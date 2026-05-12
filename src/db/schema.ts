/**
 * FarmaLat - Schema D1 (Fase 1)
 * 12 tablas core para MVP de POS de farmacia.
 * Multi-tenant via tenant_id en cada tabla operativa.
 */
import { sqliteTable, text, integer, real, index, uniqueIndex } from "drizzle-orm/sqlite-core";

const ts = (name: string) => integer(name, { mode: "timestamp_ms" });
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
  trialEndsAt: ts("trial_ends_at"),
  createdAt: ts("created_at").notNull().$defaultFn(() => new Date()),
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
  createdAt: ts("created_at").notNull().$defaultFn(() => new Date()),
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
  createdAt: ts("created_at").notNull().$defaultFn(() => new Date()),
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
  createdAt: ts("created_at").notNull().$defaultFn(() => new Date()),
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
  // Grupo Art. 226 LGS: I estupefacientes, II psicotr. alta, III psicotr. media, IV antibioticos, V libre. Null = no controlado.
  controlledGroup: text("controlled_group", { enum: ["I", "II", "III", "IV", "V"] }),
  requiresPrescription: integer("requires_prescription", { mode: "boolean" }).notNull().default(false),
  retainsPrescription: integer("retains_prescription", { mode: "boolean" }).notNull().default(false),
  manufacturerHolder: text("manufacturer_holder"),
  tracksBatch: integer("tracks_batch", { mode: "boolean" }).notNull().default(false),

  // SAT
  satProdServKey: text("sat_prod_serv_key"),
  satUnitKey: text("sat_unit_key"),
  isService: integer("is_service", { mode: "boolean" }).notNull().default(false),

  description: text("description"),
  presentation: text("presentation"),

  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: ts("created_at").notNull().$defaultFn(() => new Date()),
  updatedAt: ts("updated_at").notNull().$defaultFn(() => new Date()),
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
  updatedAt: ts("updated_at").notNull().$defaultFn(() => new Date()),
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
  createdAt: ts("created_at").notNull().$defaultFn(() => new Date()),
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
  cancelledAt: ts("cancelled_at"),

  cfdiUuid: text("cfdi_uuid"),
  cfdiStatus: text("cfdi_status", { enum: ["none", "pending", "issued", "cancelled"] }).notNull().default("none"),

  createdAt: ts("created_at").notNull().$defaultFn(() => new Date()),
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
  createdAt: ts("created_at").notNull().$defaultFn(() => new Date()),
}, (t) => [
  index("payments_sale_idx").on(t.saleId),
]);

// ============================================================
// DOCTORS - médicos prescriptores (para comisiones y receta)
// ============================================================
export const doctors = sqliteTable("doctors", {
  id: id(),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id),
  cedula: text("cedula"),
  fullName: text("full_name").notNull(),
  specialty: text("specialty"),
  email: text("email"),
  phone: text("phone"),
  commissionPct: real("commission_pct").notNull().default(0),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: ts("created_at").notNull().$defaultFn(() => new Date()),
}, (t) => [
  index("doctors_tenant_idx").on(t.tenantId),
  uniqueIndex("doctors_cedula_idx").on(t.tenantId, t.cedula),
]);

// ============================================================
// PRODUCT_LOTS - lotes y caducidad por producto
// Obligatorio para productos con controlledGroup. Opcional para resto en F1.
// ============================================================
export const productLots = sqliteTable("product_lots", {
  id: id(),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id),
  productId: integer("product_id").notNull().references(() => products.id),
  warehouseId: integer("warehouse_id").notNull().references(() => warehouses.id),
  lot: text("lot").notNull(),
  expiryDate: ts("expiry_date"),
  qtyOnHand: real("qty_on_hand").notNull().default(0),
  unitCost: real("unit_cost").notNull().default(0),
  receivedAt: ts("received_at").notNull().$defaultFn(() => new Date()),
}, (t) => [
  index("lots_product_idx").on(t.productId, t.warehouseId),
  index("lots_expiry_idx").on(t.tenantId, t.expiryDate),
]);

