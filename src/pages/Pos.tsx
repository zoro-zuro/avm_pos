import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Plus,
  Minus,
  Trash2,
  X,
  Printer,
  CreditCard,
  Banknote,
  QrCode,
  Search,
} from "lucide-react";

// ============= TYPES =============
type Category = { id: number; categoryName: string };
type Product = {
  id: number;
  barcode: string;
  productName: string;
  mrp: number;
  gst: number;
  categoryId: number;
  supplierId: number;
  quantity: number;
  brand: string;
  unit: string;
  cost: number;
  reorderLevel: number;
  warehouse?: string | null;
  description?: string | null;
  createdAt?: string;
  updatedAt?: string;
};
type CartItem = { product: Product; qty: number };

type Bill = {
  id: number;
  items: CartItem[];
  billDiscount: number;
  roundOff: boolean;
  cashAmt: number;
  upiAmt: number;
  cardAmt: number;
};

type User = { id: number; name: string; role: "admin" | "staff" | "manager" };
type POSPageProps = { user: User | null; onLogout: () => void };

// ============= DATA =============
// const CATEGORIES: Category[] = [
//   { id: "all", name: "All" },
//   { id: "groceries", name: "Groceries" },
//   { id: "snacks", name: "Snacks" },
//   { id: "drinks", name: "Drinks" },
//   { id: "personal", name: "Personal Care" },
//   { id: "misc", name: "Misc" },
// ];

// const PRODUCTS: Product[] = [
//   {
//     id: "p1",
//     barcode: "890123400001",
//     name: "Maggi Noodles",
//     mrp: 12,
//     gst: 0,
//     categoryId: "snacks",
//   },
//   {
//     id: "p2",
//     barcode: "890123400002",
//     name: "Coke 500ml",
//     mrp: 40,
//     gst: 12,
//     categoryId: "drinks",
//   },
//   {
//     id: "p3",
//     barcode: "890123400003",
//     name: "Milk Bread",
//     mrp: 35,
//     gst: 0,
//     categoryId: "groceries",
//   },
//   {
//     id: "p4",
//     barcode: "890123400004",
//     name: "Rice 1kg",
//     mrp: 72,
//     gst: 0,
//     categoryId: "groceries",
//   },
//   {
//     id: "p5",
//     barcode: "890123400005",
//     name: "Soap Bar",
//     mrp: 28,
//     gst: 18,
//     categoryId: "personal",
//   },
//   {
//     id: "p6",
//     barcode: "890123400006",
//     name: "Biscuit Pack",
//     mrp: 20,
//     gst: 0,
//     categoryId: "snacks",
//   },
//   {
//     id: "p7",
//     barcode: "890123400007",
//     name: "Water 1L",
//     mrp: 20,
//     gst: 0,
//     categoryId: "drinks",
//   },
//   {
//     id: "p8",
//     barcode: "890123400008",
//     name: "Shampoo (S)",
//     mrp: 59,
//     gst: 18,
//     categoryId: "personal",
//   },
// ];

// ============= UTILS =============
function formatINR(n: number) {
  return "₹" + n.toFixed(2);
}

// ============= COMPONENTS =============
function IconBtn({
  onClick,
  children,
  title,
  variant = "default",
  size = "default",
}: {
  onClick?: () => void;
  children: React.ReactNode;
  title?: string;
  variant?: "default" | "danger" | "primary";
  size?: "default" | "sm";
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={[
        "inline-flex items-center justify-center rounded-lg border transition",
        size === "sm" ? "p-1" : "p-2",
        variant === "danger"
          ? "border-gray-200 bg-white text-gray-500 hover:border-red-300 hover:text-red-600"
          : variant === "primary"
            ? "border-blue bg-blue text-white hover:opacity-90"
            : "border-gray-200 bg-white text-gray-700 hover:border-orange hover:text-orange",
      ].join(" ")}
      type="button"
    >
      {children}
    </button>
  );
}

