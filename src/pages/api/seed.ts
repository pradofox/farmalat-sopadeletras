/**
 * POST /api/seed → corre el seed inicial. Idempotente.
 * Sin auth por ahora porque solo crea datos demo y es idempotente.
 */
export const prerender = false;
import type { APIRoute } from "astro";
import { getDb } from "../../lib/db";
import { seed } from "../../lib/seed";

export const POST: APIRoute = async ({ url }) => {
  const db = getDb();
  const reset = url.searchParams.get("reset") === "1";
  try {
    const result = await seed(db, { reset });
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: String(err instanceof Error ? err.message : err) }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
};
