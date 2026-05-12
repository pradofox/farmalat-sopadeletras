export const prerender = false;
import type { APIRoute } from "astro";
import { getDb, schema } from "../../lib/db";
import { and, eq, sql } from "drizzle-orm";

interface Item { productId: number; quantityOrdered: number; unitCost: number; ivaPct?: number; }
interface Body { supplierId: number; warehouseId: number; items: Item[]; expectedAt?: string; notes?: string; }

function buildOrderNumber(n: number): string {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  return `OC${yy}${mm}-${String(n).padStart(5, "0")}`;
}

export const POST: APIRoute = async ({ request, locals }) => {
  const db = getDb();
  const tenantId = locals.tenantId;
  const userId = locals.userId ?? null;

  let body: Body;
  try { body = await request.json(); } catch { return Response.json({ ok: false, error: "JSON invalido" }, { status: 400 }); }

  if (!body.supplierId || !body.warehouseId || !body.items?.length) {
    return Response.json({ ok: false, error: "supplierId, warehouseId e items requeridos" }, { status: 400 });
  }

  // Calcular totales
  let subtotal = 0, ivaTotal = 0;
  for (const it of body.items) {
    const s = it.quantityOrdered * it.unitCost;
    subtotal += s;
    ivaTotal += s * ((it.ivaPct ?? 0) / 100);
  }
  const total = subtotal + ivaTotal;

  // Folio
  const countRow = await db.select({ n: sql<number>`count(*)` })
    .from(schema.supplierOrders)
    .where(eq(schema.supplierOrders.tenantId, tenantId));
  const orderNumber = buildOrderNumber((countRow[0]?.n ?? 0) + 1);

  try {
    const [order] = await db.insert(schema.supplierOrders).values({
      tenantId,
      supplierId: body.supplierId,
      warehouseId: body.warehouseId,
      orderNumber,
      status: "draft",
      subtotal,
      ivaTotal,
      total,
      expectedAt: body.expectedAt ? new Date(body.expectedAt) : null,
      notes: body.notes ?? null,
      userId,
    }).returning();

    for (const it of body.items) {
      const p = await db.select({ name: schema.products.name }).from(schema.products).where(eq(schema.products.id, it.productId)).limit(1);
      await db.insert(schema.supplierOrderItems).values({
        orderId: order.id,
        productId: it.productId,
        productName: p[0]?.name ?? "Producto",
        quantityOrdered: it.quantityOrdered,
        unitCost: it.unitCost,
        ivaPct: it.ivaPct ?? 0,
      });
    }

    return Response.json({ ok: true, orderId: order.id, orderNumber });
  } catch (err) {
    return Response.json({ ok: false, error: String(err instanceof Error ? err.message : err) }, { status: 500 });
  }
};
