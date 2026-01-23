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

import { BrowserWindow, ipcMain } from "electron";
import bcrypt from "bcrypt";
import { and, count, desc, eq, gte, lte } from "drizzle-orm";
import { db } from "./db";
import {
  createReceiptWithItems,
  ensureDbSchema,
  seedDbIfEmpty,
} from "./bootstrap";
import {
  categories,
  notifications,
  productLogs,
  products,
  receipts,
  settings,
  storeSettings,
  suppliers,
  transactionItems,
  userSettings,
  users,
} from "./schema";

// Types for bill printing
type BillItem = { name: string; qty: number; price: number };
type BillPayload = {
  storeName: string;
  address: string;
  phone: string;
  billNo: string;
  dateTime: string;
  items: BillItem[];
  total: number;
  paymentMode: string;
};
type PosPrintData =
  | { type: "text"; value: string; style?: any }
  | {
      type: "table";
      tableHeader: string[];
      tableBody: (string | number)[][];
      style?: any;
      tableHeaderStyle?: any;
      tableBodyStyle?: any;
    }
  | { type: "image"; path?: string; url?: string; style?: any }
  | {
      type: "barCode" | "qrCode";
      value: string;
      height?: number;
      width?: number;
      style?: any;
    };

type Role = "admin" | "staff" | "manager";

type DeviceStatus = "connected" | "disconnected" | "unknown";
let lastScannerActivityAt: number | null = null;
const SCANNER_ACTIVE_WINDOW_MS = 30_000;

// Session management
let currentUser: { id: number; name: string; role: Role } | null = null;

function escapeHtml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildReceiptHtml(payload: BillPayload) {
  const itemRows = payload.items
    .map((it) => {
      const amt = Number(it.qty) * Number(it.price);
      return `<tr>
        <td class="name">${escapeHtml(it.name)}</td>
        <td class="qty">${Number(it.qty)}</td>
        <td class="rate">${Number(it.price).toFixed(2)}</td>
        <td class="amt">${amt.toFixed(2)}</td>
      </tr>`;
    })
    .join("\n");

  const total = Number(payload.total || 0).toFixed(2);

  return `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Receipt</title>
      <style>
        * { box-sizing: border-box; }
        body { margin: 0; padding: 10px; font-family: Arial, sans-serif; }
        .receipt { width: 280px; }
        .center { text-align: center; }
        .logo { font-weight: 800; letter-spacing: 2px; font-size: 18px; }
        .muted { color: #444; font-size: 11px; }
        .meta { margin-top: 6px; font-size: 11px; }
        .hr { border-top: 1px dashed #111; margin: 8px 0; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; }
        th { text-align: left; padding: 2px 0; border-bottom: 1px solid #ddd; }
        td { padding: 2px 0; vertical-align: top; }
        td.qty, td.rate, td.amt { text-align: right; width: 52px; }
        td.name { width: auto; }
        .totalRow { display: flex; justify-content: space-between; font-size: 12px; font-weight: 700; }
        .foot { margin-top: 8px; font-size: 11px; }
      </style>
    </head>
    <body>
      <div class="receipt">
        <div class="center">
          <div class="logo">AVM</div>
          <div style="font-size:14px; font-weight:700;">${escapeHtml(payload.storeName)}</div>
          <div class="muted">${escapeHtml(payload.address)}</div>
          <div class="muted">Phone: ${escapeHtml(payload.phone)}</div>
        </div>

        <div class="hr"></div>

        <div class="meta">
          <div>Bill: ${escapeHtml(payload.billNo)}</div>
          <div>${escapeHtml(payload.dateTime)}</div>
        </div>

        <div class="hr"></div>

        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th style="text-align:right;">Qty</th>
              <th style="text-align:right;">Rate</th>
              <th style="text-align:right;">Amt</th>
            </tr>
          </thead>
          <tbody>
            ${itemRows}
          </tbody>
        </table>

        <div class="hr"></div>

        <div class="totalRow">
          <span>Total</span>
          <span>${total}</span>
        </div>
        <div class="foot">
          <div>Payment: ${escapeHtml(payload.paymentMode)}</div>
          <div class="center" style="margin-top:6px;">Thank you! Visit again.</div>
        </div>
      </div>
    </body>
  </html>`;
}

