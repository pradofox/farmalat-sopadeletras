export const prerender = false;
/**
 * POST /api/patient-accounts/[id]/items
 * Agrega productos a la cuenta del paciente, descuenta inventario y crea movimiento sale-like.
 */
import type { APIRoute } from "astro";
import { getDb, schema } from "../../../../lib/db";
import { and, eq } from "drizzle-orm";

interface Item { productId: number; quantity: number; unitPrice: number; ivaPct: number; }
interface Body { items: Item[]; doctorId?: number; }

export const POST: APIRoute = async ({ params, request, locals }) => {
  const db = getDb();
  const tenantId = locals.tenantId;
  const userId = locals.userId ?? null;
  const accountId = Number(params.id);

  const [account] = await db.select().from(schema.patientAccounts)
    .where(and(eq(schema.patientAccounts.id, accountId), eq(schema.patientAccounts.tenantId, tenantId)))
    .limit(1);
  if (!account || account.status !== "open") {
    return Response.json({ ok: false, error: "Cuenta no encontrada o cerrada" }, { status: 404 });
  }

  let body: Body;
  try { body = await request.json(); } catch { return Response.json({ ok: false, error: "JSON invalido" }, { status: 400 }); }
  if (!body.items?.length) return Response.json({ ok: false, error: "Items requeridos" }, { status: 400 });

  let addedTotal = 0;
  for (const it of body.items) {
    const [p] = await db.select({ name: schema.products.name, cg: schema.products.controlledGroup }).from(schema.products).where(eq(schema.products.id, it.productId)).limit(1);
    const subtotal = it.quantity * it.unitPrice;
    const ivaAmount = subtotal * (it.ivaPct / 100);
    const total = subtotal + ivaAmount;
    addedTotal += total;

    await db.insert(schema.patientAccountItems).values({
      accountId,
      productId: it.productId,
      productName: p?.name ?? "Producto",
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      ivaPct: it.ivaPct,
      subtotal,
      total,
      doctorId: body.doctorId ?? null,
    });

    // Descontar inventario
    const [inv] = await db.select().from(schema.inventory)
      .where(and(eq(schema.inventory.productId, it.productId), eq(schema.inventory.warehouseId, account.warehouseId)))
      .limit(1);
    const newQty = (inv?.quantity ?? 0) - it.quantity;
    if (inv) await db.update(schema.inventory).set({ quantity: newQty, updatedAt: new Date() }).where(eq(schema.inventory.id, inv.id));

    await db.insert(schema.inventoryMovements).values({
      tenantId, warehouseId: account.warehouseId, productId: it.productId,
      controlledGroup: p?.cg ?? null, type: "sale", quantity: -it.quantity,
      balanceAfter: newQty, reason: `Cuenta ${account.accountNumber}`, userId,
    });
  }

  await db.update(schema.patientAccounts)
    .set({ totalCharged: account.totalCharged + addedTotal })
    .where(eq(schema.patientAccounts.id, accountId));

  return Response.json({ ok: true, addedTotal });
};
