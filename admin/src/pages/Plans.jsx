import { useState, useEffect } from "react";
import { api } from "../api/client";

const card = { background: "#f0f7fcd7", borderRadius: 16, padding: 24, marginBottom: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" };
const table = { width: "100%", borderCollapse: "collapse" };
const th = { textAlign: "left", padding: "10px 12px", borderBottom: "2px solid #E5E7EB", fontWeight: 600, color: "#1B2B34" };
const td = { padding: "10px 12px", borderBottom: "1px solid #E5E7EB", color: "#1B2B34" };
const input = { padding: "6px 10px", borderRadius: 8, border: "1px solid #E5E7EB", width: 80 };
const btn = { padding: "8px 16px", borderRadius: 8, border: "none", fontWeight: 600, cursor: "pointer" };
const btnPrimary = { ...btn, background: "#1EA7FD", color: "#fff" };
const btnSmall = { ...btn, background: "#E0F2FE", color: "#1B2B34", padding: "6px 12px", fontSize: 13 };

export default function Plans() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);

  useEffect(() => {
    api.plans()
      .then(setPlans)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const updateProduct = async (pp, field, value) => {
    const num = field.includes("price") ? Number(value) : value;
    setSaving(pp.id);
    try {
      await api.updatePlanProduct(pp.id, { [field]: num });
      setPlans((prev) =>
        prev.map((p) => ({
          ...p,
          products: p.products.map((x) => (x.id === pp.id ? { ...x, [field]: num } : x)),
        }))
      );
    } catch (e) {
      alert(e.message);
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
      alert(e.message);
    } finally {
      setSaving(null);
    }
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Plans & rates</h1>
      <p style={{ color: "#6B7C85", marginBottom: 24 }}>Update subscription plans and bottle rates (daily / weekly / monthly).</p>
      {plans.map((plan) => (
        <div key={plan.id} style={card}>
          <h2 style={{ marginTop: 0, marginBottom: 16 }}>{plan.name} ({plan.slug})</h2>
          <p style={{ marginBottom: 16, fontSize: 14, color: "#6B7C85" }}>
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
          </p>
          <table style={table}>
            <thead>
              <tr>
                <th style={th}>Product</th>
                <th style={th}>Label</th>
                <th style={th}>Daily (₹)</th>
                <th style={th}>Weekly (₹)</th>
                <th style={th}>Monthly (₹)</th>
              </tr>
            </thead>
            <tbody>
              {(plan.products || []).map((pp) => (
                <tr key={pp.id}>
                  <td style={td}>{pp.productKey}</td>
                  <td style={td}>
                    <input
                      defaultValue={pp.productLabel}
                      onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== pp.productLabel) updateProduct(pp, "productLabel", v); }}
                      style={{ ...input, width: "100%", maxWidth: 140 }}
                    />
                  </td>
                  <td style={td}>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      defaultValue={pp.priceDaily}
                      onBlur={(e) => { const v = Number(e.target.value); if (!Number.isNaN(v)) updateProduct(pp, "priceDaily", v); }}
                      style={input}
                    />
                  </td>
                  <td style={td}>
                    <input
                      type="number"
                      min={0}
                      value={pp.priceWeekly}
                      onBlur={(e) => { const v = Number(e.target.value); if (!Number.isNaN(v) && v !== pp.priceWeekly) updateProduct(pp, "priceWeekly", v); }}
                      defaultValue={pp.priceWeekly}
                      style={input}
                    />
                  </td>
                  <td style={td}>
                    <input
                      type="number"
                      min={0}
                      value={pp.priceMonthly}
                      onBlur={(e) => { const v = Number(e.target.value); if (!Number.isNaN(v) && v !== pp.priceMonthly) updateProduct(pp, "priceMonthly", v); }}
                      defaultValue={pp.priceMonthly}
                      style={input}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
