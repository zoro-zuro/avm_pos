import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

type ReceiptRow = {
  id: number;
  totalAmount: number;
  tax: number;
  discount: number | null;
  paymentSplit: string;
  receiptDate: string | Date | null;
  createdBy: number;
};

type DashboardMetrics = {
  totalSales: number;
  transactionCount: number;
  avgTransactionValue: number;
  topProductName: string | null;
};

function formatINR(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(n);
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [recent, setRecent] = useState<ReceiptRow[]>([]);

  const fetchToday = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await window.api?.getTodayDashboard();
      if (!res?.success) throw new Error(res?.error ?? "Failed to load dashboard");
      setMetrics(res.metrics as DashboardMetrics);
      setRecent((res.recentReceipts ?? []) as ReceiptRow[]);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchToday();
  }, []);

  const cards = useMemo(() => {
    const m = metrics;
    return [
      { label: "Today's total sales", value: m ? formatINR(m.totalSales) : "—" },
      { label: "Transactions", value: m ? String(m.transactionCount) : "—" },
      {
        label: "Average transaction",
        value: m ? formatINR(m.avgTransactionValue) : "—",
      },
      {
        label: "Top selling product",
        value: m?.topProductName ?? "—",
      },
    ];
  }, [metrics]);

  return (
    <div className="p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">
            Today's sales summary and recent transactions.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button className={BtnSecondary} onClick={fetchToday}>
            Refresh
          </button>
          <button className={BtnPrimary} onClick={() => navigate("/pos")}>
            Go to POS
          </button>
        </div>
      </div>

      {error ? (
        <div className="mt-4 rounded-xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {/* KPI row */}
      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="text-xs text-slate-500">{c.label}</div>
            <div className="mt-1 text-lg font-semibold text-slate-900">
              {loading ? "…" : c.value}
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <ActionBtn label="POS" onClick={() => navigate("/pos")} />
        <ActionBtn label="Inventory" onClick={() => navigate("/inventory")} />
        <ActionBtn label="Reports" onClick={() => navigate("/sales-report")} />
        <ActionBtn label="Settings" onClick={() => navigate("/settings")} />
      </div>

      {/* Recent transactions */}
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-4">
          <div>
            <div className="text-sm font-semibold text-slate-900">
              Recent transactions
            </div>
            <div className="mt-0.5 text-xs text-slate-500">Latest 10</div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <Th>ID</Th>
                <Th>Date</Th>
                <Th className="text-right">Discount</Th>
                <Th className="text-right">Tax</Th>
                <Th className="text-right">Total</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td className="p-6 text-slate-600" colSpan={5}>
                    Loading transactions…
                  </td>
                </tr>
              ) : recent.length === 0 ? (
                <tr>
                  <td className="p-6 text-slate-600" colSpan={5}>
                    No transactions today.
                  </td>
                </tr>
              ) : (
                recent.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/60">
                    <Td className="font-medium text-slate-900">#{r.id}</Td>
                    <Td className="text-slate-600">
                      {r.receiptDate
                        ? new Date(r.receiptDate).toLocaleString()
                        : "—"}
                    </Td>
                    <Td className="text-right tabular-nums text-slate-700">
                      {formatINR(Number(r.discount ?? 0))}
                    </Td>
                    <Td className="text-right tabular-nums text-slate-700">
                      {formatINR(Number(r.tax ?? 0))}
                    </Td>
                    <Td className="text-right tabular-nums font-semibold text-slate-900">
                      {formatINR(Number(r.totalAmount ?? 0))}
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ActionBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm hover:bg-slate-50"
    >
      <div className="text-sm font-semibold text-slate-900">{label}</div>
      <div className="mt-1 text-xs text-slate-500">Open {label}</div>
    </button>
  );
}

function Th({ children, className = "" }: React.PropsWithChildren<{ className?: string }>) {
  return (
    <th
      className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide ${className}`}
    >
      {children}
    </th>
  );
}

function Td({ children, className = "" }: React.PropsWithChildren<{ className?: string }>) {
  return <td className={`px-4 py-3 ${className}`}>{children}</td>;
}

// reuse global classes used elsewhere
const BtnPrimary =
  "rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800";
const BtnSecondary =
  "rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50";
