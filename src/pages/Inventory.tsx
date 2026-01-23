import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDebouncedValue } from "../lib/useDebouncedValue";

type CategoryRow = { id: number; categoryName: string };

type ProductRow = {
  id: number;
  barcode: string;
  productName: string;
  categoryId: number;
  quantity: number;
  reorderLevel: number;
  mrp: number;
  gst: number;
  unit: string;
  brand: string;
  warehouse: string | null;
  updatedAt: string | Date | null;
  description: string | null;
};

type SortKey = "productName" | "barcode" | "quantity" | "mrp" | "updatedAt";

type StockStatus = "All" | "In Stock" | "Low" | "Out";

export default function InventoryPage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [products, setProducts] = useState<ProductRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);

  const [lowStockThreshold, setLowStockThreshold] = useState<number>(10);

  const [q, setQ] = useState("");
  const dq = useDebouncedValue(q, 250);
  const [categoryId, setCategoryId] = useState<number | "all">("all");
  const [status, setStatus] = useState<StockStatus>("All");

  const [sortKey, setSortKey] = useState<SortKey>("productName");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const [page, setPage] = useState(1);
  const pageSize = 15;

  const [editing, setEditing] = useState<ProductRow | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<ProductRow>>({});
  const [saving, setSaving] = useState(false);

  const refresh = async () => {
    setLoading(true);
    setError(null);

    try {
      const [prodRes, catRes, settingsRes] = await Promise.all([
        window.api?.getProducts(),
        window.api?.getCategories(),
        window.api?.getSettings(),
      ]);

      if (!prodRes?.success)
        throw new Error(prodRes?.error ?? "Failed to load products");
      if (!catRes?.success)
        throw new Error(catRes?.error ?? "Failed to load categories");

      setProducts((prodRes.products ?? []) as ProductRow[]);
      setCategories((catRes.categories ?? []) as CategoryRow[]);

      const threshold = Number(settingsRes?.settings?.lowStockThreshold ?? 10);
      if (!Number.isNaN(threshold)) setLowStockThreshold(threshold);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const categoryNameById = useMemo(() => {
    const m = new Map<number, string>();
    for (const c of categories) m.set(c.id, c.categoryName);
    return m;
  }, [categories]);

  const filtered = useMemo(() => {
    const query = dq.trim().toLowerCase();

    return products.filter((p) => {
      const matchesQ =
        !query ||
        p.productName.toLowerCase().includes(query) ||
        p.barcode.toLowerCase().includes(query);

      const matchesCat = categoryId === "all" || p.categoryId === categoryId;

      const isOut = p.quantity <= 0;
      const isLow = p.quantity > 0 && p.quantity <= lowStockThreshold;
      const matchesStatus =
        status === "All" ||
        (status === "Out" && isOut) ||
        (status === "Low" && isLow) ||
        (status === "In Stock" && !isOut && !isLow);

      return matchesQ && matchesCat && matchesStatus;
    });
  }, [products, dq, categoryId, status, lowStockThreshold]);

  const sorted = useMemo(() => {
    const arr = [...filtered];

    const dir = sortDir === "asc" ? 1 : -1;

    arr.sort((a, b) => {
      const va = a[sortKey];
      const vb = b[sortKey];

      if (sortKey === "quantity" || sortKey === "mrp") {
        return (Number(va) - Number(vb)) * dir;
      }

      if (sortKey === "updatedAt") {
        const da = va ? new Date(va).getTime() : 0;
        const db = vb ? new Date(vb).getTime() : 0;
        return (da - db) * dir;
      }

      return String(va ?? "").localeCompare(String(vb ?? "")) * dir;
    });

    return arr;
  }, [filtered, sortKey, sortDir]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));

  useEffect(() => {
    setPage(1);
  }, [dq, categoryId, status, sortKey, sortDir]);

  const paged = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, page]);

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setSortDir("asc");
    }
  };

  const openEdit = (p: ProductRow) => {
    setEditing(p);
    setEditDraft({
      productName: p.productName,
      barcode: p.barcode,
      categoryId: p.categoryId,
      quantity: p.quantity,
      reorderLevel: p.reorderLevel,
      mrp: p.mrp,
      gst: p.gst,
      unit: p.unit,
      brand: p.brand,
      warehouse: p.warehouse,
      description: p.description,
    });
  };

  const saveEdit = async () => {
    if (!editing) return;

    const name = String(editDraft.productName ?? "").trim();
    const barcode = String(editDraft.barcode ?? "").trim();

    if (!name || !barcode) {
      setError("Name and SKU are required");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await window.api?.invoke("products:update", {
        id: editing.id,
        args: {
          productName: name,
          barcode,
          categoryId: Number(editDraft.categoryId),
          quantity: Number(editDraft.quantity),
          reorderLevel: Number(editDraft.reorderLevel),
          mrp: Number(editDraft.mrp),
          gst: Number(editDraft.gst),
          unit: String(editDraft.unit ?? "piece"),
          brand: String(editDraft.brand ?? ""),
          warehouse: String(editDraft.warehouse ?? ""),
          description: String(editDraft.description ?? ""),
        },
      });

      if (!res?.success) throw new Error(res?.error ?? "Failed to update product");

      setEditing(null);
      setEditDraft({});
      await refresh();
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  };

  const deleteProduct = async (p: ProductRow) => {
    if (!confirm(`Delete ${p.productName}?`)) return;

    setError(null);
    try {
      const res = await window.api?.invoke("products:delete", { id: p.id });
      if (!res?.success) throw new Error(res?.error ?? "Failed to delete");
      await refresh();
    } catch (e) {
      setError(String(e));
    }
  };

  return (
    <div className="p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Inventory</h1>
          <p className="mt-1 text-sm text-slate-500">
            Search, filter, sort, and manage products.
          </p>
        </div>

        <div className="flex gap-2">
          <button className={BtnSecondary} onClick={refresh} disabled={loading}>
            Refresh
          </button>
          <button className={BtnPrimary} onClick={() => navigate("/create-product")}> 
            Add New Product
          </button>
        </div>
      </div>

      {error ? (
        <div className="mt-4 rounded-xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="mt-5 rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 items-center gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name or SKU"
              className={InputCls}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              className={InputCls}
              value={categoryId === "all" ? "all" : String(categoryId)}
              onChange={(e) =>
                setCategoryId(e.target.value === "all" ? "all" : Number(e.target.value))
              }
            >
              <option value="all">All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.categoryName}
                </option>
              ))}
            </select>

            <select
              className={InputCls}
              value={status}
              onChange={(e) => setStatus(e.target.value as StockStatus)}
            >
              <option value="All">All</option>
              <option value="In Stock">In Stock</option>
              <option value="Low">Low</option>
              <option value="Out">Out</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <Th sortable onClick={() => toggleSort("barcode")}>SKU</Th>
                <Th sortable onClick={() => toggleSort("productName")}>Product</Th>
                <Th>Category</Th>
                <Th>Warehouse</Th>
                <Th className="text-right" sortable onClick={() => toggleSort("quantity")}>
                  Qty
                </Th>
                <Th className="text-right" sortable onClick={() => toggleSort("mrp")}> 
                  Price
                </Th>
                <Th className="text-right">Reorder</Th>
                <Th>Status</Th>
                <Th sortable onClick={() => toggleSort("updatedAt")}>Updated</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td className="p-10 text-center text-slate-500" colSpan={10}>
                    Loading…
                  </td>
                </tr>
              ) : paged.length === 0 ? (
                <tr>
                  <td className="p-10 text-center text-slate-500" colSpan={10}>
                    No products found.
                  </td>
                </tr>
              ) : (
                paged.map((p) => {
                  const out = p.quantity <= 0;
                  const low = p.quantity > 0 && p.quantity <= lowStockThreshold;

                  return (
                    <tr
                      key={p.id}
                      className={
                        out
                          ? "bg-rose-50/60"
                          : low
                            ? "bg-amber-50/60"
                            : "hover:bg-slate-50/60"
                      }
                    >
                      <Td className="font-mono text-slate-800">{p.barcode}</Td>
                      <Td className="font-medium text-slate-900">{p.productName}</Td>
                      <Td className="text-slate-600">
                        {categoryNameById.get(p.categoryId) ?? "—"}
                      </Td>
                      <Td className="text-slate-600">{p.warehouse ?? "Main"}</Td>
                      <Td className="text-right tabular-nums text-slate-800">{p.quantity}</Td>
                      <Td className="text-right tabular-nums text-slate-800">₹{Number(p.mrp).toFixed(2)}</Td>
                      <Td className="text-right tabular-nums text-slate-700">{p.reorderLevel}</Td>
                      <Td>
                        <StatusBadge out={out} low={low} />
                      </Td>
                      <Td className="text-slate-600">
                        {p.updatedAt ? new Date(p.updatedAt).toLocaleDateString() : "—"}
                      </Td>
                      <Td className="text-right">
                        <div className="inline-flex gap-2">
                          <button className={BtnSecondary} onClick={() => openEdit(p)}>
                            Edit
                          </button>
                          <button className={BtnDanger} onClick={() => deleteProduct(p)}>
                            Delete
                          </button>
                        </div>
                      </Td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-100 p-4 text-sm text-slate-600">
          <div>
            Page {page} / {pageCount} · {sorted.length} item(s)
          </div>
          <div className="flex items-center gap-2">
            <button
              className={BtnSecondary}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              Prev
            </button>
            <button
              className={BtnSecondary}
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              disabled={page >= pageCount}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {editing ? (
        <Modal title={`Edit: ${editing.productName}`} onClose={() => setEditing(null)}>
          <div className="grid grid-cols-12 gap-3">
            <Field
              className="col-span-12 sm:col-span-6"
              label="Product name"
              value={String(editDraft.productName ?? "")}
              onChange={(v) => setEditDraft((p) => ({ ...p, productName: v }))}
            />
            <Field
              className="col-span-12 sm:col-span-6"
              label="SKU / Barcode"
              value={String(editDraft.barcode ?? "")}
              onChange={(v) => setEditDraft((p) => ({ ...p, barcode: v }))}
            />

            <div className="col-span-12 sm:col-span-6 grid gap-2">
              <Label>Category</Label>
              <select
                className={InputCls}
                value={String(editDraft.categoryId ?? editing.categoryId)}
                onChange={(e) =>
                  setEditDraft((p) => ({ ...p, categoryId: Number(e.target.value) }))
                }
              >
                {categories.map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.categoryName}
                  </option>
                ))}
              </select>
            </div>

            <Field
              className="col-span-12 sm:col-span-3"
              label="Quantity"
              type="number"
              value={String(editDraft.quantity ?? editing.quantity)}
              onChange={(v) => setEditDraft((p) => ({ ...p, quantity: Number(v) }))}
            />
            <Field
              className="col-span-12 sm:col-span-3"
              label="Reorder level"
              type="number"
              value={String(editDraft.reorderLevel ?? editing.reorderLevel)}
              onChange={(v) =>
                setEditDraft((p) => ({ ...p, reorderLevel: Number(v) }))
              }
            />

            <Field
              className="col-span-12 sm:col-span-4"
              label="MRP"
              type="number"
              value={String(editDraft.mrp ?? editing.mrp)}
              onChange={(v) => setEditDraft((p) => ({ ...p, mrp: Number(v) }))}
            />
            <Field
              className="col-span-12 sm:col-span-4"
              label="GST %"
              type="number"
              value={String(editDraft.gst ?? editing.gst)}
              onChange={(v) => setEditDraft((p) => ({ ...p, gst: Number(v) }))}
            />
            <Field
              className="col-span-12 sm:col-span-4"
              label="Unit"
              value={String(editDraft.unit ?? editing.unit)}
              onChange={(v) => setEditDraft((p) => ({ ...p, unit: v }))}
            />

            <Field
              className="col-span-12 sm:col-span-6"
              label="Brand"
              value={String(editDraft.brand ?? editing.brand)}
              onChange={(v) => setEditDraft((p) => ({ ...p, brand: v }))}
            />
            <Field
              className="col-span-12 sm:col-span-6"
              label="Warehouse"
              value={String(editDraft.warehouse ?? editing.warehouse ?? "")}
              onChange={(v) => setEditDraft((p) => ({ ...p, warehouse: v }))}
            />

            <Field
              className="col-span-12"
              label="Description"
              value={String(editDraft.description ?? editing.description ?? "")}
              onChange={(v) => setEditDraft((p) => ({ ...p, description: v }))}
            />
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <button className={BtnSecondary} onClick={() => setEditing(null)} disabled={saving}>
              Cancel
            </button>
            <button className={BtnPrimary} onClick={saveEdit} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

function StatusBadge({ out, low }: { out: boolean; low: boolean }) {
  const cls = out
    ? "border-rose-100 bg-rose-50 text-rose-700"
    : low
      ? "border-amber-100 bg-amber-50 text-amber-700"
      : "border-emerald-100 bg-emerald-50 text-emerald-700";
  const label = out ? "Out" : low ? "Low" : "In";

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
}

function Modal({
  title,
  children,
  onClose,
}: React.PropsWithChildren<{ title: string; onClose: () => void }>) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-4">
          <div className="text-sm font-semibold text-slate-900">{title}</div>
          <button className={BtnSecondary} onClick={onClose}>
            Close
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

function Th({
  children,
  className = "",
  sortable,
  onClick,
}: React.PropsWithChildren<{
  className?: string;
  sortable?: boolean;
  onClick?: () => void;
}>) {
  return (
    <th
      className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide ${className} ${
        sortable ? "cursor-pointer select-none hover:text-slate-900" : ""
      }`}
      onClick={onClick}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  className = "",
}: React.PropsWithChildren<{ className?: string }>) {
  return <td className={`px-4 py-3 ${className}`}>{children}</td>;
}

function Label({ children }: React.PropsWithChildren) {
  return <div className="text-xs font-medium text-slate-600">{children}</div>;
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  className = "",
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  type?: string;
}) {
  return (
    <div className={`${className} grid gap-2`}>
      <Label>{label}</Label>
      <input
        className={InputCls}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        type={type}
      />
    </div>
  );
}

const InputCls =
  "rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-300";
const BtnPrimary =
  "rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50";
const BtnSecondary =
  "rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50";
const BtnDanger =
  "rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700";
