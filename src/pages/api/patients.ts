export const prerender = false;
import type { APIRoute } from "astro";
import { getDb, schema } from "../../lib/db";
import { and, eq } from "drizzle-orm";

interface Body { id?: number; fullName: string; identifier?: string; birthDate?: string; phone?: string; email?: string; notes?: string; }

export const POST: APIRoute = async ({ request, locals }) => {
  const db = getDb();
  const tenantId = locals.tenantId;
  let body: Body;
  try { body = await request.json(); } catch { return Response.json({ ok: false, error: "JSON invalido" }, { status: 400 }); }
  if (!body.fullName) return Response.json({ ok: false, error: "Nombre requerido" }, { status: 400 });

  const payload = {
    tenantId,
    fullName: body.fullName.trim(),
    identifier: body.identifier ?? null,
    birthDate: body.birthDate ? new Date(body.birthDate) : null,
    phone: body.phone ?? null,
    email: body.email ?? null,
    notes: body.notes ?? null,
  };

  if (body.id) {
    await db.update(schema.patients).set(payload).where(and(eq(schema.patients.id, body.id), eq(schema.patients.tenantId, tenantId)));
    return Response.json({ ok: true, id: body.id });
  }
  const [row] = await db.insert(schema.patients).values(payload).returning();
  return Response.json({ ok: true, id: row.id });
};