// Modal for manual product search
function ManualAddModal({
  isOpen,
  onClose,
  onAdd,
}: {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (product: Product) => void;
}) {
  const [categoryId, setCategoryId] = useState<number | "all">("all");
  const [query, setQuery] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      const matchCat = categoryId === "all" || p.categoryId === categoryId;
      const matchQuery =
        !q || p.productName.toLowerCase().includes(q) || p.barcode.includes(q);
      return matchCat && matchQuery;
    });
  }, [query, categoryId, products]);

  useEffect(() => {
    if (!isOpen) return;
    // @ts-ignore
    (window.api as any)
      ?.getCategories?.()
      .then((res: any) => setCategories(res?.categories ?? []));
    // @ts-ignore
    (window.api as any)
      ?.getProducts?.()
      .then((res: any) => setProducts(res?.products ?? []));
  }, [isOpen]);

  if (!isOpen) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl max-h-[80vh] bg-white rounded-xl shadow-xl flex overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sidebar: Categories */}
        <aside className="w-48 border-r border-gray-200 bg-gray-50 p-3 overflow-auto">
          <div className="text-xs font-bold text-gray-600 mb-2">Categories</div>
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => setCategoryId("all")}
              className={[
                "w-full text-left px-3 py-2 rounded-lg text-sm font-semibold transition border",
                categoryId === "all"
                  ? "bg-orange/10 text-orange border-orange/30"
                  : "bg-white text-gray-700 border-gray-200 hover:border-orange/40",
              ].join(" ")}
            >
              All Categories
            </button>
            {categories.map((c) => {
              const active = categoryId === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategoryId(c.id)}
                  className={[
                    "w-full text-left px-3 py-2 rounded-lg text-sm font-semibold transition border",
                    active
                      ? "bg-orange/10 text-orange border-orange/30"
                      : "bg-white text-gray-700 border-gray-200 hover:border-orange/40",
                  ].join(" ")}
                >
                  {c.categoryName}
                </button>
              );
            })}
          </div>
        </aside>

        {/* Main: Search + list */}
        <div className="flex-1 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <div className="text-lg font-bold text-gray-900">
                Select Product
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>

            <div className="relative">
              <Search
                className="absolute left-3 top-2.5 text-gray-400"
                size={18}
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name or barcode..."
                className="w-full rounded-lg border border-gray-200 bg-white pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange/40"
                autoFocus
              />
            </div>
          </div>

          <div className="flex-1 overflow-auto p-4">
            <div className="grid grid-cols-3 gap-3">
              {filtered.length === 0 ? (
                <div className="col-span-3 text-center py-8 text-gray-500">
                  No products found
                </div>
              ) : (
                filtered.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      onAdd(p);
                      onClose();
                    }}
                    className="text-left p-3 rounded-lg border border-gray-200 bg-white hover:border-orange/40 hover:shadow-sm transition"
                  >
                    <div className="text-sm font-semibold text-gray-900 truncate">
                      {p.productName}
                    </div>
                    <div className="mt-1 text-[11px] font-mono text-gray-500">
                      {p.barcode}
                    </div>
                    <div className="mt-2 font-mono text-sm font-bold text-blue">
                      {formatINR(p.mrp)}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============= MAIN COMPONENT =============
