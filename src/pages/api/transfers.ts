export const prerender = false;
/**
 * POST /api/transfers
 * Crea un traslado de inventario desde fromWarehouseId hacia toWarehouseId.
 * Aplica inmediatamente (model simple: salida del origen + entrada al destino).
 * Inventory movements: transfer_out (origen) y transfer_in (destino).
 */
import type { APIRoute } from "astro";
import { getDb, schema } from "../../lib/db";
import { and, eq, sql } from "drizzle-orm";

interface Item { productId: number; quantity: number; }
interface Body { fromWarehouseId: number; toWarehouseId: number; items: Item[]; notes?: string; }

function buildTransferNumber(n: number): string {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  return `TR${yy}${mm}-${String(n).padStart(5, "0")}`;
}

export const POST: APIRoute = async ({ request, locals }) => {
  const db = getDb();
  const tenantId = locals.tenantId;
  const userId = locals.userId ?? null;

  let body: Body;
  try { body = await request.json(); } catch { return Response.json({ ok: false, error: "JSON invalido" }, { status: 400 }); }

  if (!body.fromWarehouseId || !body.toWarehouseId || body.fromWarehouseId === body.toWarehouseId || !body.items?.length) {
    return Response.json({ ok: false, error: "Almacenes origen y destino distintos + items requeridos" }, { status: 400 });
  }

  // Validar stock disponible
  for (const it of body.items) {
    const [inv] = await db.select({ q: schema.inventory.quantity }).from(schema.inventory)
      .where(and(eq(schema.inventory.productId, it.productId), eq(schema.inventory.warehouseId, body.fromWarehouseId)))
      .limit(1);
    if (!inv || inv.q < it.quantity) {
      return Response.json({ ok: false, error: `Stock insuficiente para producto ${it.productId}` }, { status: 400 });
    }
  }

  const countRow = await db.select({ n: sql<number>`count(*)` }).from(schema.transfers).where(eq(schema.transfers.tenantId, tenantId));
  const transferNumber = buildTransferNumber((countRow[0]?.n ?? 0) + 1);

  try {
    const [transfer] = await db.insert(schema.transfers).values({
      tenantId,
      fromWarehouseId: body.fromWarehouseId,
      toWarehouseId: body.toWarehouseId,
      transferNumber,
      status: "received",
      sentAt: new Date(),
      receivedAt: new Date(),
      notes: body.notes ?? null,
      userId,
    }).returning();

    for (const it of body.items) {
      const p = await db.select({ name: schema.products.name, cg: schema.products.controlledGroup })
        .from(schema.products).where(eq(schema.products.id, it.productId)).limit(1);
      const productName = p[0]?.name ?? "Producto";
      const cg = p[0]?.cg ?? null;

      await db.insert(schema.transferItems).values({
        transferId: transfer.id,
        productId: it.productId,
        productName,
        quantity: it.quantity,
      });

      // Salida del origen
      const [invFrom] = await db.select().from(schema.inventory)
        .where(and(eq(schema.inventory.productId, it.productId), eq(schema.inventory.warehouseId, body.fromWarehouseId)))
        .limit(1);
      const newFromQty = (invFrom?.quantity ?? 0) - it.quantity;
      await db.update(schema.inventory).set({ quantity: newFromQty, updatedAt: new Date() }).where(eq(schema.inventory.id, invFrom!.id));

      await db.insert(schema.inventoryMovements).values({
        tenantId, warehouseId: body.fromWarehouseId, productId: it.productId,
        controlledGroup: cg, type: "transfer_out", quantity: -it.quantity,
        balanceAfter: newFromQty, reason: `Hacia ${transferNumber}`, userId,
      });

      // Entrada al destino
      const [invTo] = await db.select().from(schema.inventory)
        .where(and(eq(schema.inventory.productId, it.productId), eq(schema.inventory.warehouseId, body.toWarehouseId)))
        .limit(1);
      let newToQty = it.quantity;
      if (invTo) {
        newToQty = invTo.quantity + it.quantity;
        await db.update(schema.inventory).set({ quantity: newToQty, updatedAt: new Date() }).where(eq(schema.inventory.id, invTo.id));
      } else {
        await db.insert(schema.inventory).values({
          tenantId, warehouseId: body.toWarehouseId, productId: it.productId,
          quantity: newToQty, minQuantity: 0, maxQuantity: newToQty * 2, lastCost: invFrom?.lastCost ?? 0,
        });
      }

      await db.insert(schema.inventoryMovements).values({
        tenantId, warehouseId: body.toWarehouseId, productId: it.productId,
        controlledGroup: cg, type: "transfer_in", quantity: it.quantity,
        balanceAfter: newToQty, reason: `Desde ${transferNumber}`, userId,
      });
    }

    return Response.json({ ok: true, transferId: transfer.id, transferNumber });
  } catch (err) {
    return Response.json({ ok: false, error: String(err instanceof Error ? err.message : err) }, { status: 500 });
  }
};
