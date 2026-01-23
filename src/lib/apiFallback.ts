type Role = "admin" | "staff" | "manager";

type PaymentSplit = { cashAmt: number; upiAmt: number; cardAmt: number };

type MockUser = {
  id: number;
  name: string;
  password: string;
  role: Role;
  active: boolean;
  createdAt: string;
};

type MockCategory = { id: number; categoryName: string };

type MockSupplier = {
  id: number;
  supplierName: string;
  supplierPhone?: string;
  supplierGstin?: string;
  supplierAddress?: string;
};

type MockProduct = {
  id: number;
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
  warehouse?: string | null;
  description?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type MockReceipt = {
  id: number;
  totalAmount: number;
  tax: number;
  paymentSplit: string;
  discount: number;
  receiptDate: string;
  createdBy: number;
};

type MockLog = {
  id: number;
  productId: number;
  receiptId: number | null;
  type: string;
  quantity: number;
  amount: number;
  tax: number;
  discount: number;
  datetime: string;
};

type MockDb = {
  users: MockUser[];
  categories: MockCategory[];
  suppliers: MockSupplier[];
  products: MockProduct[];
  receipts: MockReceipt[];
  logs: MockLog[];
  settings: Record<string, string>;
  nextIds: {
    user: number;
    category: number;
    supplier: number;
    product: number;
    receipt: number;
    log: number;
  };
};

const STORAGE_KEY = "avm_mock_db_v1";

function ok<T extends object>(data?: T) {
  return { success: true, ...(data ?? {}) };
}
function fail(error: unknown) {
  return { success: false, error: String(error) };
}

function toIso(d: Date) {
  return d.toISOString();
}

function seedDb(): MockDb {
  const now = new Date();

  const categories: MockCategory[] = [
    { id: 1, categoryName: "Grocery" },
    { id: 2, categoryName: "Dairy" },
    { id: 3, categoryName: "Beverages" },
    { id: 4, categoryName: "Bakery" },
    { id: 5, categoryName: "Snacks" },
  ];

  const supplier: MockSupplier = {
    id: 1,
    supplierName: "AVM Default Supplier",
    supplierPhone: "+91-9000000000",
    supplierAddress: "Lakshmipuram, Tamil Nadu",
  };

  const users: MockUser[] = [
    {
      id: 1,
      name: "admin",
      password: "1234",
      role: "admin",
      active: true,
      createdAt: toIso(now),
    },
    {
      id: 2,
      name: "staff1",
      password: "staff123",
      role: "staff",
      active: true,
      createdAt: toIso(now),
    },
    {
      id: 3,
      name: "manager1",
      password: "manager123",
      role: "manager",
      active: true,
      createdAt: toIso(now),
    },
  ];

  const products: MockProduct[] = [
    {
      id: 1,
      barcode: "890100000001",
      productName: "Rice 5kg",
      categoryId: 1,
      supplierId: 1,
      quantity: 60,
      brand: "AVM",
      unit: "pack",
      mrp: 320,
      cost: 280,
      gst: 0,
      reorderLevel: 10,
      warehouse: "Main",
      createdAt: toIso(now),
      updatedAt: toIso(now),
    },
    {
      id: 2,
      barcode: "890100000002",
      productName: "Wheat Flour 1kg",
      categoryId: 1,
      supplierId: 1,
      quantity: 120,
      brand: "Aashirvaad",
      unit: "pack",
      mrp: 58,
      cost: 48,
      gst: 0,
      reorderLevel: 15,
      warehouse: "Main",
      createdAt: toIso(now),
      updatedAt: toIso(now),
    },
    {
      id: 3,
      barcode: "890100000003",
      productName: "Sugar 1kg",
      categoryId: 1,
      supplierId: 1,
      quantity: 90,
      brand: "AVM",
      unit: "pack",
      mrp: 52,
      cost: 45,
      gst: 0,
      reorderLevel: 12,
      warehouse: "Main",
      createdAt: toIso(now),
      updatedAt: toIso(now),
    },
    {
      id: 4,
      barcode: "890100000004",
      productName: "Sunflower Oil 1L",
      categoryId: 1,
      supplierId: 1,
      quantity: 40,
      brand: "Fortune",
      unit: "L",
      mrp: 145,
      cost: 128,
      gst: 5,
      reorderLevel: 8,
      warehouse: "Main",
      createdAt: toIso(now),
      updatedAt: toIso(now),
    },
    {
      id: 5,
      barcode: "890100000005",
      productName: "Toor Dal 1kg",
      categoryId: 1,
      supplierId: 1,
      quantity: 55,
      brand: "AVM",
      unit: "pack",
      mrp: 170,
      cost: 150,
      gst: 0,
      reorderLevel: 10,
      warehouse: "Main",
      createdAt: toIso(now),
      updatedAt: toIso(now),
    },
    {
      id: 6,
      barcode: "890100000006",
      productName: "Milk 500ml",
      categoryId: 2,
      supplierId: 1,
      quantity: 8,
      brand: "Aavin",
      unit: "ml",
      mrp: 26,
      cost: 22,
      gst: 0,
      reorderLevel: 10,
      warehouse: "Main",
      createdAt: toIso(now),
      updatedAt: toIso(now),
    },
    {
      id: 7,
      barcode: "890100000007",
      productName: "Curd 500g",
      categoryId: 2,
      supplierId: 1,
      quantity: 25,
      brand: "Aavin",
      unit: "pack",
      mrp: 42,
      cost: 36,
      gst: 0,
      reorderLevel: 10,
      warehouse: "Main",
      createdAt: toIso(now),
      updatedAt: toIso(now),
    },
    {
      id: 8,
      barcode: "890100000008",
      productName: "Butter 100g",
      categoryId: 2,
      supplierId: 1,
      quantity: 18,
      brand: "Amul",
      unit: "pack",
      mrp: 60,
      cost: 52,
      gst: 0,
      reorderLevel: 8,
      warehouse: "Main",
      createdAt: toIso(now),
      updatedAt: toIso(now),
    },
    {
      id: 9,
      barcode: "890100000009",
      productName: "Paneer 200g",
      categoryId: 2,
      supplierId: 1,
      quantity: 10,
      brand: "Amul",
      unit: "pack",
      mrp: 90,
      cost: 78,
      gst: 0,
      reorderLevel: 6,
      warehouse: "Main",
      createdAt: toIso(now),
      updatedAt: toIso(now),
    },
    {
      id: 10,
      barcode: "890100000010",
      productName: "Bread - White",
      categoryId: 4,
      supplierId: 1,
      quantity: 1,
      brand: "Britannia",
      unit: "pack",
      mrp: 40,
      cost: 34,
      gst: 0,
      reorderLevel: 10,
      warehouse: "Main",
      createdAt: toIso(now),
      updatedAt: toIso(now),
    },
    {
      id: 11,
      barcode: "890100000011",
      productName: "Bun Pack (6 pcs)",
      categoryId: 4,
      supplierId: 1,
      quantity: 14,
      brand: "Local",
      unit: "pack",
      mrp: 35,
      cost: 28,
      gst: 0,
      reorderLevel: 10,
      warehouse: "Main",
      createdAt: toIso(now),
      updatedAt: toIso(now),
    },
    {
      id: 12,
      barcode: "890100000012",
      productName: "Coca-Cola 500ml",
      categoryId: 3,
      supplierId: 1,
      quantity: 70,
      brand: "Coca-Cola",
      unit: "ml",
      mrp: 40,
      cost: 34,
      gst: 12,
      reorderLevel: 15,
      warehouse: "Main",
      createdAt: toIso(now),
      updatedAt: toIso(now),
    },
    {
      id: 13,
      barcode: "890100000013",
      productName: "Water 1L",
      categoryId: 3,
      supplierId: 1,
      quantity: 200,
      brand: "Bisleri",
      unit: "L",
      mrp: 20,
      cost: 14,
      gst: 0,
      reorderLevel: 30,
      warehouse: "Main",
      createdAt: toIso(now),
      updatedAt: toIso(now),
    },
    {
      id: 14,
      barcode: "890100000014",
      productName: "Tea Powder 250g",
      categoryId: 3,
      supplierId: 1,
      quantity: 35,
      brand: "Tata Tea",
      unit: "pack",
      mrp: 90,
      cost: 78,
      gst: 5,
      reorderLevel: 10,
      warehouse: "Main",
      createdAt: toIso(now),
      updatedAt: toIso(now),
    },
    {
      id: 15,
      barcode: "890100000015",
      productName: "Coffee 100g",
      categoryId: 3,
      supplierId: 1,
      quantity: 12,
      brand: "Bru",
      unit: "pack",
      mrp: 110,
      cost: 95,
      gst: 5,
      reorderLevel: 10,
      warehouse: "Main",
      createdAt: toIso(now),
      updatedAt: toIso(now),
    },
    {
      id: 16,
      barcode: "890100000016",
      productName: "Biscuit - Marie",
      categoryId: 5,
      supplierId: 1,
      quantity: 100,
      brand: "Britannia",
      unit: "pack",
      mrp: 25,
      cost: 18,
      gst: 0,
      reorderLevel: 20,
      warehouse: "Main",
      createdAt: toIso(now),
      updatedAt: toIso(now),
    },
    {
      id: 17,
      barcode: "890100000017",
      productName: "Potato Chips 50g",
      categoryId: 5,
      supplierId: 1,
      quantity: 30,
      brand: "Lay's",
      unit: "pack",
      mrp: 20,
      cost: 14,
      gst: 12,
      reorderLevel: 15,
      warehouse: "Main",
      createdAt: toIso(now),
      updatedAt: toIso(now),
    },
    {
      id: 18,
      barcode: "890100000018",
      productName: "Chocolate Bar",
      categoryId: 5,
      supplierId: 1,
      quantity: 5,
      brand: "Dairy Milk",
      unit: "piece",
      mrp: 40,
      cost: 30,
      gst: 18,
      reorderLevel: 10,
      warehouse: "Main",
      createdAt: toIso(now),
      updatedAt: toIso(now),
    },
    {
      id: 19,
      barcode: "890100000019",
      productName: "Instant Noodles",
      categoryId: 5,
      supplierId: 1,
      quantity: 150,
      brand: "Maggi",
      unit: "pack",
      mrp: 14,
      cost: 10,
      gst: 0,
      reorderLevel: 25,
      warehouse: "Main",
      createdAt: toIso(now),
      updatedAt: toIso(now),
    },
    {
      id: 20,
      barcode: "890100000020",
      productName: "Salt 1kg",
      categoryId: 1,
      supplierId: 1,
      quantity: 80,
      brand: "Tata",
      unit: "pack",
      mrp: 22,
      cost: 16,
      gst: 0,
      reorderLevel: 12,
      warehouse: "Main",
      createdAt: toIso(now),
      updatedAt: toIso(now),
    },
    {
      id: 21,
      barcode: "890100000021",
      productName: "Dishwash Liquid 500ml",
      categoryId: 1,
      supplierId: 1,
      quantity: 9,
      brand: "Vim",
      unit: "ml",
      mrp: 110,
      cost: 92,
      gst: 18,
      reorderLevel: 10,
      warehouse: "Main",
      createdAt: toIso(now),
      updatedAt: toIso(now),
    },
  ];

  const settings: Record<string, string> = {
    storeName: "AVM Grocery Store",
    storeLocation: "Lakshmipuram, Tamil Nadu",
    storePhone: "+91-9876543210",
    storeEmail: "contact@avmgrocery.com",
    taxRate: "5",
    lowStockThreshold: "10",
    currency: "INR",
    discountPolicy: "percent",
  };

  const db: MockDb = {
    users,
    categories,
    suppliers: [supplier],
    products,
    receipts: [],
    logs: [],
    settings,
    nextIds: {
      user: 4,
      category: 6,
      supplier: 2,
      product: 22,
      receipt: 1,
      log: 1,
    },
  };

  // Seed 10-15 receipts across last 7 days
  const paymentModes: PaymentSplit[] = [
    { cashAmt: 1, upiAmt: 0, cardAmt: 0 },
    { cashAmt: 0, upiAmt: 1, cardAmt: 0 },
    { cashAmt: 0, upiAmt: 0, cardAmt: 1 },
    { cashAmt: 0.5, upiAmt: 0.5, cardAmt: 0 },
    { cashAmt: 0.5, upiAmt: 0, cardAmt: 0.5 },
  ];

  const samples: Array<{
    daysAgo: number;
    items: Array<{ barcode: string; qty: number }>;
    discountPct?: number;
  }> = [
    {
      daysAgo: 0,
      items: [
        { barcode: "890100000001", qty: 1 },
        { barcode: "890100000013", qty: 2 },
        { barcode: "890100000016", qty: 1 },
      ],
      discountPct: 5,
    },
    {
      daysAgo: 0,
      items: [
        { barcode: "890100000012", qty: 1 },
        { barcode: "890100000019", qty: 3 },
      ],
    },
    {
      daysAgo: 1,
      items: [
        { barcode: "890100000003", qty: 1 },
        { barcode: "890100000020", qty: 1 },
      ],
      discountPct: 10,
    },
    {
      daysAgo: 1,
      items: [
        { barcode: "890100000014", qty: 1 },
        { barcode: "890100000006", qty: 2 },
        { barcode: "890100000017", qty: 1 },
      ],
    },
    {
      daysAgo: 2,
      items: [
        { barcode: "890100000004", qty: 1 },
        { barcode: "890100000005", qty: 1 },
      ],
    },
    {
      daysAgo: 2,
      items: [
        { barcode: "890100000013", qty: 3 },
        { barcode: "890100000016", qty: 2 },
        { barcode: "890100000018", qty: 1 },
      ],
      discountPct: 5,
    },
    {
      daysAgo: 3,
      items: [
        { barcode: "890100000002", qty: 2 },
        { barcode: "890100000007", qty: 1 },
      ],
    },
    {
      daysAgo: 3,
      items: [
        { barcode: "890100000012", qty: 2 },
        { barcode: "890100000017", qty: 2 },
      ],
    },
    {
      daysAgo: 4,
      items: [
        { barcode: "890100000010", qty: 1 },
        { barcode: "890100000011", qty: 1 },
        { barcode: "890100000006", qty: 1 },
      ],
    },
    {
      daysAgo: 5,
      items: [
        { barcode: "890100000020", qty: 1 },
        { barcode: "890100000003", qty: 1 },
        { barcode: "890100000014", qty: 1 },
      ],
    },
    {
      daysAgo: 6,
      items: [
        { barcode: "890100000001", qty: 1 },
        { barcode: "890100000012", qty: 1 },
        { barcode: "890100000013", qty: 2 },
      ],
    },
    {
      daysAgo: 6,
      items: [
        { barcode: "890100000019", qty: 5 },
        { barcode: "890100000016", qty: 2 },
      ],
      discountPct: 5,
    },
  ];

  // NOTE: we do not decrement stock for sample receipts (keeps initial inventory reasonable).
  // Instead we only create logs/receipts for reporting.
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i];
    const date = new Date();
    date.setDate(date.getDate() - s.daysAgo);
    date.setHours(10 + (i % 9), 15 + ((i * 7) % 40), 0, 0);

    const items = s.items
      .map((it) => {
        const p = db.products.find((x) => x.barcode === it.barcode);
        if (!p) return null;
        const lineGross = p.mrp * it.qty;
        const lineTax = (lineGross * (p.gst || 0)) / 100;
        return { product: p, qty: it.qty, lineGross, lineTax };
      })
      .filter(
        (x): x is { product: MockProduct; qty: number; lineGross: number; lineTax: number } =>
          Boolean(x)
      );

    const subtotal = items.reduce((acc, r) => acc + r.lineGross, 0);
    const tax = items.reduce((acc, r) => acc + r.lineTax, 0);
    const discount = s.discountPct ? (subtotal * s.discountPct) / 100 : 0;
    const total = Math.max(0, subtotal - discount + tax);

    const ratio = paymentModes[i % paymentModes.length];
    const split: PaymentSplit = {
      cashAmt: total * ratio.cashAmt,
      upiAmt: total * ratio.upiAmt,
      cardAmt: total * ratio.cardAmt,
    };

    const receiptId = db.nextIds.receipt++;
    db.receipts.push({
      id: receiptId,
      totalAmount: total,
      tax,
      discount,
      paymentSplit: JSON.stringify(split),
      receiptDate: toIso(date),
      createdBy: 1,
    });

    for (const r of items) {
      const lineDiscount = subtotal > 0 ? (discount * r.lineGross) / subtotal : 0;
      db.logs.push({
        id: db.nextIds.log++,
        productId: r.product.id,
        receiptId,
        type: "sale",
        quantity: r.qty,
        amount: r.lineGross,
        tax: r.lineTax,
        discount: lineDiscount,
        datetime: toIso(date),
      });
    }
  }

  return db;
}

