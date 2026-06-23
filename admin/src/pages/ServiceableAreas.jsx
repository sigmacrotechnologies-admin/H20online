import { useEffect, useState } from "react";
import PageHeader from "../components/PageHeader";
import LoadingState from "../components/LoadingState";
import { api } from "../api/client";

const emptyForm = {
  pinCode: "",
  label: "",
  city: "",
  state: "",
  supplierId: "",
  radiusKm: 10,
  isActive: true,
};

export default function ServiceableAreas() {
  const [loading, setLoading] = useState(true);
  const [areas, setAreas] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const load = () => {
    setLoading(true);
    Promise.all([api.serviceableAreas(), api.suppliers({ limit: 500 })])
      .then(([areaList, supplierRes]) => {
        setAreas(Array.isArray(areaList) ? areaList : []);
        const list = supplierRes?.suppliers || supplierRes?.items || supplierRes || [];
        setSuppliers(Array.isArray(list) ? list : []);
      })
      .catch((err) => setMessage(err.message || "Failed to load"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm({
      ...emptyForm,
      supplierId: suppliers[0]?.id || suppliers[0]?._id || "",
    });
    setShowForm(true);
    setMessage("");
  };

  const openEdit = (area) => {
    setEditingId(area.id);
    setForm({
      pinCode: area.pinCode || "",
      label: area.label || "",
      city: area.city || "",
      state: "",
      supplierId: area.supplierId || "",
      radiusKm: area.radiusKm ?? 10,
      isActive: !!area.isActive,
    });
    setShowForm(true);
    setMessage("");
  };

  const save = async () => {
    const pin = String(form.pinCode || "").replace(/\D/g, "");
    if (!pin || pin.length < 6) {
      setMessage("Valid 6-digit PIN code is required");
      return;
    }
    if (!form.supplierId) {
      setMessage("Select a supplier");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      const body = {
        pinCode: pin,
        label: form.label,
        city: form.city,
        state: form.state,
        supplierId: form.supplierId,
        radiusKm: Number(form.radiusKm) || 10,
        isActive: form.isActive,
      };
      if (editingId) {
        const updated = await api.updateServiceableArea(editingId, body);
        setAreas((prev) => prev.map((a) => (a.id === editingId ? updated : a)));
        setMessage("Serviceable area updated.");
      } else {
        const created = await api.createServiceableArea(body);
        setAreas((prev) => [created, ...prev]);
        setMessage("Serviceable area added.");
      }
      setShowForm(false);
      setEditingId(null);
    } catch (err) {
      setMessage(err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Remove this serviceable area? Customers outside this zone will not be able to order from the mapped supplier.")) return;
    try {
      await api.deleteServiceableArea(id);
      setAreas((prev) => prev.filter((a) => a.id !== id));
      setMessage("Serviceable area removed.");
    } catch (err) {
      setMessage(err.message || "Delete failed");
    }
  };

  if (loading) return <LoadingState />;

  return (
    <div className="admin-page">
      <PageHeader
        title="Serviceable areas"
        subtitle="Map supplier delivery zones by PIN code. Customers must be within the radius (default 10 km) or match the PIN to order."
      />

      {message ? (
        <div
          className={
            message.includes("failed") || message.includes("required") || message.includes("Select")
              ? "alert-banner alert-banner--error"
              : "alert-banner alert-banner--success"
          }
        >
          {message}
        </div>
      ) : null}

      <div style={{ marginBottom: 16 }}>
        <button type="button" className="btn btn-primary" onClick={openCreate}>+ Add serviceable area</button>
      </div>

      {showForm ? (
        <div className="card">
          <h3 style={{ margin: "0 0 16px", color: "#1B2B34" }}>
            {editingId ? "Edit serviceable area" : "New serviceable area"}
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16, marginBottom: 16 }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontWeight: 600 }}>PIN code *</span>
              <input
                className="input"
                value={form.pinCode}
                placeholder="e.g. 400001"
                onChange={(e) => setForm((p) => ({ ...p, pinCode: e.target.value }))}
              />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontWeight: 600 }}>Label</span>
              <input
                className="input"
                value={form.label}
                placeholder="e.g. Andheri West hub"
                onChange={(e) => setForm((p) => ({ ...p, label: e.target.value }))}
              />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontWeight: 600 }}>City</span>
              <input
                className="input"
                value={form.city}
                placeholder="Mumbai"
                onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
              />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontWeight: 600 }}>State</span>
              <input
                className="input"
                value={form.state}
                placeholder="Maharashtra"
                onChange={(e) => setForm((p) => ({ ...p, state: e.target.value }))}
              />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontWeight: 600 }}>Supplier *</span>
              <select
                className="input input-wide"
                value={form.supplierId}
                onChange={(e) => setForm((p) => ({ ...p, supplierId: e.target.value }))}
              >
                <option value="">Select supplier</option>
                {suppliers.map((s) => {
                  const id = s.id || s._id;
                  return (
                    <option key={id} value={id}>
                      {s.name || s.businessName || id}
                    </option>
                  );
                })}
              </select>
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontWeight: 600 }}>Radius (km)</span>
              <input
                type="number"
                min={1}
                max={50}
                className="input"
                value={form.radiusKm}
                onChange={(e) => setForm((p) => ({ ...p, radiusKm: e.target.value }))}
              />
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 24 }}>
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))} />
              Active
            </label>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" className="btn btn-primary" disabled={saving} onClick={save}>
              {saving ? "Saving…" : "Save"}
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      ) : null}

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Supplier</th>
              <th>PIN</th>
              <th>Label / City</th>
              <th>Radius</th>
              <th>Coords</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {areas.length === 0 ? (
              <tr>
                <td colSpan={7}>No serviceable areas yet. Add zones so customers can order in those PIN / radius ranges.</td>
              </tr>
            ) : (
              areas.map((a) => (
                <tr key={a.id}>
                  <td>{a.supplierName || a.supplierId}</td>
                  <td>{a.pinCode}</td>
                  <td>
                    {a.label ? <div>{a.label}</div> : null}
                    {a.city ? <div style={{ fontSize: 13, color: "#64748B" }}>{a.city}</div> : null}
                  </td>
                  <td>{a.radiusKm ?? 10} km</td>
                  <td>
                    {a.latitude != null && a.longitude != null
                      ? `${Number(a.latitude).toFixed(4)}, ${Number(a.longitude).toFixed(4)}`
                      : "—"}
                  </td>
                  <td>{a.isActive ? "Active" : "Inactive"}</td>
                  <td>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => openEdit(a)}>Edit</button>
                    <button type="button" className="btn btn-danger btn-sm" style={{ marginLeft: 8 }} onClick={() => remove(a.id)}>Delete</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
