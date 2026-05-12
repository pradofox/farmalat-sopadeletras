export const prerender = false;
/**
 * POST /api/patient-accounts: abre una cuenta hospitalaria nueva.
 */
import type { APIRoute } from "astro";
import { getDb, schema } from "../../lib/db";
import { eq, sql } from "drizzle-orm";

interface Body {
  patientId: number;
  warehouseId: number;
  bedNumber?: string;
  payerType?: "private" | "insurance" | "imss" | "issste" | "other";
  notes?: string;
}

export const POST: APIRoute = async ({ request, locals }) => {
  const db = getDb();
  const tenantId = locals.tenantId;
  const userId = locals.userId ?? null;
  let body: Body;
  try { body = await request.json(); } catch { return Response.json({ ok: false, error: "JSON invalido" }, { status: 400 }); }
  if (!body.patientId || !body.warehouseId) return Response.json({ ok: false, error: "patientId y warehouseId requeridos" }, { status: 400 });

  const countRow = await db.select({ n: sql<number>`count(*)` }).from(schema.patientAccounts).where(eq(schema.patientAccounts.tenantId, tenantId));
  const n = (countRow[0]?.n ?? 0) + 1;
  const now = new Date();
  const accountNumber = `CP${String(now.getFullYear()).slice(-2)}${String(now.getMonth() + 1).padStart(2, "0")}-${String(n).padStart(5, "0")}`;

  const [row] = await db.insert(schema.patientAccounts).values({
    tenantId,
    patientId: body.patientId,
    warehouseId: body.warehouseId,
    accountNumber,
    status: "open",
    payerType: body.payerType ?? "private",
    bedNumber: body.bedNumber ?? null,
    admittedAt: now,
    notes: body.notes ?? null,
    userId,
  }).returning();

  return Response.json({ ok: true, accountId: row.id, accountNumber });
};