// ============================================================
// PRESCRIPTIONS - recetas asociadas a venta (Grupo I-III)
// ============================================================
export const prescriptions = sqliteTable("prescriptions", {
  id: id(),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id),
  saleId: integer("sale_id").references(() => sales.id),
  doctorId: integer("doctor_id").references(() => doctors.id),
  type: text("type", { enum: ["physical", "bar_code_cofepris", "electronic"] }).notNull().default("physical"),
  barcode: text("barcode"),                       // codigo de barras COFEPRIS Grupo I
  attachmentUrl: text("attachment_url"),          // R2 con la foto/escaneo
  retained: integer("retained", { mode: "boolean" }).notNull().default(false),
  refillsMax: integer("refills_max").notNull().default(1),
  refillsUsed: integer("refills_used").notNull().default(0),
  patientName: text("patient_name"),
  patientAge: integer("patient_age"),
  issuedAt: ts("issued_at"),
  createdAt: ts("created_at").notNull().$defaultFn(() => new Date()),
}, (t) => [
  index("rx_tenant_idx").on(t.tenantId),
  index("rx_sale_idx").on(t.saleId),
]);

// ============================================================
// INVENTORY_MOVEMENTS - libro de control con saldo materializado
// ============================================================
export const inventoryMovements = sqliteTable("inventory_movements", {
  id: id(),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id),
  warehouseId: integer("warehouse_id").notNull().references(() => warehouses.id),
  productId: integer("product_id").notNull().references(() => products.id),
  lotId: integer("lot_id").references(() => productLots.id),
  controlledGroup: text("controlled_group", { enum: ["I", "II", "III", "IV", "V"] }),
  type: text("type", { enum: ["purchase", "sale", "transfer_in", "transfer_out", "adjustment_in", "adjustment_out", "expired_loss", "return"] }).notNull(),
  quantity: real("quantity").notNull(),           // positivo entrada, negativo salida
  balanceAfter: real("balance_after").notNull(),  // saldo materializado para libro
  unitCost: real("unit_cost"),
  saleId: integer("sale_id").references(() => sales.id),
  prescriptionId: integer("prescription_id").references(() => prescriptions.id),
  supplierInvoice: text("supplier_invoice"),
  reason: text("reason"),
  userId: integer("user_id").references(() => users.id),
  createdAt: ts("created_at").notNull().$defaultFn(() => new Date()),
}, (t) => [
  index("movs_book_idx").on(t.tenantId, t.warehouseId, t.controlledGroup, t.createdAt),
  index("movs_product_idx").on(t.productId, t.createdAt),
]);

// ============================================================
// SUPPLIERS - proveedores (Casa Saba, Nadro, Marzam, etc.)
// ============================================================
export const suppliers = sqliteTable("suppliers", {
  id: id(),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id),
  name: text("name").notNull(),
  contactName: text("contact_name"),
  email: text("email"),
  phone: text("phone"),
  rfc: text("rfc"),
  address: text("address"),
  paymentTerms: text("payment_terms"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: ts("created_at").notNull().$defaultFn(() => new Date()),
}, (t) => [
  index("suppliers_tenant_idx").on(t.tenantId),
]);

// ============================================================
// SUPPLIER_ORDERS - ordenes de compra
// ============================================================
export const supplierOrders = sqliteTable("supplier_orders", {
  id: id(),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id),
  supplierId: integer("supplier_id").notNull().references(() => suppliers.id),
  warehouseId: integer("warehouse_id").notNull().references(() => warehouses.id),
  orderNumber: text("order_number").notNull(),
  status: text("status", { enum: ["draft", "sent", "partial", "received", "cancelled"] }).notNull().default("draft"),
  subtotal: real("subtotal").notNull().default(0),
  ivaTotal: real("iva_total").notNull().default(0),
  total: real("total").notNull().default(0),
  expectedAt: ts("expected_at"),
  sentAt: ts("sent_at"),
  receivedAt: ts("received_at"),
  notes: text("notes"),
  userId: integer("user_id").references(() => users.id),
  createdAt: ts("created_at").notNull().$defaultFn(() => new Date()),
}, (t) => [
  index("supplier_orders_tenant_idx").on(t.tenantId, t.createdAt),
]);

// ============================================================
// SUPPLIER_ORDER_ITEMS - lineas de orden de compra
// ============================================================
export const supplierOrderItems = sqliteTable("supplier_order_items", {
  id: id(),
  orderId: integer("order_id").notNull().references(() => supplierOrders.id),
  productId: integer("product_id").notNull().references(() => products.id),
  productName: text("product_name").notNull(),
  quantityOrdered: real("quantity_ordered").notNull(),
  quantityReceived: real("quantity_received").notNull().default(0),
  unitCost: real("unit_cost").notNull(),
  ivaPct: real("iva_pct").notNull().default(0),
  lot: text("lot"),
  expiryDate: ts("expiry_date"),
}, (t) => [
  index("supplier_order_items_order_idx").on(t.orderId),
]);

