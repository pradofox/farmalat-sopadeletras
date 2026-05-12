/**
 * Seed RICO de Farmacia Alfa para demo persistente.
 * Carga catalogo extenso, 4 medicos, 2 sucursales, ordenes a proveedor,
 * cuentas-paciente, recetas y ~30 ventas distribuidas en los ultimos 7 dias.
 *
 * Idempotente: si ya existe el slug "alfa" no duplica. Para regenerar limpio,
 * llamar a wipeAll() primero.
 */
import type { DB } from "./db";
import { schema } from "./db";
import { hashPassword } from "./auth";
import { eq, and, sql } from "drizzle-orm";

const TENANT_SLUG = "alfa";
const DEMO_PASSWORD = "lili2026";

export async function wipeAll(db: DB) {
  // Orden inverso de FKs
  const tables = [
    "patient_account_items", "patient_accounts", "patients",
    "inventory_movements", "prescriptions", "product_lots",
    "transfer_items", "transfers",
    "supplier_order_items", "supplier_orders", "suppliers",
    "audit_log", "payments", "sale_items", "sales",
    "doctors", "customers",
    "inventory", "products",
    "units", "departments",
    "users", "warehouses", "tenants",
  ];
  for (const t of tables) {
    try { await db.run(sql.raw(`DELETE FROM ${t}`)); } catch {}
  }
}

interface ProductSpec {
  barcode: string;
  name: string;
  dept: string;
  cost: number;
  utility: number;
  iva: number;
  controlledGroup?: "I" | "II" | "III" | "IV" | "V";
  requiresPrescription?: boolean;
  retainsPrescription?: boolean;
  isAntibiotic?: boolean;
  isDrug?: boolean;
  isGeneric?: boolean;
  tracksBatch?: boolean;
  activeIngredient?: string;
  presentation?: string;
  commission?: number;
  manufacturer?: string;
}

