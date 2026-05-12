/**
 * FarmaLat - Schema D1 (Fase 1)
 * 12 tablas core para MVP de POS de farmacia.
 * Multi-tenant via tenant_id en cada tabla operativa.
 */
import { sqliteTable, text, integer, real, index, uniqueIndex } from "drizzle-orm/sqlite-core";

const ts = () => integer("timestamp", { mode: "timestamp_ms" });
const id = () => integer("id", { mode: "number" }).primaryKey({ autoIncrement: true });

// ============================================================
// TENANTS - una farmacia o cadena
// ============================================================
export const tenants = sqliteTable("tenants", {
  id: id(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  rfc: text("rfc"),
  regimenFiscal: text("regimen_fiscal"),
  email: text("email").notNull(),
  phone: text("phone"),
  status: text("status", { enum: ["trial", "active", "paused", "cancelled"] }).notNull().default("trial"),
  trialEndsAt: ts(),
  createdAt: ts().notNull().$defaultFn(() => new Date()),
});

// ============================================================
// USERS - cajeros, admins por farmacia
// ============================================================
export const users = sqliteTable("users", {
  id: id(),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id),
  email: text("email").notNull(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  role: text("role", { enum: ["owner", "admin", "manager", "cashier"] }).notNull().default("cashier"),
  defaultWarehouseId: integer("default_warehouse_id"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: ts().notNull().$defaultFn(() => new Date()),
}, (t) => [
  uniqueIndex("users_tenant_email_idx").on(t.tenantId, t.email),
]);

// ============================================================
// WAREHOUSES - sucursales y almacenes
// ============================================================
export const warehouses = sqliteTable("warehouses", {
  id: id(),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id),
  name: text("name").notNull(),
  ticketLine1: text("ticket_line1"),
  ticketLine2: text("ticket_line2"),
  ticketLine3: text("ticket_line3"),
  logoUrl: text("logo_url"),
  allowsTransfers: integer("allows_transfers", { mode: "boolean" }).notNull().default(true),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: ts().notNull().$defaultFn(() => new Date()),
}, (t) => [
  index("warehouses_tenant_idx").on(t.tenantId),
]);

// ============================================================
// DEPARTMENTS - categorías de productos
// ============================================================
export const departments = sqliteTable("departments", {
  id: id(),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id),
  name: text("name").notNull(),
  createdAt: ts().notNull().$defaultFn(() => new Date()),
}, (t) => [
  uniqueIndex("departments_tenant_name_idx").on(t.tenantId, t.name),
]);

// ============================================================
// UNITS - unidades de medida (Pieza, Caja, Frasco, ml...)
// ============================================================
export const units = sqliteTable("units", {
  id: id(),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id),
  name: text("name").notNull(),
  abbreviation: text("abbreviation"),
}, (t) => [
  uniqueIndex("units_tenant_name_idx").on(t.tenantId, t.name),
]);

// ============================================================
// PRODUCTS - catálogo
// ============================================================
export const products = sqliteTable("products", {
  id: id(),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id),
  barcode: text("barcode"),
  name: text("name").notNull(),
  departmentId: integer("department_id").references(() => departments.id),
  saleUnitId: integer("sale_unit_id").references(() => units.id),
  purchaseUnitId: integer("purchase_unit_id").references(() => units.id),
  saleFactor: real("sale_factor").notNull().default(1),

  cost: real("cost").notNull().default(0),
  utilityPct: real("utility_pct").notNull().default(0),
  publicPrice: real("public_price").notNull().default(0),
  ivaPct: real("iva_pct").notNull().default(0),
  commissionPct: real("commission_pct").notNull().default(0),

  // Clasificaciones
  activeIngredient: text("active_ingredient"),
  isDrug: integer("is_drug", { mode: "boolean" }).notNull().default(false),
  isAntibiotic: integer("is_antibiotic", { mode: "boolean" }).notNull().default(false),
  isGeneric: integer("is_generic", { mode: "boolean" }).notNull().default(false),
  cofeprisGroup: text("cofepris_group"), // I, II, III, IV, V o null
  retainsPrescription: integer("retains_prescription", { mode: "boolean" }).notNull().default(false),

  // SAT
  satProdServKey: text("sat_prod_serv_key"),
  satUnitKey: text("sat_unit_key"),
  isService: integer("is_service", { mode: "boolean" }).notNull().default(false),

  description: text("description"),
  presentation: text("presentation"),

  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: ts().notNull().$defaultFn(() => new Date()),
  updatedAt: ts().notNull().$defaultFn(() => new Date()),
}, (t) => [
  index("products_tenant_idx").on(t.tenantId),
  index("products_barcode_idx").on(t.tenantId, t.barcode),
  index("products_name_idx").on(t.tenantId, t.name),
]);

