export const prerender = false;
import type { APIRoute } from "astro";
import { getDb, schema } from "../../../lib/db";
import { hashPassword, verifyPassword } from "../../../lib/auth";
import { eq } from "drizzle-orm";

interface Body { currentPassword: string; newPassword: string; }

export const POST: APIRoute = async ({ request, locals }) => {
  const db = getDb();
  const userId = locals.userId;
  if (!userId) return Response.json({ ok: false, error: "No autorizado" }, { status: 401 });

  let body: Body;
  try { body = await request.json(); } catch { return Response.json({ ok: false, error: "JSON invalido" }, { status: 400 }); }
  if (!body.currentPassword || !body.newPassword) return Response.json({ ok: false, error: "Faltan datos" }, { status: 400 });
  if (body.newPassword.length < 8) return Response.json({ ok: false, error: "Nueva contraseña minimo 8 caracteres" }, { status: 400 });

  const [user] = await db.select().from(schema.users).where(eq(schema.users.id, userId)).limit(1);
  if (!user) return Response.json({ ok: false, error: "Usuario no encontrado" }, { status: 404 });

  const ok = await verifyPassword(body.currentPassword, user.passwordHash);
  if (!ok) return Response.json({ ok: false, error: "Contraseña actual incorrecta" }, { status: 401 });

  const hash = await hashPassword(body.newPassword);
  await db.update(schema.users).set({ passwordHash: hash }).where(eq(schema.users.id, userId));

  return Response.json({ ok: true });
};
