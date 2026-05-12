export const prerender = false;

import type { APIRoute } from "astro";
import { getDb, schema } from "../../lib/db";
import { and, eq } from "drizzle-orm";

interface ProductBody {
  id?: number;
  name: string;
  barcode?: string;
  publicPrice: number;
  cost?: number;
  utilityPct?: number;
  ivaPct?: number;
  commissionPct?: number;
  departmentId?: number;
  saleUnitId?: number;
  isDrug?: boolean;
  isAntibiotic?: boolean;
  isGeneric?: boolean;
  controlledGroup?: "I" | "II" | "III" | "IV" | "V" | null;
  requiresPrescription?: boolean;
  retainsPrescription?: boolean;
  activeIngredient?: string;
  presentation?: string;
  description?: string;
}

export const POST: APIRoute = async ({ request, locals }) => {
  const db = getDb();
  const tenantId = locals.tenantId;

  let body: ProductBody;
  try { body = await request.json(); } catch { return Response.json({ ok: false, error: "JSON invalido" }, { status: 400 }); }

  if (!body.name || typeof body.publicPrice !== "number") {
    return Response.json({ ok: false, error: "Nombre y precio son obligatorios" }, { status: 400 });
  }

  try {
    if (body.id) {
      await db.update(schema.products)
        .set({
          name: body.name,
          barcode: body.barcode || null,
          publicPrice: body.publicPrice,
          cost: body.cost ?? 0,
          utilityPct: body.utilityPct ?? 0,
          ivaPct: body.ivaPct ?? 0,
          commissionPct: body.commissionPct ?? 0,
          departmentId: body.departmentId ?? null,
          saleUnitId: body.saleUnitId ?? null,
          isDrug: body.isDrug ?? false,
          isAntibiotic: body.isAntibiotic ?? false,
          isGeneric: body.isGeneric ?? false,
          controlledGroup: body.controlledGroup ?? null,
          requiresPrescription: body.requiresPrescription ?? false,
          retainsPrescription: body.retainsPrescription ?? false,
          activeIngredient: body.activeIngredient || null,
          presentation: body.presentation || null,
          description: body.description || null,
          updatedAt: new Date(),
        })
        .where(and(eq(schema.products.id, body.id), eq(schema.products.tenantId, tenantId)));
      return Response.json({ ok: true, id: body.id });
    }

    const [row] = await db.insert(schema.products).values({
      tenantId,
      name: body.name,
      barcode: body.barcode || null,
      publicPrice: body.publicPrice,
      cost: body.cost ?? 0,
      utilityPct: body.utilityPct ?? 0,
      ivaPct: body.ivaPct ?? 0,
      commissionPct: body.commissionPct ?? 0,
      departmentId: body.departmentId ?? null,
      saleUnitId: body.saleUnitId ?? null,
      isDrug: body.isDrug ?? false,
      isAntibiotic: body.isAntibiotic ?? false,
      isGeneric: body.isGeneric ?? false,
      controlledGroup: body.controlledGroup ?? null,
      requiresPrescription: body.requiresPrescription ?? false,
      retainsPrescription: body.retainsPrescription ?? false,
      activeIngredient: body.activeIngredient || null,
      presentation: body.presentation || null,
      description: body.description || null,
    }).returning();

    return Response.json({ ok: true, id: row.id });
  } catch (err) {
    return Response.json({ ok: false, error: String(err instanceof Error ? err.message : err) }, { status: 500 });
  }
};
