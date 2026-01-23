/**
 * Ensure Node.js globals are available for better-sqlite3
 * These should be set by main.ts, but we double-check here
 */
if (!(global as any).__filename) {
  (global as any).__filename = import.meta.url;
}
if (!(global as any).__dirname) {
  (global as any).__dirname = import.meta.url;
}

import bcrypt from "bcrypt";
import type { Database } from "better-sqlite3";
import { count, eq } from "drizzle-orm";
import { db, sqlite } from "./db";
import {
  categories,
  productLogs,
  products,
  receipts,
  settings,
  suppliers,
  transactionItems,
  transactions,
  users,
} from "./schema";

function hasColumn(sqliteDb: Database, table: string, column: string) {
  const rows = sqliteDb.prepare(`PRAGMA table_info(${table})`).all() as Array<{
    name: string;
  }>;
  return rows.some((r) => r.name === column);
}

function ensureColumn(
  sqliteDb: Database,
  table: string,
  column: string,
  ddl: string
) {
  if (hasColumn(sqliteDb, table, column)) return;
  sqliteDb.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
}

export function ensureDbSchema() {
  console.log("📊 Starting ensureDbSchema...");
  try {
    sqlite.exec(`
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        role TEXT NOT NULL,
        active INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category_name TEXT NOT NULL UNIQUE
      );

      CREATE TABLE IF NOT EXISTS suppliers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        supplier_name TEXT NOT NULL UNIQUE,
        supplier_phone TEXT,
        supplier_gstin TEXT,
        supplier_address TEXT
      );

      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        barcode TEXT NOT NULL UNIQUE,
        product_name TEXT NOT NULL,
        category_id INTEGER NOT NULL REFERENCES categories(id),
        supplier_id INTEGER NOT NULL REFERENCES suppliers(id),
        quantity REAL NOT NULL DEFAULT 0,
        brand TEXT NOT NULL,
        unit TEXT NOT NULL,
        mrp REAL NOT NULL,
        cost REAL NOT NULL,
        gst REAL NOT NULL,
        reorder_level REAL NOT NULL DEFAULT 0,
        warehouse TEXT,
        description TEXT,
        created_at INTEGER,
        updated_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS receipts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        total_amount REAL NOT NULL,
        tax REAL NOT NULL DEFAULT 0,
        payment_split TEXT NOT NULL,
        discount REAL DEFAULT 0,
        receipt_date INTEGER,
        created_by INTEGER NOT NULL REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        final_amount REAL NOT NULL,
        tax REAL NOT NULL DEFAULT 0,
        payment_split TEXT NOT NULL,
        discount REAL DEFAULT 0,
        transaction_date INTEGER NOT NULL,
        created_by INTEGER NOT NULL REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS transaction_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        transaction_id INTEGER NOT NULL REFERENCES transactions(id),
        product_id INTEGER NOT NULL REFERENCES products(id),
        quantity REAL NOT NULL,
        unit_price REAL NOT NULL,
        amount REAL NOT NULL,
        tax REAL NOT NULL DEFAULT 0,
        discount REAL NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS product_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL REFERENCES products(id),
        receipt_id INTEGER REFERENCES receipts(id),
        type TEXT NOT NULL,
        quantity REAL NOT NULL DEFAULT 1,
        amount REAL NOT NULL,
        tax REAL NOT NULL DEFAULT 0,
        discount REAL NOT NULL DEFAULT 0,
        datetime INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS user_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id),
        landing_page TEXT NOT NULL DEFAULT 'dashboard'
      );

      CREATE TABLE IF NOT EXISTS store_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER REFERENCES users(id),
        address TEXT,
        phone TEXT,
        gstin TEXT,
        allow_negative_stock INTEGER NOT NULL DEFAULT 0,
        default_gst_rate REAL,
        default_reorder_level REAL,
        expiry_warning_in INTEGER
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id),
        whatsapp_no TEXT,
        notify_expiry INTEGER NOT NULL DEFAULT 1,
        notify_reorder INTEGER NOT NULL DEFAULT 1,
        notify_weekly_report INTEGER NOT NULL DEFAULT 1,
        notify_monthly_report INTEGER NOT NULL DEFAULT 1,
        notify_daily_revenue INTEGER NOT NULL DEFAULT 1,
        daily_report_timing INTEGER
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);

    console.log("📊 Base schema created successfully");

    ensureColumn(sqlite, "users", "active", "active INTEGER NOT NULL DEFAULT 1");
    console.log("📊 Users 'active' column ensured");
    
    ensureColumn(
      sqlite,
      "products",
      "warehouse",
      "warehouse TEXT"
    );
    console.log("📊 Products 'warehouse' column ensured");
    
    ensureColumn(
      sqlite,
      "products",
      "description",
      "description TEXT"
    );
    console.log("📊 Products 'description' column ensured");
    
    console.log("✅ ensureDbSchema completed successfully");
  } catch (e) {
    console.error("❌ ensureDbSchema failed:", e);
    console.error("❌ Schema error details:", {
      message: e instanceof Error ? e.message : String(e),
      stack: e instanceof Error ? e.stack : undefined,
      timestamp: new Date().toISOString()
    });
    throw e;
  }
}

type PaymentSplit = { cashAmt: number; upiAmt: number; cardAmt: number };

function splitToJson(split: PaymentSplit) {
  return JSON.stringify({
    cashAmt: Number(split.cashAmt || 0),
    upiAmt: Number(split.upiAmt || 0),
    cardAmt: Number(split.cardAmt || 0),
  });
}

function computeReceiptTotals(args: {
  items: Array<{ productId: number; qty: number }>;
  discount: number;
}) {
  const rows = args.items.map((it) => {
    const p = db.select().from(products).where(eq(products.id, it.productId)).get();
    if (!p) throw new Error(`Product not found: ${it.productId}`);
    const qty = Number(it.qty);
    if (qty <= 0) throw new Error("Invalid quantity");
    if (Number(p.quantity) < qty) {
      throw new Error(`Insufficient stock for ${p.productName}`);
    }

    const lineGross = Number(p.mrp) * qty;
    const lineTax = (lineGross * Number(p.gst || 0)) / 100;
    return { product: p, qty, lineGross, lineTax };
  });

  const subtotal = rows.reduce((acc, r) => acc + r.lineGross, 0);
  const tax = rows.reduce((acc, r) => acc + r.lineTax, 0);
  const discount = Math.max(0, Math.min(Number(args.discount || 0), subtotal));

  const total = Math.max(0, subtotal - discount + tax);
  return { rows, subtotal, tax, discount, total };
}

export function createReceiptWithItems(args: {
  createdBy: number;
  receiptDate: Date;
  discount: number;
  paymentSplit: PaymentSplit;
  items: Array<{ productId: number; qty: number }>;
}) {
  const tx = sqlite.transaction(() => {
    const { rows, subtotal, tax, discount, total } = computeReceiptTotals({
      items: args.items,
      discount: args.discount,
    });

    const insertedTx = db
      .insert(transactions)
      .values({
        finalAmount: total,
        tax,
        paymentSplit: splitToJson(args.paymentSplit),
        discount,
        transactionDate: args.receiptDate,
        createdBy: args.createdBy,
      })
      .run();

    const transactionId = Number(insertedTx.lastInsertRowid);

    // Keep receipts in-sync (used by existing UI)
    db.insert(receipts)
      .values({
        id: transactionId,
        totalAmount: total,
        tax,
        paymentSplit: splitToJson(args.paymentSplit),
        discount,
        receiptDate: args.receiptDate,
        createdBy: args.createdBy,
      })
      .run();

    const receiptId = transactionId;

    for (const r of rows) {
      const lineDiscount =
        subtotal > 0 ? (discount * r.lineGross) / subtotal : 0;

      db.insert(transactionItems)
        .values({
          transactionId,
          productId: r.product.id,
          quantity: r.qty,
          unitPrice: Number(r.product.mrp),
          amount: r.lineGross,
          tax: r.lineTax,
          discount: lineDiscount,
        })
        .run();

      db.insert(productLogs)
        .values({
          productId: r.product.id,
          receiptId,
          type: "sale",
          quantity: r.qty,
          amount: r.lineGross,
          tax: r.lineTax,
          discount: lineDiscount,
          datetime: args.receiptDate,
        })
        .run();

      db.update(products)
        .set({
          quantity: Number(r.product.quantity) - r.qty,
          updatedAt: new Date(),
        })
        .where(eq(products.id, r.product.id))
        .run();
    }

    return { receiptId, transactionId, totalAmount: total, tax, discount };
  });

  return tx();
}

export async function seedDbIfEmpty() {
  console.log("🌱 Starting seedDbIfEmpty...");
  try {
    const existing = db.select({ count: count() }).from(users).get();
    if ((existing?.count ?? 0) > 0) {
      console.log("🌱 Database already seeded, skipping");
      return;
    }

    const now = new Date();

    // Hash passwords before seeding
    const adminPassword = await bcrypt.hash("1234", 10);
    const staffPassword = await bcrypt.hash("staff123", 10);
    const managerPassword = await bcrypt.hash("manager123", 10);

    // Users
    db.insert(users)
      .values([
        {
          name: "admin",
          password: adminPassword,
          role: "admin",
          active: true,
          createdAt: now,
        },
        {
          name: "staff1",
          password: staffPassword,
          role: "staff",
          active: true,
          createdAt: now,
        },
        {
          name: "manager1",
          password: managerPassword,
          role: "manager",
          active: true,
          createdAt: now,
        },
      ])
      .run();

    // Categories
    const catNames = ["Grocery", "Dairy", "Beverages", "Bakery", "Snacks"] as const;
    for (const categoryName of catNames) {
      db.insert(categories).values({ categoryName }).run();
    }

    // Supplier (required by products schema)
    const sup = db
      .insert(suppliers)
      .values({
        supplierName: "AVM Default Supplier",
        supplierPhone: "+91-9000000000",
        supplierAddress: "Lakshmipuram, Tamil Nadu",
      })
      .run();
    const supplierId = Number(sup.lastInsertRowid);

  const catByName = (name: string) =>
    db.select().from(categories).where(eq(categories.categoryName, name)).get()!
      .id;

  const nowTs = now;

  // Products (20+)
  const seedProducts: Array<{
    barcode: string;
    productName: string;
    categoryName: (typeof catNames)[number];
    brand: string;
    unit: string;
    mrp: number;
    cost: number;
    gst: number;
    quantity: number;
    reorderLevel: number;
    warehouse?: string;
    description?: string;
  }> = [
    {
      barcode: "890100000001",
      productName: "Rice 5kg",
      categoryName: "Grocery",
      brand: "AVM",
      unit: "pack",
      mrp: 320,
      cost: 280,
      gst: 0,
      quantity: 60,
      reorderLevel: 10,
      warehouse: "Main",
    },
    {
      barcode: "890100000002",
      productName: "Wheat Flour 1kg",
      categoryName: "Grocery",
      brand: "Aashirvaad",
      unit: "pack",
      mrp: 58,
      cost: 48,
      gst: 0,
      quantity: 120,
      reorderLevel: 15,
      warehouse: "Main",
    },
    {
      barcode: "890100000003",
      productName: "Sugar 1kg",
      categoryName: "Grocery",
      brand: "AVM",
      unit: "pack",
      mrp: 52,
      cost: 45,
      gst: 0,
      quantity: 90,
      reorderLevel: 12,
      warehouse: "Main",
    },
    {
      barcode: "890100000004",
      productName: "Sunflower Oil 1L",
      categoryName: "Grocery",
      brand: "Fortune",
      unit: "L",
      mrp: 145,
      cost: 128,
      gst: 5,
      quantity: 40,
      reorderLevel: 8,
      warehouse: "Main",
    },
    {
      barcode: "890100000005",
      productName: "Toor Dal 1kg",
      categoryName: "Grocery",
      brand: "AVM",
      unit: "pack",
      mrp: 170,
      cost: 150,
      gst: 0,
      quantity: 55,
      reorderLevel: 10,
      warehouse: "Main",
    },

    {
      barcode: "890100000006",
      productName: "Milk 500ml",
      categoryName: "Dairy",
      brand: "Aavin",
      unit: "ml",
      mrp: 26,
      cost: 22,
      gst: 0,
      quantity: 8,
      reorderLevel: 10,
      warehouse: "Main",
    },
    {
      barcode: "890100000007",
      productName: "Curd 500g",
      categoryName: "Dairy",
      brand: "Aavin",
      unit: "pack",
      mrp: 42,
      cost: 36,
      gst: 0,
      quantity: 25,
      reorderLevel: 10,
      warehouse: "Main",
    },
    {
      barcode: "890100000008",
      productName: "Butter 100g",
      categoryName: "Dairy",
      brand: "Amul",
      unit: "pack",
      mrp: 60,
      cost: 52,
      gst: 0,
      quantity: 18,
      reorderLevel: 8,
      warehouse: "Main",
    },
    {
      barcode: "890100000009",
      productName: "Paneer 200g",
      categoryName: "Dairy",
      brand: "Amul",
      unit: "pack",
      mrp: 90,
      cost: 78,
      gst: 0,
      quantity: 10,
      reorderLevel: 6,
      warehouse: "Main",
    },

    {
      barcode: "890100000010",
      productName: "Bread - White",
      categoryName: "Bakery",
      brand: "Britannia",
      unit: "pack",
      mrp: 40,
      cost: 34,
      gst: 0,
      quantity: 1,
      reorderLevel: 10,
      warehouse: "Main",
    },
    {
      barcode: "890100000011",
      productName: "Bun Pack (6 pcs)",
      categoryName: "Bakery",
      brand: "Local",
      unit: "pack",
      mrp: 35,
      cost: 28,
      gst: 0,
      quantity: 14,
      reorderLevel: 10,
      warehouse: "Main",
    },

    {
      barcode: "890100000012",
      productName: "Coca-Cola 500ml",
      categoryName: "Beverages",
      brand: "Coca-Cola",
      unit: "ml",
      mrp: 40,
      cost: 34,
      gst: 12,
      quantity: 70,
      reorderLevel: 15,
      warehouse: "Main",
    },
    {
      barcode: "890100000013",
      productName: "Water 1L",
      categoryName: "Beverages",
      brand: "Bisleri",
      unit: "L",
      mrp: 20,
      cost: 14,
      gst: 0,
      quantity: 200,
      reorderLevel: 30,
      warehouse: "Main",
    },
    {
      barcode: "890100000014",
      productName: "Tea Powder 250g",
      categoryName: "Beverages",
      brand: "Tata Tea",
      unit: "pack",
      mrp: 90,
      cost: 78,
      gst: 5,
      quantity: 35,
      reorderLevel: 10,
      warehouse: "Main",
    },
    {
      barcode: "890100000015",
      productName: "Coffee 100g",
      categoryName: "Beverages",
      brand: "Bru",
      unit: "pack",
      mrp: 110,
      cost: 95,
      gst: 5,
      quantity: 12,
      reorderLevel: 10,
      warehouse: "Main",
    },

    {
      barcode: "890100000016",
      productName: "Biscuit - Marie",
      categoryName: "Snacks",
      brand: "Britannia",
      unit: "pack",
      mrp: 25,
      cost: 18,
      gst: 0,
      quantity: 100,
      reorderLevel: 20,
      warehouse: "Main",
    },
    {
      barcode: "890100000017",
      productName: "Potato Chips 50g",
      categoryName: "Snacks",
      brand: "Lay's",
      unit: "pack",
      mrp: 20,
      cost: 14,
      gst: 12,
      quantity: 30,
      reorderLevel: 15,
      warehouse: "Main",
    },
    {
      barcode: "890100000018",
      productName: "Chocolate Bar",
      categoryName: "Snacks",
      brand: "Dairy Milk",
      unit: "piece",
      mrp: 40,
      cost: 30,
      gst: 18,
      quantity: 5,
      reorderLevel: 10,
      warehouse: "Main",
    },
    {
      barcode: "890100000019",
      productName: "Instant Noodles",
      categoryName: "Snacks",
      brand: "Maggi",
      unit: "pack",
      mrp: 14,
      cost: 10,
      gst: 0,
      quantity: 150,
      reorderLevel: 25,
      warehouse: "Main",
    },
    {
      barcode: "890100000020",
      productName: "Salt 1kg",
      categoryName: "Grocery",
      brand: "Tata",
      unit: "pack",
      mrp: 22,
      cost: 16,
      gst: 0,
      quantity: 80,
      reorderLevel: 12,
      warehouse: "Main",
    },
    {
      barcode: "890100000021",
      productName: "Dishwash Liquid 500ml",
      categoryName: "Grocery",
      brand: "Vim",
      unit: "ml",
      mrp: 110,
      cost: 92,
      gst: 18,
      quantity: 9,
      reorderLevel: 10,
      warehouse: "Main",
    },
  ];

  for (const p of seedProducts) {
    db.insert(products)
      .values({
        barcode: p.barcode,
        productName: p.productName,
        categoryId: catByName(p.categoryName),
        supplierId,
        quantity: p.quantity,
        brand: p.brand,
        unit: p.unit,
        mrp: p.mrp,
        cost: p.cost,
        gst: p.gst,
        reorderLevel: p.reorderLevel,
        warehouse: p.warehouse,
        description: p.description,
        createdAt: nowTs,
        updatedAt: nowTs,
      })
      .run();
  }

  // Required settings
  const settingsSeed: Record<string, string> = {
    storeName: "AVM Grocery Store",
    storeLocation: "Lakshmipuram, Tamil Nadu",
    storePhone: "+91-9876543210",
    storeEmail: "contact@avmgrocery.com",
    taxRate: "5",
    lowStockThreshold: "10",
    currency: "INR",
    discountPolicy: "percent",
  };

  for (const [key, value] of Object.entries(settingsSeed)) {
    db.insert(settings)
      .values({ key, value, updatedAt: now })
      .run();
  }

  const admin = db.select().from(users).where(eq(users.name, "admin")).get();
  if (!admin) return;

  // Sample receipts over last 7 days
  const allProducts = db.select().from(products).all();
  const byBarcode = new Map(allProducts.map((p) => [p.barcode, p]));

  const sampleReceipts: Array<{
    daysAgo: number;
    items: Array<{ barcode: string; qty: number }>;
    payment: PaymentSplit;
    discountPct?: number;
  }> = [
    {
      daysAgo: 0,
      items: [
        { barcode: "890100000001", qty: 1 },
        { barcode: "890100000013", qty: 2 },
        { barcode: "890100000016", qty: 1 },
      ],
      payment: { cashAmt: 0, upiAmt: 0, cardAmt: 0 },
      discountPct: 5,
    },
    {
      daysAgo: 0,
      items: [
        { barcode: "890100000012", qty: 1 },
        { barcode: "890100000019", qty: 3 },
      ],
      payment: { cashAmt: 0, upiAmt: 0, cardAmt: 0 },
    },
    {
      daysAgo: 1,
      items: [
        { barcode: "890100000003", qty: 1 },
        { barcode: "890100000020", qty: 1 },
      ],
      payment: { cashAmt: 0, upiAmt: 0, cardAmt: 0 },
      discountPct: 10,
    },
    {
      daysAgo: 1,
      items: [
        { barcode: "890100000014", qty: 1 },
        { barcode: "890100000006", qty: 2 },
        { barcode: "890100000017", qty: 1 },
      ],
      payment: { cashAmt: 0, upiAmt: 0, cardAmt: 0 },
    },
    {
      daysAgo: 2,
      items: [
        { barcode: "890100000004", qty: 1 },
        { barcode: "890100000005", qty: 1 },
      ],
      payment: { cashAmt: 0, upiAmt: 0, cardAmt: 0 },
    },
    {
      daysAgo: 2,
      items: [
        { barcode: "890100000013", qty: 3 },
        { barcode: "890100000016", qty: 2 },
        { barcode: "890100000018", qty: 1 },
      ],
      payment: { cashAmt: 0, upiAmt: 0, cardAmt: 0 },
      discountPct: 5,
    },
    {
      daysAgo: 3,
      items: [
        { barcode: "890100000002", qty: 2 },
        { barcode: "890100000007", qty: 1 },
      ],
      payment: { cashAmt: 0, upiAmt: 0, cardAmt: 0 },
    },
    {
      daysAgo: 3,
      items: [
        { barcode: "890100000012", qty: 2 },
        { barcode: "890100000017", qty: 2 },
      ],
      payment: { cashAmt: 0, upiAmt: 0, cardAmt: 0 },
    },
    {
      daysAgo: 4,
      items: [
        { barcode: "890100000010", qty: 1 },
        { barcode: "890100000011", qty: 1 },
        { barcode: "890100000006", qty: 1 },
      ],
      payment: { cashAmt: 0, upiAmt: 0, cardAmt: 0 },
    },
    {
      daysAgo: 5,
      items: [
        { barcode: "890100000020", qty: 1 },
        { barcode: "890100000003", qty: 1 },
        { barcode: "890100000014", qty: 1 },
      ],
      payment: { cashAmt: 0, upiAmt: 0, cardAmt: 0 },
    },
    {
      daysAgo: 6,
      items: [
        { barcode: "890100000001", qty: 1 },
        { barcode: "890100000012", qty: 1 },
        { barcode: "890100000013", qty: 2 },
      ],
      payment: { cashAmt: 0, upiAmt: 0, cardAmt: 0 },
    },
    {
      daysAgo: 6,
      items: [
        { barcode: "890100000019", qty: 5 },
        { barcode: "890100000016", qty: 2 },
      ],
      payment: { cashAmt: 0, upiAmt: 0, cardAmt: 0 },
      discountPct: 5,
    },
  ];

  // assign payment mixes
  const paymentModes: PaymentSplit[] = [
    { cashAmt: 1, upiAmt: 0, cardAmt: 0 },
    { cashAmt: 0, upiAmt: 1, cardAmt: 0 },
    { cashAmt: 0, upiAmt: 0, cardAmt: 1 },
    { cashAmt: 0.5, upiAmt: 0.5, cardAmt: 0 },
    { cashAmt: 0.5, upiAmt: 0, cardAmt: 0.5 },
  ];

  for (let i = 0; i < sampleReceipts.length; i++) {
    const s = sampleReceipts[i];
    const date = new Date();
    date.setDate(date.getDate() - s.daysAgo);
    date.setHours(10 + (i % 9), 15 + ((i * 7) % 40), 0, 0);

    const items = s.items
      .map((it) => {
        const p = byBarcode.get(it.barcode);
        if (!p) return null;
        return { productId: p.id, qty: it.qty };
      })
      .filter((x): x is { productId: number; qty: number } => Boolean(x));

    const totals = computeReceiptTotals({ items, discount: 0 });
    const discount =
      s.discountPct && totals.subtotal > 0
        ? (totals.subtotal * s.discountPct) / 100
        : 0;

    const paymentRatio = paymentModes[i % paymentModes.length];
    const totalAmount = Math.max(0, totals.subtotal - discount + totals.tax);
    const paymentSplit: PaymentSplit = {
      cashAmt: totalAmount * paymentRatio.cashAmt,
      upiAmt: totalAmount * paymentRatio.upiAmt,
      cardAmt: totalAmount * paymentRatio.cardAmt,
    };

    createReceiptWithItems({
      createdBy: admin.id,
      receiptDate: date,
      discount,
      paymentSplit,
      items,
    });
  }

  // Ensure at least one product log exists for dashboard/top-selling
    const logCount =
      db.select({ count: count() }).from(productLogs).get()?.count ?? 0;
    if (logCount === 0) {
      const p = db.select().from(products).limit(1).get();
      if (p) {
        createReceiptWithItems({
          createdBy: admin.id,
          receiptDate: new Date(),
          discount: 0,
          paymentSplit: { cashAmt: p.mrp, upiAmt: 0, cardAmt: 0 },
          items: [{ productId: p.id, qty: 1 }],
        });
      }
    }

    console.log("✅ seedDbIfEmpty completed successfully");
  } catch (e) {
    console.error("❌ seedDbIfEmpty failed:", e);
    console.error("❌ Seeding error details:", {
      message: e instanceof Error ? e.message : String(e),
      stack: e instanceof Error ? e.stack : undefined,
      timestamp: new Date().toISOString()
    });
    throw e;
  }

}
