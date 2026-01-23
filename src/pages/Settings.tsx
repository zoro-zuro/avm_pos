import React, { useEffect, useMemo, useState } from "react";

type Role = "admin" | "staff" | "manager";

export type SettingsUser = {
  id: number;
  name: string;
  role: Role;
};

type SettingsPageProps = {
  user: SettingsUser;
};

type AppUserRow = {
  id: number;
  name: string;
  role: Role;
  active: boolean;
  createdAt?: string | Date;
};

type Tab = "store" | "users" | "system";

export default function SettingsPage({ user }: SettingsPageProps) {
  const [tab, setTab] = useState<Tab>("store");

  return (
    <div className="p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Settings</h1>
          <p className="mt-1 text-sm text-slate-500">Store, users, and system settings.</p>
        </div>
      </div>

      {user.role !== "admin" ? (
        <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-semibold text-slate-900">Account</div>
          <div className="mt-2 text-sm text-slate-700">Logged in as: {user.name}</div>
          <div className="mt-1 text-xs text-slate-500">Role: {user.role}</div>
          <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-800">
            Only admins can edit store/system settings and manage users.
          </div>
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-12 gap-4">
          <div className="col-span-12 lg:col-span-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
              <div className="px-3 py-2 text-sm font-semibold text-slate-900">Settings</div>
              <div className="mt-1 space-y-1">
                <SideBtn active={tab === "store"} onClick={() => setTab("store")}>
                  Store Information
                </SideBtn>
                <SideBtn active={tab === "users"} onClick={() => setTab("users")}>
                  Users
                </SideBtn>
                <SideBtn active={tab === "system"} onClick={() => setTab("system")}>
                  System Settings
                </SideBtn>
              </div>
            </div>
          </div>

          <div className="col-span-12 lg:col-span-9">
            {tab === "store" ? <StoreTab currentUser={user} /> : null}
            {tab === "users" ? <UsersTab currentUser={user} /> : null}
            {tab === "system" ? <SystemTab currentUser={user} /> : null}
          </div>
        </div>
      )}
    </div>
  );
}

function SideBtn({
  active,
  children,
  onClick,
}: React.PropsWithChildren<{ active: boolean; onClick: () => void }>) {
  return (
    <button
      onClick={onClick}
      className={[
        "w-full rounded-xl px-3 py-2 text-left",
        active ? "bg-amber-50 text-slate-900" : "hover:bg-slate-50 text-slate-700",
      ].join(" ")}
    >
      <div className="text-sm font-medium">{children}</div>
    </button>
  );
}

function StoreTab({ currentUser }: { currentUser: SettingsUser }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [storeName, setStoreName] = useState("");
  const [storeLocation, setStoreLocation] = useState("");
  const [storePhone, setStorePhone] = useState("");
  const [storeEmail, setStoreEmail] = useState("");

  const load = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await window.api?.getSettings();
      if (!res?.success) throw new Error(res?.error ?? "Failed to load settings");

      setStoreName(res.settings?.storeName ?? "");
      setStoreLocation(res.settings?.storeLocation ?? "");
      setStorePhone(res.settings?.storePhone ?? "");
      setStoreEmail(res.settings?.storeEmail ?? "");
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const save = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const values: Record<string, string> = {
        storeName: storeName.trim(),
        storeLocation: storeLocation.trim(),
        storePhone: storePhone.trim(),
        storeEmail: storeEmail.trim(),
      };

      if (!values.storeName || !values.storeLocation) {
        throw new Error("Store name and location are required");
      }

      const res = await window.api?.setSettingsMany(currentUser.id, values);
      if (!res?.success) throw new Error(res?.error ?? "Failed to save");

      setSuccess("Saved.");
      await load();
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card title="Store Information" subtitle="Edit and save store details">
      {error ? <ErrorBox>{error}</ErrorBox> : null}
      {success ? <SuccessBox>{success}</SuccessBox> : null}

      <div className="grid grid-cols-12 gap-3">
        <Field
          className="col-span-12 sm:col-span-6"
          label="Store name"
          value={storeName}
          onChange={setStoreName}
          disabled={loading || saving}
        />
        <Field
          className="col-span-12 sm:col-span-6"
          label="Location"
          value={storeLocation}
          onChange={setStoreLocation}
          disabled={loading || saving}
        />
        <Field
          className="col-span-12 sm:col-span-6"
          label="Phone"
          value={storePhone}
          onChange={setStorePhone}
          disabled={loading || saving}
        />
        <Field
          className="col-span-12 sm:col-span-6"
          label="Email"
          value={storeEmail}
          onChange={setStoreEmail}
          disabled={loading || saving}
        />
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <button className={BtnSecondary} onClick={load} disabled={loading || saving}>
          Reset
        </button>
        <button className={BtnPrimary} onClick={save} disabled={loading || saving}>
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </Card>
  );
}

