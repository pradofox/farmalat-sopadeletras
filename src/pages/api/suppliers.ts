export const prerender = false;
import type { APIRoute } from "astro";
import { getDb, schema } from "../../lib/db";
import { and, eq } from "drizzle-orm";

interface Body {
  id?: number;
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  rfc?: string;
  address?: string;
  paymentTerms?: string;
}

export const POST: APIRoute = async ({ request, locals }) => {
  const db = getDb();
  const tenantId = locals.tenantId;

  let body: Body;
  try { body = await request.json(); } catch { return Response.json({ ok: false, error: "JSON invalido" }, { status: 400 }); }
  if (!body.name) return Response.json({ ok: false, error: "Nombre requerido" }, { status: 400 });

  try {
    if (body.id) {
      await db.update(schema.suppliers)
        .set({
          name: body.name,
          contactName: body.contactName ?? null,
          email: body.email ?? null,
          phone: body.phone ?? null,
          rfc: body.rfc ?? null,
          address: body.address ?? null,
          paymentTerms: body.paymentTerms ?? null,
        })
        .where(and(eq(schema.suppliers.id, body.id), eq(schema.suppliers.tenantId, tenantId)));
      return Response.json({ ok: true, id: body.id });
    }
    const [row] = await db.insert(schema.suppliers).values({
      tenantId,
      name: body.name,
      contactName: body.contactName ?? null,
      email: body.email ?? null,
      phone: body.phone ?? null,
      rfc: body.rfc ?? null,
      address: body.address ?? null,
      paymentTerms: body.paymentTerms ?? null,
    }).returning();
    return Response.json({ ok: true, id: row.id });
  } catch (err) {
    return Response.json({ ok: false, error: String(err instanceof Error ? err.message : err) }, { status: 500 });
  }
};