// ============================================================
// TRANSFERS - traslados entre sucursales
// ============================================================
export const transfers = sqliteTable("transfers", {
  id: id(),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id),
  fromWarehouseId: integer("from_warehouse_id").notNull().references(() => warehouses.id),
  toWarehouseId: integer("to_warehouse_id").notNull().references(() => warehouses.id),
  transferNumber: text("transfer_number").notNull(),
  status: text("status", { enum: ["draft", "sent", "received", "cancelled"] }).notNull().default("draft"),
  sentAt: ts("sent_at"),
  receivedAt: ts("received_at"),
  notes: text("notes"),
  userId: integer("user_id").references(() => users.id),
  createdAt: ts("created_at").notNull().$defaultFn(() => new Date()),
}, (t) => [
  index("transfers_tenant_idx").on(t.tenantId, t.createdAt),
]);

// ============================================================
// TRANSFER_ITEMS - lineas de traslado
// ============================================================
export const transferItems = sqliteTable("transfer_items", {
  id: id(),
  transferId: integer("transfer_id").notNull().references(() => transfers.id),
  productId: integer("product_id").notNull().references(() => products.id),
  productName: text("product_name").notNull(),
  quantity: real("quantity").notNull(),
  lot: text("lot"),
}, (t) => [
  index("transfer_items_transfer_idx").on(t.transferId),
]);

// ============================================================
// PATIENTS - pacientes para farmacia hospitalaria
// ============================================================
export const patients = sqliteTable("patients", {
  id: id(),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id),
  identifier: text("identifier"),       // expediente, CURP, número de cama
  fullName: text("full_name").notNull(),
  birthDate: ts("birth_date"),
  phone: text("phone"),
  email: text("email"),
  notes: text("notes"),
  createdAt: ts("created_at").notNull().$defaultFn(() => new Date()),
}, (t) => [
  index("patients_tenant_idx").on(t.tenantId),
  index("patients_identifier_idx").on(t.tenantId, t.identifier),
]);

// ============================================================
// PATIENT_ACCOUNTS - cuentas de hospitalizacion
// ============================================================
export const patientAccounts = sqliteTable("patient_accounts", {
  id: id(),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id),
  patientId: integer("patient_id").notNull().references(() => patients.id),
  warehouseId: integer("warehouse_id").notNull().references(() => warehouses.id),
  accountNumber: text("account_number").notNull(),
  status: text("status", { enum: ["open", "closed", "cancelled"] }).notNull().default("open"),
  payerType: text("payer_type", { enum: ["private", "insurance", "imss", "issste", "other"] }).notNull().default("private"),
  bedNumber: text("bed_number"),
  admittedAt: ts("admitted_at"),
  dischargedAt: ts("discharged_at"),
  totalCharged: real("total_charged").notNull().default(0),
  notes: text("notes"),
  saleId: integer("sale_id"),           // cuando se cierra, se crea una sale
  userId: integer("user_id").references(() => users.id),
  createdAt: ts("created_at").notNull().$defaultFn(() => new Date()),
}, (t) => [
  index("patient_accounts_tenant_idx").on(t.tenantId, t.status),
  index("patient_accounts_patient_idx").on(t.patientId),
]);

// ============================================================
// PATIENT_ACCOUNT_ITEMS - cargos por consumo
// ============================================================
export const patientAccountItems = sqliteTable("patient_account_items", {
  id: id(),
  accountId: integer("account_id").notNull().references(() => patientAccounts.id),
  productId: integer("product_id").notNull().references(() => products.id),
  productName: text("product_name").notNull(),
  quantity: real("quantity").notNull(),
  unitPrice: real("unit_price").notNull(),
  ivaPct: real("iva_pct").notNull().default(0),
  subtotal: real("subtotal").notNull(),
  total: real("total").notNull(),
  doctorId: integer("doctor_id").references(() => doctors.id),
  createdAt: ts("created_at").notNull().$defaultFn(() => new Date()),
}, (t) => [
  index("paitems_account_idx").on(t.accountId),
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
  createdAt: ts("created_at").notNull().$defaultFn(() => new Date()),
}, (t) => [
  index("audit_tenant_date_idx").on(t.tenantId, t.createdAt),
]);
