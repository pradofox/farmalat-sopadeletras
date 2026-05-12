export const prerender = false;

/**
 * POST /api/auth/signup
 * Crea: tenant + sucursal "Matriz" + usuario owner + departamentos base + unidades base.
 * Inicia sesion automatica.
 */
import type { APIRoute } from "astro";
import { getDb, schema } from "../../../lib/db";
import { hashPassword, isValidEmail } from "../../../lib/auth";
import { createSession, buildCookie } from "../../../lib/session";
import { eq } from "drizzle-orm";

interface Body {
  pharmacyName?: string;
  slug?: string;
  yourName?: string;
  email?: string;
  password?: string;
  phone?: string;
  rfc?: string;
  regimenFiscal?: string;
}

function makeSlug(input: string): string {
  return input.toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || `farmacia-${Date.now()}`;
}

export const POST: APIRoute = async ({ request }) => {
  const db = getDb();

  let body: Body;
  try { body = await request.json(); } catch { return Response.json({ ok: false, error: "JSON invalido" }, { status: 400 }); }

  const pharmacyName = body.pharmacyName?.trim();
  const yourName = body.yourName?.trim();
  const email = body.email?.trim().toLowerCase();
  const password = body.password ?? "";
  if (!pharmacyName || !yourName || !email || !password) {
    return Response.json({ ok: false, error: "Todos los campos son obligatorios" }, { status: 400 });
  }
  if (!isValidEmail(email)) {
    return Response.json({ ok: false, error: "Email invalido" }, { status: 400 });
  }
  if (password.length < 8) {
    return Response.json({ ok: false, error: "Contraseña minimo 8 caracteres" }, { status: 400 });
  }

  // Verificar que no exista usuario con este email
  const existing = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.email, email)).limit(1);
  if (existing.length > 0) {
    return Response.json({ ok: false, error: "Ya existe una cuenta con este email" }, { status: 409 });
  }

  // Resolver slug unico
  let slug = body.slug?.trim() || makeSlug(pharmacyName);
  for (let i = 0; i < 5; i++) {
    const taken = await db.select({ id: schema.tenants.id }).from(schema.tenants).where(eq(schema.tenants.slug, slug)).limit(1);
    if (taken.length === 0) break;
    slug = `${makeSlug(pharmacyName)}-${Math.random().toString(36).slice(2, 6)}`;
  }

  try {
    const [tenant] = await db.insert(schema.tenants).values({
      slug,
      name: pharmacyName,
      rfc: body.rfc ?? null,
      regimenFiscal: body.regimenFiscal ?? "626",
      email,
      phone: body.phone ?? null,
      status: "trial",
      trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    }).returning();

    const [warehouse] = await db.insert(schema.warehouses).values({
      tenantId: tenant.id,
      name: "Matriz",
      ticketLine1: pharmacyName,
      allowsTransfers: false,
    }).returning();

    const passwordHash = await hashPassword(password);
    const [user] = await db.insert(schema.users).values({
      tenantId: tenant.id,
      email,
      passwordHash,
      name: yourName,
      role: "owner",
      defaultWarehouseId: warehouse.id,
    }).returning();

    // Catalogos base
    await db.insert(schema.departments).values([
      { tenantId: tenant.id, name: "Farmacia" },
      { tenantId: tenant.id, name: "Antibioticos" },
      { tenantId: tenant.id, name: "Higiene y belleza" },
      { tenantId: tenant.id, name: "Consumo" },
    ]);
    await db.insert(schema.units).values([
      { tenantId: tenant.id, name: "Pieza", abbreviation: "pz" },
      { tenantId: tenant.id, name: "Caja", abbreviation: "cj" },
      { tenantId: tenant.id, name: "Frasco", abbreviation: "fco" },
    ]);
    await db.insert(schema.customers).values({
      tenantId: tenant.id,
      name: "PUBLICO EN GENERAL",
      rfc: "XAXX010101000",
      taxRegime: "616",
      cfdiUse: "S01",
    });

    const token = await createSession({
      userId: user.id,
      tenantId: tenant.id,
      email: user.email,
      name: user.name,
    });

    return new Response(JSON.stringify({ ok: true, tenantSlug: slug }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Set-Cookie": buildCookie(token) },
    });
  } catch (err) {
    return Response.json({ ok: false, error: String(err instanceof Error ? err.message : err) }, { status: 500 });
  }
};
