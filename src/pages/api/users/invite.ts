export const prerender = false;
/**
 * POST /api/users/invite
 * Crea un nuevo usuario en el mismo tenant. Por simplicidad, el admin
 * define el password inicial y se lo comparte al cajero.
 */
import type { APIRoute } from "astro";
import { getDb, schema } from "../../../lib/db";
import { hashPassword, isValidEmail } from "../../../lib/auth";
import { eq } from "drizzle-orm";

interface Body {
  name: string;
  email: string;
  password: string;
  role?: "admin" | "manager" | "cashier";
  defaultWarehouseId?: number;
}

export const POST: APIRoute = async ({ request, locals }) => {
  const db = getDb();
  const tenantId = locals.tenantId;
  let body: Body;
  try { body = await request.json(); } catch { return Response.json({ ok: false, error: "JSON invalido" }, { status: 400 }); }

  if (!body.name || !body.email || !body.password) return Response.json({ ok: false, error: "Faltan datos" }, { status: 400 });
  if (!isValidEmail(body.email)) return Response.json({ ok: false, error: "Email invalido" }, { status: 400 });
  if (body.password.length < 8) return Response.json({ ok: false, error: "Password minimo 8 caracteres" }, { status: 400 });

  const email = body.email.trim().toLowerCase();
  const existing = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.email, email)).limit(1);
  if (existing.length > 0) return Response.json({ ok: false, error: "Ya existe un usuario con ese email" }, { status: 409 });

  const passwordHash = await hashPassword(body.password);
  const [row] = await db.insert(schema.users).values({
    tenantId,
    email,
    passwordHash,
    name: body.name.trim(),
    role: body.role ?? "cashier",
    defaultWarehouseId: body.defaultWarehouseId ?? null,
  }).returning();

  return Response.json({ ok: true, id: row.id });
};
