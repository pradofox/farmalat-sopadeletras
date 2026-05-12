export const prerender = false;
/**
 * POST /api/patient-accounts/[id]/close
 * Cierra la cuenta y genera una sale unificada con todos los items.
 */
import type { APIRoute } from "astro";
import { getDb, schema } from "../../../../lib/db";
import { and, eq, sql } from "drizzle-orm";

export const POST: APIRoute = async ({ params, locals }) => {
  const db = getDb();
  const tenantId = locals.tenantId;
  const userId = locals.userId ?? 1;
  const accountId = Number(params.id);

  const [account] = await db.select().from(schema.patientAccounts)
    .where(and(eq(schema.patientAccounts.id, accountId), eq(schema.patientAccounts.tenantId, tenantId)))
    .limit(1);
  if (!account || account.status !== "open") {
    return Response.json({ ok: false, error: "Cuenta no encontrada o ya cerrada" }, { status: 404 });
  }

  const items = await db.select().from(schema.patientAccountItems).where(eq(schema.patientAccountItems.accountId, accountId));
  if (items.length === 0) {
    return Response.json({ ok: false, error: "La cuenta no tiene cargos" }, { status: 400 });
  }

  let subtotal = 0, ivaTotal = 0;
  for (const it of items) {
    subtotal += it.subtotal;
    ivaTotal += it.subtotal * (it.ivaPct / 100);
  }
  const total = subtotal + ivaTotal;

  // Folio especial de cuenta hospitalaria
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const countRow = await db.select({ n: sql<number>`count(*)` }).from(schema.sales)
    .where(and(eq(schema.sales.tenantId, tenantId), eq(schema.sales.warehouseId, account.warehouseId)));
  const n = (countRow[0]?.n ?? 0) + 1;
  const yy = String(today.getFullYear()).slice(-2);
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const ticketNumber = `H${yy}${mm}${dd}-${String(n).padStart(5, "0")}`;

  const [sale] = await db.insert(schema.sales).values({
    tenantId,
    warehouseId: account.warehouseId,
    userId,
    customerId: null,
    ticketNumber,
    subtotal,
    ivaTotal,
    total,
    status: "completed",
  }).returning();

  for (const it of items) {
    await db.insert(schema.saleItems).values({
      saleId: sale.id,
      productId: it.productId,
      productName: it.productName,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      ivaPct: it.ivaPct,
      subtotal: it.subtotal,
      ivaAmount: it.subtotal * (it.ivaPct / 100),
      total: it.total,
    });
  }

  // Marca de pago: pendiente (no se cobra al cerrar; se cobra a la aseguradora/paciente despues)
  await db.insert(schema.payments).values({
    saleId: sale.id,
    method: "credit",
    amount: total,
    reference: `Cuenta paciente ${account.accountNumber}`,
  });

  await db.update(schema.patientAccounts)
    .set({ status: "closed", dischargedAt: new Date(), saleId: sale.id })
    .where(eq(schema.patientAccounts.id, accountId));

  return Response.json({ ok: true, saleId: sale.id, ticketNumber, total });
};