/**
 * Helper to build receipt data for PosPrinter.
 * Kept as a pure function with no side effects so it can be unit-tested easily
 * and does not contribute to startup-time crashes.
 */
export function buildReceiptData(payload: BillPayload): PosPrintData[] {
  const {
    storeName,
    address,
    phone,
    billNo,
    dateTime,
    items,
    total,
    paymentMode,
  } = payload;

  const itemRows = items.map((item) => [
    item.name,
    String(item.qty),
    item.price.toFixed(2),
    (item.qty * item.price).toFixed(2),
  ]);

  return [
    {
      type: "text",
      value: storeName,
      style: {
        fontWeight: "700",
        textAlign: "center",
        fontSize: "18px",
      },
    },
    {
      type: "text",
      value: address,
      style: { textAlign: "center", fontSize: "10px" },
    },
    {
      type: "text",
      value: `Phone: ${phone}`,
      style: {
        textAlign: "center",
        fontSize: "10px",
        margin: "0 0 4px 0",
      },
    },
    {
      type: "text",
      value: `Bill No: ${billNo}   Date: ${dateTime}`,
      style: { fontSize: "10px", margin: "4px 0" },
    },
    {
      type: "text",
      value: "--------------------------------",
      style: { textAlign: "center" },
    },
    {
      type: "table",
      style: { border: "0px solid #fff" },
      tableHeader: ["Item", "Qty", "Rate", "Amt"],
      tableBody: itemRows,
      tableHeaderStyle: { fontSize: "10px", fontWeight: "700" },
      tableBodyStyle: { fontSize: "10px" },
    },
    {
      type: "text",
      value: "--------------------------------",
      style: { textAlign: "center" },
    },
    {
      type: "text",
      value: `Total: ${total.toFixed(2)}`,
      style: {
        fontSize: "12px",
        fontWeight: "700",
        textAlign: "right",
      },
    },
    {
      type: "text",
      value: `Payment: ${paymentMode}`,
      style: {
        fontSize: "10px",
        textAlign: "right",
        margin: "4px 0 0 0",
      },
    },
    {
      type: "text",
      value: "Thank you! Visit again.",
      style: { textAlign: "center", margin: "6px 0 0 0" },
    },
  ];
}

function ok<T extends object>(data?: T) {
  return { success: true, ...(data ?? {}) };
}
function fail(error: unknown) {
  return { success: false, error: String(error) };
}

function assertAdmin(currentUserId: number) {
  try {
    console.log(`🔐 Checking admin status for user ${currentUserId}`);
    const u = db.select().from(users).where(eq(users.id, currentUserId)).get();
    if (!u) throw new Error("Current user not found");
    if (u.role !== "admin") throw new Error("Access denied (admin only)");
    console.log(`✅ Admin check passed for user ${currentUserId}`);
    return u;
  } catch (e) {
    console.error(`❌ Admin check failed for user ${currentUserId}:`, e);
    throw e;
  }
}

