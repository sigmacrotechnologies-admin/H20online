import { useState, useEffect } from "react";
import PageHeader from "../components/PageHeader";
import LoadingState from "../components/LoadingState";
import { api } from "../api/client";

const card = { background: "#f0f7fcd7", borderRadius: 16, padding: 24, marginBottom: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" };
const table = { width: "100%", borderCollapse: "collapse" };
const th = { textAlign: "left", padding: "10px 12px", borderBottom: "2px solid #E5E7EB", fontWeight: 600, color: "#1B2B34" };
const td = { padding: "10px 12px", borderBottom: "1px solid #E5E7EB", color: "#1B2B34" };
const input = { padding: "6px 10px", borderRadius: 8, border: "1px solid #E5E7EB", width: 80 };
const inputWide = { ...input, width: "100%", maxWidth: 140 };
const inputId = { ...input, width: 120 };
const btn = { padding: "8px 16px", borderRadius: 8, border: "none", fontWeight: 600, cursor: "pointer" };
const btnPrimary = { ...btn, background: "#1EA7FD", color: "#fff" };
const btnDanger = { ...btn, background: "#FEE2E2", color: "#B91C1C", padding: "6px 12px", fontSize: 13 };
const btnSmall = { ...btn, background: "#E0F2FE", color: "#1B2B34", padding: "6px 12px", fontSize: 13 };
const PRODUCT_IMAGE_OPTIONS = [
  { label: "Default", value: "" },
  { label: "Water Camper", value: "asset://water-camper" },
  { label: "Water Bottle", value: "asset://water-bottle" },
  { label: "Plastic Bottle", value: "asset://plastic-bottle" },
  { label: "Gallon Bottle", value: "asset://gallon-bottle" },
  { label: "Gallon 1", value: "asset://gallon-1" },
  { label: "Gallon 2", value: "asset://gallon-2" },
  { label: "Gallon 3", value: "asset://gallon-3" },
  { label: "Dispenser", value: "asset://water-dispenser" },
  { label: "Tank Truck", value: "asset://tank-truck" },
];

function randomProductId() {
  return "prod_" + Math.random().toString(36).slice(2, 10);
}

export default function Plans() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [addingForPlanId, setAddingForPlanId] = useState(null);
  const [newProduct, setNewProduct] = useState({
    productKey: "",
    productLabel: "",
    productId: "",
    imageUrl: "",
    priceDaily: 0,
    priceWeekly: 0,
    priceMonthly: 0,
  });

  const loadPlans = () => {
    setLoading(true);
    api
      .plans()
      .then(setPlans)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const updateProduct = async (pp, field, value) => {
    const num = ["priceDaily", "priceWeekly", "priceMonthly"].includes(field) ? Number(value) : value;
    if (field === "priceDaily" || field === "priceWeekly" || field === "priceMonthly") {
      if (Number.isNaN(num) || num < 0) return;
    }
    setSaving(pp.id);
    try {
      await api.updatePlanProduct(pp.id, { [field]: num });
      setPlans((prev) =>
        prev.map((p) => ({
          ...p,
          products: (p.products || []).map((x) => (x.id === pp.id ? { ...x, [field]: num } : x)),
        }))
      );
    } catch (e) {
      alert(e.message || "Update failed");
    } finally {
      setSaving(null);
    }
  };

  const generateProductId = async (pp) => {
    const newId = randomProductId();
    setSaving(pp.id);
    try {
      await api.updatePlanProduct(pp.id, { productId: newId });
      setPlans((prev) =>
        prev.map((p) => ({
          ...p,
          products: (p.products || []).map((x) => (x.id === pp.id ? { ...x, productId: newId } : x)),
        }))
      );
    } catch (e) {
      alert(e.message || "Failed to generate ID");
    } finally {
      setSaving(null);
    }
  };

  const generateAllMissingIds = async () => {
    const missing = plans.flatMap((p) => (p.products || []).filter((pp) => !pp.productId));
    if (missing.length === 0) {
      alert("All products already have a Product ID.");
      return;
    }
    if (!confirm(`Generate random Product ID for ${missing.length} product(s) that don't have one?`)) return;
    for (const pp of missing) {
      try {
        await api.updatePlanProduct(pp.id, { productId: randomProductId() });
      } catch (e) {
        alert(e.message || "Failed for one product");
        return;
      }
    }
    loadPlans();
  };

  const deleteProduct = async (plan, pp) => {
    if (!confirm(`Remove "${pp.productLabel}" from ${plan.name}? This will remove it from the plan for customers.`)) return;
    setSaving(pp.id);
    try {
      await api.deletePlanProduct(pp.id);
      setPlans((prev) =>
        prev.map((p) => (p.id === plan.id ? { ...p, products: (p.products || []).filter((x) => x.id !== pp.id) } : p))
      );
    } catch (e) {
      alert(e.message || "Delete failed");
    } finally {
      setSaving(null);
    }
  };

  const addProduct = async (plan) => {
    const key = (newProduct.productKey || "").trim();
    const label = (newProduct.productLabel || "").trim();
    if (!key || !label) {
      alert("Product key and label are required.");
      return;
    }
    const daily = Number(newProduct.priceDaily);
    const weekly = Number(newProduct.priceWeekly);
    const monthly = Number(newProduct.priceMonthly);
    if (Number.isNaN(daily) || Number.isNaN(weekly) || Number.isNaN(monthly) || daily < 0 || weekly < 0 || monthly < 0) {
      alert("Enter valid daily, weekly, and monthly rates (≥ 0).");
      return;
    }
    setSaving("add-" + plan.id);
    try {
      const created = await api.createPlanProduct({
        planId: plan.id,
        productKey: key,
        productLabel: label,
        productId: (newProduct.productId || "").trim() || undefined,
        imageUrl: (newProduct.imageUrl || "").trim() || undefined,
        priceDaily: daily,
        priceWeekly: weekly,
        priceMonthly: monthly,
      });
      setPlans((prev) =>
        prev.map((p) => (p.id === plan.id ? { ...p, products: [...(p.products || []), created] } : p))
      );
      setAddingForPlanId(null);
      setNewProduct({ productKey: "", productLabel: "", productId: "", imageUrl: "", priceDaily: 0, priceWeekly: 0, priceMonthly: 0 });
    } catch (e) {
      alert(e.message || "Add product failed");
    } finally {
      setSaving(null);
    }
  };

  const updatePlan = async (plan, field, value) => {
    setSaving(plan.id);
    try {
      await api.updatePlan(plan.id, { [field]: value });
      setPlans((prev) => prev.map((p) => (p.id === plan.id ? { ...p, [field]: value } : p)));
    } catch (e) {
      alert(e.message || "Update failed");
    } finally {
      setSaving(null);
    }
  };

  if (loading) return <LoadingState />;

  return (
    <div className="admin-page">
      <PageHeader
        title="Plans & rates"
        subtitle="Edit plans, add or remove products, set product ID/label and daily/weekly/monthly rates. Changes appear for customers on the subscription page."
      />
      <button type="button" className="btn btn-secondary btn-sm" onClick={generateAllMissingIds} style={{ marginBottom: 24 }}>
        Generate Product ID for all products that don't have one
      </button>
      {plans.map((plan) => (
        <div key={plan.id} className="card">
          <h2 className="card-title">{plan.name} ({plan.slug})</h2>
          <p className="card-subtitle">
            Max qty per product:{" "}
            <input
              type="number"
              min={1}
              value={plan.maxQuantityPerProduct}
              onChange={(e) => updatePlan(plan, "maxQuantityPerProduct", Number(e.target.value))}
              style={{ ...input, width: 60 }}
            />
            {" "}Coming soon:{" "}
            <input
              type="checkbox"
              checked={plan.comingSoon || false}
              onChange={(e) => updatePlan(plan, "comingSoon", e.target.checked)}
            />
            {!plan.comingSoon && (
              <span style={{ marginLeft: 8, color: "#059669" }}>Available now — you can add products below.</span>
            )}
          </p>
          <table className="data-table">
            <thead>
              <tr>
                <th>Product ID</th>
                <th>Product key</th>
                <th>Label</th>
                <th>Image</th>
                <th>Daily (₹)</th>
                <th>Weekly (₹)</th>
                <th>Monthly (₹)</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {(plan.products || []).map((pp) => (
                <tr key={pp.id}>
                  <td>
                    <input
                      key={pp.id + (pp.productId || "")}
                      defaultValue={pp.productId || ""}
                      placeholder="—"
                      onBlur={(e) => {
                        const v = e.target.value.trim();
                        if (v !== (pp.productId || "")) updateProduct(pp, "productId", v || "");
                      }}
                      style={inputId}
                    />
                    <button
                      type="button"
                      style={{ ...btnSmall, marginLeft: 6 }}
                      onClick={() => generateProductId(pp)}
                      disabled={saving === pp.id}
                    >
                      {saving === pp.id ? "…" : "Generate"}
                    </button>
                  </td>
                  <td>
                    <input
                      defaultValue={pp.productKey}
                      onBlur={(e) => {
                        const v = e.target.value.trim();
                        if (v && v !== pp.productKey) updateProduct(pp, "productKey", v);
                      }}
                      style={{ ...inputWide, maxWidth: 120 }}
                      placeholder="e.g. 1l-bottle"
                    />
                  </td>
                  <td>
                    <input
                      defaultValue={pp.productLabel}
                      onBlur={(e) => {
                        const v = e.target.value.trim();
                        if (v && v !== pp.productLabel) updateProduct(pp, "productLabel", v);
                      }}
                      style={inputWide}
                    />
                  </td>
                  <td>
                    <select
                      defaultValue={pp.imageUrl || ""}
                      onBlur={(e) => {
                        const v = e.target.value;
                        if (v !== (pp.imageUrl || "")) updateProduct(pp, "imageUrl", v);
                      }}
                      style={{ ...inputWide, maxWidth: 160 }}
                    >
                      {PRODUCT_IMAGE_OPTIONS.map((opt) => (
                        <option key={opt.value || "default"} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      defaultValue={pp.priceDaily}
                      onBlur={(e) => {
                        const v = Number(e.target.value);
                        if (!Number.isNaN(v) && v >= 0) updateProduct(pp, "priceDaily", v);
                      }}
                      className="input"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min={0}
                      defaultValue={pp.priceWeekly}
                      onBlur={(e) => {
                        const v = Number(e.target.value);
                        if (!Number.isNaN(v) && v >= 0) updateProduct(pp, "priceWeekly", v);
                      }}
                      className="input"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min={0}
                      defaultValue={pp.priceMonthly}
                      onBlur={(e) => {
                        const v = Number(e.target.value);
                        if (!Number.isNaN(v) && v >= 0) updateProduct(pp, "priceMonthly", v);
                      }}
                      className="input"
                    />
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => deleteProduct(plan, pp)}
                      disabled={saving === pp.id}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Add product */}
          {addingForPlanId === plan.id ? (
            <div style={{ marginTop: 16, padding: 16, background: "#fff", borderRadius: 12, border: "1px solid #E5E7EB" }}>
              <h4 style={{ marginTop: 0, marginBottom: 12 }}>Add product</h4>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", marginBottom: 12 }}>
                <input
                  placeholder="Product key (e.g. 1l-bottle)"
                  value={newProduct.productKey}
                  onChange={(e) => setNewProduct((n) => ({ ...n, productKey: e.target.value }))}
                  style={{ ...inputWide, maxWidth: 160 }}
                />
                <input
                  placeholder="Label (e.g. 1L Bottle)"
                  value={newProduct.productLabel}
                  onChange={(e) => setNewProduct((n) => ({ ...n, productLabel: e.target.value }))}
                  style={{ ...inputWide, maxWidth: 140 }}
                />
                <input
                  placeholder="Product ID (optional)"
                  value={newProduct.productId}
                  onChange={(e) => setNewProduct((n) => ({ ...n, productId: e.target.value }))}
                  style={inputId}
                />
                <select
                  value={newProduct.imageUrl}
                  onChange={(e) => setNewProduct((n) => ({ ...n, imageUrl: e.target.value }))}
                  style={{ ...inputWide, maxWidth: 170 }}
                >
                  {PRODUCT_IMAGE_OPTIONS.map((opt) => (
                    <option key={opt.value || "default"} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={0}
                  placeholder="Daily ₹"
                  value={newProduct.priceDaily || ""}
                  onChange={(e) => setNewProduct((n) => ({ ...n, priceDaily: e.target.value }))}
                  className="input"
                />
                <input
                  type="number"
                  min={0}
                  placeholder="Weekly ₹"
                  value={newProduct.priceWeekly || ""}
                  onChange={(e) => setNewProduct((n) => ({ ...n, priceWeekly: e.target.value }))}
                  className="input"
                />
                <input
                  type="number"
                  min={0}
                  placeholder="Monthly ₹"
                  value={newProduct.priceMonthly || ""}
                  onChange={(e) => setNewProduct((n) => ({ ...n, priceMonthly: e.target.value }))}
                  className="input"
                />
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => addProduct(plan)}
                  disabled={saving === "add-" + plan.id}
                >
                  {saving === "add-" + plan.id ? "Adding…" : "Add product"}
                </button>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setAddingForPlanId(null)}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              style={{ ...btnPrimary, marginTop: 16 }}
              onClick={() => setAddingForPlanId(plan.id)}
            >
              + Add product
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
