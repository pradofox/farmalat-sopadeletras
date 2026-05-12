export const prerender = false;

/**
 * POST /api/products/import
 * Body: multipart/form-data con campo "file" = XLSX o CSV.
 *
 * Detecta columnas por encabezado fuzzy:
 *   - Nombre / Descripcion / Producto -> name
 *   - Codigo de barras / Barcode / Codigo -> barcode
 *   - Costo / Precio compra -> cost
 *   - Precio / Precio publico / PVP -> publicPrice
 *   - IVA / IVA % -> ivaPct
 *   - Departamento / Categoria -> departmentName (se crea on-demand)
 *   - Grupo COFEPRIS -> controlledGroup
 *   - Presentacion -> presentation
 *
 * Resuelve departamento creando si no existe. Unidad de venta default "Pieza".
 */
import type { APIRoute } from "astro";
import * as XLSX from "xlsx";
import { getDb, schema } from "../../../lib/db";
import { and, eq } from "drizzle-orm";

type Row = Record<string, any>;

const headerMap: Record<string, string> = {
  // name
  "nombre": "name", "producto": "name", "descripcion": "name", "descripción": "name",
  // barcode
  "codigo": "barcode", "código": "barcode", "barcode": "barcode",
  "codigo de barras": "barcode", "código de barras": "barcode", "cod barras": "barcode",
  // cost
  "costo": "cost", "precio compra": "cost", "precio de compra": "cost",
  // public price
  "precio": "publicPrice", "precio publico": "publicPrice", "precio público": "publicPrice",
  "pvp": "publicPrice", "precio venta": "publicPrice", "precio al publico": "publicPrice",
  // iva
  "iva": "ivaPct", "iva %": "ivaPct", "iva porcentaje": "ivaPct",
  // department
  "departamento": "departmentName", "categoria": "departmentName", "categoría": "departmentName",
  // cofepris
  "cofepris": "controlledGroup", "grupo": "controlledGroup", "grupo cofepris": "controlledGroup",
  // presentation
  "presentacion": "presentation", "presentación": "presentation",
  // active ingredient
  "principio activo": "activeIngredient",
};

function normalizeHeader(h: string) {
  return String(h).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
}

function mapRow(raw: Row): Row {
  const out: Row = {};
  for (const key in raw) {
    const norm = normalizeHeader(key);
    const target = headerMap[norm];
    if (target) out[target] = raw[key];
  }
  return out;
}

export const POST: APIRoute = async ({ request, locals }) => {
  const db = getDb();
  const tenantId = locals.tenantId;

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return Response.json({ ok: false, error: "Falta archivo" }, { status: 400 });
  }
  const dryRun = form.get("dryRun") === "1";

  const buf = await file.arrayBuffer();
  let rows: Row[];
  try {
    const wb = XLSX.read(buf, { type: "array" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    rows = XLSX.utils.sheet_to_json<Row>(sheet, { raw: false, defval: "" });
  } catch (err) {
    return Response.json({ ok: false, error: "No se pudo leer el archivo. Usa XLSX, XLS o CSV." }, { status: 400 });
  }

  if (rows.length === 0) {
    return Response.json({ ok: false, error: "El archivo no tiene filas." }, { status: 400 });
  }

  const mapped = rows.map(mapRow);
  const errors: Array<{ row: number; reason: string }> = [];
  const valid: Row[] = [];
  mapped.forEach((r, i) => {
    if (!r.name) { errors.push({ row: i + 2, reason: "Sin nombre" }); return; }
    if (r.publicPrice == null || r.publicPrice === "") { errors.push({ row: i + 2, reason: "Sin precio" }); return; }
    const price = parseFloat(String(r.publicPrice));
    if (Number.isNaN(price)) { errors.push({ row: i + 2, reason: "Precio invalido" }); return; }
    valid.push({ ...r, publicPrice: price });
  });

  if (dryRun) {
    return Response.json({
      ok: true,
      preview: true,
      total: rows.length,
      valid: valid.length,
      errors: errors.slice(0, 10),
      sample: valid.slice(0, 5),
      columnsDetected: Array.from(new Set(mapped.flatMap((r) => Object.keys(r)))),
    });
  }

  // Resolver departamentos (crear los faltantes)
  const deptCache = new Map<string, number>();
  const existingDepts = await db.select().from(schema.departments).where(eq(schema.departments.tenantId, tenantId));
  for (const d of existingDepts) deptCache.set(d.name.toLowerCase(), d.id);

  // Unidad default "Pieza"
  const existingUnits = await db.select().from(schema.units).where(eq(schema.units.tenantId, tenantId));
  let pieceUnitId = existingUnits.find((u) => u.name.toLowerCase() === "pieza")?.id;
  if (!pieceUnitId) {
    const [u] = await db.insert(schema.units).values({ tenantId, name: "Pieza", abbreviation: "pz" }).returning();
    pieceUnitId = u.id;
  }

  let inserted = 0;
  let skipped = 0;
  for (const r of valid) {
    let deptId: number | null = null;
    if (r.departmentName) {
      const key = String(r.departmentName).trim().toLowerCase();
      if (deptCache.has(key)) {
        deptId = deptCache.get(key)!;
      } else {
        try {
          const [d] = await db.insert(schema.departments).values({ tenantId, name: String(r.departmentName).trim() }).returning();
          deptCache.set(key, d.id); deptId = d.id;
        } catch { /* duplicate */ }
      }
    }

    const cost = parseFloat(String(r.cost ?? 0)) || 0;
    const price = parseFloat(String(r.publicPrice)) || 0;
    const ivaPct = parseFloat(String(r.ivaPct ?? 0)) || 0;
    const cg = ["I", "II", "III", "IV", "V"].includes(String(r.controlledGroup)) ? String(r.controlledGroup) : null;

    // Si hay barcode y ya existe ese producto en este tenant, saltar
    if (r.barcode) {
      const existing = await db.select({ id: schema.products.id })
        .from(schema.products)
        .where(and(eq(schema.products.tenantId, tenantId), eq(schema.products.barcode, String(r.barcode).trim())))
        .limit(1);
      if (existing[0]) { skipped++; continue; }
    }

    try {
      await db.insert(schema.products).values({
        tenantId,
        name: String(r.name).trim(),
        barcode: r.barcode ? String(r.barcode).trim() : null,
        departmentId: deptId,
        saleUnitId: pieceUnitId,
        cost,
        utilityPct: cost > 0 && price > 0 ? Number((((price - cost) / cost) * 100).toFixed(2)) : 0,
        publicPrice: price,
        ivaPct,
        controlledGroup: cg as any,
        requiresPrescription: !!cg,
        retainsPrescription: cg === "II",
        isAntibiotic: cg === "IV",
        activeIngredient: r.activeIngredient ? String(r.activeIngredient).trim() : null,
        presentation: r.presentation ? String(r.presentation).trim() : null,
      });
      inserted++;
    } catch (err) {
      errors.push({ row: -1, reason: `Error insertando ${r.name}: ${String(err instanceof Error ? err.message : err)}` });
    }
  }

  return Response.json({ ok: true, inserted, skipped, errors: errors.slice(0, 20) });
};
