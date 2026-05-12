export const prerender = false;
import type { APIRoute } from "astro";
import { getDb, schema } from "../../../lib/db";
import { and, eq, like, or } from "drizzle-orm";

export const GET: APIRoute = async ({ url, locals }) => {
  const db = getDb();
  const tenantId = locals.tenantId;
  const q = (url.searchParams.get("q") ?? "").trim();
  if (!q) return Response.json({ patients: [] });

  const rows = await db
    .select({ id: schema.patients.id, fullName: schema.patients.fullName, identifier: schema.patients.identifier })
    .from(schema.patients)
    .where(and(eq(schema.patients.tenantId, tenantId), or(like(schema.patients.fullName, `%${q}%`), like(schema.patients.identifier, `%${q}%`))))
    .limit(10);

  return Response.json({ patients: rows });
};
