export const prerender = false;
/**
 * POST /api/public/cfdi-mock
 * Endpoint publico (sin auth) que recibe slug del tenant + folio del ticket
 * + datos del receptor. Valida que el ticket exista, este dentro de 30 dias
 * y no este facturado. Marca la venta como facturada (mock) y guarda los
 * datos. En produccion seria reemplazado por la llamada real a Facturapi.
 */
import type { APIRoute } from "astro";
import { getDb, schema } from "../../../lib/db";
import { and, eq } from "drizzle-orm";
import { isValidRfc, REGIMEN_FISCAL, USO_CFDI } from "../../../lib/sat-catalogs";
import { makeMockUuid } from "../../../lib/cfdi";

interface Body {
  tenantSlug: string;
  folio: string;
  rfc: string;
  name: string;
  regimenFiscal: string;
  usoCfdi: string;
  zipCode: string;
  email?: string;
}

export const POST: APIRoute = async ({ request }) => {
  const db = getDb();
  let body: Body;
  try { body = await request.json(); } catch { return Response.json({ ok: false, error: "JSON invalido" }, { status: 400 }); }

  const rfc = body.rfc?.toUpperCase().trim();
  if (!isValidRfc(rfc)) return Response.json({ ok: false, error: "RFC invalido" }, { status: 400 });
  if (!body.name?.trim()) return Response.json({ ok: false, error: "Nombre / razón social requerido" }, { status: 400 });
  if (!REGIMEN_FISCAL[body.regimenFiscal]) return Response.json({ ok: false, error: "Régimen fiscal invalido" }, { status: 400 });
  if (!USO_CFDI[body.usoCfdi]) return Response.json({ ok: false, error: "Uso CFDI invalido" }, { status: 400 });
  if (!/^\d{5}$/.test(body.zipCode ?? "")) return Response.json({ ok: false, error: "Código postal invalido (5 dígitos)" }, { status: 400 });

  // Buscar tenant
  const [tenant] = await db.select({ id: schema.tenants.id }).from(schema.tenants).where(eq(schema.tenants.slug, body.tenantSlug)).limit(1);
  if (!tenant) return Response.json({ ok: false, error: "Farmacia no encontrada" }, { status: 404 });

  // Buscar venta por folio
  const [sale] = await db.select().from(schema.sales)
    .where(and(eq(schema.sales.tenantId, tenant.id), eq(schema.sales.ticketNumber, body.folio)))
    .limit(1);
  if (!sale) return Response.json({ ok: false, error: "Ticket no encontrado" }, { status: 404 });

  // Validar plazo 30 dias
  const ticketAge = Date.now() - new Date(sale.createdAt!).getTime();
  if (ticketAge > 30 * 24 * 60 * 60 * 1000) {
    return Response.json({ ok: false, error: "Ticket fuera del plazo de 30 días" }, { status: 400 });
  }
  if (sale.cfdiStatus === "issued") {
    return Response.json({ ok: false, error: "Este ticket ya fue facturado" }, { status: 400 });
  }

  // Crear customer si no existe
  let customerId = sale.customerId;
  if (!customerId) {
    const [c] = await db.insert(schema.customers).values({
      tenantId: tenant.id,
      name: body.name.trim().toUpperCase(),
      rfc,
      email: body.email ?? null,
      zipCode: body.zipCode,
      taxRegime: body.regimenFiscal,
      cfdiUse: body.usoCfdi,
    }).returning();
    customerId = c.id;
  }

  // Generar UUID mock y marcar venta
  const uuid = makeMockUuid();
  await db.update(schema.sales).set({
    cfdiUuid: uuid,
    cfdiStatus: "issued",
    customerId,
  }).where(eq(schema.sales.id, sale.id));

  return Response.json({ ok: true, uuid, saleId: sale.id });
};
