CREATE TABLE `audit_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tenant_id` integer NOT NULL,
	`user_id` integer,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` integer,
	`payload` text,
	`ip_address` text,
	`timestamp` integer NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `audit_tenant_date_idx` ON `audit_log` (`tenant_id`,`timestamp`);--> statement-breakpoint
CREATE TABLE `customers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tenant_id` integer NOT NULL,
	`name` text NOT NULL,
	`rfc` text,
	`email` text,
	`phone` text,
	`address` text,
	`zip_code` text,
	`tax_regime` text,
	`cfdi_use` text,
	`timestamp` integer NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `customers_tenant_idx` ON `customers` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `customers_rfc_idx` ON `customers` (`tenant_id`,`rfc`);--> statement-breakpoint
CREATE TABLE `departments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tenant_id` integer NOT NULL,
	`name` text NOT NULL,
	`timestamp` integer NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `departments_tenant_name_idx` ON `departments` (`tenant_id`,`name`);--> statement-breakpoint
CREATE TABLE `inventory` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tenant_id` integer NOT NULL,
	`warehouse_id` integer NOT NULL,
	`product_id` integer NOT NULL,
	`quantity` real DEFAULT 0 NOT NULL,
	`min_quantity` real DEFAULT 0 NOT NULL,
	`max_quantity` real DEFAULT 0 NOT NULL,
	`last_cost` real DEFAULT 0 NOT NULL,
	`timestamp` integer NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `inventory_wh_prod_idx` ON `inventory` (`warehouse_id`,`product_id`);--> statement-breakpoint
CREATE INDEX `inventory_tenant_idx` ON `inventory` (`tenant_id`);--> statement-breakpoint
CREATE TABLE `payments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`sale_id` integer NOT NULL,
	`method` text NOT NULL,
	`amount` real NOT NULL,
	`reference` text,
	`timestamp` integer NOT NULL,
	FOREIGN KEY (`sale_id`) REFERENCES `sales`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `payments_sale_idx` ON `payments` (`sale_id`);--> statement-breakpoint
CREATE TABLE `products` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tenant_id` integer NOT NULL,
	`barcode` text,
	`name` text NOT NULL,
	`department_id` integer,
	`sale_unit_id` integer,
	`purchase_unit_id` integer,
	`sale_factor` real DEFAULT 1 NOT NULL,
	`cost` real DEFAULT 0 NOT NULL,
	`utility_pct` real DEFAULT 0 NOT NULL,
	`public_price` real DEFAULT 0 NOT NULL,
	`iva_pct` real DEFAULT 0 NOT NULL,
	`commission_pct` real DEFAULT 0 NOT NULL,
	`active_ingredient` text,
	`is_drug` integer DEFAULT false NOT NULL,
	`is_antibiotic` integer DEFAULT false NOT NULL,
	`is_generic` integer DEFAULT false NOT NULL,
	`cofepris_group` text,
	`retains_prescription` integer DEFAULT false NOT NULL,
	`sat_prod_serv_key` text,
	`sat_unit_key` text,
	`is_service` integer DEFAULT false NOT NULL,
	`description` text,
	`presentation` text,
	`active` integer DEFAULT true NOT NULL,
	`timestamp` integer NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`sale_unit_id`) REFERENCES `units`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`purchase_unit_id`) REFERENCES `units`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `products_tenant_idx` ON `products` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `products_barcode_idx` ON `products` (`tenant_id`,`barcode`);--> statement-breakpoint
CREATE INDEX `products_name_idx` ON `products` (`tenant_id`,`name`);--> statement-breakpoint
CREATE TABLE `sale_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`sale_id` integer NOT NULL,
	`product_id` integer NOT NULL,
	`product_name` text NOT NULL,
	`quantity` real NOT NULL,
	`unit_price` real NOT NULL,
	`iva_pct` real DEFAULT 0 NOT NULL,
	`subtotal` real NOT NULL,
	`iva_amount` real DEFAULT 0 NOT NULL,
	`total` real NOT NULL,
	FOREIGN KEY (`sale_id`) REFERENCES `sales`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `sale_items_sale_idx` ON `sale_items` (`sale_id`);--> statement-breakpoint
CREATE TABLE `sales` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tenant_id` integer NOT NULL,
	`warehouse_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`customer_id` integer,
	`ticket_number` text NOT NULL,
	`subtotal` real DEFAULT 0 NOT NULL,
	`iva_total` real DEFAULT 0 NOT NULL,
	`total` real DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'completed' NOT NULL,
	`cancelled_by_id` integer,
	`timestamp` integer NOT NULL,
	`cfdi_uuid` text,
	`cfdi_status` text DEFAULT 'none' NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`cancelled_by_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `sales_tenant_date_idx` ON `sales` (`tenant_id`,`timestamp`);--> statement-breakpoint
CREATE INDEX `sales_warehouse_idx` ON `sales` (`warehouse_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `sales_ticket_idx` ON `sales` (`tenant_id`,`warehouse_id`,`ticket_number`);--> statement-breakpoint
CREATE TABLE `tenants` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`rfc` text,
	`regimen_fiscal` text,
	`email` text NOT NULL,
	`phone` text,
	`status` text DEFAULT 'trial' NOT NULL,
	`timestamp` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tenants_slug_unique` ON `tenants` (`slug`);--> statement-breakpoint
CREATE TABLE `units` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tenant_id` integer NOT NULL,
	`name` text NOT NULL,
	`abbreviation` text,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `units_tenant_name_idx` ON `units` (`tenant_id`,`name`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tenant_id` integer NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`name` text NOT NULL,
	`role` text DEFAULT 'cashier' NOT NULL,
	`default_warehouse_id` integer,
	`active` integer DEFAULT true NOT NULL,
	`timestamp` integer NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_tenant_email_idx` ON `users` (`tenant_id`,`email`);--> statement-breakpoint
CREATE TABLE `warehouses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tenant_id` integer NOT NULL,
	`name` text NOT NULL,
	`ticket_line1` text,
	`ticket_line2` text,
	`ticket_line3` text,
	`logo_url` text,
	`allows_transfers` integer DEFAULT true NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`timestamp` integer NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `warehouses_tenant_idx` ON `warehouses` (`tenant_id`);