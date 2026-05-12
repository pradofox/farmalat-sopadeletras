export const prerender = false;
/**
 * POST /api/inventory/adjust
 * Ajuste manual de inventario (positivo o negativo).
 * Genera movimiento adjustment_in / adjustment_out / expired_loss.
 */
import type { APIRoute } from "astro";
import { getDb, schema } from "../../../lib/db";
import { and, eq } from "drizzle-orm";

interface Body {
  warehouseId: number;
  productId: number;
  quantity: number; // positivo o negativo
  reason: string;
  type?: "adjustment_in" | "adjustment_out" | "expired_loss";
}

export const POST: APIRoute = async ({ request, locals }) => {
  const db = getDb();
  const tenantId = locals.tenantId;
  const userId = locals.userId ?? null;

  let body: Body;
  try { body = await request.json(); } catch { return Response.json({ ok: false, error: "JSON invalido" }, { status: 400 }); }
  if (!body.warehouseId || !body.productId || !body.quantity || !body.reason) {
    return Response.json({ ok: false, error: "Faltan datos" }, { status: 400 });
  }

  const type = body.type ?? (body.quantity > 0 ? "adjustment_in" : "adjustment_out");

  const [inv] = await db.select().from(schema.inventory)
    .where(and(eq(schema.inventory.productId, body.productId), eq(schema.inventory.warehouseId, body.warehouseId)))
    .limit(1);

  const currentQty = inv?.quantity ?? 0;
  const newQty = currentQty + body.quantity;

  if (inv) {
    await db.update(schema.inventory).set({ quantity: newQty, updatedAt: new Date() }).where(eq(schema.inventory.id, inv.id));
  } else if (body.quantity > 0) {
    await db.insert(schema.inventory).values({
      tenantId, warehouseId: body.warehouseId, productId: body.productId,
      quantity: newQty, minQuantity: 0, maxQuantity: 0, lastCost: 0,
    });
  } else {
    return Response.json({ ok: false, error: "Producto sin inventario en este almacen" }, { status: 400 });
  }

  const p = await db.select({ cg: schema.products.controlledGroup }).from(schema.products).where(eq(schema.products.id, body.productId)).limit(1);

  await db.insert(schema.inventoryMovements).values({
    tenantId, warehouseId: body.warehouseId, productId: body.productId,
    controlledGroup: p[0]?.cg ?? null,
    type, quantity: body.quantity, balanceAfter: newQty,
    reason: body.reason, userId,
  });

  return Response.json({ ok: true, newQuantity: newQty });
};