function SystemTab({ currentUser }: { currentUser: SettingsUser }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [taxRate, setTaxRate] = useState("5");
  const [lowStockThreshold, setLowStockThreshold] = useState("10");
  const [currency, setCurrency] = useState("INR");
  const [discountPolicy, setDiscountPolicy] = useState("percent");

  const load = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await window.api?.getSettings();
      if (!res?.success) throw new Error(res?.error ?? "Failed to load settings");

      setTaxRate(res.settings?.taxRate ?? "5");
      setLowStockThreshold(res.settings?.lowStockThreshold ?? "10");
      setCurrency(res.settings?.currency ?? "INR");
      setDiscountPolicy(res.settings?.discountPolicy ?? "percent");
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const save = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const tr = Number(taxRate);
      const ls = Number(lowStockThreshold);
      if (Number.isNaN(tr) || tr < 0) throw new Error("Tax rate must be a valid number");
      if (Number.isNaN(ls) || ls < 0) throw new Error("Low stock threshold must be a valid number");
      if (!currency.trim()) throw new Error("Currency is required");

      const res = await window.api?.setSettingsMany(currentUser.id, {
        taxRate: String(tr),
        lowStockThreshold: String(ls),
        currency: currency.trim(),
        discountPolicy: discountPolicy.trim() || "percent",
      });

      if (!res?.success) throw new Error(res?.error ?? "Failed to save");
      setSuccess("Saved.");
      await load();
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card title="System Settings" subtitle="Tax, currency, and thresholds">
      {error ? <ErrorBox>{error}</ErrorBox> : null}
      {success ? <SuccessBox>{success}</SuccessBox> : null}

      <div className="grid grid-cols-12 gap-3">
        <Field
          className="col-span-12 sm:col-span-3"
          label="Tax rate (%)"
          value={taxRate}
          onChange={setTaxRate}
          type="number"
          disabled={loading || saving}
        />
        <Field
          className="col-span-12 sm:col-span-3"
          label="Low stock threshold"
          value={lowStockThreshold}
          onChange={setLowStockThreshold}
          type="number"
          disabled={loading || saving}
        />
        <Field
          className="col-span-12 sm:col-span-3"
          label="Currency"
          value={currency}
          onChange={setCurrency}
          disabled={loading || saving}
        />
        <Field
          className="col-span-12 sm:col-span-3"
          label="Discount policy"
          value={discountPolicy}
          onChange={setDiscountPolicy}
          disabled={loading || saving}
        />
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <button className={BtnSecondary} onClick={load} disabled={loading || saving}>
          Reset
        </button>
        <button className={BtnPrimary} onClick={save} disabled={loading || saving}>
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </Card>
  );
}