const PRODUCTS: ProductSpec[] = [
  // ============ MEDICAMENTOS FARMACIA GENERAL (IVA 0%) ============
  { barcode: "7502209851078", name: "PARACETAMOL 750MG C/10 TABS",        dept: "Farmacia",     cost: 8.40,   utility: 50, iva: 0, isDrug: true, isGeneric: true,  activeIngredient: "paracetamol",       presentation: "Caja con 10 tabletas",  commission: 5,  manufacturer: "Genomma Lab" },
  { barcode: "7501349025500", name: "IBUPROFENO 400MG C/10 TABS",         dept: "Farmacia",     cost: 12.00,  utility: 55, iva: 0, isDrug: true, isGeneric: true,  activeIngredient: "ibuprofeno",        presentation: "Caja con 10 tabletas",  commission: 5,  manufacturer: "Pfizer" },
  { barcode: "7501349027060", name: "LORATADINA 10MG C/20 TABS",          dept: "Farmacia",     cost: 18.00,  utility: 60, iva: 0, isDrug: true, isGeneric: true,  activeIngredient: "loratadina",        presentation: "Caja con 20 tabletas",  commission: 5,  manufacturer: "Bayer" },
  { barcode: "7501006030051", name: "OMEPRAZOL 20MG C/14 CAP",            dept: "Farmacia",     cost: 34.00,  utility: 50, iva: 0, isDrug: true, isGeneric: true,  activeIngredient: "omeprazol",         presentation: "Caja con 14 capsulas",  commission: 5,  manufacturer: "Sanofi" },
  { barcode: "7501349020005", name: "DOLO-NEUROBION FORTE C/30 GRAGEAS",  dept: "Farmacia",     cost: 240.00, utility: 50, iva: 0, isDrug: true,                    activeIngredient: "diclofenaco + tiamina + piridoxina + cianocobalamina", presentation: "Caja con 30 grageas", commission: 8, manufacturer: "P&G" },
  { barcode: "7501349042503", name: "METFORMINA 850MG C/30 TABS",         dept: "Farmacia",     cost: 22.00,  utility: 50, iva: 0, isDrug: true, isGeneric: true,  activeIngredient: "metformina",        presentation: "Caja con 30 tabletas",  commission: 5,  manufacturer: "Silanes" },
  { barcode: "7501349044002", name: "ATORVASTATINA 20MG C/14 TABS",       dept: "Farmacia",     cost: 65.00,  utility: 55, iva: 0, isDrug: true, isGeneric: true,  activeIngredient: "atorvastatina",     presentation: "Caja con 14 tabletas",  commission: 5,  manufacturer: "Pfizer" },
  { barcode: "7501349050010", name: "SALBUTAMOL INHALADOR 100MCG",        dept: "Farmacia",     cost: 95.00,  utility: 50, iva: 0, isDrug: true,                    activeIngredient: "salbutamol",        presentation: "Inhalador 200 dosis",   commission: 8,  manufacturer: "GSK" },
  { barcode: "7501349011104", name: "BUTILHIOSCINA 10MG C/20 TABS",       dept: "Farmacia",     cost: 18.50,  utility: 55, iva: 0, isDrug: true, isGeneric: true,  activeIngredient: "butilhioscina",     presentation: "Caja con 20 tabletas",  commission: 5,  manufacturer: "Boehringer" },
  { barcode: "7501349020203", name: "DICLOFENACO 100MG C/20 TABS",        dept: "Farmacia",     cost: 22.00,  utility: 55, iva: 0, isDrug: true, isGeneric: true,  activeIngredient: "diclofenaco",       presentation: "Caja con 20 tabletas",  commission: 5,  manufacturer: "Novartis" },
  { barcode: "7501349030104", name: "NAPROXENO 500MG C/20 TABS",          dept: "Farmacia",     cost: 26.00,  utility: 55, iva: 0, isDrug: true, isGeneric: true,  activeIngredient: "naproxeno",         presentation: "Caja con 20 tabletas",  commission: 5,  manufacturer: "Bayer" },
  { barcode: "7501349040118", name: "CAPTOPRIL 25MG C/30 TABS",           dept: "Farmacia",     cost: 28.00,  utility: 50, iva: 0, isDrug: true, isGeneric: true,  activeIngredient: "captopril",         presentation: "Caja con 30 tabletas",  commission: 6,  manufacturer: "Squibb" },
  { barcode: "7501349040125", name: "LOSARTAN 50MG C/30 TABS",            dept: "Farmacia",     cost: 42.00,  utility: 55, iva: 0, isDrug: true, isGeneric: true,  activeIngredient: "losartan",          presentation: "Caja con 30 tabletas",  commission: 6,  manufacturer: "MSD" },
  { barcode: "7501349040132", name: "GLIBENCLAMIDA 5MG C/50 TABS",        dept: "Farmacia",     cost: 22.00,  utility: 50, iva: 0, isDrug: true, isGeneric: true,  activeIngredient: "glibenclamida",     presentation: "Caja con 50 tabletas",  commission: 5,  manufacturer: "Sanofi" },
  { barcode: "7501349040149", name: "FUROSEMIDA 40MG C/20 TABS",          dept: "Farmacia",     cost: 18.00,  utility: 50, iva: 0, isDrug: true, isGeneric: true,  activeIngredient: "furosemida",        presentation: "Caja con 20 tabletas",  commission: 5,  manufacturer: "Sanofi" },
  { barcode: "7501349040156", name: "CETIRIZINA 10MG C/10 TABS",          dept: "Farmacia",     cost: 24.00,  utility: 55, iva: 0, isDrug: true, isGeneric: true,  activeIngredient: "cetirizina",        presentation: "Caja con 10 tabletas",  commission: 5,  manufacturer: "UCB" },
  { barcode: "7501349040163", name: "AMBROXOL JARABE 120ML",              dept: "Farmacia",     cost: 38.00,  utility: 50, iva: 0, isDrug: true,                    activeIngredient: "ambroxol",          presentation: "Frasco 120ml",          commission: 6,  manufacturer: "Boehringer" },
  { barcode: "7501349040170", name: "FLUCONAZOL 150MG C/1 CAP",           dept: "Farmacia",     cost: 32.00,  utility: 55, iva: 0, isDrug: true, isGeneric: true,  activeIngredient: "fluconazol",        presentation: "Capsula unica",         commission: 7,  manufacturer: "Pfizer" },

  // ============ ANTIBIOTICOS Grupo IV ============
  { barcode: "7501349026230", name: "AMOXICILINA 875MG C/10 TABS",        dept: "Antibioticos", cost: 38.93,  utility: 50, iva: 0, isDrug: true, isAntibiotic: true, isGeneric: true, controlledGroup: "IV", requiresPrescription: true, activeIngredient: "amoxicilina con acido clavulanico", presentation: "Caja con 10 tabletas", commission: 10, manufacturer: "GSK" },
  { barcode: "7501349038002", name: "AZITROMICINA 500MG C/3 TABS",        dept: "Antibioticos", cost: 95.00,  utility: 50, iva: 0, isDrug: true, isAntibiotic: true, controlledGroup: "IV", requiresPrescription: true, activeIngredient: "azitromicina", presentation: "Caja con 3 tabletas", commission: 10, manufacturer: "Pfizer" },
  { barcode: "7501349040005", name: "CIPROFLOXACINO 500MG C/14 TABS",     dept: "Antibioticos", cost: 78.00,  utility: 55, iva: 0, isDrug: true, isAntibiotic: true, isGeneric: true, controlledGroup: "IV", requiresPrescription: true, activeIngredient: "ciprofloxacino", presentation: "Caja con 14 tabletas", commission: 10, manufacturer: "Bayer" },
  { barcode: "7501349040012", name: "LEVOFLOXACINO 500MG C/7 TABS",       dept: "Antibioticos", cost: 145.00, utility: 50, iva: 0, isDrug: true, isAntibiotic: true, controlledGroup: "IV", requiresPrescription: true, activeIngredient: "levofloxacino", presentation: "Caja con 7 tabletas", commission: 12, manufacturer: "Sanofi" },
  { barcode: "7501349040029", name: "CEFALEXINA 500MG C/20 CAP",          dept: "Antibioticos", cost: 88.00,  utility: 50, iva: 0, isDrug: true, isAntibiotic: true, isGeneric: true, controlledGroup: "IV", requiresPrescription: true, activeIngredient: "cefalexina", presentation: "Caja con 20 capsulas", commission: 10, manufacturer: "Lilly" },
  { barcode: "7501349040036", name: "DOXICICLINA 100MG C/10 CAP",         dept: "Antibioticos", cost: 56.00,  utility: 55, iva: 0, isDrug: true, isAntibiotic: true, isGeneric: true, controlledGroup: "IV", requiresPrescription: true, activeIngredient: "doxiciclina", presentation: "Caja con 10 capsulas", commission: 10, manufacturer: "Pfizer" },

  // ============ PSICOTROPICOS Grupo III (receta surtible 3 veces / 6 meses) ============
  { barcode: "7501349060011", name: "CLONAZEPAM 2MG C/30 TABS",           dept: "Farmacia",     cost: 85.00,  utility: 55, iva: 0, isDrug: true, controlledGroup: "III", requiresPrescription: true, tracksBatch: true, activeIngredient: "clonazepam", presentation: "Caja con 30 tabletas", commission: 12, manufacturer: "Roche" },
  { barcode: "7501349060028", name: "ALPRAZOLAM 0.5MG C/30 TABS",         dept: "Farmacia",     cost: 92.00,  utility: 55, iva: 0, isDrug: true, controlledGroup: "III", requiresPrescription: true, tracksBatch: true, activeIngredient: "alprazolam", presentation: "Caja con 30 tabletas", commission: 12, manufacturer: "Pfizer" },
  { barcode: "7501349060035", name: "DIAZEPAM 10MG C/30 TABS",            dept: "Farmacia",     cost: 78.00,  utility: 55, iva: 0, isDrug: true, controlledGroup: "III", requiresPrescription: true, tracksBatch: true, activeIngredient: "diazepam", presentation: "Caja con 30 tabletas", commission: 12, manufacturer: "Roche" },

  // ============ PSICOTROPICOS Grupo II (receta retenida) ============
  { barcode: "7501349060042", name: "TRAMADOL 50MG C/20 CAP",             dept: "Farmacia",     cost: 145.00, utility: 50, iva: 0, isDrug: true, controlledGroup: "II", requiresPrescription: true, retainsPrescription: true, tracksBatch: true, activeIngredient: "tramadol", presentation: "Caja con 20 capsulas", commission: 15, manufacturer: "Grunenthal" },
  { barcode: "7501349060059", name: "BUPRENORFINA 0.2MG SUBLINGUAL C/30", dept: "Farmacia",     cost: 480.00, utility: 50, iva: 0, isDrug: true, controlledGroup: "II", requiresPrescription: true, retainsPrescription: true, tracksBatch: true, activeIngredient: "buprenorfina", presentation: "Caja con 30 sublinguales", commission: 18, manufacturer: "Indivior" },

  // ============ HIGIENE Y BELLEZA (IVA 16%) ============
  { barcode: "7501008080015", name: "ALCOHOL EN GEL 250ML",               dept: "Higiene",      cost: 28.00, utility: 70, iva: 16, presentation: "Botella 250ml" },
  { barcode: "2829300000000", name: "CUBREBOCA 3 PLIEGUES C/50",          dept: "Higiene",      cost: 8.63,  utility: 50, iva: 16, presentation: "Caja con 50 piezas" },
  { barcode: "7501008090012", name: "CURITAS C/30",                       dept: "Higiene",      cost: 22.00, utility: 70, iva: 16, presentation: "Caja con 30 curitas" },
  { barcode: "7596840761520", name: "ALGODON PLISADO 50G",                dept: "Higiene",      cost: 9.49,  utility: 60, iva: 16, presentation: "Bolsa 50g" },
  { barcode: "7501008080022", name: "AGUA OXIGENADA 480ML",               dept: "Higiene",      cost: 14.00, utility: 65, iva: 16, presentation: "Botella 480ml" },
  { barcode: "7501008080039", name: "GASAS ESTERILES 10X10 C/50",         dept: "Higiene",      cost: 35.00, utility: 60, iva: 16, presentation: "Caja con 50 gasas" },
  { barcode: "7501008080046", name: "ISODINE ESPUMA 120ML",               dept: "Higiene",      cost: 68.00, utility: 50, iva: 16, presentation: "Frasco 120ml" },
  { barcode: "7501008080053", name: "JABON ANTIBACTERIAL 250ML",          dept: "Higiene",      cost: 22.00, utility: 60, iva: 16, presentation: "Botella 250ml" },
  { barcode: "7501008080060", name: "SHAMPOO ANTICASPA 400ML",            dept: "Higiene",      cost: 58.00, utility: 65, iva: 16, presentation: "Botella 400ml" },
  { barcode: "7501008080077", name: "PASTA DENTAL ANTICARIES 100ML",      dept: "Higiene",      cost: 24.00, utility: 70, iva: 16, presentation: "Tubo 100ml" },

  // ============ CUIDADO PERSONAL (IVA 16%) ============
  { barcode: "7501008090015", name: "CREMA CORPORAL HUMECTANTE 400ML",    dept: "Higiene",      cost: 65.00, utility: 70, iva: 16, presentation: "Frasco 400ml" },
  { barcode: "7501008090022", name: "DESODORANTE EN BARRA 90G",           dept: "Higiene",      cost: 32.00, utility: 70, iva: 16, presentation: "Barra 90g" },
  { barcode: "7501008090039", name: "PROTECTOR SOLAR FPS50 120ML",        dept: "Higiene",      cost: 145.00, utility: 60, iva: 16, presentation: "Tubo 120ml" },
  { barcode: "7501008090046", name: "REPELENTE DE INSECTOS 200ML",        dept: "Higiene",      cost: 58.00, utility: 65, iva: 16, presentation: "Aerosol 200ml" },

  // ============ CONSUMO (IVA 16%) ============
  { barcode: "7501055302505", name: "AGUA EMBOTELLADA 600ML",             dept: "Consumo",      cost: 5.50, utility: 100, iva: 0, presentation: "Botella 600ml" },
  { barcode: "7501008090050", name: "PAÑUELOS DESECHABLES C/100",         dept: "Consumo",      cost: 18.00, utility: 70, iva: 16, presentation: "Caja con 100 pañuelos" },
  { barcode: "7501008090067", name: "SUERO ORAL 500ML",                   dept: "Consumo",      cost: 22.00, utility: 50, iva: 0, presentation: "Botella 500ml" },
  { barcode: "7501008090074", name: "PAPEL HIGIENICO 4 ROLLOS",           dept: "Consumo",      cost: 42.00, utility: 50, iva: 16, presentation: "Paquete 4 rollos" },
  { barcode: "7501008090081", name: "CHOCOLATE 50G",                      dept: "Consumo",      cost: 12.00, utility: 80, iva: 16, presentation: "Barra 50g" },
  { barcode: "7501008090098", name: "BATERIAS AA C/4",                    dept: "Consumo",      cost: 28.00, utility: 60, iva: 16, presentation: "Blister con 4" },

  // ============ VITAMINAS Y SUPLEMENTOS ============
  { barcode: "7501349070010", name: "VITAMINA C 1000MG C/60 TABS",        dept: "Farmacia",     cost: 88.00, utility: 60, iva: 0, isDrug: true, presentation: "Frasco con 60 tabletas" },
  { barcode: "7501349070027", name: "MULTIVITAMINICO ADULTO C/100 TABS",  dept: "Farmacia",     cost: 145.00, utility: 60, iva: 0, isDrug: true, presentation: "Frasco con 100 tabletas" },
  { barcode: "7501349070034", name: "CALCIO + VITAMINA D C/60 TABS",      dept: "Farmacia",     cost: 96.00, utility: 60, iva: 0, isDrug: true, presentation: "Frasco con 60 tabletas" },
  { barcode: "7501349070041", name: "OMEGA 3 1000MG C/100 CAP",           dept: "Farmacia",     cost: 185.00, utility: 60, iva: 0, isDrug: true, presentation: "Frasco con 100 capsulas" },
  { barcode: "7501349070058", name: "MAGNESIO 500MG C/60 TABS",           dept: "Farmacia",     cost: 78.00, utility: 60, iva: 0, isDrug: true, presentation: "Frasco con 60 tabletas" },
  { barcode: "7501349070065", name: "HIERRO 60MG C/30 TABS",              dept: "Farmacia",     cost: 65.00, utility: 60, iva: 0, isDrug: true, presentation: "Frasco con 30 tabletas" },
  { barcode: "7501349070072", name: "ACIDO FOLICO 5MG C/90 TABS",         dept: "Farmacia",     cost: 38.00, utility: 60, iva: 0, isDrug: true, presentation: "Frasco con 90 tabletas" },

  // ============ EQUIPOS PARA EL CUIDADO ============
  { barcode: "7501008100016", name: "TERMOMETRO DIGITAL",                 dept: "Higiene",      cost: 85.00,  utility: 70, iva: 16, presentation: "Termometro oral/axilar" },
  { barcode: "7501008100023", name: "BAUMANOMETRO DIGITAL DE BRAZO",      dept: "Higiene",      cost: 580.00, utility: 50, iva: 16, presentation: "Equipo con brazalete" },
  { barcode: "7501008100030", name: "OXIMETRO DE PULSO",                  dept: "Higiene",      cost: 320.00, utility: 50, iva: 16, presentation: "Sensor digital" },
];

