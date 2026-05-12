export const prerender = false;
import type { APIRoute } from "astro";
import { getDb, schema } from "../../../lib/db";
import { eq } from "drizzle-orm";

interface Body { name?: string; rfc?: string; regimenFiscal?: string; email?: string; phone?: string; }

export const POST: APIRoute = async ({ request, locals }) => {
  const db = getDb();
  const tenantId = locals.tenantId;
  let body: Body;
  try { body = await request.json(); } catch { return Response.json({ ok: false, error: "JSON invalido" }, { status: 400 }); }

  await db.update(schema.tenants).set({
    name: body.name ?? undefined,
    rfc: body.rfc ?? null,
    regimenFiscal: body.regimenFiscal ?? null,
    email: body.email ?? undefined,
    phone: body.phone ?? null,
  } as any).where(eq(schema.tenants.id, tenantId));

  return Response.json({ ok: true });
};