function UsersTab({ currentUser }: { currentUser: SettingsUser }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [users, setUsers] = useState<AppUserRow[]>([]);

  const totalAdmins = useMemo(
    () => users.filter((u) => u.role === "admin" && u.active).length,
    [users]
  );

  const [newUser, setNewUser] = useState({
    name: "",
    password: "",
    role: "staff" as Role,
  });

  const [editUser, setEditUser] = useState<AppUserRow | null>(null);
  const [editDraft, setEditDraft] = useState<{ name: string; role: Role; password: string; active: boolean }>({
    name: "",
    role: "staff",
    password: "",
    active: true,
  });

  const load = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await window.api?.invoke("users:getAll", { currentUserId: currentUser.id });
      if (!res?.success) throw new Error(res?.error ?? "Failed to load users");

      const rows = (res.users ?? []) as Array<{ id: number; name: string; role: Role; active?: boolean; createdAt?: any }>;
      setUsers(
        rows.map((u) => ({
          id: u.id,
          name: u.name,
          role: u.role,
          active: Boolean(u.active ?? true),
          createdAt: u.createdAt,
        }))
      );
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const create = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      if (!newUser.name.trim() || !newUser.password.trim()) {
        throw new Error("Username and password are required");
      }

      const res = await window.api?.invoke("users:create", {
        currentUserId: currentUser.id,
        name: newUser.name.trim(),
        role: newUser.role,
        password: newUser.password,
      });

      if (!res?.success) throw new Error(res?.error ?? "Failed to create user");

      setNewUser({ name: "", password: "", role: "staff" });
      setSuccess("User created.");
      await load();
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (u: AppUserRow) => {
    setEditUser(u);
    setEditDraft({ name: u.name, role: u.role, password: "", active: u.active });
  };

  const saveEdit = async () => {
    if (!editUser) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      if (!editDraft.name.trim()) throw new Error("Username is required");

      if (editUser.role === "admin" && totalAdmins === 1 && !editDraft.active) {
        throw new Error("At least one active admin must remain.");
      }

      if (editUser.id === currentUser.id && editUser.role === "admin" && editDraft.role !== "admin") {
        throw new Error("You cannot change your own admin role.");
      }

      const patch: any = {
        name: editDraft.name.trim(),
        role: editDraft.role,
        active: editDraft.active,
      };
      if (editDraft.password.trim()) patch.password = editDraft.password;

      const res = await window.api?.invoke("users:update", {
        currentUserId: currentUser.id,
        id: editUser.id,
        patch,
      });

      if (!res?.success) throw new Error(res?.error ?? "Failed to update user");

      setEditUser(null);
      setSuccess("User updated.");
      await load();
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (u: AppUserRow) => {
    if (!confirm(`Delete ${u.name}?`)) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      if (u.role === "admin" && totalAdmins === 1) {
        throw new Error("At least one active admin must remain.");
      }

      const res = await window.api?.invoke("users:delete", {
        currentUserId: currentUser.id,
        id: u.id,
      });

      if (!res?.success) throw new Error(res?.error ?? "Failed to delete");

      setSuccess("User deleted.");
      await load();
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card title="Users" subtitle="Add, edit, disable, and delete users">
      {error ? <ErrorBox>{error}</ErrorBox> : null}
      {success ? <SuccessBox>{success}</SuccessBox> : null}

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <Th>Name</Th>
              <Th>Role</Th>
              <Th>Status</Th>
              <Th>Created</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={5} className="p-6 text-slate-600">Loading…</td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-6 text-slate-600">No users found.</td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/60">
                  <Td className="font-medium text-slate-900">{u.name}</Td>
                  <Td>
                    <RoleBadge role={u.role} />
                  </Td>
                  <Td>
                    <StatusBadge active={u.active} />
                  </Td>
                  <Td className="text-slate-600">
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}
                  </Td>
                  <Td className="text-right">
                    <div className="inline-flex gap-2">
                      <button className={BtnSecondary} onClick={() => openEdit(u)}>
                        Edit
                      </button>
                      <button
                        className={BtnDanger}
                        onClick={() => remove(u)}
                        disabled={saving || (u.role === "admin" && totalAdmins === 1)}
                      >
                        Delete
                      </button>
                    </div>
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="text-sm font-semibold text-slate-900">Add new user</div>
        <div className="mt-3 grid grid-cols-12 gap-3">
          <Field
            className="col-span-12 sm:col-span-4"
            label="Username"
            value={newUser.name}
            onChange={(v) => setNewUser((p) => ({ ...p, name: v }))}
            disabled={saving}
          />
          <Field
            className="col-span-12 sm:col-span-4"
            label="Password"
            value={newUser.password}
            onChange={(v) => setNewUser((p) => ({ ...p, password: v }))}
            type="password"
            disabled={saving}
          />
          <div className="col-span-12 sm:col-span-2 grid gap-2">
            <Label>Role</Label>
            <select
              className={InputCls}
              value={newUser.role}
              onChange={(e) => setNewUser((p) => ({ ...p, role: e.target.value as Role }))}
              disabled={saving}
            >
              <option value="staff">staff</option>
              <option value="manager">manager</option>
              <option value="admin">admin</option>
            </select>
          </div>
          <div className="col-span-12 sm:col-span-2 flex items-end justify-end">
            <button className={BtnPrimary} onClick={create} disabled={saving}>
              Create
            </button>
          </div>
        </div>
      </div>

      {editUser ? (
        <Modal title={`Edit user: ${editUser.name}`} onClose={() => setEditUser(null)}>
          <div className="grid grid-cols-12 gap-3">
            <Field
              className="col-span-12 sm:col-span-6"
              label="Username"
              value={editDraft.name}
              onChange={(v) => setEditDraft((p) => ({ ...p, name: v }))}
              disabled={saving}
            />
            <div className="col-span-12 sm:col-span-3 grid gap-2">
              <Label>Role</Label>
              <select
                className={InputCls}
                value={editDraft.role}
                onChange={(e) => setEditDraft((p) => ({ ...p, role: e.target.value as Role }))}
                disabled={saving}
              >
                <option value="staff">staff</option>
                <option value="manager">manager</option>
                <option value="admin">admin</option>
              </select>
            </div>
            <div className="col-span-12 sm:col-span-3 grid gap-2">
              <Label>Status</Label>
              <select
                className={InputCls}
                value={editDraft.active ? "active" : "disabled"}
                onChange={(e) => setEditDraft((p) => ({ ...p, active: e.target.value === "active" }))}
                disabled={saving}
              >
                <option value="active">active</option>
                <option value="disabled">disabled</option>
              </select>
            </div>

            <Field
              className="col-span-12"
              label="New password (optional)"
              value={editDraft.password}
              onChange={(v) => setEditDraft((p) => ({ ...p, password: v }))}
              type="password"
              disabled={saving}
            />
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <button className={BtnSecondary} onClick={() => setEditUser(null)} disabled={saving}>
              Cancel
            </button>
            <button className={BtnPrimary} onClick={saveEdit} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </Modal>
      ) : null}
    </Card>
  );
}

