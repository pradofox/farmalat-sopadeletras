export const prerender = false;
/**
 * GET /api/search?q=...
 * Busqueda global: productos, ventas (folio), clientes, pacientes.
 */
import type { APIRoute } from "astro";
import { getDb, schema } from "../../lib/db";
import { and, eq, like, or, desc } from "drizzle-orm";

export const GET: APIRoute = async ({ url, locals }) => {
  const db = getDb();
  const tenantId = locals.tenantId;
  const q = (url.searchParams.get("q") ?? "").trim();
  if (!q || q.length < 2) return Response.json({ results: [] });

  const [products, sales, customers, patients] = await Promise.all([
    db.select({ id: schema.products.id, name: schema.products.name, barcode: schema.products.barcode })
      .from(schema.products)
      .where(and(eq(schema.products.tenantId, tenantId), or(like(schema.products.name, `%${q}%`), like(schema.products.barcode, `%${q}%`))))
      .limit(5),
    db.select({ id: schema.sales.id, ticketNumber: schema.sales.ticketNumber, total: schema.sales.total, createdAt: schema.sales.createdAt })
      .from(schema.sales)
      .where(and(eq(schema.sales.tenantId, tenantId), like(schema.sales.ticketNumber, `%${q}%`)))
      .orderBy(desc(schema.sales.createdAt))
      .limit(5),
    db.select({ id: schema.customers.id, name: schema.customers.name, rfc: schema.customers.rfc })
      .from(schema.customers)
      .where(and(eq(schema.customers.tenantId, tenantId), or(like(schema.customers.name, `%${q}%`), like(schema.customers.rfc, `%${q}%`))))
      .limit(5),
    db.select({ id: schema.patients.id, fullName: schema.patients.fullName, identifier: schema.patients.identifier })
      .from(schema.patients)
      .where(and(eq(schema.patients.tenantId, tenantId), or(like(schema.patients.fullName, `%${q}%`), like(schema.patients.identifier, `%${q}%`))))
      .limit(5),
  ]);

  return Response.json({
    products: products.map((p) => ({ ...p, url: `/app/productos/${p.id}` })),
    sales:    sales.map((s) => ({ ...s, url: `/app/venta/ticket/${s.id}` })),
    customers:customers.map((c) => ({ ...c, url: `/app/clientes` })),
    patients: patients.map((p) => ({ ...p, url: `/app/cuentas-paciente` })),
  });
};