export async function setupHandlers() {
  console.log("🚀 Starting setupHandlers()...");
  
  // Remove all existing handlers to prevent duplicates
  ipcMain.removeAllListeners("print-bill");
  ipcMain.removeAllListeners("print-bill:success");
  ipcMain.removeAllListeners("print-bill:error");
  
  let bootstrapError: string | null = null;
  try {
    console.log("📊 Ensuring database schema...");
    ensureDbSchema();
    console.log("📊 Schema ensured successfully");
    
    console.log("🌱 Seeding database if empty...");
    await seedDbIfEmpty();
    console.log("🌱 Database seeding completed");
  } catch (e) {
    bootstrapError = String(e);
    console.error("❌ DB bootstrap failed:", e);
    console.error("❌ Bootstrap error details:", {
      message: e instanceof Error ? e.message : String(e),
      stack: e instanceof Error ? e.stack : undefined,
      name: e instanceof Error ? e.name : undefined
    });
  }

  console.log("🔧 Setting up IPC handlers...");

  // -------- Auth --------

  ipcMain.handle("auth:check-init", () => {
    try {
      console.log("🔍 auth:check-init called");
      if (bootstrapError) {
        console.log("❌ Bootstrap error detected:", bootstrapError);
        return fail(bootstrapError);
      }
      const result = db.select({ count: count() }).from(users).get();
      console.log("✅ auth:check-init success");
      return ok({ isInit: (result?.count ?? 0) > 0 });
    } catch (e) {
      console.error("❌ auth:check-init failed:", e);
      return fail(e);
    }
  });

  ipcMain.handle(
    "auth:setup-admin",
    async (_, { name, password }: { name: string; password: string }) => {
      try {
        console.log("🔍 auth:setup-admin called for:", name);
        if (bootstrapError) {
          console.log("❌ Bootstrap error detected:", bootstrapError);
          return fail(bootstrapError);
        }
        const existing = db.select({ count: count() }).from(users).get();
        if ((existing?.count ?? 0) > 0) {
          console.log("✅ auth:setup-admin: already initialized");
          return ok({ message: "Already initialized" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        db.insert(users)
          .values({
            name,
            password: hashedPassword,
            role: "admin",
            createdAt: new Date(),
          })
          .run();

        console.log("✅ auth:setup-admin success");
        return ok();
      } catch (e) {
        console.error("❌ auth:setup-admin failed:", e);
        return fail(e);
      }
    },
  );

  ipcMain.handle(
    "auth:login",
    async (_, { name, password }: { name: string; password: string }) => {
      try {
        if (bootstrapError) return fail(bootstrapError);
        const u = db.select().from(users).where(eq(users.name, name)).get();
        if (!u) return { success: false, error: "Invalid credentials" };
        
        const passwordMatch = await bcrypt.compare(password, u.password);
        if (!passwordMatch) return { success: false, error: "Invalid credentials" };
        
        if (!u.active) return { success: false, error: "User is disabled" };

        // Set current user session
        currentUser = { id: u.id, name: u.name, role: u.role as Role };

        return ok({
          user: { id: u.id, name: u.name, role: u.role as Role },
        });
      } catch (e) {
        return fail(e);
      }
    },
  );

  ipcMain.handle(
    "auth:change-password",
    async (_, args: { currentUserId: number; password: string }) => {
      try {
        const existingUser = db
          .select()
          .from(users)
          .where(eq(users.id, args.currentUserId))
          .get();
        if (!existingUser) return fail("User not found");

        const passwordMatch = await bcrypt.compare(args.password, existingUser.password);
        if (!passwordMatch) return fail("Current password is incorrect");
        
        const hashedPassword = await bcrypt.hash(args.password, 10);
        db.update(users)
          .set({ password: hashedPassword })
          .where(eq(users.id, args.currentUserId))
          .run();
        return ok();
      } catch (e) {
        return fail(e);
      }
    },
  );

  ipcMain.handle("auth:logout", () => {
    try {
      currentUser = null;
      return ok();
    } catch (e) {
      return fail(e);
    }
  });

  ipcMain.handle("auth:checkSession", () => {
    try {
      return ok({ user: currentUser });
    } catch (e) {
      return fail(e);
    }
  });

  // -------- Products --------

  ipcMain.handle("products:getAll", () => {
    try {
      console.log("🔍 products:getAll called");
      const all = db.select().from(products).all();
      console.log("✅ products:getAll success, found:", all.length, "products");
      return ok({ products: all });
    } catch (e) {
      console.error("❌ products:getAll failed:", e);
      return fail(e);
    }
  });

  ipcMain.handle(
    "products:barcodeExists",
    (_, { barcode }: { barcode: string }) => {
      try {
        const row = db
          .select({ id: products.id })
          .from(products)
          .where(eq(products.barcode, barcode))
          .get();
        return ok({ exists: Boolean(row) });
      } catch (e) {
        return fail(e);
      }
    },
  );

  ipcMain.handle(
    "products:add",
    (
      _,
      args: {
        name: string;
        quantity: number;
        barcode: string;
        categoryId: number;
        supplierId: number;
        brand: string;
        unit: string;
        mrp: number;
        cost: number;
        gst: number;
        reorderLevel: number;
        warehouse?: string;
        description?: string;
      },
    ) => {
      try {
        const inserted = db
          .insert(products)
          .values({
            productName: args.name,
            quantity: args.quantity,
            barcode: args.barcode,
            categoryId: args.categoryId,
            supplierId: args.supplierId,
            brand: args.brand,
            unit: args.unit,
            mrp: args.mrp,
            cost: args.cost,
            gst: args.gst,
            reorderLevel: args.reorderLevel,
            warehouse: args.warehouse,
            description: args.description,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .run();

        return ok({ productId: Number(inserted.lastInsertRowid) });
      } catch (e) {
        return fail(e);
      }
    },
  );

  ipcMain.handle("products:getOne", (_, { id }: { id: number }) => {
    try {
      const product = db
        .select()
        .from(products)
        .where(eq(products.id, id))
        .get();
      if (!product) return { success: false, error: "Product not found" };
      return ok({ product });
    } catch (e) {
      return fail(e);
    }
  });

  ipcMain.handle(
    "products:update",
    (
      _,
      {
        id,
        args,
      }: {
        id: number;
        args: Partial<{
          barcode: string;
          productName: string;
          categoryId: number;
          supplierId: number;
          quantity: number;
          brand: string;
          unit: string;
          mrp: number;
          cost: number;
          gst: number;
          reorderLevel: number;
          warehouse: string | null;
          description: string | null;
        }>;
      },
    ) => {
      try {
        db.update(products)
          .set({ ...args, updatedAt: new Date() })
          .where(eq(products.id, id))
          .run();
        return ok();
      } catch (e) {
        return fail(e);
      }
    },
  );

  ipcMain.handle("products:delete", (_, { id }: { id: number }) => {
    try {
      // Remove dependent rows first (so FK constraints don't block deletion)
      db.delete(productLogs).where(eq(productLogs.productId, id)).run();
      db.delete(transactionItems)
        .where(eq(transactionItems.productId, id))
        .run();

      db.delete(products).where(eq(products.id, id)).run();
      return ok();
    } catch (e) {
      return fail(e);
    }
  });

  // -------- Categories --------

  ipcMain.handle("categories:getAll", () => {
    try {
      const all = db.select().from(categories).all();
      return ok({ categories: all });
    } catch (e) {
      return fail(e);
    }
  });

  ipcMain.handle("categories:add", (_, { name }: { name: string }) => {
    try {
      db.insert(categories).values({ categoryName: name }).run();
      return ok();
    } catch (e) {
      return fail(e);
    }
  });

  ipcMain.handle(
    "categories:update",
    (_, { id, name }: { id: number; name: string }) => {
      try {
        db.update(categories)
          .set({ categoryName: name })
          .where(eq(categories.id, id))
          .run();
        return ok();
      } catch (e) {
        return fail(e);
      }
    },
  );

  ipcMain.handle("categories:delete", (_, { id }: { id: number }) => {
    try {
      db.delete(categories).where(eq(categories.id, id)).run();
      return ok();
    } catch (e) {
      return fail(e);
    }
  });

  // -------- Suppliers --------

  ipcMain.handle("suppliers:getAll", () => {
    try {
      const all = db.select().from(suppliers).all();
      return ok({ suppliers: all });
    } catch (e) {
      return fail(e);
    }
  });

  ipcMain.handle(
    "suppliers:add",
    (
      _,
      args: {
        supplierName: string;
        supplierPhone?: string;
        supplierGstin?: string;
        supplierAddress?: string;
      },
    ) => {
      try {
        db.insert(suppliers).values(args).run();
        return ok();
      } catch (e) {
        return fail(e);
      }
    },
  );

  ipcMain.handle(
    "suppliers:update",
    (
      _,
      {
        id,
        args,
      }: {
        id: number;
        args: Partial<{
          supplierName: string;
          supplierPhone: string | null;
          supplierGstin: string | null;
          supplierAddress: string | null;
        }>;
      },
    ) => {
      try {
        db.update(suppliers).set(args).where(eq(suppliers.id, id)).run();
        return ok();
      } catch (e) {
        return fail(e);
      }
    },
  );

  ipcMain.handle("suppliers:delete", (_, { id }: { id: number }) => {
    try {
      db.delete(suppliers).where(eq(suppliers.id, id)).run();
      return ok();
    } catch (e) {
      return fail(e);
    }
  });

  // -------- Receipts --------

  ipcMain.handle("receipts:getAll", () => {
    try {
      const allRec = db.select().from(receipts).all();
      return ok({ allRec });
    } catch (e) {
      return fail(e);
    }
  });

  ipcMain.handle(
    "receipts:add",
    (
      _,
      args: {
        totalAmount: number;
        tax: number;
        paymentSplit: string; // JSON string
        discount?: number;
        receiptDate?: Date;
        createdBy: number;
      },
    ) => {
      try {
        const inserted = db
          .insert(receipts)
          .values({
            totalAmount: args.totalAmount,
            tax: args.tax,
            paymentSplit: args.paymentSplit,
            discount: args.discount ?? 0,
            receiptDate: args.receiptDate ?? new Date(),
            createdBy: args.createdBy,
          })
          .run();
        return ok({ receiptId: Number(inserted.lastInsertRowid) });
      } catch (e) {
        return fail(e);
      }
    },
  );

  ipcMain.handle(
    "pos:checkout",
    (
      _,
      args: {
        createdBy: number;
        discount: number;
        paymentSplit: { cashAmt: number; upiAmt: number; cardAmt: number };
        items: Array<{ productId: number; qty: number }>;
      },
    ) => {
      try {
        const res = createReceiptWithItems({
          createdBy: args.createdBy,
          receiptDate: new Date(),
          discount: Number(args.discount || 0),
          paymentSplit: args.paymentSplit,
          items: args.items,
        });
        return ok(res);
      } catch (e) {
        return fail(e);
      }
    },
  );

  ipcMain.handle(
    "receipts:getRange",
    (
      _,
      args: {
        from: string; // ISO
        to: string; // ISO
      },
    ) => {
      try {
        const from = new Date(args.from);
        const to = new Date(args.to);

        const rows = db
          .select()
          .from(receipts)
          .where(
            and(gte(receipts.receiptDate, from), lte(receipts.receiptDate, to)),
          )
          .orderBy(desc(receipts.receiptDate))
          .all();

        return ok({ receipts: rows });
      } catch (e) {
        return fail(e);
      }
    },
  );

  ipcMain.handle("receipts:delete", (_, { id }: { id: number }) => {
    try {
      db.delete(receipts).where(eq(receipts.id, id)).run();
      return ok();
    } catch (e) {
      return fail(e);
    }
  });

  // -------- Logs --------

  ipcMain.handle(
    "logs:add",
    (
      _,
      args: {
        productId: number;
        receiptId?: number;
        type: string;
        quantity: number;
        amount: number;
        tax?: number;
        discount?: number;
        datetime: Date;
      },
    ) => {
      try {
        db.insert(productLogs)
          .values({
            productId: args.productId,
            receiptId: args.receiptId,
            type: args.type,
            quantity: args.quantity,
            amount: args.amount,
            tax: args.tax ?? 0,
            discount: args.discount ?? 0,
            datetime: args.datetime,
          })
          .run();
        return ok();
      } catch (e) {
        return fail(e);
      }
    },
  );

  ipcMain.handle(
    "logs:getReceiptLogs",
    (_, { receiptId }: { receiptId: number }) => {
      try {
        const logs = db
          .select()
          .from(productLogs)
          .where(eq(productLogs.receiptId, receiptId))
          .all();
        return ok({ logs });
      } catch (e) {
        return fail(e);
      }
    },
  );

  ipcMain.handle(
    "logs:getRange",
    (
      _,
      args: {
        from: string; // ISO
        to: string; // ISO
      },
    ) => {
      try {
        const from = new Date(args.from);
        const to = new Date(args.to);

        const logs = db
          .select()
          .from(productLogs)
          .where(
            and(gte(productLogs.datetime, from), lte(productLogs.datetime, to)),
          )
          .orderBy(desc(productLogs.datetime))
          .all();

        return ok({ logs });
      } catch (e) {
        return fail(e);
      }
    },
  );

  // -------- Reports --------

  ipcMain.handle("reports:todayDashboard", () => {
    try {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);

      const todayReceipts = db
        .select()
        .from(receipts)
        .where(
          and(gte(receipts.receiptDate, start), lte(receipts.receiptDate, end)),
        )
        .orderBy(desc(receipts.receiptDate))
        .all();

      const totalSales = todayReceipts.reduce(
        (acc: number, r: typeof receipts.$inferSelect) =>
          acc + Number(r.totalAmount || 0),
        0,
      );
      const transactionCount = todayReceipts.length;
      const avgTransactionValue =
        transactionCount > 0 ? totalSales / transactionCount : 0;

      const logs = db
        .select()
        .from(productLogs)
        .where(
          and(gte(productLogs.datetime, start), lte(productLogs.datetime, end)),
        )
        .all();

      const byProduct = new Map<number, number>();
      for (const l of logs) {
        if (l.type !== "sale") continue;
        byProduct.set(
          l.productId,
          (byProduct.get(l.productId) ?? 0) + Number(l.quantity || 0),
        );
      }

      let topSellingProduct: { productId: number; qty: number } | null = null;
      byProduct.forEach((qty, productId) => {
        if (!topSellingProduct || qty > topSellingProduct.qty) {
          topSellingProduct = { productId: productId as number, qty };
        }
      });

      const topProductName = topSellingProduct
        ? (db
            .select({ productName: products.productName })
            .from(products)
            .where(
              eq(
                products.id,
                (topSellingProduct as { productId: number; qty: number })
                  .productId,
              ),
            )
            .get()?.productName ?? null)
        : null;

      return ok({
        metrics: {
          totalSales,
          transactionCount,
          avgTransactionValue,
          topProductName,
        },
        recentReceipts: todayReceipts.slice(0, 10),
      });
    } catch (e) {
      return fail(e);
    }
  });

  ipcMain.handle(
    "reports:salesRange",
    (
      _,
      args: {
        from: string; // ISO
        to: string; // ISO
      },
    ) => {
      try {
        const from = new Date(args.from);
        const to = new Date(args.to);

        const rangeReceipts = db
          .select()
          .from(receipts)
          .where(
            and(gte(receipts.receiptDate, from), lte(receipts.receiptDate, to)),
          )
          .orderBy(desc(receipts.receiptDate))
          .all();

        const rangeLogs = db
          .select()
          .from(productLogs)
          .where(
            and(gte(productLogs.datetime, from), lte(productLogs.datetime, to)),
          )
          .orderBy(desc(productLogs.datetime))
          .all();

        const allProducts = db.select().from(products).all();
        const allCategories = db.select().from(categories).all();

        return ok({
          receipts: rangeReceipts,
          logs: rangeLogs,
          products: allProducts,
          categories: allCategories,
        });
      } catch (e) {
        return fail(e);
      }
    },
  );

  // -------- Settings (key/value) --------

  ipcMain.handle("settings:getAll", () => {
    try {
      const rows = db.select().from(settings).all();
      const map: Record<string, string> = {};
      for (const r of rows) map[r.key] = r.value;
      return ok({ settings: map });
    } catch (e) {
      return fail(e);
    }
  });

  ipcMain.handle(
    "settings:setMany",
    (
      _,
      args: {
        currentUserId: number;
        values: Record<string, string>;
      },
    ) => {
      try {
        assertAdmin(args.currentUserId);

        const now = new Date();
        for (const [key, value] of Object.entries(args.values)) {
          db.insert(settings)
            .values({ key, value: String(value), updatedAt: now })
            .onConflictDoUpdate({
              target: settings.key,
              set: { value: String(value), updatedAt: now },
            })
            .run();
        }

        return ok();
      } catch (e) {
        return fail(e);
      }
    },
  );

  // -------- Users & Roles (admin-only) --------

  ipcMain.handle(
    "users:create",
    (
      _,
      args: {
        currentUserId: number;
        name: string;
        role: Role;
        password: string;
      },
    ) => {
      try {
        assertAdmin(args.currentUserId);

        db.insert(users)
          .values({
            name: args.name,
            role: args.role,
            password: args.password,
            createdAt: new Date(),
          })
          .run();

        return ok();
      } catch (e) {
        return fail(e);
      }
    },
  );

  ipcMain.handle(
    "users:getAll",
    (_, { currentUserId }: { currentUserId: number }) => {
      try {
        assertAdmin(currentUserId);
        const all = db.select().from(users).all();
        return ok({ users: all });
      } catch (e) {
        return fail(e);
      }
    },
  );

  ipcMain.handle(
    "users:update",
    (
      _,
      args: {
        currentUserId: number;
        id: number;
        patch: Partial<{
          name: string;
          role: Role;
          password: string;
          active: boolean;
        }>;
      },
    ) => {
      try {
        assertAdmin(args.currentUserId);
        db.update(users).set(args.patch).where(eq(users.id, args.id)).run();
        return ok();
      } catch (e) {
        return fail(e);
      }
    },
  );

  ipcMain.handle(
    "users:delete",
    (_, args: { currentUserId: number; id: number }) => {
      try {
        assertAdmin(args.currentUserId);

        // In your UI you already enforce “don’t delete last admin”.
        // (You can also enforce here by counting admins if needed.)

        db.delete(users).where(eq(users.id, args.id)).run();
        db.delete(userSettings).where(eq(userSettings.userId, args.id)).run();
        db.delete(storeSettings).where(eq(storeSettings.userId, args.id)).run();
        db.delete(notifications).where(eq(notifications.userId, args.id)).run();

        return ok();
      } catch (e) {
        return fail(e);
      }
    },
  );

  // -------- User Settings --------

  ipcMain.handle("userSettings:getOne", (_, { userId }: { userId: number }) => {
    try {
      const row = db
        .select()
        .from(userSettings)
        .where(eq(userSettings.userId, userId))
        .get();
      return ok({ userSettings: row ?? null });
    } catch (e) {
      return fail(e);
    }
  });

  ipcMain.handle(
    "userSettings:upsert",
    (_, args: { userId: number; landingPage: string }) => {
      try {
        const existing = db
          .select()
          .from(userSettings)
          .where(eq(userSettings.userId, args.userId))
          .get();

        if (!existing) {
          db.insert(userSettings)
            .values({ userId: args.userId, landingPage: args.landingPage })
            .run();
        } else {
          db.update(userSettings)
            .set({ landingPage: args.landingPage })
            .where(eq(userSettings.userId, args.userId))
            .run();
        }

        return ok();
      } catch (e) {
        return fail(e);
      }
    },
  );

  // -------- Store Settings --------

  ipcMain.handle(
    "storeSettings:getOne",
    (_, { userId }: { userId: number }) => {
      try {
        const row = db
          .select()
          .from(storeSettings)
          .where(eq(storeSettings.userId, userId))
          .get();
        return ok({ storeSettings: row ?? null });
      } catch (e) {
        return fail(e);
      }
    },
  );

  ipcMain.handle(
    "storeSettings:upsert",
    (
      _,
      args: {
        userId: number;
        address?: string | null;
        phone?: string | null;
        gstin?: string | null;
        allowNegativeStock?: boolean;
        defaultGstRate?: number | null;
        defaultReorderLevel?: number | null;
        expiryWarningIn?: number | null;
      },
    ) => {
      try {
        const existing = db
          .select()
          .from(storeSettings)
          .where(eq(storeSettings.userId, args.userId))
          .get();

        const patch = {
          userId: args.userId,
          address: args.address ?? null,
          phone: args.phone ?? null,
          gstin: args.gstin ?? null,
          allowNegativeStock: args.allowNegativeStock ?? false,
          defaultGstRate: args.defaultGstRate ?? null,
          defaultReorderLevel: args.defaultReorderLevel ?? null,
          expiryWarningIn: args.expiryWarningIn ?? null,
        };

        if (!existing) {
          db.insert(storeSettings).values(patch).run();
        } else {
          db.update(storeSettings)
            .set(patch)
            .where(eq(storeSettings.userId, args.userId))
            .run();
        }

        return ok();
      } catch (e) {
        return fail(e);
      }
    },
  );

  // -------- Notifications --------

  ipcMain.handle(
    "notifications:getOne",
    (_, { userId }: { userId: number }) => {
      try {
        const row = db
          .select()
          .from(notifications)
          .where(eq(notifications.userId, userId))
          .get();
        return ok({ notifications: row ?? null });
      } catch (e) {
        return fail(e);
      }
    },
  );

  ipcMain.handle(
    "notifications:upsert",
    (
      _,
      args: {
        userId: number;
        whatsAppNo?: string | null;
        notifyExpiry?: boolean;
        notifyReorder?: boolean;
        notifyWeeklyReport?: boolean;
        notifyMonthlyReport?: boolean;
        notifyDailyRevenue?: boolean;
        dailyReportTiming?: Date | null;
      },
    ) => {
      try {
        const existing = db
          .select()
          .from(notifications)
          .where(eq(notifications.userId, args.userId))
          .get();

        const patch = {
          userId: args.userId,
          whatsAppNo: args.whatsAppNo ?? null,
          notifyExpiry: args.notifyExpiry ?? true,
          notifyReorder: args.notifyReorder ?? true,
          notifyWeeklyReport: args.notifyWeeklyReport ?? true,
          notifyMonthlyReport: args.notifyMonthlyReport ?? true,
          notifyDailyRevenue: args.notifyDailyRevenue ?? true,
          dailyReportTiming: args.dailyReportTiming ?? null,
        };

        if (!existing) {
          db.insert(notifications).values(patch).run();
        } else {
          db.update(notifications)
            .set(patch)
            .where(eq(notifications.userId, args.userId))
            .run();
        }

        return ok();
      } catch (e) {
        return fail(e);
      }
    },
  );

  // -------- Bill Printing --------

  ipcMain.on("print-bill", async (event, payload: BillPayload) => {
    try {
      const printers = await event.sender.getPrintersAsync();
      if (!printers || printers.length === 0) {
        event.reply("print-bill:error", "No printer connected. Please check your printer connection.");
        return;
      }

      // Check if any printer is online (status 0 = IDLE/READY)
      const onlinePrinter = printers.find((p: any) => p.status === 0);
      if (!onlinePrinter) {
        event.reply("print-bill:error", "Printer is offline. Please check your printer connection.");
        return;
      }

      const html = buildReceiptHtml(payload);
      const printWin = new BrowserWindow({
        show: false,
        webPreferences: {
          sandbox: false,
          contextIsolation: true,
          nodeIntegration: false,
        },
      });

      await printWin.loadURL(
        `data:text/html;charset=utf-8,${encodeURIComponent(html)}`,
      );

      printWin.webContents.print(
        {
          silent: true,
          printBackground: true,
          margins: { marginType: "none" },
          deviceName: onlinePrinter.name,
        },
        (success, failureReason) => {
          console.log("Print callback called:", success, failureReason);
          try {
            if (success) {
              console.log("Sending print-bill:success");
              event.reply("print-bill:success");
            } else {
              console.log("Sending print-bill:error:", failureReason);
              event.reply("print-bill:error", failureReason || "PRINT_ERROR");
            }
          } finally {
            printWin.close();
          }
        },
      );
    } catch (err: any) {
      event.reply("print-bill:error", err?.message || "PRINT_ERROR");
    }
  });

  // -------- Device Status --------

  ipcMain.handle("devices:reportScannerActivity", async () => {
    lastScannerActivityAt = Date.now();
    return ok();
  });

  ipcMain.handle("devices:checkPrinter", async () => {
    try {
      const win = BrowserWindow.getAllWindows()[0];
      if (!win) return ok({ status: "unknown" as DeviceStatus });
      const printers = await win.webContents.getPrintersAsync();
      
      // Check if any printer is online (status 0 = IDLE/READY)
      const onlinePrinter = printers.find((p: any) => p.status === 0);
      const status: DeviceStatus = onlinePrinter ? "connected" : "disconnected";
      return ok({ status });
    } catch (err: any) {
      return ok({ status: "unknown" as DeviceStatus });
    }
  });

  ipcMain.handle("devices:checkScanner", async () => {
    try {
      if (!lastScannerActivityAt) return ok({ status: "disconnected" as DeviceStatus });
      const active = Date.now() - lastScannerActivityAt < SCANNER_ACTIVE_WINDOW_MS;
      return ok({ status: (active ? "connected" : "disconnected") as DeviceStatus });
    } catch (err) {
      return ok({ status: "unknown" as DeviceStatus });
    }
  });

  console.log("✅ All IPC handlers registered successfully");
}