function loadDb(): MockDb {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const seeded = seedDb();
    saveDb(seeded);
    return seeded;
  }

  try {
    return JSON.parse(raw) as MockDb;
  } catch {
    const seeded = seedDb();
    saveDb(seeded);
    return seeded;
  }
}

function saveDb(db: MockDb) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object") {
    throw new Error("Invalid payload");
  }
  return value as Record<string, unknown>;
}

function assertAdmin(db: MockDb, currentUserId: number) {
  const u = db.users.find((x) => x.id === currentUserId);
  if (!u) throw new Error("Current user not found");
  if (u.role !== "admin") throw new Error("Access denied (admin only)");
  if (!u.active) throw new Error("User is disabled");
  return u;
}

function computeTotals(db: MockDb, args: { items: Array<{ productId: number; qty: number }>; discount: number }) {
  const rows = args.items.map((it) => {
    const p = db.products.find((x) => x.id === it.productId);
    if (!p) throw new Error(`Product not found: ${it.productId}`);

    const qty = Number(it.qty);
    if (qty <= 0) throw new Error("Invalid quantity");
    if (p.quantity < qty) throw new Error(`Insufficient stock for ${p.productName}`);

    const lineGross = p.mrp * qty;
    const lineTax = (lineGross * (p.gst || 0)) / 100;
    return { product: p, qty, lineGross, lineTax };
  });

  const subtotal = rows.reduce((acc, r) => acc + r.lineGross, 0);
  const tax = rows.reduce((acc, r) => acc + r.lineTax, 0);
  const discount = Math.max(0, Math.min(Number(args.discount || 0), subtotal));
  const total = Math.max(0, subtotal - discount + tax);
  return { rows, subtotal, tax, discount, total };
}

