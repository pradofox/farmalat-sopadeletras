export const prerender = false;
/**
 * POST /api/prescriptions
 * Body multipart/form-data:
 *  - doctorId? (number)
 *  - patientName (string)
 *  - patientAge? (number)
 *  - type (physical | bar_code_cofepris | electronic)
 *  - barcode? (string)
 *  - retained (1 = retiene fisica)
 *  - issuedAt? (yyyy-mm-dd)
 *  - file? (foto/escaneo) -> a R2 RECEIPTS
 */
import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { getDb, schema } from "../../lib/db";

export const POST: APIRoute = async ({ request, locals }) => {
  const db = getDb();
  const tenantId = locals.tenantId;
  const r2 = (env as { RECEIPTS: R2Bucket }).RECEIPTS;

  const form = await request.formData();
  const doctorId = form.get("doctorId") ? Number(form.get("doctorId")) : null;
  const patientName = (form.get("patientName") as string | null)?.trim() || null;
  const patientAge = form.get("patientAge") ? Number(form.get("patientAge")) : null;
  const type = (form.get("type") as string) || "physical";
  const barcode = (form.get("barcode") as string | null)?.trim() || null;
  const retained = form.get("retained") === "1";
  const issuedAtStr = form.get("issuedAt") as string | null;
  const file = form.get("file");

  let attachmentUrl: string | null = null;
  if (file instanceof File && file.size > 0) {
    const ext = file.name.split(".").pop() || "jpg";
    const key = `${tenantId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    await r2.put(key, file.stream(), { httpMetadata: { contentType: file.type || "image/jpeg" } });
    attachmentUrl = `r2://farmalat-receipts/${key}`;
  }

  const [row] = await db.insert(schema.prescriptions).values({
    tenantId,
    doctorId,
    type: type as any,
    barcode,
    attachmentUrl,
    retained,
    refillsMax: type === "bar_code_cofepris" ? 1 : 3,
    refillsUsed: 0,
    patientName,
    patientAge,
    issuedAt: issuedAtStr ? new Date(issuedAtStr) : null,
  }).returning();

  return Response.json({ ok: true, prescriptionId: row.id, attachmentUrl });
};
