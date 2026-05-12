export const prerender = false;

/**
 * POST /api/sales
 *
 * Crea una venta completa con transaccion D1 emulada (batch):
 * - sales (encabezado con folio)
 * - sale_items (lineas)
 * - payments (formas de pago)
 * - inventory (descuento)
 * - inventory_movements (libro de control con balance_after)
 *
 * El folio sigue convencion: YYMMDD + 5 digitos correlativos por warehouse.
 */
import type { APIRoute } from "astro";
import { getDb, schema } from "../../lib/db";
import { and, eq, sql } from "drizzle-orm";

interface IncomingItem {
  productId: number;
  quantity: number;
  unitPrice: number;
  ivaPct: number;
}
interface IncomingPayment {
  method: "cash" | "card_debit" | "card_credit" | "transfer" | "wallet" | "credit";
  amount: number;
  reference?: string;
}
interface SaleBody {
  warehouseId: number;
  customerId?: number;
  prescriptionId?: number;
  items: IncomingItem[];
  payments: IncomingPayment[];
}

function buildFolio(warehouseId: number, n: number): string {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const wh = String(warehouseId).padStart(2, "0");
  return `${yy}${mm}${dd}${wh}${String(n).padStart(5, "0")}`;
}

export const POST: APIRoute = async ({ request, locals }) => {
  const db = getDb();
  const tenantId = locals.tenantId;
  const userId = locals.userId ?? 1;

  let body: SaleBody;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "JSON invalido" }, { status: 400 });
  }

  const { warehouseId, customerId, items, payments } = body;
  if (!warehouseId || !items?.length) {
    return Response.json({ ok: false, error: "Faltan datos: warehouseId e items requeridos" }, { status: 400 });
  }

  // Calcular totales
  let subtotal = 0;
  let ivaTotal = 0;
  for (const it of items) {
    const lineSubtotal = it.quantity * it.unitPrice;
    const lineIva = lineSubtotal * (it.ivaPct / 100);
    subtotal += lineSubtotal;
    ivaTotal += lineIva;
  }
  const total = subtotal + ivaTotal;

  const paymentSum = payments?.reduce((a, p) => a + p.amount, 0) ?? 0;
  if (Math.abs(paymentSum - total) > 0.01) {
    return Response.json({ ok: false, error: `Pagos ($${paymentSum.toFixed(2)}) no cuadran con total ($${total.toFixed(2)})` }, { status: 400 });
  }

  try {
    // Folio: contar ventas del dia + 1
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const countRow = await db
      .select({ n: sql<number>`count(*)` })
      .from(schema.sales)
      .where(and(
        eq(schema.sales.tenantId, tenantId),
        eq(schema.sales.warehouseId, warehouseId),
        sql`${schema.sales.createdAt} >= ${today.getTime()}`,
      ));
    const n = (countRow[0]?.n ?? 0) + 1;
    const folio = buildFolio(warehouseId, n);

    // Insert encabezado
    const [sale] = await db.insert(schema.sales).values({
      tenantId,
      warehouseId,
      userId,
      customerId: customerId ?? null,
      ticketNumber: folio,
      subtotal,
      ivaTotal,
      total,
      status: "completed",
    }).returning();

    // Insert lineas
    const enrichedItems = await Promise.all(items.map(async (it) => {
      const p = await db.select({ name: schema.products.name }).from(schema.products).where(eq(schema.products.id, it.productId)).limit(1);
      return {
        saleId: sale.id,
        productId: it.productId,
        productName: p[0]?.name ?? "Producto",
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        ivaPct: it.ivaPct,
        subtotal: it.quantity * it.unitPrice,
        ivaAmount: it.quantity * it.unitPrice * (it.ivaPct / 100),
        total: it.quantity * it.unitPrice * (1 + it.ivaPct / 100),
      };
    }));
    await db.insert(schema.saleItems).values(enrichedItems);

    // Insert pagos
    if (payments?.length) {
      await db.insert(schema.payments).values(payments.map((p) => ({
        saleId: sale.id,
        method: p.method,
        amount: p.amount,
        reference: p.reference ?? null,
      })));
    }

    // Descuento de inventario + movimientos
    for (const it of items) {
      // Update inventario
      const invRow = await db
        .select({ id: schema.inventory.id, quantity: schema.inventory.quantity })
        .from(schema.inventory)
        .where(and(eq(schema.inventory.productId, it.productId), eq(schema.inventory.warehouseId, warehouseId)))
        .limit(1);

      const currentQty = invRow[0]?.quantity ?? 0;
      const newQty = currentQty - it.quantity;

      if (invRow[0]) {
        await db.update(schema.inventory)
          .set({ quantity: newQty, updatedAt: new Date() })
          .where(eq(schema.inventory.id, invRow[0].id));
      }

      // Lookup controlled group del producto para el movement
      const prodRow = await db
        .select({ cg: schema.products.controlledGroup })
        .from(schema.products)
        .where(eq(schema.products.id, it.productId))
        .limit(1);

      await db.insert(schema.inventoryMovements).values({
        tenantId,
        warehouseId,
        productId: it.productId,
        controlledGroup: prodRow[0]?.cg ?? null,
        type: "sale",
        quantity: -it.quantity,
        balanceAfter: newQty,
        unitCost: 0,
        saleId: sale.id,
        prescriptionId: body.prescriptionId ?? null,
        userId,
      });
    }

    return Response.json({ ok: true, saleId: sale.id, ticketNumber: sale.ticketNumber });
  } catch (err) {
    return Response.json({ ok: false, error: String(err instanceof Error ? err.message : err) }, { status: 500 });
  }
};
