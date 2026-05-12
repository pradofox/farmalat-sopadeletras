export const prerender = false;
import type { APIRoute } from "astro";
import * as XLSX from "xlsx";
import { getDb, schema } from "../../../lib/db";
import { eq } from "drizzle-orm";

export const GET: APIRoute = async ({ locals }) => {
  const db = getDb();
  const tenantId = locals.tenantId;
  const rows = await db
    .select({
      name: schema.products.name,
      barcode: schema.products.barcode,
      department: schema.departments.name,
      cost: schema.products.cost,
      utilityPct: schema.products.utilityPct,
      publicPrice: schema.products.publicPrice,
      ivaPct: schema.products.ivaPct,
      controlledGroup: schema.products.controlledGroup,
      requiresPrescription: schema.products.requiresPrescription,
      activeIngredient: schema.products.activeIngredient,
      presentation: schema.products.presentation,
    })
    .from(schema.products)
    .leftJoin(schema.departments, eq(schema.products.departmentId, schema.departments.id))
    .where(eq(schema.products.tenantId, tenantId))
    .orderBy(schema.products.name);

  const sheet = XLSX.utils.json_to_sheet(rows.map((r) => ({
    Producto: r.name,
    "Código de barras": r.barcode ?? "",
    Departamento: r.department ?? "",
    Costo: r.cost,
    "Utilidad %": r.utilityPct,
    "Precio publico": r.publicPrice,
    "IVA %": r.ivaPct,
    "Grupo COFEPRIS": r.controlledGroup ?? "",
    "Requiere receta": r.requiresPrescription ? "Si" : "No",
    "Principio activo": r.activeIngredient ?? "",
    Presentacion: r.presentation ?? "",
  })));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, "Productos");
  const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });

  return new Response(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="farmalat-productos.xlsx"`,
    },
  });
};
