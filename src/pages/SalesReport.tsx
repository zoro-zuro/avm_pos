import React, { useEffect, useMemo, useState } from "react";

type CategoryRow = { id: number; categoryName: string };

type ProductRow = {
  id: number;
  productName: string;
  categoryId: number;
};

type ReceiptRow = {
  id: number;
  totalAmount: number;
  tax: number;
  discount: number | null;
  paymentSplit: string;
  receiptDate: string | Date | null;
};

type LogRow = {
  id: number;
  productId: number;
  receiptId: number | null;
  type: string;
  quantity: number;
  amount: number;
  tax: number;
  discount: number;
  datetime: string | Date;
};

type Preset = "today" | "week" | "month" | "custom";

type PaymentFilter = "all" | "cash" | "upi" | "card";

function fmtINR(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(n);
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function parsePaymentSplit(raw: string): {
  cashAmt: number;
  upiAmt: number;
  cardAmt: number;
} {
  try {
    const p = JSON.parse(raw ?? "{}");
    return {
      cashAmt: Number(p.cashAmt ?? 0),
      upiAmt: Number(p.upiAmt ?? 0),
      cardAmt: Number(p.cardAmt ?? 0),
    };
  } catch {
    return { cashAmt: 0, upiAmt: 0, cardAmt: 0 };
  }
}

export default function SalesReportPage() {
  const [preset, setPreset] = useState<Preset>("week");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");

  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<number | "all">("all");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [receipts, setReceipts] = useState<ReceiptRow[]>([]);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);

  const resolvedRange = useMemo(() => {
    const now = new Date();

    if (preset === "today") {
      return { from: startOfDay(now), to: endOfDay(now) };
    }

    if (preset === "week") {
      const d = startOfDay(now);
      d.setDate(d.getDate() - 6);
      return { from: d, to: endOfDay(now) };
    }

    if (preset === "month") {
      const d = startOfDay(now);
      d.setDate(d.getDate() - 29);
      return { from: d, to: endOfDay(now) };
    }

    const f = from ? startOfDay(new Date(from)) : startOfDay(now);
    const t = to ? endOfDay(new Date(to)) : endOfDay(now);
    return { from: f, to: t };
  }, [preset, from, to]);

  useEffect(() => {
    const f = resolvedRange.from.toISOString().slice(0, 10);
    const t = resolvedRange.to.toISOString().slice(0, 10);
    setFrom((p) => (preset === "custom" ? p : f));
    setTo((p) => (preset === "custom" ? p : t));
  }, [preset, resolvedRange.from, resolvedRange.to]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await window.api?.getSalesRange(
        resolvedRange.from.toISOString(),
        resolvedRange.to.toISOString()
      );
      if (!res?.success) throw new Error(res?.error ?? "Failed to load report");

      setReceipts((res.receipts ?? []) as ReceiptRow[]);
      setLogs((res.logs ?? []) as LogRow[]);
      setProducts((res.products ?? []) as ProductRow[]);
      setCategories((res.categories ?? []) as CategoryRow[]);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, [resolvedRange.from, resolvedRange.to]);

  const productById = useMemo(() => {
    const m = new Map<number, ProductRow>();
    for (const p of products) m.set(p.id, p);
    return m;
  }, [products]);

  const categoryById = useMemo(() => {
    const m = new Map<number, string>();
    for (const c of categories) m.set(c.id, c.categoryName);
    return m;
  }, [categories]);

  const filteredReceipts = useMemo(() => {
    if (paymentFilter === "all") return receipts;

    return receipts.filter((r) => {
      const p = parsePaymentSplit(r.paymentSplit);
      if (paymentFilter === "cash") return p.cashAmt > 0;
      if (paymentFilter === "upi") return p.upiAmt > 0;
      return p.cardAmt > 0;
    });
  }, [receipts, paymentFilter]);

  const receiptIdSet = useMemo(() => new Set(filteredReceipts.map((r) => r.id)), [filteredReceipts]);

  const filteredLogs = useMemo(() => {
    const base = logs.filter((l) => l.type === "sale" && l.receiptId != null);

    const byPayment = paymentFilter === "all" ? base : base.filter((l) => receiptIdSet.has(Number(l.receiptId)));

    if (categoryFilter === "all") return byPayment;

    return byPayment.filter((l) => productById.get(l.productId)?.categoryId === categoryFilter);
  }, [logs, paymentFilter, receiptIdSet, categoryFilter, productById]);

  const metrics = useMemo(() => {
    const totalSales =
      categoryFilter === "all"
        ? filteredReceipts.reduce((acc, r) => acc + Number(r.totalAmount || 0), 0)
        : filteredLogs.reduce(
            (acc, l) => acc + Number(l.amount || 0) - Number(l.discount || 0) + Number(l.tax || 0),
            0
          );

    const transactionCount =
      categoryFilter === "all"
        ? filteredReceipts.length
        : new Set(filteredLogs.map((l) => Number(l.receiptId))).size;

    const avgTransactionValue = transactionCount > 0 ? totalSales / transactionCount : 0;

    const qtyByProduct = new Map<number, number>();
    for (const l of filteredLogs) {
      qtyByProduct.set(l.productId, (qtyByProduct.get(l.productId) ?? 0) + Number(l.quantity || 0));
    }

    const topProducts = Array.from(qtyByProduct.entries())
      .map(([productId, qty]) => ({
        productId,
        qty,
        name: productById.get(productId)?.productName ?? `#${productId}`,
      }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 10);

    const payments = filteredReceipts.reduce(
      (acc, r) => {
        const p = parsePaymentSplit(r.paymentSplit);
        acc.cash += p.cashAmt;
        acc.upi += p.upiAmt;
        acc.card += p.cardAmt;
        return acc;
      },
      { cash: 0, upi: 0, card: 0 }
    );

    return { totalSales, transactionCount, avgTransactionValue, topProducts, payments };
  }, [categoryFilter, filteredReceipts, filteredLogs, productById]);

  const salesOverTime = useMemo(() => {
    const bucket = new Map<string, number>();

    const isHourly = preset === "today";

    if (categoryFilter === "all") {
      for (const r of filteredReceipts) {
        const dt = r.receiptDate ? new Date(r.receiptDate) : new Date();
        const key = isHourly
          ? `${String(dt.getHours()).padStart(2, "0")}:00`
          : dt.toISOString().slice(0, 10);
        bucket.set(key, (bucket.get(key) ?? 0) + Number(r.totalAmount || 0));
      }
    } else {
      for (const l of filteredLogs) {
        const dt = new Date(l.datetime);
        const key = isHourly
          ? `${String(dt.getHours()).padStart(2, "0")}:00`
          : dt.toISOString().slice(0, 10);
        const amount = Number(l.amount || 0) - Number(l.discount || 0) + Number(l.tax || 0);
        bucket.set(key, (bucket.get(key) ?? 0) + amount);
      }
    }

    const keys = isHourly
      ? Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, "0")}:00`)
      : Array.from(bucket.keys()).sort();

    return keys.map((k) => ({ day: k, value: bucket.get(k) ?? 0 }));
  }, [categoryFilter, filteredReceipts, filteredLogs, preset]);

  const pieStyle = useMemo(() => {
    const total = metrics.payments.cash + metrics.payments.upi + metrics.payments.card;
    if (total <= 0) return { background: "conic-gradient(#e2e8f0 0 100%)" } as React.CSSProperties;

    const cashPct = (metrics.payments.cash / total) * 100;
    const upiPct = (metrics.payments.upi / total) * 100;

    const a = cashPct;
    const b = cashPct + upiPct;

    return {
      background: `conic-gradient(#0ea5e9 0 ${a}%, #22c55e ${a}% ${b}%, #f97316 ${b}% 100%)`,
    } as React.CSSProperties;
  }, [metrics.payments]);

  const exportCsv = () => {
    const rows = filteredReceipts.map((r) => {
      const p = parsePaymentSplit(r.paymentSplit);
      return {
        id: r.id,
        receiptDate: r.receiptDate ? new Date(r.receiptDate).toISOString() : "",
        totalAmount: Number(r.totalAmount || 0),
        tax: Number(r.tax || 0),
        discount: Number(r.discount || 0),
        cash: p.cashAmt,
        upi: p.upiAmt,
        card: p.cardAmt,
      };
    });

    const header = Object.keys(rows[0] ?? { id: "" }).join(",");
    const body = rows
      .map((r) =>
        [
          r.id,
          r.receiptDate,
          r.totalAmount,
          r.tax,
          r.discount,
          r.cash,
          r.upi,
          r.card,
        ].join(",")
      )
      .join("\n");

    const csv = header + "\n" + body;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `sales-report_${resolvedRange.from.toISOString().slice(0, 10)}_${resolvedRange.to
      .toISOString()
      .slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6">
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-slate-900">Sales Report</h1>
          <p className="mt-1 text-sm text-slate-500 truncate">
            {resolvedRange.from.toLocaleDateString()} → {resolvedRange.to.toLocaleDateString()}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select className={InputCls} value={preset} onChange={(e) => setPreset(e.target.value as Preset)}>
            <option value="today">Today</option>
            <option value="week">Last 7 days</option>
            <option value="month">Last 30 days</option>
            <option value="custom">Custom</option>
          </select>

          {preset === "custom" ? (
            <>
              <input className={InputCls} value={from} onChange={(e) => setFrom(e.target.value)} placeholder="YYYY-MM-DD" />
              <input className={InputCls} value={to} onChange={(e) => setTo(e.target.value)} placeholder="YYYY-MM-DD" />
            </>
          ) : null}

          <select
            className={InputCls}
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value as PaymentFilter)}
          >
            <option value="all">All payments</option>
            <option value="cash">Cash</option>
            <option value="upi">UPI</option>
            <option value="card">Card</option>
          </select>

          <select
            className={InputCls}
            value={categoryFilter === "all" ? "all" : String(categoryFilter)}
            onChange={(e) =>
              setCategoryFilter(e.target.value === "all" ? "all" : Number(e.target.value))
            }
          >
            <option value="all">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={String(c.id)}>
                {c.categoryName}
              </option>
            ))}
          </select>

          <button className={BtnSecondary} onClick={fetchData} disabled={loading}>
            Refresh
          </button>
          <button className={BtnPrimary} onClick={exportCsv} disabled={loading || filteredReceipts.length === 0}>
            Export CSV
          </button>
        </div>
      </div>

      {error ? (
        <div className="mt-4 rounded-xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {/* Metrics */}
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi title="Total sales" value={loading ? "…" : fmtINR(metrics.totalSales)} />
        <Kpi title="Transactions" value={loading ? "…" : String(metrics.transactionCount)} />
        <Kpi title="Avg transaction" value={loading ? "…" : fmtINR(metrics.avgTransactionValue)} />
        <Kpi title="Top product" value={loading ? "…" : metrics.topProducts[0]?.name ?? "—"} />
      </div>

      {/* Charts */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-4">
            <div className="text-sm font-semibold text-slate-900">Sales over time</div>
            <div className="mt-0.5 text-xs text-slate-500">Line chart</div>
          </div>
          <div className="p-4">
            <LineChart points={salesOverTime} />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-4">
            <div className="text-sm font-semibold text-slate-900">Payments</div>
            <div className="mt-0.5 text-xs text-slate-500">Pie chart</div>
          </div>
          <div className="p-4">
            <div className="mx-auto h-40 w-40 rounded-full" style={pieStyle} />
            <div className="mt-4 space-y-2">
              <LegendRow color="#0ea5e9" label="Cash" value={fmtINR(metrics.payments.cash)} />
              <LegendRow color="#22c55e" label="UPI" value={fmtINR(metrics.payments.upi)} />
              <LegendRow color="#f97316" label="Card" value={fmtINR(metrics.payments.card)} />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-4">
            <div className="text-sm font-semibold text-slate-900">Top products</div>
            <div className="mt-0.5 text-xs text-slate-500">Bar chart (by quantity)</div>
          </div>
          <div className="p-4">
            <BarChart
              rows={metrics.topProducts.map((p) => {
                const prod = productById.get(p.productId);
                const cat = prod ? categoryById.get(prod.categoryId) : null;
                return {
                  label: cat ? `${p.name} (${cat})` : p.name,
                  value: p.qty,
                };
              })}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-4">
            <div className="text-sm font-semibold text-slate-900">Recent receipts</div>
            <div className="mt-0.5 text-xs text-slate-500">Last 10</div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <Th>ID</Th>
                  <Th>Date</Th>
                  <Th className="text-right">Total</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={3} className="p-6 text-slate-600">Loading…</td>
                  </tr>
                ) : filteredReceipts.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="p-6 text-slate-600">No receipts.</td>
                  </tr>
                ) : (
                  filteredReceipts.slice(0, 10).map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/60">
                      <Td className="font-medium text-slate-900">#{r.id}</Td>
                      <Td className="text-slate-600">
                        {r.receiptDate ? new Date(r.receiptDate).toLocaleString() : "—"}
                      </Td>
                      <Td className="text-right tabular-nums font-semibold text-slate-900">
                        {fmtINR(Number(r.totalAmount || 0))}
                      </Td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {categoryFilter !== "all" ? (
        <div className="mt-2 text-xs text-slate-500">
          Note: category-filtered totals are computed from item logs.
        </div>
      ) : null}

      <div className="mt-2 text-xs text-slate-500">
        Loaded products: {products.length} · Categories: {categories.length} · Receipts: {receipts.length}
      </div>
    </div>
  );
}

function Kpi({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs text-slate-500">{title}</div>
      <div className="mt-1 text-lg font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function LegendRow({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: color }} />
        <span className="text-sm text-slate-700">{label}</span>
      </div>
      <div className="text-sm font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function LineChart({ points }: { points: Array<{ day: string; value: number }> }) {
  const w = 520;
  const h = 180;
  const pad = 18;

  const values = points.map((p) => p.value);
  const max = Math.max(1, ...values);
  const min = Math.min(0, ...values);

  const toX = (i: number) => {
    if (points.length <= 1) return pad;
    const t = i / (points.length - 1);
    return pad + t * (w - pad * 2);
  };

  const toY = (v: number) => {
    const t = (v - min) / (max - min || 1);
    return h - pad - t * (h - pad * 2);
  };

  const d = points
    .map((p, i) => `${toX(i)},${toY(p.value)}`)
    .join(" ");

  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full">
        <rect x={0} y={0} width={w} height={h} rx={12} fill="#f8fafc" />
        <polyline
          fill="none"
          stroke="#0f172a"
          strokeWidth={2}
          points={d}
        />
      </svg>
      <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
        {points.slice(-5).map((p) => (
          <span key={p.day} className="rounded-full border border-slate-200 bg-white px-2 py-1">
            {p.day}: {fmtINR(p.value)}
          </span>
        ))}
      </div>
    </div>
  );
}

function BarChart({ rows }: { rows: Array<{ label: string; value: number }> }) {
  const max = Math.max(1, ...rows.map((r) => r.value));

  if (rows.length === 0) {
    return <div className="text-sm text-slate-600">No items in this range.</div>;
  }

  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div key={r.label} className="grid grid-cols-12 gap-2 items-center">
          <div className="col-span-5 truncate text-sm text-slate-700">{r.label}</div>
          <div className="col-span-5">
            <div className="h-2 rounded-full bg-slate-100">
              <div
                className="h-2 rounded-full bg-slate-900"
                style={{ width: `${(r.value / max) * 100}%` }}
              />
            </div>
          </div>
          <div className="col-span-2 text-right text-sm font-semibold text-slate-900">
            {r.value}
          </div>
        </div>
      ))}
    </div>
  );
}

function Th({ children, className = "" }: React.PropsWithChildren<{ className?: string }>) {
  return <th className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide ${className}`}>{children}</th>;
}
function Td({ children, className = "" }: React.PropsWithChildren<{ className?: string }>) {
  return <td className={`px-4 py-3 ${className}`}>{children}</td>;
}

const InputCls =
  "h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-slate-300";
const BtnPrimary =
  "rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50";
const BtnSecondary =
  "rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50";