const DOCTORS = [
  { cedula: "1234567", fullName: "Dra. Ana López Hernández",     specialty: "Medicina general",     commissionPct: 8 },
  { cedula: "2345678", fullName: "Dr. Carlos Méndez Rivas",      specialty: "Cardiología",         commissionPct: 10 },
  { cedula: "3456789", fullName: "Dra. Patricia Soto Vázquez",   specialty: "Pediatría",           commissionPct: 8 },
  { cedula: "4567890", fullName: "Dr. Roberto García Téllez",    specialty: "Medicina interna",    commissionPct: 12 },
];

const PATIENT_DEMO = [
  { fullName: "Juan Pérez Mendoza",    identifier: "EXP-2025-0001", phone: "8112340001" },
  { fullName: "María González López",  identifier: "EXP-2025-0002", phone: "8112340002" },
];

export async function seed(db: DB, options: { reset?: boolean } = {}) {
  // Si reset, wipe primero
  if (options.reset) {
    await wipeAll(db);
  }

  // Idempotencia
  const existing = await db.select().from(schema.tenants).where(eq(schema.tenants.slug, TENANT_SLUG)).limit(1);
  if (existing.length > 0 && !options.reset) {
    return { ok: true, message: "Ya seedeado", tenantId: existing[0].id };
  }

  // ============ TENANT ============
  const [tenant] = await db.insert(schema.tenants).values({
    slug: TENANT_SLUG,
    name: "Farmacia Alfa",
    rfc: "FAA250101AAA",
    regimenFiscal: "626",
    email: "administracion@laatec.com",
    phone: "+528118023213",
    status: "trial",
  }).returning();

  // ============ WAREHOUSES (2 sucursales para traslados) ============
  const [matriz] = await db.insert(schema.warehouses).values({
    tenantId: tenant.id,
    name: "Matriz",
    ticketLine1: "Farmacia Alfa Matriz",
    ticketLine2: "Av. Topo Chico 590-2F, Anáhuac",
    ticketLine3: "San Nicolás de los Garza, N.L. · Tel: 81 1802 3213",
    allowsTransfers: true,
  }).returning();
  const [sucursal] = await db.insert(schema.warehouses).values({
    tenantId: tenant.id,
    name: "Sucursal Centro",
    ticketLine1: "Farmacia Alfa Centro",
    ticketLine2: "Av. Constitución 1234",
    ticketLine3: "Monterrey, N.L. · Tel: 81 8000 0000",
    allowsTransfers: true,
  }).returning();

  // ============ USERS (admin Lili + cajero demo) ============
  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const [lili] = await db.insert(schema.users).values({
    tenantId: tenant.id,
    email: "lilian@farmacia-alfa.mx",
    passwordHash,
    name: "Lilian Balderas",
    role: "owner",
    defaultWarehouseId: matriz.id,
  }).returning();
  await db.insert(schema.users).values({
    tenantId: tenant.id,
    email: "sandy@farmacia-alfa.mx",
    passwordHash,
    name: "Sandy Herrera",
    role: "cashier",
    defaultWarehouseId: matriz.id,
  });

  // ============ DEPARTAMENTOS ============
  const deptRows = await db.insert(schema.departments).values([
    { tenantId: tenant.id, name: "Farmacia" },
    { tenantId: tenant.id, name: "Antibioticos" },
    { tenantId: tenant.id, name: "Higiene" },
    { tenantId: tenant.id, name: "Consumo" },
  ]).returning();
  const deptByName: Record<string, number> = {};
  for (const d of deptRows) deptByName[d.name] = d.id;

  // ============ UNIDADES ============
  const unitRows = await db.insert(schema.units).values([
    { tenantId: tenant.id, name: "Pieza", abbreviation: "pz" },
    { tenantId: tenant.id, name: "Caja", abbreviation: "cj" },
    { tenantId: tenant.id, name: "Frasco", abbreviation: "fco" },
    { tenantId: tenant.id, name: "Tubo", abbreviation: "tb" },
  ]).returning();
  const pieza = unitRows[0].id;

  // ============ CLIENTES (publico general + 2 RFC reales) ============
  await db.insert(schema.customers).values([
    { tenantId: tenant.id, name: "PUBLICO EN GENERAL", rfc: "XAXX010101000", taxRegime: "616", cfdiUse: "S01" },
    { tenantId: tenant.id, name: "GRUPO HOSPITALARIO DEL NORTE SA DE CV", rfc: "GHN150515AB1", taxRegime: "601", cfdiUse: "G03", email: "facturacion@hosnorte.mx", zipCode: "64000", phone: "8181234567" },
    { tenantId: tenant.id, name: "JUAN CARLOS RAMIREZ MARTINEZ", rfc: "RAMJ800101AB1", taxRegime: "612", cfdiUse: "D07", zipCode: "64710" },
  ]);

  // ============ MEDICOS ============
  const docRows = await db.insert(schema.doctors).values(
    DOCTORS.map((d) => ({ tenantId: tenant.id, ...d })),
  ).returning();

  // ============ PROVEEDORES ============
  const supRows = await db.insert(schema.suppliers).values([
    { tenantId: tenant.id, name: "Casa Saba", contactName: "Atención clientes",   email: "ventas@casasaba.com.mx",   phone: "55-5267-8800", paymentTerms: "Crédito 30 días" },
    { tenantId: tenant.id, name: "Nadro",     contactName: "Atención clientes",   email: "ventas@nadro.com.mx",      phone: "55-1500-2300", paymentTerms: "Crédito 30 días" },
    { tenantId: tenant.id, name: "Marzam",    contactName: "Atención clientes",   email: "contacto@marzam.com.mx",   phone: "55-5448-3000", paymentTerms: "Crédito 15 días" },
    { tenantId: tenant.id, name: "Levic",     contactName: "Pedidos institucional", email: "pedidos@levic.com.mx",    phone: "55-5566-7788", paymentTerms: "Crédito 60 días" },
  ]).returning();

  // ============ PRODUCTOS + INVENTARIO ============
  const productMap = new Map<string, { id: number; cost: number; publicPrice: number; ivaPct: number }>();
  for (const p of PRODUCTS) {
    const publicPrice = Number((p.cost * (1 + p.utility / 100)).toFixed(2));
    const [row] = await db.insert(schema.products).values({
      tenantId: tenant.id,
      barcode: p.barcode,
      name: p.name,
      departmentId: deptByName[p.dept],
      saleUnitId: pieza,
      cost: p.cost,
      utilityPct: p.utility,
      publicPrice,
      ivaPct: p.iva,
      commissionPct: p.commission ?? 0,
      isDrug: p.isDrug ?? false,
      isAntibiotic: p.isAntibiotic ?? false,
      isGeneric: p.isGeneric ?? false,
      controlledGroup: p.controlledGroup,
      requiresPrescription: p.requiresPrescription ?? false,
      retainsPrescription: p.retainsPrescription ?? false,
      tracksBatch: p.tracksBatch ?? false,
      activeIngredient: p.activeIngredient,
      presentation: p.presentation,
      manufacturerHolder: p.manufacturer,
    }).returning();
    productMap.set(p.barcode, { id: row.id, cost: p.cost, publicPrice, ivaPct: p.iva });

    // Inventario inicial (mas alto en matriz, menor en sucursal)
    const baseQty = 30 + Math.floor(Math.random() * 70);
    await db.insert(schema.inventory).values({
      tenantId: tenant.id,
      warehouseId: matriz.id,
      productId: row.id,
      quantity: baseQty,
      minQuantity: Math.max(5, Math.floor(baseQty * 0.2)),
      maxQuantity: baseQty * 2,
      lastCost: p.cost,
    });
    await db.insert(schema.inventory).values({
      tenantId: tenant.id,
      warehouseId: sucursal.id,
      productId: row.id,
      quantity: Math.floor(baseQty * 0.4),
      minQuantity: Math.max(3, Math.floor(baseQty * 0.1)),
      maxQuantity: baseQty,
      lastCost: p.cost,
    });

    // Lotes para productos con tracksBatch (Grupos II y III)
    if (p.tracksBatch) {
      const months = p.controlledGroup === "II" ? 6 : 12;
      const expiryDate = new Date();
      expiryDate.setMonth(expiryDate.getMonth() + months);
      await db.insert(schema.productLots).values({
        tenantId: tenant.id,
        productId: row.id,
        warehouseId: matriz.id,
        lot: `L${Math.floor(Math.random() * 90000 + 10000)}`,
        expiryDate,
        qtyOnHand: baseQty,
        unitCost: p.cost,
      });
    }
  }

  // Lotes proximos a vencer para algunos productos (alerta caducidad)
  const expiringSoon = ["7501349025500", "7501349020203"];
  for (const bc of expiringSoon) {
    const p = productMap.get(bc);
    if (!p) continue;
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 25); // 25 dias
    await db.insert(schema.productLots).values({
      tenantId: tenant.id,
      productId: p.id,
      warehouseId: matriz.id,
      lot: `EXP${Math.floor(Math.random() * 90000 + 10000)}`,
      expiryDate: expiry,
      qtyOnHand: 8,
      unitCost: p.cost,
    });
  }

  // ============ ORDENES A PROVEEDOR (3) ============
  // 1) Borrador - Marzam
  const [order1] = await db.insert(schema.supplierOrders).values({
    tenantId: tenant.id,
    supplierId: supRows[2].id,
    warehouseId: matriz.id,
    orderNumber: "OC2505-00001",
    status: "draft",
    subtotal: 0,
    ivaTotal: 0,
    total: 0,
    notes: "Pedido tentativo para reabasto mensual",
    userId: lili.id,
  }).returning();
  const order1Items = [
    { barcode: "7501349025500", qty: 20 },
    { barcode: "7501349027060", qty: 10 },
    { barcode: "7501349020005", qty: 5 },
  ];
  let order1Sub = 0;
  for (const i of order1Items) {
    const p = productMap.get(i.barcode)!;
    const unitCost = p.cost * 0.9;
    await db.insert(schema.supplierOrderItems).values({
      orderId: order1.id,
      productId: p.id,
      productName: PRODUCTS.find((x) => x.barcode === i.barcode)!.name,
      quantityOrdered: i.qty,
      unitCost,
      ivaPct: p.ivaPct,
    });
    order1Sub += i.qty * unitCost;
  }
  await db.update(schema.supplierOrders).set({ subtotal: order1Sub, total: order1Sub }).where(eq(schema.supplierOrders.id, order1.id));

  // 2) Enviada (esperada hoy) - Nadro
  const [order2] = await db.insert(schema.supplierOrders).values({
    tenantId: tenant.id,
    supplierId: supRows[1].id,
    warehouseId: matriz.id,
    orderNumber: "OC2505-00002",
    status: "sent",
    subtotal: 0,
    ivaTotal: 0,
    total: 0,
    sentAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    expectedAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    userId: lili.id,
  }).returning();
  const order2Items = [
    { barcode: "7501349026230", qty: 30 },
    { barcode: "7501349038002", qty: 20 },
    { barcode: "7501349040005", qty: 25 },
  ];
  let order2Sub = 0;
  for (const i of order2Items) {
    const p = productMap.get(i.barcode)!;
    const unitCost = p.cost * 0.9;
    await db.insert(schema.supplierOrderItems).values({
      orderId: order2.id,
      productId: p.id,
      productName: PRODUCTS.find((x) => x.barcode === i.barcode)!.name,
      quantityOrdered: i.qty,
      unitCost,
      ivaPct: p.ivaPct,
    });
    order2Sub += i.qty * unitCost;
  }
  await db.update(schema.supplierOrders).set({ subtotal: order2Sub, total: order2Sub }).where(eq(schema.supplierOrders.id, order2.id));

  // 3) Recibida (hace 3 dias) - Casa Saba
  const [order3] = await db.insert(schema.supplierOrders).values({
    tenantId: tenant.id,
    supplierId: supRows[0].id,
    warehouseId: matriz.id,
    orderNumber: "OC2505-00003",
    status: "received",
    subtotal: 0,
    ivaTotal: 0,
    total: 0,
    sentAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    expectedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
    receivedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    userId: lili.id,
  }).returning();
  const order3Items = [
    { barcode: "7502209851078", qty: 50 },
    { barcode: "7501006030051", qty: 25 },
    { barcode: "7501349042503", qty: 30 },
  ];
  let order3Sub = 0;
  for (const i of order3Items) {
    const p = productMap.get(i.barcode)!;
    const unitCost = p.cost * 0.9;
    const prodName = PRODUCTS.find((x) => x.barcode === i.barcode)!.name;
    await db.insert(schema.supplierOrderItems).values({
      orderId: order3.id,
      productId: p.id,
      productName: prodName,
      quantityOrdered: i.qty,
      quantityReceived: i.qty,
      unitCost,
      ivaPct: p.ivaPct,
    });
    order3Sub += i.qty * unitCost;
    // Movimiento de entrada (purchase)
    const [inv] = await db.select().from(schema.inventory)
      .where(and(eq(schema.inventory.productId, p.id), eq(schema.inventory.warehouseId, matriz.id)))
      .limit(1);
    const newQty = inv.quantity + i.qty;
    await db.update(schema.inventory).set({ quantity: newQty, lastCost: unitCost }).where(eq(schema.inventory.id, inv.id));
    await db.insert(schema.inventoryMovements).values({
      tenantId: tenant.id,
      warehouseId: matriz.id,
      productId: p.id,
      type: "purchase",
      quantity: i.qty,
      balanceAfter: newQty,
      unitCost,
      supplierInvoice: order3.orderNumber,
      userId: lili.id,
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    });
  }
  await db.update(schema.supplierOrders).set({ subtotal: order3Sub, total: order3Sub }).where(eq(schema.supplierOrders.id, order3.id));

  // ============ TRASLADO ENTRE SUCURSALES ============
  const [transfer1] = await db.insert(schema.transfers).values({
    tenantId: tenant.id,
    fromWarehouseId: matriz.id,
    toWarehouseId: sucursal.id,
    transferNumber: "TR2505-00001",
    status: "received",
    sentAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    receivedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    notes: "Reabasto inicial Sucursal Centro",
    userId: lili.id,
  }).returning();
  const transferItems = ["7502209851078", "7501349025500", "7501349027060"];
  for (const bc of transferItems) {
    const p = productMap.get(bc)!;
    const prodName = PRODUCTS.find((x) => x.barcode === bc)!.name;
    const qty = 10;
    await db.insert(schema.transferItems).values({
      transferId: transfer1.id, productId: p.id, productName: prodName, quantity: qty,
    });
    // Salida matriz
    const [invFrom] = await db.select().from(schema.inventory)
      .where(and(eq(schema.inventory.productId, p.id), eq(schema.inventory.warehouseId, matriz.id))).limit(1);
    await db.update(schema.inventory).set({ quantity: invFrom.quantity - qty }).where(eq(schema.inventory.id, invFrom.id));
    await db.insert(schema.inventoryMovements).values({
      tenantId: tenant.id, warehouseId: matriz.id, productId: p.id,
      type: "transfer_out", quantity: -qty, balanceAfter: invFrom.quantity - qty,
      reason: `Hacia ${transfer1.transferNumber}`, userId: lili.id,
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    });
    // Entrada sucursal
    const [invTo] = await db.select().from(schema.inventory)
      .where(and(eq(schema.inventory.productId, p.id), eq(schema.inventory.warehouseId, sucursal.id))).limit(1);
    await db.update(schema.inventory).set({ quantity: invTo.quantity + qty }).where(eq(schema.inventory.id, invTo.id));
    await db.insert(schema.inventoryMovements).values({
      tenantId: tenant.id, warehouseId: sucursal.id, productId: p.id,
      type: "transfer_in", quantity: qty, balanceAfter: invTo.quantity + qty,
      reason: `Desde ${transfer1.transferNumber}`, userId: lili.id,
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    });
  }

  // ============ VENTAS (~30 distribuidas en ultimos 7 dias) ============
  const otcBarcodes = PRODUCTS.filter((p) => !p.controlledGroup).map((p) => p.barcode);
  const rxIVbarcodes = PRODUCTS.filter((p) => p.controlledGroup === "IV").map((p) => p.barcode);
  const rxIIIbarcodes = PRODUCTS.filter((p) => p.controlledGroup === "III").map((p) => p.barcode);

  const paymentMethods: Array<"cash" | "card_debit" | "card_credit" | "transfer"> = ["cash", "cash", "cash", "card_debit", "card_debit", "card_credit", "transfer"];

  let salesCount = 0;
  for (let day = 7; day >= 0; day--) {
    const salesPerDay = day === 0 ? 3 : Math.floor(2 + Math.random() * 4); // 2-5 ventas por dia
    for (let s = 0; s < salesPerDay; s++) {
      salesCount++;
      const saleDate = new Date(Date.now() - day * 24 * 60 * 60 * 1000 - Math.random() * 12 * 60 * 60 * 1000);
      const hourOffset = 9 + Math.floor(Math.random() * 11); // entre 9am-8pm
      saleDate.setHours(hourOffset, Math.floor(Math.random() * 60), 0, 0);

      // Tipo de venta: mezclamos OTC con receta de vez en cuando
      const includeRx = Math.random() < 0.25; // 25% con receta
      const items: Array<{ barcode: string; qty: number }> = [];
      const itemCount = 1 + Math.floor(Math.random() * 4);
      for (let i = 0; i < itemCount; i++) {
        const bc = otcBarcodes[Math.floor(Math.random() * otcBarcodes.length)];
        if (!items.find((x) => x.barcode === bc)) items.push({ barcode: bc, qty: 1 + Math.floor(Math.random() * 3) });
      }
      let prescriptionId: number | null = null;
      if (includeRx) {
        const rxbc = Math.random() < 0.7
          ? rxIVbarcodes[Math.floor(Math.random() * rxIVbarcodes.length)]
          : rxIIIbarcodes[Math.floor(Math.random() * rxIIIbarcodes.length)];
        items.push({ barcode: rxbc, qty: 1 });
        const doctor = docRows[Math.floor(Math.random() * docRows.length)];
        const isGroup2 = PRODUCTS.find((p) => p.barcode === rxbc)?.controlledGroup === "II";
        const [rx] = await db.insert(schema.prescriptions).values({
          tenantId: tenant.id,
          doctorId: doctor.id,
          type: "physical",
          retained: isGroup2,
          refillsMax: 1,
          refillsUsed: 0,
          patientName: ["Roberto Hernández", "Lucía Martínez", "Miguel Ángel Torres", "Sandra Ruiz"][Math.floor(Math.random() * 4)],
          patientAge: 25 + Math.floor(Math.random() * 50),
          issuedAt: saleDate,
          createdAt: saleDate,
        }).returning();
        prescriptionId = rx.id;
      }

      let subtotal = 0;
      let ivaTotal = 0;
      const saleItemsData: Array<any> = [];
      for (const it of items) {
        const p = productMap.get(it.barcode);
        if (!p) continue;
        const prodName = PRODUCTS.find((x) => x.barcode === it.barcode)!.name;
        const lineSub = it.qty * p.publicPrice;
        const lineIva = lineSub * (p.ivaPct / 100);
        subtotal += lineSub;
        ivaTotal += lineIva;
        saleItemsData.push({
          productId: p.id,
          productName: prodName,
          quantity: it.qty,
          unitPrice: p.publicPrice,
          ivaPct: p.ivaPct,
          subtotal: lineSub,
          ivaAmount: lineIva,
          total: lineSub + lineIva,
        });
      }
      const total = subtotal + ivaTotal;
      const yy = String(saleDate.getFullYear()).slice(-2);
      const mm = String(saleDate.getMonth() + 1).padStart(2, "0");
      const dd = String(saleDate.getDate()).padStart(2, "0");
      const ticketNumber = `${yy}${mm}${dd}${String(matriz.id).padStart(2, "0")}${String(salesCount).padStart(5, "0")}`;

      const [sale] = await db.insert(schema.sales).values({
        tenantId: tenant.id,
        warehouseId: matriz.id,
        userId: Math.random() < 0.5 ? lili.id : (await db.select().from(schema.users).where(eq(schema.users.tenantId, tenant.id)).limit(2))[1].id,
        ticketNumber,
        subtotal,
        ivaTotal,
        total,
        status: "completed",
        createdAt: saleDate,
      }).returning();

      for (const sid of saleItemsData) {
        await db.insert(schema.saleItems).values({ saleId: sale.id, ...sid });
      }

      await db.insert(schema.payments).values({
        saleId: sale.id,
        method: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
        amount: total,
        createdAt: saleDate,
      });

      // Descontar inventario + movimientos
      for (const it of items) {
        const p = productMap.get(it.barcode);
        if (!p) continue;
        const [inv] = await db.select().from(schema.inventory)
          .where(and(eq(schema.inventory.productId, p.id), eq(schema.inventory.warehouseId, matriz.id))).limit(1);
        if (!inv || inv.quantity < it.qty) continue;
        const newQty = inv.quantity - it.qty;
        await db.update(schema.inventory).set({ quantity: newQty, updatedAt: saleDate }).where(eq(schema.inventory.id, inv.id));
        const spec = PRODUCTS.find((x) => x.barcode === it.barcode);
        await db.insert(schema.inventoryMovements).values({
          tenantId: tenant.id,
          warehouseId: matriz.id,
          productId: p.id,
          controlledGroup: spec?.controlledGroup ?? null,
          type: "sale",
          quantity: -it.qty,
          balanceAfter: newQty,
          unitCost: 0,
          saleId: sale.id,
          prescriptionId,
          userId: lili.id,
          createdAt: saleDate,
        });
      }
    }
  }

  // ============ AJUSTE MANUAL DE INVENTARIO ============
  const ajusteBarcode = "7501008080015"; // Alcohol en gel
  const pAjuste = productMap.get(ajusteBarcode)!;
  const [invAjuste] = await db.select().from(schema.inventory)
    .where(and(eq(schema.inventory.productId, pAjuste.id), eq(schema.inventory.warehouseId, matriz.id))).limit(1);
  const ajusteQty = -3;
  const newAjusteQty = invAjuste.quantity + ajusteQty;
  await db.update(schema.inventory).set({ quantity: newAjusteQty }).where(eq(schema.inventory.id, invAjuste.id));
  await db.insert(schema.inventoryMovements).values({
    tenantId: tenant.id, warehouseId: matriz.id, productId: pAjuste.id,
    type: "adjustment_out", quantity: ajusteQty, balanceAfter: newAjusteQty,
    reason: "Recuento físico mensual", userId: lili.id,
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
  });

  // ============ CUENTAS-PACIENTE ============
  const [pat1] = await db.insert(schema.patients).values({
    tenantId: tenant.id,
    fullName: PATIENT_DEMO[0].fullName,
    identifier: PATIENT_DEMO[0].identifier,
    phone: PATIENT_DEMO[0].phone,
  }).returning();
  const [pat2] = await db.insert(schema.patients).values({
    tenantId: tenant.id,
    fullName: PATIENT_DEMO[1].fullName,
    identifier: PATIENT_DEMO[1].identifier,
    phone: PATIENT_DEMO[1].phone,
  }).returning();

  // Cuenta cerrada (Juan Perez, alta hace 3 dias)
  const closedAdmitted = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const closedDischarged = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  const [acct1] = await db.insert(schema.patientAccounts).values({
    tenantId: tenant.id,
    patientId: pat1.id,
    warehouseId: matriz.id,
    accountNumber: "CP2505-00001",
    status: "closed",
    payerType: "insurance",
    bedNumber: "102-B",
    admittedAt: closedAdmitted,
    dischargedAt: closedDischarged,
    notes: "Diagnóstico: gastroenteritis aguda. Médico: Dr. Carlos Méndez.",
    totalCharged: 0,
    userId: lili.id,
    createdAt: closedAdmitted,
  }).returning();
  const acct1Items = [
    { barcode: "7501006030051", qty: 2 },
    { barcode: "7501349025500", qty: 4 },
    { barcode: "7501349026230", qty: 1 },
    { barcode: "7501008080022", qty: 1 },
    { barcode: "7501008080039", qty: 2 },
  ];
  let acct1Total = 0;
  for (const i of acct1Items) {
    const p = productMap.get(i.barcode)!;
    const prodName = PRODUCTS.find((x) => x.barcode === i.barcode)!.name;
    const sub = i.qty * p.publicPrice;
    const total = sub * (1 + p.ivaPct / 100);
    await db.insert(schema.patientAccountItems).values({
      accountId: acct1.id, productId: p.id, productName: prodName,
      quantity: i.qty, unitPrice: p.publicPrice, ivaPct: p.ivaPct,
      subtotal: sub, total,
      createdAt: closedAdmitted,
    });
    acct1Total += total;
  }
  await db.update(schema.patientAccounts).set({ totalCharged: acct1Total }).where(eq(schema.patientAccounts.id, acct1.id));

  // Cuenta abierta (Maria Gonzalez, ingreso hace 2 dias)
  const openAdmitted = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
  const [acct2] = await db.insert(schema.patientAccounts).values({
    tenantId: tenant.id,
    patientId: pat2.id,
    warehouseId: matriz.id,
    accountNumber: "CP2505-00002",
    status: "open",
    payerType: "private",
    bedNumber: "204-A",
    admittedAt: openAdmitted,
    notes: "Diagnóstico: post-operatorio. Médico: Dra. Patricia Soto.",
    totalCharged: 0,
    userId: lili.id,
    createdAt: openAdmitted,
  }).returning();
  const acct2Items = [
    { barcode: "7501349020005", qty: 1 },
    { barcode: "7501349060042", qty: 1 }, // Tramadol Grupo II
    { barcode: "7501006030051", qty: 1 },
    { barcode: "7501008080039", qty: 1 },
  ];
  let acct2Total = 0;
  for (const i of acct2Items) {
    const p = productMap.get(i.barcode)!;
    const prodName = PRODUCTS.find((x) => x.barcode === i.barcode)!.name;
    const sub = i.qty * p.publicPrice;
    const total = sub * (1 + p.ivaPct / 100);
    await db.insert(schema.patientAccountItems).values({
      accountId: acct2.id, productId: p.id, productName: prodName,
      quantity: i.qty, unitPrice: p.publicPrice, ivaPct: p.ivaPct,
      subtotal: sub, total,
      createdAt: openAdmitted,
    });
    acct2Total += total;
  }
  await db.update(schema.patientAccounts).set({ totalCharged: acct2Total }).where(eq(schema.patientAccounts.id, acct2.id));

  return {
    ok: true,
    message: "Demo enriquecido cargado",
    tenantId: tenant.id,
    products: PRODUCTS.length,
    doctors: DOCTORS.length,
    sales: salesCount,
    suppliers: 4,
    patientAccounts: 2,
    credentials: { email: "lilian@farmacia-alfa.mx", password: DEMO_PASSWORD },
  };
}