// ============================================================
// INVENTORY - existencia por almacén
// ============================================================
export const inventory = sqliteTable("inventory", {
  id: id(),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id),
  warehouseId: integer("warehouse_id").notNull().references(() => warehouses.id),
  productId: integer("product_id").notNull().references(() => products.id),
  quantity: real("quantity").notNull().default(0),
  minQuantity: real("min_quantity").notNull().default(0),
  maxQuantity: real("max_quantity").notNull().default(0),
  lastCost: real("last_cost").notNull().default(0),
  updatedAt: ts().notNull().$defaultFn(() => new Date()),
}, (t) => [
  uniqueIndex("inventory_wh_prod_idx").on(t.warehouseId, t.productId),
  index("inventory_tenant_idx").on(t.tenantId),
]);

// ============================================================
// CUSTOMERS - clientes (público general + para CFDI)
// ============================================================
export const customers = sqliteTable("customers", {
  id: id(),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id),
  name: text("name").notNull(),
  rfc: text("rfc"),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  zipCode: text("zip_code"),
  taxRegime: text("tax_regime"),
  cfdiUse: text("cfdi_use"),
  createdAt: ts().notNull().$defaultFn(() => new Date()),
}, (t) => [
  index("customers_tenant_idx").on(t.tenantId),
  index("customers_rfc_idx").on(t.tenantId, t.rfc),
]);

// ============================================================
// SALES - encabezado de venta/ticket
// ============================================================
export const sales = sqliteTable("sales", {
  id: id(),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id),
  warehouseId: integer("warehouse_id").notNull().references(() => warehouses.id),
  userId: integer("user_id").notNull().references(() => users.id),
  customerId: integer("customer_id").references(() => customers.id),

  ticketNumber: text("ticket_number").notNull(),
  subtotal: real("subtotal").notNull().default(0),
  ivaTotal: real("iva_total").notNull().default(0),
  total: real("total").notNull().default(0),

  status: text("status", { enum: ["completed", "cancelled", "draft"] }).notNull().default("completed"),
  cancelledById: integer("cancelled_by_id").references(() => users.id),
  cancelledAt: ts(),

  cfdiUuid: text("cfdi_uuid"),
  cfdiStatus: text("cfdi_status", { enum: ["none", "pending", "issued", "cancelled"] }).notNull().default("none"),

  createdAt: ts().notNull().$defaultFn(() => new Date()),
}, (t) => [
  index("sales_tenant_date_idx").on(t.tenantId, t.createdAt),
  index("sales_warehouse_idx").on(t.warehouseId),
  uniqueIndex("sales_ticket_idx").on(t.tenantId, t.warehouseId, t.ticketNumber),
]);

// ============================================================
// SALE_ITEMS - líneas de venta
// ============================================================
export const saleItems = sqliteTable("sale_items", {
  id: id(),
  saleId: integer("sale_id").notNull().references(() => sales.id),
  productId: integer("product_id").notNull().references(() => products.id),
  productName: text("product_name").notNull(),
  quantity: real("quantity").notNull(),
  unitPrice: real("unit_price").notNull(),
  ivaPct: real("iva_pct").notNull().default(0),
  subtotal: real("subtotal").notNull(),
  ivaAmount: real("iva_amount").notNull().default(0),
  total: real("total").notNull(),
}, (t) => [
  index("sale_items_sale_idx").on(t.saleId),
]);

// ============================================================
// PAYMENTS - formas de pago aplicadas a una venta
// ============================================================
export const payments = sqliteTable("payments", {
  id: id(),
  saleId: integer("sale_id").notNull().references(() => sales.id),
  method: text("method", { enum: ["cash", "card_debit", "card_credit", "transfer", "wallet", "credit"] }).notNull(),
  amount: real("amount").notNull(),
  reference: text("reference"),
  createdAt: ts().notNull().$defaultFn(() => new Date()),
}, (t) => [
  index("payments_sale_idx").on(t.saleId),
]);

// ============================================================
// AUDIT_LOG - bitácora de cambios críticos
// ============================================================
export const auditLog = sqliteTable("audit_log", {
  id: id(),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id),
  userId: integer("user_id").references(() => users.id),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: integer("entity_id"),
  payload: text("payload"),
  ipAddress: text("ip_address"),
  createdAt: ts().notNull().$defaultFn(() => new Date()),
}, (t) => [
  index("audit_tenant_date_idx").on(t.tenantId, t.createdAt),
]);
