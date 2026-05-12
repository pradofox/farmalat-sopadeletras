/**
 * Seed de Farmacia Alfa con datos minimos para piloto.
 * Idempotente: si ya existe el tenant slug, no duplica.
 */
import type { DB } from "./db";
import { schema } from "./db";
import { hashPassword } from "./auth";
import { eq } from "drizzle-orm";

const TENANT_SLUG = "alfa";
const DEMO_PASSWORD = "lili2026";

export async function seed(db: DB) {
  // 1) Tenant
  const existing = await db.select().from(schema.tenants).where(eq(schema.tenants.slug, TENANT_SLUG)).limit(1);
  if (existing.length > 0) {
    return { ok: true, message: "Ya seedeado", tenantId: existing[0].id };
  }

  const [tenant] = await db.insert(schema.tenants).values({
    slug: TENANT_SLUG,
    name: "Farmacia Alfa",
    rfc: "AAA010101AAA",
    regimenFiscal: "626",
    email: "administracion@laatec.com",
    phone: "+528118023213",
    status: "trial",
  }).returning();

  // 2) Warehouse (sucursal Matriz)
  const [warehouse] = await db.insert(schema.warehouses).values({
    tenantId: tenant.id,
    name: "Matriz",
    ticketLine1: "Farmacia Alfa Matriz",
    ticketLine2: "Av. Topo Chico 590-2F, Anáhuac",
    ticketLine3: "San Nicolás de los Garza, N.L. · Tel: 81 1802 3213",
    allowsTransfers: true,
  }).returning();

  // 3) Usuario admin (Lili)
  const passwordHash = await hashPassword(DEMO_PASSWORD);
  await db.insert(schema.users).values({
    tenantId: tenant.id,
    email: "lilian@farmacia-alfa.mx",
    passwordHash,
    name: "Lilian Balderas",
    role: "owner",
    defaultWarehouseId: warehouse.id,
  });

  // 4) Departamentos
  const deptRows = await db.insert(schema.departments).values([
    { tenantId: tenant.id, name: "Farmacia" },
    { tenantId: tenant.id, name: "Antibioticos" },
    { tenantId: tenant.id, name: "Higiene y belleza" },
    { tenantId: tenant.id, name: "Consumo" },
  ]).returning();
  const deptFarmacia = deptRows[0].id;
  const deptAntibioticos = deptRows[1].id;
  const deptHigiene = deptRows[2].id;
  const deptConsumo = deptRows[3].id;

  // 5) Unidades
  const unitRows = await db.insert(schema.units).values([
    { tenantId: tenant.id, name: "Pieza", abbreviation: "pz" },
    { tenantId: tenant.id, name: "Caja", abbreviation: "cj" },
    { tenantId: tenant.id, name: "Frasco", abbreviation: "fco" },
    { tenantId: tenant.id, name: "Tubo", abbreviation: "tb" },
  ]).returning();
  const unitPieza = unitRows[0].id;

  // 6) Cliente Publico en General (genérico CFDI)
  await db.insert(schema.customers).values({
    tenantId: tenant.id,
    name: "PUBLICO EN GENERAL",
    rfc: "XAXX010101000",
    taxRegime: "616",
    cfdiUse: "S01",
  });

  // 7) Medico demo
  await db.insert(schema.doctors).values({
    tenantId: tenant.id,
    cedula: "1234567",
    fullName: "Dra. Ana López",
    specialty: "Medicina general",
    commissionPct: 5,
  });

  // 7b) Proveedores demo
  await db.insert(schema.suppliers).values([
    { tenantId: tenant.id, name: "Casa Saba", contactName: "Atención clientes", email: "ventas@casasaba.com.mx", phone: "55-5267-8800", paymentTerms: "Crédito 30 días" },
    { tenantId: tenant.id, name: "Nadro",      contactName: "Atención clientes", email: "ventas@nadro.com.mx",   phone: "55-1500-2300", paymentTerms: "Crédito 30 días" },
    { tenantId: tenant.id, name: "Marzam",     contactName: "Atención clientes", email: "contacto@marzam.com.mx",phone: "55-5448-3000", paymentTerms: "Crédito 15 días" },
  ]);

  // 8) Productos demo (20 medicamentos comunes + algunos no medicamentos)
  const products: Array<typeof schema.products.$inferInsert> = [
    // Farmacia general (IVA 0% medicinas de patente)
    { tenantId: tenant.id, name: "PARACETAMOL 750MG C/10 TABS",       barcode: "7502209851078", departmentId: deptFarmacia,    saleUnitId: unitPieza, cost: 8.40,   utilityPct: 30, publicPrice: 18.00,  ivaPct: 0,  isDrug: true, isGeneric: true, presentation: "Tabletas 750mg" },
    { tenantId: tenant.id, name: "IBUPROFENO 400MG C/10 TABS",        barcode: "7501349025500", departmentId: deptFarmacia,    saleUnitId: unitPieza, cost: 12.00,  utilityPct: 35, publicPrice: 26.00,  ivaPct: 0,  isDrug: true, isGeneric: true, presentation: "Tabletas 400mg" },
    { tenantId: tenant.id, name: "LORATADINA 10MG C/20 TABS",         barcode: "7501349027060", departmentId: deptFarmacia,    saleUnitId: unitPieza, cost: 18.00,  utilityPct: 40, publicPrice: 36.00,  ivaPct: 0,  isDrug: true, isGeneric: true, presentation: "Tabletas 10mg" },
    { tenantId: tenant.id, name: "OMEPRAZOL 20MG C/14 CAP",           barcode: "7501006030051", departmentId: deptFarmacia,    saleUnitId: unitPieza, cost: 34.00,  utilityPct: 38, publicPrice: 68.00,  ivaPct: 0,  isDrug: true, isGeneric: true, presentation: "Cápsulas 20mg" },
    { tenantId: tenant.id, name: "DOLO-NEUROBION FORTE C/30 GRAGEAS", barcode: "7501349020005", departmentId: deptFarmacia,    saleUnitId: unitPieza, cost: 240.00, utilityPct: 35, publicPrice: 360.50, ivaPct: 0,  isDrug: true,                       presentation: "Grageas" },
    { tenantId: tenant.id, name: "METFORMINA 850MG C/30 TABS",        barcode: "7501349042503", departmentId: deptFarmacia,    saleUnitId: unitPieza, cost: 22.00,  utilityPct: 36, publicPrice: 45.00,  ivaPct: 0,  isDrug: true, isGeneric: true, presentation: "Tabletas 850mg" },
    { tenantId: tenant.id, name: "ATORVASTATINA 20MG C/14 TABS",      barcode: "7501349044002", departmentId: deptFarmacia,    saleUnitId: unitPieza, cost: 65.00,  utilityPct: 38, publicPrice: 119.00, ivaPct: 0,  isDrug: true, isGeneric: true, presentation: "Tabletas 20mg" },
    { tenantId: tenant.id, name: "SALBUTAMOL INHALADOR 100MCG",       barcode: "7501349050010", departmentId: deptFarmacia,    saleUnitId: unitPieza, cost: 95.00,  utilityPct: 35, publicPrice: 165.00, ivaPct: 0,  isDrug: true,                       presentation: "Inhalador" },
    { tenantId: tenant.id, name: "BUTILHIOSCINA 10MG C/20 TABS",      barcode: "7501349011104", departmentId: deptFarmacia,    saleUnitId: unitPieza, cost: 18.50,  utilityPct: 35, publicPrice: 38.00,  ivaPct: 0,  isDrug: true, isGeneric: true, presentation: "Tabletas 10mg" },
    { tenantId: tenant.id, name: "DICLOFENACO 100MG C/20 TABS",       barcode: "7501349020203", departmentId: deptFarmacia,    saleUnitId: unitPieza, cost: 22.00,  utilityPct: 38, publicPrice: 45.00,  ivaPct: 0,  isDrug: true, isGeneric: true, presentation: "Tabletas 100mg" },

    // Antibioticos (Grupo IV: requieren receta)
    { tenantId: tenant.id, name: "AMOXICILINA 875MG C/10 TABS",       barcode: "7501349026230", departmentId: deptAntibioticos, saleUnitId: unitPieza, cost: 38.93,  utilityPct: 36, publicPrice: 92.00,  ivaPct: 0,  isDrug: true, isAntibiotic: true, controlledGroup: "IV", requiresPrescription: true, activeIngredient: "amoxicilina con acido clavulanico", presentation: "Tabletas 875mg" },
    { tenantId: tenant.id, name: "AZITROMICINA 500MG C/3 TABS",       barcode: "7501349038002", departmentId: deptAntibioticos, saleUnitId: unitPieza, cost: 95.00,  utilityPct: 36, publicPrice: 175.00, ivaPct: 0,  isDrug: true, isAntibiotic: true, controlledGroup: "IV", requiresPrescription: true, activeIngredient: "azitromicina", presentation: "Tabletas 500mg" },
    { tenantId: tenant.id, name: "CIPROFLOXACINO 500MG C/14 TABS",    barcode: "7501349040005", departmentId: deptAntibioticos, saleUnitId: unitPieza, cost: 78.00,  utilityPct: 38, publicPrice: 142.00, ivaPct: 0,  isDrug: true, isAntibiotic: true, controlledGroup: "IV", requiresPrescription: true, activeIngredient: "ciprofloxacino", presentation: "Tabletas 500mg" },

    // Psicotropico Grupo III (ejemplo, requiere receta surtible)
    { tenantId: tenant.id, name: "CLONAZEPAM 2MG C/30 TABS",          barcode: "7501349060011", departmentId: deptFarmacia, saleUnitId: unitPieza, cost: 85.00,  utilityPct: 40, publicPrice: 165.00, ivaPct: 0,  isDrug: true, controlledGroup: "III", requiresPrescription: true, retainsPrescription: false, tracksBatch: true, activeIngredient: "clonazepam", presentation: "Tabletas 2mg" },

    // Higiene (IVA 16%)
    { tenantId: tenant.id, name: "ALCOHOL EN GEL 250ML",              barcode: "7501008080015", departmentId: deptHigiene, saleUnitId: unitPieza, cost: 28.00, utilityPct: 45, publicPrice: 58.00, ivaPct: 16, presentation: "Botella 250ml" },
    { tenantId: tenant.id, name: "CUBREBOCA 3 PLIEGUES C/50",         barcode: "2829300000000", departmentId: deptHigiene, saleUnitId: unitPieza, cost: 8.63,  utilityPct: 30, publicPrice: 15.00, ivaPct: 16, presentation: "Caja 50pz" },
    { tenantId: tenant.id, name: "CURITAS C/30",                      barcode: "7501008090012", departmentId: deptHigiene, saleUnitId: unitPieza, cost: 22.00, utilityPct: 45, publicPrice: 45.00, ivaPct: 16, presentation: "Caja 30pz" },
    { tenantId: tenant.id, name: "ALGODON PLISADO 50G",               barcode: "7596840761520", departmentId: deptHigiene, saleUnitId: unitPieza, cost: 9.49,  utilityPct: 40, publicPrice: 18.00, ivaPct: 16, presentation: "Bolsa 50g" },

    // Consumo
    { tenantId: tenant.id, name: "AGUA EMBOTELLADA 600ML",            barcode: "7501055302505", departmentId: deptConsumo, saleUnitId: unitPieza, cost: 5.50,  utilityPct: 60, publicPrice: 14.00, ivaPct: 0, presentation: "Botella 600ml" },
    { tenantId: tenant.id, name: "PAÑUELOS DESECHABLES C/100",        barcode: "7501008090050", departmentId: deptConsumo, saleUnitId: unitPieza, cost: 18.00, utilityPct: 45, publicPrice: 36.00, ivaPct: 16, presentation: "Caja 100pz" },
  ];

  // D1 tiene limite ~100 SQL bind vars por query; insertar uno por uno
  const insertedProducts = [];
  for (const p of products) {
    const [row] = await db.insert(schema.products).values(p).returning();
    insertedProducts.push(row);
  }

  // 9) Inventario inicial: stock para cada producto en Matriz
  const stocks = [25, 30, 40, 18, 12, 22, 14, 8, 35, 28, 15, 10, 12, 6, 50, 200, 80, 60, 120, 40];
  for (let i = 0; i < insertedProducts.length; i++) {
    const p = insertedProducts[i];
    await db.insert(schema.inventory).values({
      tenantId: tenant.id,
      warehouseId: warehouse.id,
      productId: p.id,
      quantity: stocks[i] ?? 20,
      minQuantity: 10,
      maxQuantity: 100,
      lastCost: p.cost,
    });
  }

  return {
    ok: true,
    message: "Seed completado",
    tenantId: tenant.id,
    products: insertedProducts.length,
    credentials: { email: "lilian@farmacia-alfa.mx", password: DEMO_PASSWORD },
  };
}