function RoleBadge({ role }: { role: Role }) {
  const cls =
    role === "admin"
      ? "border-purple-100 bg-purple-50 text-purple-700"
      : role === "manager"
        ? "border-blue-100 bg-blue-50 text-blue-700"
        : "border-slate-200 bg-slate-50 text-slate-700";

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${cls}`}>
      {role}
    </span>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  const cls = active
    ? "border-emerald-100 bg-emerald-50 text-emerald-700"
    : "border-rose-100 bg-rose-50 text-rose-700";
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${cls}`}>
      {active ? "active" : "disabled"}
    </span>
  );
}

function Card({
  title,
  subtitle,
  children,
}: React.PropsWithChildren<{ title: string; subtitle?: string }>) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 p-4">
        <div className="text-sm font-semibold text-slate-900">{title}</div>
        {subtitle ? <div className="mt-0.5 text-xs text-slate-500">{subtitle}</div> : null}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function ErrorBox({ children }: React.PropsWithChildren) {
  return (
    <div className="mb-4 rounded-xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-700">
      {children}
    </div>
  );
}

function SuccessBox({ children }: React.PropsWithChildren) {
  return (
    <div className="mb-4 rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-700">
      {children}
    </div>
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
        className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-xl"
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

function Th({ children, className = "" }: React.PropsWithChildren<{ className?: string }>) {
  return <th className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide ${className}`}>{children}</th>;
}
function Td({ children, className = "" }: React.PropsWithChildren<{ className?: string }>) {
  return <td className={`px-4 py-3 ${className}`}>{children}</td>;
}

function Label({ children }: React.PropsWithChildren) {
  return <div className="text-xs font-medium text-slate-600">{children}</div>;
}

function Field({
  label,
  value,
  onChange,
  className = "",
  type = "text",
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  type?: string;
  disabled?: boolean;
}) {
  return (
    <div className={`${className} grid gap-2`}>
      <Label>{label}</Label>
      <input
        className={InputCls}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        type={type}
        disabled={disabled}
      />
    </div>
  );
}

const InputCls =
  "rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-300 disabled:bg-slate-50 disabled:text-slate-400";
const BtnPrimary =
  "rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50";
const BtnSecondary =
  "rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50";
const BtnDanger =
  "rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50";
