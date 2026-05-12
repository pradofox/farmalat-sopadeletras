export const prerender = false;
import type { APIRoute } from "astro";
import { getDb, schema } from "../../lib/db";
import { and, eq } from "drizzle-orm";

interface Body {
  id?: number;
  name: string;
  ticketLine1?: string;
  ticketLine2?: string;
  ticketLine3?: string;
  allowsTransfers?: boolean;
  active?: boolean;
}

export const POST: APIRoute = async ({ request, locals }) => {
  const db = getDb();
  const tenantId = locals.tenantId;
  let body: Body;
  try { body = await request.json(); } catch { return Response.json({ ok: false, error: "JSON invalido" }, { status: 400 }); }
  if (!body.name) return Response.json({ ok: false, error: "Nombre requerido" }, { status: 400 });

  if (body.id) {
    await db.update(schema.warehouses).set({
      name: body.name,
      ticketLine1: body.ticketLine1 ?? null,
      ticketLine2: body.ticketLine2 ?? null,
      ticketLine3: body.ticketLine3 ?? null,
      allowsTransfers: body.allowsTransfers ?? true,
      active: body.active ?? true,
    }).where(and(eq(schema.warehouses.id, body.id), eq(schema.warehouses.tenantId, tenantId)));
    return Response.json({ ok: true, id: body.id });
  }
  const [row] = await db.insert(schema.warehouses).values({
    tenantId,
    name: body.name,
    ticketLine1: body.ticketLine1 ?? null,
    ticketLine2: body.ticketLine2 ?? null,
    ticketLine3: body.ticketLine3 ?? null,
    allowsTransfers: body.allowsTransfers ?? true,
  }).returning();
  return Response.json({ ok: true, id: row.id });
};