function createMockApi() {
  return {
    // Auth
    checkInit: async () => {
      try {
        const db = loadDb();
        return ok({ isInit: db.users.length > 0 });
      } catch (e) {
        return fail(e);
      }
    },

    setupAdmin: async (data: { name: string; password: string }) => {
      try {
        const db = loadDb();
        if (db.users.length > 0) return ok();

        const now = toIso(new Date());
        db.users.push({
          id: db.nextIds.user++,
          name: data.name,
          password: data.password,
          role: "admin",
          active: true,
          createdAt: now,
        });
        saveDb(db);
        return ok();
      } catch (e) {
        return fail(e);
      }
    },

    login: async (data: { name: string; password: string }) => {
      try {
        const db = loadDb();
        const u = db.users.find((x) => x.name === data.name);
        if (!u || u.password !== data.password) return fail("Invalid credentials");
        if (!u.active) return fail("User is disabled");
        return ok({ user: { id: u.id, name: u.name, role: u.role } });
      } catch (e) {
        return fail(e);
      }
    },

    // Master data
    getCategories: async () => {
      try {
        const db = loadDb();
        return ok({ categories: db.categories });
      } catch (e) {
        return fail(e);
      }
    },

    getProducts: async () => {
      try {
        const db = loadDb();
        return ok({ products: db.products });
      } catch (e) {
        return fail(e);
      }
    },

    getSuppliers: async () => {
      try {
        const db = loadDb();
        return ok({ suppliers: db.suppliers });
      } catch (e) {
        return fail(e);
      }
    },

    barcodeExists: async (barcode: string) => {
      try {
        const db = loadDb();
        return ok({ exists: db.products.some((p) => p.barcode === barcode) });
      } catch (e) {
        return fail(e);
      }
    },

    // Receipts / POS
    getReceipts: async () => {
      try {
        const db = loadDb();
        const allRec = [...db.receipts].sort((a, b) => (a.receiptDate < b.receiptDate ? 1 : -1));
        return ok({ allRec });
      } catch (e) {
        return fail(e);
      }
    },

    createReceipt: async (data: {
      totalAmount: number;
      tax: number;
      paymentSplit: string;
      discount?: number;
      receiptDate?: string;
      createdBy: number;
    }) => {
      try {
        const db = loadDb();
        const createdBy = Number(data.createdBy);
        const u = db.users.find((x) => x.id === createdBy);
        if (!u) throw new Error("User not found");

        const receiptId = db.nextIds.receipt++;
        db.receipts.push({
          id: receiptId,
          totalAmount: Number(data.totalAmount || 0),
          tax: Number(data.tax || 0),
          paymentSplit: String(data.paymentSplit ?? "{}"),
          discount: Number(data.discount || 0),
          receiptDate: data.receiptDate ? String(data.receiptDate) : toIso(new Date()),
          createdBy,
        });

        saveDb(db);
        return ok({ receiptId });
      } catch (e) {
        return fail(e);
      }
    },

    getReceiptsRange: async (from: string, to: string) => {
      try {
        const db = loadDb();
        const f = new Date(from);
        const t = new Date(to);
        const receipts = db.receipts
          .filter((r) => {
            const d = new Date(r.receiptDate);
            return d >= f && d <= t;
          })
          .sort((a, b) => (a.receiptDate < b.receiptDate ? 1 : -1));
        return ok({ receipts });
      } catch (e) {
        return fail(e);
      }
    },

    checkout: async (args: {
      createdBy: number;
      discount: number;
      paymentSplit: PaymentSplit;
      items: Array<{ productId: number; qty: number }>;
    }) => {
      try {
        const db = loadDb();
        const u = db.users.find((x) => x.id === args.createdBy);
        if (!u) throw new Error("User not found");

        const { rows, subtotal, tax, discount, total } = computeTotals(db, {
          items: args.items,
          discount: args.discount,
        });

        const receiptId = db.nextIds.receipt++;

        db.receipts.push({
          id: receiptId,
          totalAmount: total,
          tax,
          paymentSplit: JSON.stringify(args.paymentSplit),
          discount,
          receiptDate: toIso(new Date()),
          createdBy: args.createdBy,
        });

        for (const r of rows) {
          const lineDiscount = subtotal > 0 ? (discount * r.lineGross) / subtotal : 0;
          db.logs.push({
            id: db.nextIds.log++,
            productId: r.product.id,
            receiptId,
            type: "sale",
            quantity: r.qty,
            amount: r.lineGross,
            tax: r.lineTax,
            discount: lineDiscount,
            datetime: toIso(new Date()),
          });

          r.product.quantity -= r.qty;
          r.product.updatedAt = toIso(new Date());
        }

        saveDb(db);
        return ok({ receiptId, totalAmount: total, tax, discount });
      } catch (e) {
        return fail(e);
      }
    },

    // Logs
    getLogsRange: async (from: string, to: string) => {
      try {
        const db = loadDb();
        const f = new Date(from);
        const t = new Date(to);
        const logs = db.logs
          .filter((l) => {
            const d = new Date(l.datetime);
            return d >= f && d <= t;
          })
          .sort((a, b) => (a.datetime < b.datetime ? 1 : -1));
        return ok({ logs });
      } catch (e) {
        return fail(e);
      }
    },

    // Reports
    getTodayDashboard: async () => {
      try {
        const db = loadDb();
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const end = new Date();
        end.setHours(23, 59, 59, 999);

        const todayReceipts = db.receipts
          .filter((r) => {
            const d = new Date(r.receiptDate);
            return d >= start && d <= end;
          })
          .sort((a, b) => (a.receiptDate < b.receiptDate ? 1 : -1));

        const totalSales = todayReceipts.reduce((acc, r) => acc + Number(r.totalAmount || 0), 0);
        const transactionCount = todayReceipts.length;
        const avgTransactionValue = transactionCount > 0 ? totalSales / transactionCount : 0;

        const logs = db.logs.filter((l) => {
          const d = new Date(l.datetime);
          return l.type === "sale" && d >= start && d <= end;
        });

        const byProduct = new Map<number, number>();
        for (const l of logs) {
          byProduct.set(l.productId, (byProduct.get(l.productId) ?? 0) + Number(l.quantity || 0));
        }

        let topProductId: number | null = null;
        let topQty = 0;
        for (const [pid, qty] of byProduct.entries()) {
          if (qty > topQty) {
            topQty = qty;
            topProductId = pid;
          }
        }

        const topProductName = topProductId
          ? db.products.find((p) => p.id === topProductId)?.productName ?? null
          : null;

        return ok({
          metrics: { totalSales, transactionCount, avgTransactionValue, topProductName },
          recentReceipts: todayReceipts.slice(0, 10),
        });
      } catch (e) {
        return fail(e);
      }
    },

    getSalesRange: async (from: string, to: string) => {
      try {
        const db = loadDb();
        const f = new Date(from);
        const t = new Date(to);

        const receipts = db.receipts
          .filter((r) => {
            const d = new Date(r.receiptDate);
            return d >= f && d <= t;
          })
          .sort((a, b) => (a.receiptDate < b.receiptDate ? 1 : -1));

        const logs = db.logs
          .filter((l) => {
            const d = new Date(l.datetime);
            return d >= f && d <= t;
          })
          .sort((a, b) => (a.datetime < b.datetime ? 1 : -1));

        return ok({ receipts, logs, products: db.products, categories: db.categories });
      } catch (e) {
        return fail(e);
      }
    },

    // Settings
    getSettings: async () => {
      try {
        const db = loadDb();
        return ok({ settings: db.settings });
      } catch (e) {
        return fail(e);
      }
    },

    setSettingsMany: async (currentUserId: number, values: Record<string, string>) => {
      try {
        const db = loadDb();
        assertAdmin(db, currentUserId);
        db.settings = { ...db.settings, ...values };
        saveDb(db);
        return ok();
      } catch (e) {
        return fail(e);
      }
    },

    // Generic invoke (covers admin/user/product CRUD used by UI)
    invoke: async (channel: string, ...args: unknown[]) => {
      try {
        const db = loadDb();

        if (channel === "products:add") {
          const payload = asRecord(args[0]);
          const barcode = String(payload.barcode ?? "");
          if (!barcode) throw new Error("barcode required");
          if (db.products.some((p) => p.barcode === barcode))
            throw new Error("SKU already exists");

          const id = db.nextIds.product++;
          const now = toIso(new Date());
          db.products.push({
            id,
            barcode,
            productName: String(payload.name ?? payload.productName ?? ""),
            categoryId: Number(payload.categoryId),
            supplierId: Number(payload.supplierId),
            quantity: Number(payload.quantity ?? 0),
            brand: String(payload.brand ?? "AVM"),
            unit: String(payload.unit ?? "piece"),
            mrp: Number(payload.mrp ?? 0),
            cost: Number(payload.cost ?? 0),
            gst: Number(payload.gst ?? 0),
            reorderLevel: Number(payload.reorderLevel ?? 0),
            warehouse: payload.warehouse != null ? String(payload.warehouse) : "Main",
            description: payload.description != null ? String(payload.description) : null,
            createdAt: now,
            updatedAt: now,
          });

          saveDb(db);
          return ok({ productId: id });
        }

        if (channel === "products:update") {
          const payload = asRecord(args[0]);
          const id = Number(payload.id);
          const p = db.products.find((x) => x.id === id);
          if (!p) throw new Error("Product not found");

          const patch = payload.args ? asRecord(payload.args) : {};
          Object.assign(p, patch);
          p.updatedAt = toIso(new Date());
          saveDb(db);
          return ok();
        }

        if (channel === "products:delete") {
          const payload = asRecord(args[0]);
          const id = Number(payload.id);
          db.products = db.products.filter((p) => p.id !== id);
          db.logs = db.logs.filter((l) => l.productId !== id);
          saveDb(db);
          return ok();
        }

        if (channel === "users:getAll") {
          const payload = asRecord(args[0]);
          assertAdmin(db, Number(payload.currentUserId));
          return ok({
            users: db.users.map((u) => ({
              id: u.id,
              name: u.name,
              role: u.role,
              active: u.active,
              createdAt: u.createdAt,
            })),
          });
        }

        if (channel === "users:create") {
          const payload = asRecord(args[0]);
          assertAdmin(db, Number(payload.currentUserId));
          const name = String(payload.name ?? "").trim();
          const password = String(payload.password ?? "");
          const role = payload.role === "admin" || payload.role === "manager" ? (payload.role as Role) : "staff";

          if (!name || !password) throw new Error("name and password required");
          if (db.users.some((u) => u.name === name)) throw new Error("username already exists");

          db.users.push({
            id: db.nextIds.user++,
            name,
            password,
            role,
            active: true,
            createdAt: toIso(new Date()),
          });

          saveDb(db);
          return ok();
        }

        if (channel === "users:update") {
          const payload = asRecord(args[0]);
          assertAdmin(db, Number(payload.currentUserId));

          const u = db.users.find((x) => x.id === Number(payload.id));
          if (!u) throw new Error("User not found");

          const patch = payload.patch ? asRecord(payload.patch) : {};
          if (patch.name) u.name = String(patch.name);
          if (patch.role && (patch.role === "admin" || patch.role === "staff" || patch.role === "manager"))
            u.role = patch.role;
          if (typeof patch.active === "boolean") u.active = patch.active;
          if (patch.password) u.password = String(patch.password);

          saveDb(db);
          return ok();
        }

        if (channel === "users:delete") {
          const payload = asRecord(args[0]);
          assertAdmin(db, Number(payload.currentUserId));

          const id = Number(payload.id);
          db.users = db.users.filter((u) => u.id !== id);
          saveDb(db);
          return ok();
        }

        return fail(`Unknown channel: ${channel}`);
      } catch (e) {
        return fail(e);
      }
    },
  };
}

export function installApiFallback() {
  // If this is running in Electron (userAgent contains Electron), we expect preload.
  const isElectronUA = typeof navigator !== "undefined" && navigator.userAgent.includes("Electron");

  if (window.api || isElectronUA) return;

  window.api = createMockApi() as unknown as Window["api"];
}
