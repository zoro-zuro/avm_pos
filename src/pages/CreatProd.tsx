import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

type CategoryRow = { id: number; categoryName: string };

type SupplierRow = { id: number; supplierName: string };

type FormState = {
  name: string;
  sku: string;
  categoryId: string;
  price: string;
  quantity: string;
  reorderLevel: string;
  unitType: string;
  warehouse: string;
  description: string;
  brand: string;
  cost: string;
  gst: string;
};

type FormErrors = Partial<Record<keyof FormState, string>>;

export default function CreateProductPage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierRow[]>([]);

  const [state, setState] = useState<FormState>({
    name: "",
    sku: "",
    categoryId: "",
    price: "",
    quantity: "",
    reorderLevel: "10",
    unitType: "piece",
    warehouse: "Main",
    description: "",
    brand: "",
    cost: "",
    gst: "5",
  });

  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setSubmitError(null);
      try {
        const [catRes, supRes] = await Promise.all([
          window.api?.getCategories(),
          window.api?.getSuppliers(),
        ]);

        if (!catRes?.success) throw new Error(catRes?.error ?? "Failed to load categories");
        if (!supRes?.success) throw new Error(supRes?.error ?? "Failed to load suppliers");

        setCategories((catRes.categories ?? []) as CategoryRow[]);
        setSuppliers((supRes.suppliers ?? []) as SupplierRow[]);
      } catch (e) {
        setSubmitError(String(e));
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const validate = async (): Promise<FormErrors> => {
    const next: FormErrors = {};

    if (!state.name.trim()) next.name = "Name is required";
    if (!state.sku.trim()) next.sku = "SKU is required";
    if (!state.categoryId) next.categoryId = "Category is required";

    const price = Number(state.price);
    if (!state.price || Number.isNaN(price)) next.price = "Price is required";
    else if (price <= 0) next.price = "Price must be greater than 0";

    const qty = Number(state.quantity);
    if (!state.quantity || Number.isNaN(qty)) next.quantity = "Quantity is required";
    else if (qty < 0) next.quantity = "Quantity cannot be negative";

    const gst = Number(state.gst);
    if (Number.isNaN(gst) || gst < 0) next.gst = "GST must be a valid number";

    // SKU uniqueness (only if basic validation passed)
    if (!next.sku && state.sku.trim()) {
      const existsRes = await window.api?.barcodeExists(state.sku.trim());
      if (!existsRes?.success) next.sku = existsRes?.error ?? "Failed to validate SKU";
      else if (existsRes.exists) next.sku = "SKU already exists";
    }

    return next;
  };

  const canSubmit = useMemo(() => {
    return Boolean(state.name.trim() && state.sku.trim() && state.categoryId && state.price && state.quantity);
  }, [state]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setSuccess(null);
    setSubmitError(null);

    setSubmitting(true);
    try {
      const nextErrors = await validate();
      setErrors(nextErrors);
      if (Object.keys(nextErrors).length > 0) return;

      const supplierId = suppliers[0]?.id;
      if (!supplierId) throw new Error("No supplier found. Please seed the database.");

      const price = Number(state.price);
      const cost = state.cost ? Number(state.cost) : Math.max(0, price * 0.75);

      const res = await window.api?.invoke("products:add", {
        name: state.name.trim(),
        barcode: state.sku.trim(),
        categoryId: Number(state.categoryId),
        supplierId,
        quantity: Number(state.quantity),
        reorderLevel: Number(state.reorderLevel || 0),
        unit: state.unitType || "piece",
        brand: state.brand.trim() || "AVM",
        mrp: price,
        cost,
        gst: Number(state.gst || 0),
        warehouse: state.warehouse.trim() || "Main",
        description: state.description.trim() || null,
      });

      if (!res?.success) throw new Error(res?.error ?? "Failed to create product");

      setSuccess(`Product created (ID: ${res.productId}). Redirecting…`);
      setState((p) => ({
        ...p,
        name: "",
        sku: "",
        categoryId: "",
        price: "",
        quantity: "",
        description: "",
        brand: "",
        cost: "",
      }));

      setTimeout(() => navigate("/inventory"), 600);
    } catch (err) {
      setSubmitError(String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Create Product</h1>
          <p className="mt-1 text-sm text-slate-500">
            Add a new product to inventory.
          </p>
        </div>

        <div className="flex gap-2">
          <button className={BtnSecondary} type="button" onClick={() => navigate("/inventory")}> 
            Cancel
          </button>
          <button className={BtnPrimary} type="submit" form="createProduct" disabled={!canSubmit || submitting || loading}>
            {submitting ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      {submitError ? (
        <div className="mt-4 rounded-xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-700">
          {submitError}
        </div>
      ) : null}

      {success ? (
        <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-700">
          {success}
        </div>
      ) : null}

      <form id="createProduct" onSubmit={onSubmit} className="mt-5 grid grid-cols-12 gap-4">
        <Card className="col-span-12 lg:col-span-6" title="Basic details">
          <div className="grid grid-cols-12 gap-3 p-4">
            <Field
              className="col-span-12"
              label="Product name"
              value={state.name}
              onChange={(v) => setState((p) => ({ ...p, name: v }))}
              error={errors.name}
            />

            <Field
              className="col-span-12 sm:col-span-6"
              label="SKU / Barcode"
              value={state.sku}
              onChange={(v) => setState((p) => ({ ...p, sku: v }))}
              error={errors.sku}
            />

            <div className="col-span-12 sm:col-span-6 grid gap-2">
              <Label>Category</Label>
              <select
                className={InputCls}
                value={state.categoryId}
                onChange={(e) => setState((p) => ({ ...p, categoryId: e.target.value }))}
                disabled={loading}
              >
                <option value="">Select category</option>
                {categories.map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.categoryName}
                  </option>
                ))}
              </select>
              {errors.categoryId ? <Err>{errors.categoryId}</Err> : null}
            </div>

            <Field
              className="col-span-12 sm:col-span-6"
              label="Warehouse"
              value={state.warehouse}
              onChange={(v) => setState((p) => ({ ...p, warehouse: v }))}
            />

            <Field
              className="col-span-12 sm:col-span-6"
              label="Unit type"
              value={state.unitType}
              onChange={(v) => setState((p) => ({ ...p, unitType: v }))}
            />

            <Field
              className="col-span-12"
              label="Description"
              value={state.description}
              onChange={(v) => setState((p) => ({ ...p, description: v }))}
            />
          </div>
        </Card>

        <Card className="col-span-12 lg:col-span-6" title="Pricing & stock">
          <div className="grid grid-cols-12 gap-3 p-4">
            <Field
              className="col-span-12 sm:col-span-6"
              label="Price (MRP)"
              type="number"
              value={state.price}
              onChange={(v) => setState((p) => ({ ...p, price: v }))}
              error={errors.price}
            />

            <Field
              className="col-span-12 sm:col-span-6"
              label="Cost (optional)"
              type="number"
              value={state.cost}
              onChange={(v) => setState((p) => ({ ...p, cost: v }))}
            />

            <Field
              className="col-span-12 sm:col-span-4"
              label="Quantity"
              type="number"
              value={state.quantity}
              onChange={(v) => setState((p) => ({ ...p, quantity: v }))}
              error={errors.quantity}
            />

            <Field
              className="col-span-12 sm:col-span-4"
              label="Reorder level"
              type="number"
              value={state.reorderLevel}
              onChange={(v) => setState((p) => ({ ...p, reorderLevel: v }))}
            />

            <Field
              className="col-span-12 sm:col-span-4"
              label="GST %"
              type="number"
              value={state.gst}
              onChange={(v) => setState((p) => ({ ...p, gst: v }))}
              error={errors.gst}
            />

            <Field
              className="col-span-12 sm:col-span-6"
              label="Brand"
              value={state.brand}
              onChange={(v) => setState((p) => ({ ...p, brand: v }))}
            />

            <div className="col-span-12 sm:col-span-6 grid gap-2">
              <Label>Supplier</Label>
              <select className={InputCls} value={suppliers[0]?.id ? String(suppliers[0].id) : ""} disabled>
                {suppliers.length === 0 ? <option>No suppliers</option> : null}
                {suppliers.map((s) => (
                  <option key={s.id} value={String(s.id)}>
                    {s.supplierName}
                  </option>
                ))}
              </select>
              <Help>Currently uses the default supplier (seeded).</Help>
            </div>
          </div>
        </Card>

        {loading ? (
          <div className="col-span-12 text-sm text-slate-600">Loading…</div>
        ) : null}
      </form>
    </div>
  );
}

function Card({
  title,
  className,
  children,
}: React.PropsWithChildren<{ title: string; className?: string }>) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${className ?? ""}`}>
      <div className="border-b border-slate-100 p-4">
        <div className="text-sm font-semibold text-slate-900">{title}</div>
      </div>
      {children}
    </div>
  );
}

function Label({ children }: React.PropsWithChildren) {
  return <div className="text-xs font-medium text-slate-600">{children}</div>;
}

function Help({ children }: React.PropsWithChildren) {
  return <div className="text-xs text-slate-500">{children}</div>;
}

function Err({ children }: React.PropsWithChildren) {
  return <div className="text-xs text-rose-700">{children}</div>;
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  className = "",
  type = "text",
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  type?: string;
  error?: string;
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
      {error ? <Err>{error}</Err> : null}
    </div>
  );
}

const InputCls =
  "rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-300 disabled:bg-slate-50 disabled:text-slate-400";
const BtnPrimary =
  "rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50";
const BtnSecondary =
  "rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50";
