export const prerender = false;

import type { APIRoute } from "astro";
import { destroySession, clearCookie, SESSION_COOKIE } from "../../../lib/session";

export const POST: APIRoute = async ({ cookies }) => {
  const token = cookies.get(SESSION_COOKIE)?.value ?? "";
  await destroySession(token);
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json", "Set-Cookie": clearCookie() },
  });
};
