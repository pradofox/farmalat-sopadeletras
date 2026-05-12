export const prerender = false;

/**
 * GET /api/products/search?q=...&warehouseId=...
 * Busqueda rapida por barcode exacto o nombre fuzzy. Retorna stock.
 */
import type { APIRoute } from "astro";
import { getDb, schema } from "../../../lib/db";
import { and, eq, like, or, sql } from "drizzle-orm";

export const GET: APIRoute = async ({ url, locals }) => {
  const db = getDb();
  const tenantId = locals.tenantId;
  const q = (url.searchParams.get("q") ?? "").trim();
  const warehouseId = Number(url.searchParams.get("warehouseId") ?? 1);

  if (!q) return Response.json({ products: [] });

  // Primer intento: barcode exacto (camino rapido del escaner)
  const exact = await db
    .select({
      id: schema.products.id,
      name: schema.products.name,
      barcode: schema.products.barcode,
      publicPrice: schema.products.publicPrice,
      ivaPct: schema.products.ivaPct,
      requiresPrescription: schema.products.requiresPrescription,
      controlledGroup: schema.products.controlledGroup,
      stock: schema.inventory.quantity,
    })
    .from(schema.products)
    .leftJoin(
      schema.inventory,
      and(eq(schema.inventory.productId, schema.products.id), eq(schema.inventory.warehouseId, warehouseId)),
    )
    .where(and(eq(schema.products.tenantId, tenantId), eq(schema.products.barcode, q)))
    .limit(1);

  if (exact.length > 0) return Response.json({ products: exact, match: "barcode" });

  // Fuzzy por nombre o barcode parcial
  const fuzzy = await db
    .select({
      id: schema.products.id,
      name: schema.products.name,
      barcode: schema.products.barcode,
      publicPrice: schema.products.publicPrice,
      ivaPct: schema.products.ivaPct,
      requiresPrescription: schema.products.requiresPrescription,
      controlledGroup: schema.products.controlledGroup,
      stock: schema.inventory.quantity,
    })
    .from(schema.products)
    .leftJoin(
      schema.inventory,
      and(eq(schema.inventory.productId, schema.products.id), eq(schema.inventory.warehouseId, warehouseId)),
    )
    .where(
      and(
        eq(schema.products.tenantId, tenantId),
        or(like(schema.products.name, `%${q}%`), like(schema.products.barcode, `%${q}%`)),
      ),
    )
    .orderBy(schema.products.name)
    .limit(20);

  return Response.json({ products: fuzzy, match: "fuzzy" });
};
