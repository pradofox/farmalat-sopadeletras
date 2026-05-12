export const prerender = false;
/**
 * GET /api/exports/sales?from=&to=
 * Devuelve XLSX con todas las ventas + items del rango.
 */
import type { APIRoute } from "astro";
import * as XLSX from "xlsx";
import { getDb, schema } from "../../../lib/db";
import { and, eq, gte, lte, desc } from "drizzle-orm";

export const GET: APIRoute = async ({ url, locals }) => {
  const db = getDb();
  const tenantId = locals.tenantId;

  const today = new Date(); today.setHours(23, 59, 59, 999);
  const monthAgo = new Date(today); monthAgo.setDate(monthAgo.getDate() - 30); monthAgo.setHours(0, 0, 0, 0);
  const from = new Date(url.searchParams.get("from") ? url.searchParams.get("from") + "T00:00:00" : monthAgo);
  const to = new Date(url.searchParams.get("to") ? url.searchParams.get("to") + "T23:59:59.999" : today);

  const rows = await db
    .select({
      ticket: schema.sales.ticketNumber,
      date: schema.sales.createdAt,
      status: schema.sales.status,
      subtotal: schema.sales.subtotal,
      iva: schema.sales.ivaTotal,
      total: schema.sales.total,
      productName: schema.saleItems.productName,
      quantity: schema.saleItems.quantity,
      unitPrice: schema.saleItems.unitPrice,
      lineTotal: schema.saleItems.total,
      warehouse: schema.warehouses.name,
      cashier: schema.users.name,
    })
    .from(schema.sales)
    .leftJoin(schema.saleItems, eq(schema.saleItems.saleId, schema.sales.id))
    .leftJoin(schema.warehouses, eq(schema.sales.warehouseId, schema.warehouses.id))
    .leftJoin(schema.users, eq(schema.sales.userId, schema.users.id))
    .where(and(
      eq(schema.sales.tenantId, tenantId),
      gte(schema.sales.createdAt, from),
      lte(schema.sales.createdAt, to),
    ))
    .orderBy(desc(schema.sales.createdAt));

  const sheet = XLSX.utils.json_to_sheet(rows.map((r) => ({
    Ticket: r.ticket,
    Fecha: r.date ? new Date(r.date).toLocaleString("es-MX") : "",
    Estado: r.status,
    Sucursal: r.warehouse ?? "",
    Cajero: r.cashier ?? "",
    Producto: r.productName ?? "",
    Cantidad: r.quantity ?? 0,
    "Precio unit.": r.unitPrice ?? 0,
    "Importe linea": r.lineTotal ?? 0,
    Subtotal: r.subtotal,
    IVA: r.iva,
    Total: r.total,
  })));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, "Ventas");

  const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  const filename = `farmalat-ventas-${from.toISOString().slice(0, 10)}-a-${to.toISOString().slice(0, 10)}.xlsx`;

  return new Response(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
};
