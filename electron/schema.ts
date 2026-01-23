import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

// USERS

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull(), // 'admin' | 'staff' | 'manager'
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

// CATEGORIES

export const categories = sqliteTable("categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  categoryName: text("category_name").notNull().unique(),
});

// SUPPLIERS

export const suppliers = sqliteTable("suppliers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  supplierName: text("supplier_name").notNull().unique(),
  supplierPhone: text("supplier_phone"),
  supplierGstin: text("supplier_gstin"),
  supplierAddress: text("supplier_address"),
});

// PRODUCTS

export const products = sqliteTable("products", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  barcode: text("barcode").notNull().unique(),
  productName: text("product_name").notNull(),
  categoryId: integer("category_id")
    .references(() => categories.id)
    .notNull(),
  supplierId: integer("supplier_id")
    .references(() => suppliers.id)
    .notNull(),
  quantity: real("quantity").notNull().default(0),
  brand: text("brand").notNull(),
  unit: text("unit").notNull(),
  mrp: real("mrp").notNull(),
  cost: real("cost").notNull(),
  gst: real("gst").notNull(),
  reorderLevel: real("reorder_level").notNull().default(0),
  warehouse: text("warehouse"),
  description: text("description"),
  createdAt: integer("created_at", { mode: "timestamp" }),
  updatedAt: integer("updated_at", { mode: "timestamp" }),
});

// RECEIPTS (TRANSACTIONS)

export const receipts = sqliteTable("receipts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  totalAmount: real("total_amount").notNull(),
  tax: real("tax").notNull().default(0),
  paymentSplit: text("payment_split").notNull(), // JSON string
  discount: real("discount").default(0),
  receiptDate: integer("receipt_date", { mode: "timestamp" }).notNull(),
  createdBy: integer("created_by")
    .references(() => users.id)
    .notNull(),
});

// TRANSACTIONS + TRANSACTION ITEMS (requested table names)

export const transactions = sqliteTable("transactions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  finalAmount: real("final_amount").notNull(),
  tax: real("tax").notNull().default(0),
  paymentSplit: text("payment_split").notNull(),
  discount: real("discount").default(0),
  transactionDate: integer("transaction_date", { mode: "timestamp" }).notNull(),
  createdBy: integer("created_by")
    .references(() => users.id)
    .notNull(),
});

export const transactionItems = sqliteTable("transaction_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  transactionId: integer("transaction_id")
    .references(() => transactions.id)
    .notNull(),
  productId: integer("product_id")
    .references(() => products.id)
    .notNull(),
  quantity: real("quantity").notNull(),
  unitPrice: real("unit_price").notNull(),
  amount: real("amount").notNull(),
  tax: real("tax").notNull().default(0),
  discount: real("discount").notNull().default(0),
});

// PRODUCT LOGS (transaction items / stock movements)

export const productLogs = sqliteTable("product_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  productId: integer("product_id")
    .references(() => products.id)
    .notNull(),
  receiptId: integer("receipt_id").references(() => receipts.id),
  type: text("type").notNull(), // 'sale', 'adjustment', etc.
  quantity: real("quantity").notNull().default(1),
  amount: real("amount").notNull(),
  tax: real("tax").notNull().default(0),
  discount: real("discount").notNull().default(0),
  datetime: integer("datetime", { mode: "timestamp" }).notNull(),
});

// USER SETTINGS

export const userSettings = sqliteTable("user_settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  landingPage: text("landing_page").notNull().default("dashboard"),
});

// STORE SETTINGS (legacy/admin-only)

export const storeSettings = sqliteTable("store_settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").references(() => users.id),
  address: text("address"),
  phone: text("phone"),
  gstin: text("gstin"),
  allowNegativeStock: integer("allow_negative_stock", { mode: "boolean" })
    .notNull()
    .default(false),
  defaultGstRate: real("default_gst_rate"),
  defaultReorderLevel: real("default_reorder_level"),
  expiryWarningIn: integer("expiry_warning_in"),
});

// NOTIFICATIONS

export const notifications = sqliteTable("notifications", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  whatsAppNo: text("whatsapp_no"),

  notifyExpiry: integer("notify_expiry", { mode: "boolean" })
    .notNull()
    .default(true),
  notifyReorder: integer("notify_reorder", { mode: "boolean" })
    .notNull()
    .default(true),
  notifyWeeklyReport: integer("notify_weekly_report", { mode: "boolean" })
    .notNull()
    .default(true),
  notifyMonthlyReport: integer("notify_monthly_report", { mode: "boolean" })
    .notNull()
    .default(true),
  notifyDailyRevenue: integer("notify_daily_revenue", { mode: "boolean" })
    .notNull()
    .default(true),

  dailyReportTiming: integer("daily_report_timing", { mode: "timestamp" }),
});

// KEY/VALUE APP SETTINGS (used by Settings page + system thresholds)

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});
