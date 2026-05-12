export const prerender = false;

import type { APIRoute } from "astro";
import { getDb, schema } from "../../../lib/db";
import { verifyPassword } from "../../../lib/auth";
import { createSession, buildCookie } from "../../../lib/session";
import { and, eq } from "drizzle-orm";

export const POST: APIRoute = async ({ request }) => {
  const db = getDb();
  let body: { email?: string; password?: string };
  try { body = await request.json(); } catch { return Response.json({ ok: false, error: "JSON invalido" }, { status: 400 }); }

  const email = body.email?.trim().toLowerCase() ?? "";
  const password = body.password ?? "";

  if (!email || !password) {
    return Response.json({ ok: false, error: "Email y contraseña son obligatorios" }, { status: 400 });
  }

  const [user] = await db
    .select({
      id: schema.users.id,
      tenantId: schema.users.tenantId,
      name: schema.users.name,
      email: schema.users.email,
      passwordHash: schema.users.passwordHash,
      active: schema.users.active,
    })
    .from(schema.users)
    .where(eq(schema.users.email, email))
    .limit(1);

  if (!user || !user.active) {
    return Response.json({ ok: false, error: "Credenciales invalidas" }, { status: 401 });
  }

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    return Response.json({ ok: false, error: "Credenciales invalidas" }, { status: 401 });
  }

  const token = await createSession({
    userId: user.id,
    tenantId: user.tenantId,
    email: user.email,
    name: user.name,
  });

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": buildCookie(token),
    },
  });
};
