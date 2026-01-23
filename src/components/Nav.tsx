import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  ShoppingCart,
  Calculator,
  ReceiptText,
  Settings,
  Printer,
  Barcode,
  LogOut,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
type ReceiptRow = {
  id: number;
  totalAmount: number;
  tax: number;
  discount: number | null;
  paymentSplit: string; // JSON string
  receiptDate: string | null; // if you serialize timestamp
  createdBy: number;
};

type PaymentSplit = { cashAmt: number; upiAmt: number; cardAmt: number };

type DeviceStatus = "connected" | "disconnected" | "unknown";
type User = { id: number; name: string; role: "admin" | "staff" | "manager" };
function StatusDot({ status }: { status: DeviceStatus }) {
  const color =
    status === "connected"
      ? "bg-green-500"
      : status === "disconnected"
      ? "bg-red-500"
      : "bg-gray-400";

  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${color}`} />;
}

function RouteDropdown({ user }: { user: User | null }) {
  const [open, setOpen] = useState(false);

  const items = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, show: true },
    { to: "/pos", label: "POS", icon: ShoppingCart, show: true },
    { to: "/inventory", label: "Inventory", icon: ReceiptText, show: true },
    {
      to: "/create-product",
      label: "Create Product",
      icon: ShoppingCart,
      show: true,
    },
    {
      to: "/sales-report",
      label: "Sales Report",
      icon: ReceiptText,
      show: user?.role === "admin",
    },
    { to: "/settings", label: "Settings", icon: Settings, show: true },
  ].filter((x) => x.show);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition border bg-white text-gray-700 border-gray-200 hover:border-orange hover:text-orange"
      >
        Navigate
        <span className="text-xs">▾</span>
      </button>

      {open && (
        <div className="absolute left-0 mt-2 w-56 rounded-xl border border-gray-200 bg-white shadow-xl overflow-hidden z-50">
          {items.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <Icon size={16} />
              {label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function NavPill({
  to,
  label,
  icon: Icon,
}: {
  to: string;
  label: string;
  icon: React.ElementType;
}) {
  const { pathname } = useLocation();
  const active = pathname === to;

  return (
    <Link
      to={to}
      className={[
        "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition",
        "border",
        active
          ? "bg-blue text-white border-transparent"
          : "bg-white text-gray-700 border-gray-200 hover:border-orange hover:text-orange",
      ].join(" ")}
    >
      <Icon size={16} />
      {label}
    </Link>
  );
}

function ReceiptsModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [rows, setRows] = useState<ReceiptRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);

    setLoading(true);
    setError(null);
    (window.api as any)
      ?.getReceipts?.()
      .then((res: any) => {
        // handler returns { success, allRec }
        if (res?.success) setRows(res.allRec ?? []);
        else setError(res?.error ?? "Failed to load receipts");
      })
      .catch((e: any) => setError(e?.message ?? "Failed to load receipts"))
      .finally(() => setLoading(false));

    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const parsePayment = (s: string): PaymentSplit => {
    try {
      const p = JSON.parse(s ?? "{}");
      return {
        cashAmt: Number(p.cashAmt ?? 0),
        upiAmt: Number(p.upiAmt ?? 0),
        cardAmt: Number(p.cardAmt ?? 0),
      };
    } catch {
      return { cashAmt: 0, upiAmt: 0, cardAmt: 0 };
    }
  };

  return (
    <div className="fixed inset-0 z-50">
      {/* <div
        className="absolute inset-0 h-screen w-screen bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
      /> */}

      <div className="absolute bottom--0 left-0 right-0 flex items-center justify-center p-4">
        <div
          className="w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-4">
            <div>
              <div className="text-sm font-semibold text-slate-900">
                Receipts
              </div>
              <div className="mt-0.5 text-xs text-slate-500">
                {loading ? "Loading…" : `${rows.length} receipt(s)`}
              </div>
            </div>
            <button className={BtnPrimary} onClick={onClose}>
              Close
            </button>
          </div>

          <div className="max-h-[70vh] overflow-auto p-4">
            {error ? (
              <div className="rounded-xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-700">
                {error}
              </div>
            ) : loading ? (
              <div className="text-sm text-slate-600">Fetching receipts…</div>
            ) : rows.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
                No receipts found.
              </div>
            ) : (
              <div className="space-y-3">
                {rows.map((r) => {
                  const pay = parsePayment(r.paymentSplit);
                  return (
                    <div
                      key={r.id}
                      className="rounded-2xl border border-slate-200 p-4 hover:bg-slate-50/50"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-slate-900">
                            Receipt #{r.id}
                          </div>
                          <div className="mt-0.5 text-xs text-slate-500">
                            Tax: ₹{r.tax} · Discount: ₹{r.discount ?? 0}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-slate-500">Total</div>
                          <div className="text-sm font-semibold text-slate-900">
                            ₹{r.totalAmount}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                        <MiniKV label="Cash" value={`₹${pay.cashAmt}`} />
                        <MiniKV label="UPI" value={`₹${pay.upiAmt}`} />
                        <MiniKV label="Card" value={`₹${pay.cardAmt}`} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-slate-100 p-4">
            <div className="text-xs text-slate-500">Press Esc to close.</div>
            {/* <button className={BtnPrimary} onClick={onClose}>
              Done
            </button> */}
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniKV({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
      <div className="text-[11px] text-slate-500">{label}</div>
      <div className="text-sm font-semibold text-slate-900">{value}</div>
    </div>
  );
}

// reuse your button classes
const BtnPrimary =
  "rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800";
// const BtnSecondary =
//   "rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50";

export default function Navbar({
  mode = "pos",
  printerStatus = "unknown",
  scannerStatus = "unknown",
  user,
  onLogout,
}: {
  mode?: "pos" | "dashboard";
  printerStatus?: DeviceStatus;
  scannerStatus?: DeviceStatus;
  user: User | null;
  onLogout: () => void;
}) {
  // Switch button: If you are on POS => show Dashboard button; if Dashboard => show POS button
  const switchTo = mode === "pos" ? "/dashboard" : "/pos";
  const switchLabel = mode === "pos" ? "Dashboard" : "POS";
  const SwitchIcon = mode === "pos" ? LayoutDashboard : ShoppingCart;
  const [isReceipts, setIsReceipts] = useState<boolean>(false);
  const [open, setOpen] = useState(false);
  const popRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (popRef.current && !popRef.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-200 bg-white/90 backdrop-blur">
      <div className="flex h-14 items-center justify-between px-4">
        {/* Left: Logo */}
        {isReceipts && (
          <ReceiptsModal
            isOpen={isReceipts}
            onClose={() => setIsReceipts(false)}
          />
        )}
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-orange text-white grid place-items-center font-bold">
            AVM
          </div>
          <div className="leading-tight">
            <div className="text-sm font-bold text-gray-900">AVM Store</div>
            <div className="text-xs text-gray-500">POS</div>
          </div>
        </div>

        {/* Center: Nav */}
        <nav className="hidden md:flex items-center gap-2">
          <RouteDropdown user={user} />
          <NavPill to="/pos" label="POS" icon={Calculator} />
          <button
            className={[
              "inline-flex relative items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition",
              "border bg-white text-gray-700 border-gray-200 hover:border-orange hover:text-orange",
            ].join(" ")}
            onClick={() => setIsReceipts(!isReceipts)}
          >
            <ReceiptText size={16} />
            Receipts
          </button>
          {/* <NavPill
            to="/pos/transactions"
            label="ReceiptText"
            icon={ReceiptText}
          /> */}
        </nav>

        {/* Right: Status + Settings */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-600">
              <Printer size={16} className="text-gray-500" />
              <StatusDot status={printerStatus} />
              <span>Printer</span>
            </div>
            <div className="h-4 w-px bg-gray-200" />
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-600">
              <Barcode size={16} className="text-gray-500" />
              <StatusDot status={scannerStatus} />
              <span>Scanner</span>
            </div>
          </div>

          <Link
            to="/settings"
            className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white p-2 hover:border-orange hover:text-orange transition"
            title="Settings"
          >
            <Settings size={18} />
          </Link>

          <div className="relative" ref={popRef}>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-2 py-1.5 hover:border-orange transition"
              title="User"
            >
              <div className="h-8 w-8 rounded-full bg-blue text-white grid place-items-center text-xs font-bold">
                {(user?.name?.[0] ?? "U").toUpperCase()}
              </div>
            </button>

            {open && (
              <div className="absolute right-0 mt-2 w-64 rounded-xl border border-gray-200 bg-white shadow-xl overflow-hidden">
                <div className="p-3">
                  <div className="text-sm font-bold text-gray-900 truncate">
                    {user?.name ?? "Unknown User"}
                  </div>
                  <div className="text-xs text-gray-500">
                    Role:{" "}
                    <span className="font-semibold text-gray-700">
                      {user?.role ?? "-"}
                    </span>
                  </div>
                </div>

                <div className="border-t border-gray-100 p-2 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      onLogout();
                    }}
                    className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white p-2 text-gray-700 hover:border-red-300 hover:text-red-600 transition"
                    title="Logout"
                  >
                    <LogOut size={18} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile nav */}
      <div className="md:hidden flex gap-2 px-4 pb-3">
        <NavPill to={switchTo} label={switchLabel} icon={SwitchIcon} />
        <NavPill to="/pos" label="Calc" icon={Calculator} />
        <NavPill to="/pos" label="Txns" icon={ReceiptText} />
      </div>
    </header>
  );
}