export default function POSPage({ user }: POSPageProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [bills, setBills] = useState<Bill[]>([
    {
      id: 1,
      items: [],
      billDiscount: 0,
      roundOff: true,
      cashAmt: 0,
      upiAmt: 0,
      cardAmt: 0,
    },
  ]);
  const [activeBillId, setActiveBillId] = useState(1);

  let activeBill = bills.find((b) => b.id === activeBillId) || bills[0];

  useEffect(() => {
    // @ts-ignore
    (window.api as any)
      ?.getProducts?.()
      .then((res: any) => setProducts(res?.products ?? []));
  }, [user]);
  const [showManualAdd, setShowManualAdd] = useState(false);

  // Hidden barcode scanner buffer (global keydown capture) [web:120][web:123]
  const [scanBuffer, setScanBuffer] = useState("");
  const scanTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-balance split amounts when user changes one [file:119]
  const [selectedPayments, setSelectedPayments] = useState<
    Set<"cash" | "upi" | "card">
  >(new Set(["cash"]));

  // Global keydown to capture scanner without focus [web:120][web:123]
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // F7 shortcut to manually trigger add (backup) [file:119]
      if (e.key === "F7") {
        e.preventDefault();
        setShowManualAdd(true);
        return;
      }

      // Ignore if user is typing in input/textarea
      const target = e.target as HTMLElement;
      if (target.closest("input, textarea, select, [contenteditable='true']"))
        return;

      // Build buffer [web:120][web:123]
      if (e.key === "Enter") {
        e.preventDefault();
        if (scanBuffer.trim()) {
          (window.api as any)?.reportScannerActivity?.();
          const exact = products.find((p) => p.barcode === scanBuffer.trim());
          if (exact) addOrInc(exact, 1);
          setScanBuffer("");
        }
        return;
      }

      // Exclude modifiers [web:123]
      if (
        ["Shift", "Control", "Alt", "Meta", "Tab", "CapsLock"].includes(e.key)
      )
        return;

      // Add char to buffer [web:120]
      setScanBuffer((prev) => prev + e.key);

      // Auto-clear buffer after 200ms (scanner types fast) [web:123]
      if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
      scanTimeoutRef.current = setTimeout(() => setScanBuffer(""), 200);
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => {
      window.removeEventListener("keydown", handleGlobalKeyDown);
      if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
    };
  }, [scanBuffer, products]);

  // Setup print event listeners
  useEffect(() => {
    console.log("Setting up print listeners...");
    
    const handlePrintSuccess = () => {
      console.log("✅ Bill printed successfully!");
      alert("✅ Bill printed successfully!");
    };

    const handlePrintError = (_event: any, msg: string) => {
      console.error("❌ Print failed:", msg);
      alert(`❌ Print failed: ${msg}`);
    };

    const cleanupSuccess = (window.api as any)?.onPrintSuccess?.(handlePrintSuccess);
    const cleanupError = (window.api as any)?.onPrintError?.(handlePrintError);

    return () => {
      console.log("Cleaning up print listeners...");
      cleanupSuccess?.();
      cleanupError?.();
    };
  }, []);

  function updateBill(id: number, updater: (bill: Bill) => Bill) {
    setBills((prev) => prev.map((b) => (b.id === id ? updater(b) : b)));
  }
  function removeBill(id: number) {
    setBills((prev) => prev.filter((b) => b.id !== id));
  }

  function addOrInc(product: Product, qty = 1) {
    updateBill(activeBillId, (bill) => {
      const idx = bill.items.findIndex((x) => x.product.id === product.id);
      if (idx === -1)
        return { ...bill, items: [...bill.items, { product, qty }] };
      const copy = [...bill.items];
      copy[idx] = { ...copy[idx], qty: copy[idx].qty + qty };
      return { ...bill, items: copy };
    });
  }

  function inc(productId: number) {
    updateBill(activeBillId, (bill) => ({
      ...bill,
      items: bill.items.map((x) =>
        x.product.id === productId ? { ...x, qty: x.qty + 1 } : x,
      ),
    }));
  }

  function dec(productId: number) {
    updateBill(activeBillId, (bill) => ({
      ...bill,
      items: bill.items
        .map((x) => (x.product.id === productId ? { ...x, qty: x.qty - 1 } : x))
        .filter((x) => x.qty > 0),
    }));
  }

  function remove(productId: number) {
    updateBill(activeBillId, (bill) => ({
      ...bill,
      items: bill.items.filter((x) => x.product.id !== productId),
    }));
  }

  function clearCurrentBill() {
    updateBill(activeBillId, () => ({
      id: activeBillId,
      items: [],
      billDiscount: 0,
      roundOff: true,
      cashAmt: 0,
      upiAmt: 0,
      cardAmt: 0,
    }));
    setSelectedPayments(new Set(["cash"]));
  }

  function cancelCurrentBill() {
    removeBill(activeBillId);
    // const lastBillId = bills.length > 0 ? bills[bills.length - 1].id : 0;
    if (bills.length === 1) createNewBill();
    else {
      setActiveBillId(bills[0].id === activeBillId ? bills[1].id : bills[0].id);
    }

    setSelectedPayments(new Set(["cash"]));
  }

  function createNewBill() {
    const newId = Math.max(...bills.map((b) => b.id)) + 1;
    setBills((prev) => [
      ...prev,
      {
        id: newId,
        items: [],
        billDiscount: 0,
        roundOff: true,
        cashAmt: 0,
        upiAmt: 0,
        cardAmt: 0,
      },
    ]);
    setActiveBillId(newId);
    setSelectedPayments(new Set(["cash"]));
  }

  // Calculations
  const subtotal = useMemo(
    () =>
      activeBill.items.reduce((acc, it) => acc + it.product.mrp * it.qty, 0),
    [activeBill.items],
  );

  const tax = useMemo(() => {
    return activeBill.items.reduce((acc, it) => {
      const lineGross = it.product.mrp * it.qty;
      return acc + (lineGross * (it.product.gst || 0)) / 100;
    }, 0);
  }, [activeBill.items]);

  const taxableBase = Math.max(0, subtotal - activeBill.billDiscount);

  const roundValue = useMemo(() => {
    if (!activeBill.roundOff) return 0;
    const total = taxableBase + tax;
    return Math.round(total) - total;
  }, [taxableBase, tax, activeBill.roundOff]);

  const totalPayable = Math.max(0, taxableBase + tax + roundValue);

  // Auto-balance split [file:119]
  useEffect(() => {
    if (totalPayable === 0) return;

    const selected = Array.from(selectedPayments);
    if (selected.length === 0) return;

    const perMode = totalPayable / selected.length;

    updateBill(activeBillId, (bill) => ({
      ...bill,
      cashAmt: selected.includes("cash") ? perMode : 0,
      upiAmt: selected.includes("upi") ? perMode : 0,
      cardAmt: selected.includes("card") ? perMode : 0,
    }));
  }, [totalPayable, selectedPayments, activeBillId]);

  // Manual split change: auto-adjust others [file:119]
  // function handleSplitChange(mode: "cash" | "upi" | "card", value: number) {
  //   const newVal = Math.max(0, Number(value || 0));

  //   updateBill(activeBillId, (bill) => {
  //     const updated = { ...bill, [`${mode}Amt`]: newVal };
  //     const currentTotal = updated.cashAmt + updated.upiAmt + updated.cardAmt;

  //     if (currentTotal > totalPayable) {
  //       // Reduce others proportionally
  //       const diff = currentTotal - totalPayable;
  //       const others = (["cash", "upi", "card"] as const).filter(
  //         (m) => m !== mode
  //       );
  //       const otherSum =
  //         others.reduce((acc, m) => acc + (updated[`${m}Amt`] as number), 0) ||
  //         1;

  //       others.forEach((m) => {
  //         const share = ((updated[`${m}Amt`] as number) / otherSum) * diff;
  //         updated[`${m}Amt`] = Math.max(
  //           0,
  //           (updated[`${m}Amt`] as number) - share
  //         );
  //       });
  //     } else if (currentTotal < totalPayable) {
  //       // Fill remainder in first available mode
  //       const remaining = totalPayable - currentTotal;
  //       const others = (["cash", "upi", "card"] as const).filter(
  //         (m) => m !== mode
  //       );
  //       if (others.length > 0) {
  //         updated[`${others[0]}Amt`] =
  //           (updated[`${others[0]}Amt`] as number) + remaining;
  //       }
  //     }

  //     return updated;
  //   });
  // }

  function togglePaymentMode(mode: "cash" | "upi" | "card") {
    setSelectedPayments((prev) => {
      const next = new Set(prev);
      if (next.has(mode)) {
        if (next.size > 1) next.delete(mode);
      } else {
        next.add(mode);
      }
      return next;
    });
  }

  const splitTotal =
    activeBill.cashAmt + activeBill.upiAmt + activeBill.cardAmt;
  const remaining = Math.max(0, totalPayable - splitTotal);

  // Helper to determine payment mode
  function getPaymentMode(): string {
    if (
      activeBill.cashAmt > 0.01 &&
      activeBill.upiAmt < 0.01 &&
      activeBill.cardAmt < 0.01
    )
      return "CASH";
    if (
      activeBill.upiAmt > 0.01 &&
      activeBill.cashAmt < 0.01 &&
      activeBill.cardAmt < 0.01
    )
      return "UPI";
    if (
      activeBill.cardAmt > 0.01 &&
      activeBill.cashAmt < 0.01 &&
      activeBill.upiAmt < 0.01
    )
      return "CARD";
    if (
      activeBill.cashAmt > 0.01 ||
      activeBill.upiAmt > 0.01 ||
      activeBill.cardAmt > 0.01
    )
      return "MIXED";
    return "PENDING";
  }

  // Print bill using electron-pos-printer
  function handlePrintBill() {
    console.log("Printing bill...");
    const billItems: BillItem[] = activeBill.items.map((it) => ({
      name: it.product.productName,
      qty: it.qty,
      price: it.product.mrp,
    }));

    const payload: BillPayload = {
      storeName: "AVM Store",
      address: "Madurai, TN",
      phone: "98765 43210",
      billNo: "BILL-" + activeBillId,
      dateTime: new Date().toLocaleString("en-IN"),
      items: billItems,
      total: totalPayable,
      paymentMode: getPaymentMode(),
    };
    console.log(payload);
    (window.api as any)?.printBill?.(payload);
  }

  function payAndSave() {
    if (!user) {
      alert("❌ User not logged in");
      return;
    }

    if (activeBill.items.length === 0) {
      alert("❌ Cart is empty");
      return;
    }

    const isOk = confirm(
      `Bill #${activeBillId} saved\nTotal: ${formatINR(
        totalPayable,
      )}\nCash: ${formatINR(activeBill.cashAmt)}, UPI: ${formatINR(
        activeBill.upiAmt,
      )}, Card: ${formatINR(activeBill.cardAmt)}`,
    );
    if (!isOk) return;

    // Call the checkout handler with proper data
    // @ts-ignore
    (window.api as any)
      ?.checkout({
        createdBy: user.id,
        discount: activeBill.billDiscount,
        paymentSplit: {
          cashAmt: activeBill.cashAmt,
          upiAmt: activeBill.upiAmt,
          cardAmt: activeBill.cardAmt,
        },
        items: activeBill.items.map((it) => ({
          productId: it.product.id,
          qty: it.qty,
        })),
      })
      .then((res: any) => {
        if (res?.success) {
          alert(`✅ Receipt #${res.receiptId} saved successfully!`);

          // Print bill automatically
          handlePrintBill();

          // Remove bill after save
          setBills((prev) => prev.filter((b) => b.id !== activeBillId));
          if (bills.length === 1) createNewBill();
          else
            setActiveBillId(
              bills[0].id === activeBillId ? bills[1].id : bills[0].id,
            );
        } else {
          alert(`❌ Error: ${res?.error || "Failed to save receipt"}`);
        }
      })
      .catch((err: any) => {
        alert(`❌ Error: ${String(err)}`);
      });
  }

  return (
    <div className="min-h-screen bg-bg-secondary">
      {/* Two-section shell (fills page) */}
      <div className="h-fit flex">
        {/* LEFT SECTION */}
        <section className="flex-1 min-w-0 bg-white">
          {/* top tabs row */}
          <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-gray-200 bg-white">
            <div className="flex items-center gap-2">
              <div className=" w-187.5 max-h-15 overflow-x-scroll no-scrollbar gap-2 flex items-center border-r pr-2">
                {bills.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setActiveBillId(b.id)}
                    className={[
                      "px-3 py-1.5 rounded-lg text-xs font-semibold transition border shrink-0",
                      b.id === activeBillId
                        ? "bg-blue text-white border-blue"
                        : "bg-white text-gray-700 border-gray-200 hover:border-blue/40",
                    ].join(" ")}
                  >
                    Bill #{String(b.id).padStart(4, "0")}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2 items-center">
              <button
                type="button"
                onClick={createNewBill}
                title="New bill (hold)"
                className="inline-flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-semibold border border-gray-200 bg-white text-gray-700 hover:border-orange hover:text-orange transition"
              >
                <Plus size={14} />
                New
              </button>
              <button
                type="button"
                onClick={clearCurrentBill}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 hover:border-red-300 transition"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Table header + body (same grid template => perfect alignment) */}
          <div className="h-[calc(100vh-56px)] flex flex-col">
            {/* Header row */}
            <div className="border-b border-gray-200 bg-gray-50">
              <div className="grid grid-cols-12 px-5 py-3 text-xs font-bold text-gray-600">
                <div className="col-span-5 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowManualAdd(true)}
                    title="Add product manually (or press F7)"
                    className="inline-flex items-center justify-center h-6 w-6 rounded-full border border-gray-200 bg-white text-gray-700 hover:border-orange hover:text-orange transition"
                  >
                    <Plus size={14} />
                  </button>
                  <span>Item</span>
                </div>

                <div className="col-span-2 flex items-center justify-end">
                  Rate
                </div>
                <div className="col-span-2 flex items-center justify-center">
                  Quantity
                </div>
                <div className="col-span-1 flex items-center justify-end">
                  GST%
                </div>

                {/* Amount header aligns with amount cell (space reserved for delete icon) */}
                <div className="col-span-2 flex items-center justify-end gap-8">
                  <span>Amount</span>
                  <span className="w-7" aria-hidden="true" />
                </div>
              </div>
            </div>

            {/* Scroll area only for rows */}
            <div className="flex-1 overflow-auto">
              {activeBill.items.length === 0 ? (
                <div className="p-10 text-center text-sm text-gray-500">
                  Scan barcode or press{" "}
                  <kbd className="px-2 py-1 bg-gray-100 rounded text-xs font-mono">
                    F7
                  </kbd>{" "}
                  to add items
                </div>
              ) : (
                <div>
                  {activeBill.items.map((it, idx) => {
                    const lineGross = it.product.mrp * it.qty;
                    const lineTax = (lineGross * (it.product.gst || 0)) / 100;
                    const lineAmount = lineGross + lineTax;

                    return (
                      <div
                        key={it.product.id}
                        className={[
                          "grid grid-cols-12 px-5 py-2 border-b border-gray-200",
                          "items-center",
                          idx % 2 === 0 ? "bg-white" : "bg-gray-50/40",
                        ].join(" ")}
                      >
                        <div className="col-span-5 min-w-0">
                          <div className="text-sm font-semibold text-gray-900 truncate">
                            {it.product.productName}
                          </div>
                          <div className="text-[11px] font-mono text-gray-500 truncate">
                            {it.product.barcode}
                          </div>
                        </div>

                        <div className="col-span-2 flex items-center justify-end font-mono text-sm font-semibold text-gray-900">
                          {formatINR(it.product.mrp)}
                        </div>

                        {/* centered quantity cell */}
                        <div className="col-span-2 flex items-center justify-center gap-2">
                          <IconBtn
                            size="sm"
                            onClick={() => dec(it.product.id)}
                            title="Decrease"
                          >
                            <Minus size={14} />
                          </IconBtn>
                          <div className="w-10 text-center font-mono font-bold text-gray-900 text-sm">
                            {it.qty}
                          </div>
                          <IconBtn
                            size="sm"
                            onClick={() => inc(it.product.id)}
                            title="Increase"
                          >
                            <Plus size={14} />
                          </IconBtn>
                        </div>

                        <div className="col-span-1 flex items-center justify-end font-mono text-sm text-gray-700">
                          {it.product.gst || 0}
                        </div>

                        {/* Amount + delete aligned */}
                        <div className="col-span-2 flex items-center justify-end gap-8">
                          <div className="text-right">
                            <div className="font-mono font-bold text-gray-900 text-sm">
                              {formatINR(lineAmount)}
                            </div>
                            <div className="text-[10px] text-gray-500 font-mono">
                              Tax: {formatINR(lineTax)}
                            </div>
                          </div>

                          <IconBtn
                            size="sm"
                            variant="danger"
                            onClick={() => remove(it.product.id)}
                            title="Remove"
                          >
                            <Trash2 size={14} />
                          </IconBtn>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer area for Clear (inside left section) */}
          </div>
        </section>

        {/* VERTICAL DIVIDER (separate sections like ref) */}
        <div className="w-px bg-gray-200" />

        {/* RIGHT SECTION (fills height) */}
        <aside className="w-90 lg:w-100 bg-white">
          <div className="h-screen overflow-auto">
            {/* Keep your existing right-side blocks EXACTLY as you already have */}
            <div className="p-4 border-b border-gray-200">
              <div className="text-xs font-semibold text-gray-500">Amount</div>
              <div className="mt-1 font-mono text-3xl font-extrabold text-blue">
                {formatINR(totalPayable)}
              </div>
            </div>

            {/* Split cards */}
            <div className="p-4 border-b border-gray-200">
              <div className="text-xs font-semibold text-gray-500 mb-2">
                Split
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  {
                    key: "cash" as const,
                    label: "Cash",
                    icon: <Banknote size={14} />,
                    val: activeBill.cashAmt,
                  },
                  {
                    key: "upi" as const,
                    label: "UPI",
                    icon: <QrCode size={14} />,
                    val: activeBill.upiAmt,
                  },
                  {
                    key: "card" as const,
                    label: "Card",
                    icon: <CreditCard size={14} />,
                    val: activeBill.cardAmt,
                  },
                ].map((m) => {
                  const active = selectedPayments.has(m.key);
                  return (
                    <div
                      key={m.key}
                      className={[
                        "rounded-lg border p-2 text-center transition",
                        active
                          ? "border-blue/30 bg-blue/10"
                          : "border-gray-200 bg-gray-50",
                      ].join(" ")}
                    >
                      <div className="inline-flex items-center gap-1 text-[10px] font-semibold text-gray-600">
                        {m.icon}
                        {m.label}
                      </div>
                      <div className="mt-1 font-mono text-xs font-bold text-gray-900">
                        {m.val > 0 ? formatINR(m.val) : "—"}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Payment summary + Payment mode (keep your existing code below) */}
            <div className="p-4 border-b border-gray-200">
              <div className="text-sm font-bold text-gray-900 mb-3">
                Payment summary
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Sub total</span>

                  <span className="font-mono font-semibold text-gray-900">
                    {formatINR(subtotal)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Discount</span>

                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      value={activeBill.billDiscount}
                      onChange={(e) =>
                        updateBill(activeBillId, (b) => ({
                          ...b,
                          billDiscount: Number(e.target.value || 0),
                        }))
                      }
                      className="w-24 rounded-md border border-gray-200 bg-white px-2 py-1 text-right font-mono text-sm outline-none focus:ring-2 focus:ring-orange/40"
                    />
                    <span className="font-mono font-semibold text-red-600">
                      -{formatINR(activeBill.billDiscount)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Tax (GST)</span>
                  <span className="font-mono font-semibold text-gray-900">
                    {formatINR(tax)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Roundoff</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        updateBill(activeBillId, (b) => ({
                          ...b,
                          roundOff: !b.roundOff,
                        }))
                      }
                      className={[
                        "h-6 w-11 rounded-full border transition relative",
                        activeBill.roundOff
                          ? "bg-orange border-orange/30"
                          : "bg-white border-gray-200",
                      ].join(" ")}
                      aria-label="Toggle roundoff"
                    >
                      <span
                        className={[
                          "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition",
                          activeBill.roundOff ? "left-5" : "left-0.5",
                        ].join(" ")}
                      />
                    </button>
                    <span className="font-mono font-semibold text-gray-900">
                      {activeBill.roundOff
                        ? formatINR(roundValue)
                        : formatINR(0)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Common stuff (split inputs) [file:119] */}
            {/* <div className="p-4 border-b border-gray-200">
                <div className="text-sm font-bold text-gray-900 mb-3">
                  Amount calculation
                </div>

                <div className="space-y-2">
                  {[
                    {
                      key: "cash" as const,
                      label: "Cash",
                      icon: <Banknote size={16} />,
                    },
                    {
                      key: "upi" as const,
                      label: "UPI",
                      icon: <QrCode size={16} />,
                    },
                    {
                      key: "card" as const,
                      label: "Card",
                      icon: <CreditCard size={16} />,
                    },
                  ].map((m) => (
                    <div
                      key={m.key}
                      className="flex items-center justify-between gap-2"
                    >
                      <div className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700">
                        {m.icon}
                        {m.label}
                      </div>
                      <input
                        type="number"
                        min={0}
                        value={activeBill[`${m.key}Amt`]}
                        onChange={(e) =>
                          handleSplitChange(m.key, Number(e.target.value || 0))
                        }
                        className="w-32 rounded-md border border-gray-200 bg-white px-2 py-1 text-right font-mono text-sm outline-none focus:ring-2 focus:ring-orange/40"
                      />
                    </div>
                  ))}
                </div>

                {remaining > 0.01 && (
                  <div className="mt-2 text-xs text-red-600">
                    Remaining: {formatINR(remaining)}
                  </div>
                )}
              </div> */}

            {/* Payment mode (multiselect) [file:119] */}
            <div className="p-4">
              <div className="text-sm font-bold text-gray-900 mb-3">
                Payment mode
              </div>

              <div className="grid grid-cols-3 gap-2 mb-3">
                {[
                  {
                    key: "cash" as const,
                    label: "Cash",
                    icon: <Banknote size={14} />,
                  },
                  {
                    key: "upi" as const,
                    label: "UPI",
                    icon: <QrCode size={14} />,
                  },
                  {
                    key: "card" as const,
                    label: "Card",
                    icon: <CreditCard size={14} />,
                  },
                ].map((m) => {
                  const active = selectedPayments.has(m.key);
                  return (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => togglePaymentMode(m.key)}
                      className={[
                        "rounded-lg border px-2 py-2 text-xs font-semibold transition inline-flex items-center justify-center gap-1",
                        active
                          ? "border-orange/40 bg-orange/10 text-orange"
                          : "border-gray-200 bg-white text-gray-700 hover:border-orange/40",
                      ].join(" ")}
                    >
                      {m.icon}
                      {m.label}
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-2 gap-2 mb-2">
                <button
                  type="button"
                  onClick={cancelCurrentBill}
                  className="rounded-lg border border-gray-200 bg-white py-2.5 text-sm font-semibold text-gray-800 hover:border-red-300 hover:text-red-600 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handlePrintBill}
                  className="rounded-lg border border-gray-200 bg-white py-2.5 text-sm font-semibold text-gray-800 hover:border-blue/40 hover:text-blue transition inline-flex items-center justify-center gap-2"
                >
                  <Printer size={16} />
                  Print
                </button>
              </div>

              <button
                type="button"
                onClick={payAndSave}
                disabled={activeBill.items.length === 0 || remaining > 0.01}
                className="w-full rounded-lg bg-blue text-white py-2.5 text-sm font-semibold hover:opacity-95 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Pay & Save
              </button>
            </div>
            <div className="ml-2 text-xs text-gray-500 text-center mt-2">
              Cashier: {user?.name ?? "Staff"} • Scan ready (F7 manual)
            </div>
          </div>
        </aside>
      </div>

      <ManualAddModal
        isOpen={showManualAdd}
        onClose={() => setShowManualAdd(false)}
        onAdd={(p) => addOrInc(p, 1)}
      />
    </div>
  );
}
