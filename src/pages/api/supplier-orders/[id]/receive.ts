export const prerender = false;
/**
 * POST /api/supplier-orders/[id]/receive
 * Marca la orden como recibida (full) y dispara:
 *  - update quantityReceived = quantityOrdered en todas las lineas
 *  - inventory += quantityOrdered por linea en el warehouse de la orden
 *  - inventory_movements type=purchase con balance_after
 *  - product_lots opcional si lot+expiry en linea
 */
import type { APIRoute } from "astro";
import { getDb, schema } from "../../../../lib/db";
import { and, eq } from "drizzle-orm";

export const POST: APIRoute = async ({ params, locals }) => {
  const db = getDb();
  const tenantId = locals.tenantId;
  const userId = locals.userId ?? null;
  const orderId = Number(params.id);

  const [order] = await db.select().from(schema.supplierOrders)
    .where(and(eq(schema.supplierOrders.id, orderId), eq(schema.supplierOrders.tenantId, tenantId))).limit(1);
  if (!order) return Response.json({ ok: false, error: "Orden no encontrada" }, { status: 404 });
  if (order.status === "received" || order.status === "cancelled") {
    return Response.json({ ok: false, error: "Orden ya está cerrada" }, { status: 400 });
  }

  const items = await db.select().from(schema.supplierOrderItems).where(eq(schema.supplierOrderItems.orderId, orderId));

  for (const it of items) {
    // Update item
    await db.update(schema.supplierOrderItems)
      .set({ quantityReceived: it.quantityOrdered })
      .where(eq(schema.supplierOrderItems.id, it.id));

    // Inventory
    const [inv] = await db.select().from(schema.inventory)
      .where(and(eq(schema.inventory.productId, it.productId), eq(schema.inventory.warehouseId, order.warehouseId)))
      .limit(1);

    let newQty = it.quantityOrdered;
    if (inv) {
      newQty = inv.quantity + it.quantityOrdered;
      await db.update(schema.inventory)
        .set({ quantity: newQty, lastCost: it.unitCost, updatedAt: new Date() })
        .where(eq(schema.inventory.id, inv.id));
    } else {
      await db.insert(schema.inventory).values({
        tenantId, warehouseId: order.warehouseId, productId: it.productId,
        quantity: newQty, minQuantity: 0, maxQuantity: newQty * 2, lastCost: it.unitCost,
      });
    }

    // Lote opcional
    if (it.lot) {
      await db.insert(schema.productLots).values({
        tenantId, productId: it.productId, warehouseId: order.warehouseId,
        lot: it.lot, expiryDate: it.expiryDate ?? null,
        qtyOnHand: it.quantityOrdered, unitCost: it.unitCost,
      });
    }

    // Movement
    const prod = await db.select({ cg: schema.products.controlledGroup }).from(schema.products).where(eq(schema.products.id, it.productId)).limit(1);
    await db.insert(schema.inventoryMovements).values({
      tenantId,
      warehouseId: order.warehouseId,
      productId: it.productId,
      controlledGroup: prod[0]?.cg ?? null,
      type: "purchase",
      quantity: it.quantityOrdered,
      balanceAfter: newQty,
      unitCost: it.unitCost,
      supplierInvoice: order.orderNumber,
      userId,
    });
  }

  await db.update(schema.supplierOrders)
    .set({ status: "received", receivedAt: new Date() })
    .where(eq(schema.supplierOrders.id, orderId));

  return Response.json({ ok: true });
};
