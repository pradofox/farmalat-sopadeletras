export const prerender = false;
/**
 * GET /api/receipts/{tenant}/{filename}
 * Sirve archivos de recetas desde R2 RECEIPTS.
 * Solo autenticado y solo del propio tenant.
 */
import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";

export const GET: APIRoute = async ({ params, locals }) => {
  const r2 = (env as { RECEIPTS: R2Bucket }).RECEIPTS;
  const path = (params.path as string) ?? "";
  if (!path) return new Response("Not found", { status: 404 });

  // Validar que el path corresponde al tenant del usuario
  const tenantId = locals.tenantId;
  if (!path.startsWith(`${tenantId}/`)) return new Response("Forbidden", { status: 403 });

  const obj = await r2.get(path);
  if (!obj) return new Response("Not found", { status: 404 });

  return new Response(obj.body, {
    headers: {
      "Content-Type": obj.httpMetadata?.contentType ?? "application/octet-stream",
      "Cache-Control": "private, max-age=3600",
    },
  });
};
