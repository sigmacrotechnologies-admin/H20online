import { useEffect, useState } from "react";
import PageHeader from "../components/PageHeader";
import LoadingState from "../components/LoadingState";
import { api } from "../api/client";

export default function TaxSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [meta, setMeta] = useState({ razorpayConfigured: false, razorpayTestMode: false });
  const [form, setForm] = useState({
    gstPercent: 18,
    serviceTaxPercent: 0,
    razorpayEnabled: true,
    defaultCommissionPercent: 20,
    defaultDeliverySharePercent: 10,
    additionalTaxes: [],
  });

  const load = () => {
    setLoading(true);
    api
      .taxSettings()
      .then((data) => {
        setForm({
          gstPercent: data.gstPercent ?? 18,
          serviceTaxPercent: data.serviceTaxPercent ?? 0,
          razorpayEnabled: data.razorpayEnabled ?? true,
          defaultCommissionPercent: data.defaultCommissionPercent ?? 20,
          defaultDeliverySharePercent: data.defaultDeliverySharePercent ?? 10,
          additionalTaxes: data.additionalTaxes || [],
        });
        setMeta({
          razorpayConfigured: data.razorpayConfigured,
          razorpayTestMode: data.razorpayTestMode,
          razorpayKeyId: data.razorpayKeyId,
        });
      })
      .catch((err) => setMessage(err.message || "Failed to load settings"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    setMessage("");
    try {
      const updated = await api.updateTaxSettings(form);
      setForm({
        gstPercent: updated.gstPercent ?? form.gstPercent,
        serviceTaxPercent: updated.serviceTaxPercent ?? form.serviceTaxPercent,
        razorpayEnabled: updated.razorpayEnabled ?? form.razorpayEnabled,
        defaultCommissionPercent: updated.defaultCommissionPercent ?? form.defaultCommissionPercent,
        defaultDeliverySharePercent: updated.defaultDeliverySharePercent ?? form.defaultDeliverySharePercent,
        additionalTaxes: updated.additionalTaxes || [],
      });
      setMessage("Settings saved. New orders and settlements will use these rates.");
    } catch (err) {
      setMessage(err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const addTax = () => {
    setForm((prev) => ({
      ...prev,
      additionalTaxes: [...(prev.additionalTaxes || []), { label: "Custom tax", percent: 0, enabled: true }],
    }));
  };

  const updateAdditional = (index, field, value) => {
    setForm((prev) => ({
      ...prev,
      additionalTaxes: prev.additionalTaxes.map((t, i) => (i === index ? { ...t, [field]: value } : t)),
    }));
  };

  const removeAdditional = (index) => {
    setForm((prev) => ({
      ...prev,
      additionalTaxes: prev.additionalTaxes.filter((_, i) => i !== index),
    }));
  };

  if (loading) return <LoadingState />;

  const messageClass =
    message.includes("saved") ? "alert-banner alert-banner--success" : message ? "alert-banner alert-banner--error" : "";

  return (
    <div className="admin-page">
      <PageHeader
        title="Tax & payment settings"
        subtitle="Configure GST and other taxes for checkout billing. Razorpay test gateway can be enabled for mobile payments."
      />

      {message ? <div className={messageClass}>{message}</div> : null}

      <div className="card">
        <h3 className="card-title">Tax rates (%)</h3>
        <p className="card-subtitle">
          Percentages are applied on item subtotal. Taxes are shown on checkout and payment screens before the customer pays.
        </p>

        <div className="filters-bar">
          <label className="form-group" style={{ marginBottom: 0 }}>
            <span className="form-label">GST</span>
            <input
              type="number"
              min={0}
              max={100}
              className="input"
              style={{ width: 100 }}
              value={form.gstPercent}
              onChange={(e) => setForm((p) => ({ ...p, gstPercent: Number(e.target.value) }))}
            />
          </label>
          <label className="form-group" style={{ marginBottom: 0 }}>
            <span className="form-label">Service tax</span>
            <input
              type="number"
              min={0}
              max={100}
              className="input"
              style={{ width: 100 }}
              value={form.serviceTaxPercent}
              onChange={(e) => setForm((p) => ({ ...p, serviceTaxPercent: Number(e.target.value) }))}
            />
          </label>
        </div>

        <h4 className="card-title">Additional taxes</h4>
        {(form.additionalTaxes || []).map((t, i) => (
          <div key={i} className="filters-bar" style={{ marginBottom: 8 }}>
            <input
              className="input input-wide"
              style={{ maxWidth: 220 }}
              value={t.label}
              placeholder="Label (e.g. Cess)"
              onChange={(e) => updateAdditional(i, "label", e.target.value)}
            />
            <input
              type="number"
              min={0}
              max={100}
              className="input"
              style={{ width: 100 }}
              value={t.percent}
              onChange={(e) => updateAdditional(i, "percent", Number(e.target.value))}
            />
            <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input type="checkbox" checked={t.enabled} onChange={(e) => updateAdditional(i, "enabled", e.target.checked)} />
              Enabled
            </label>
            <button type="button" className="btn btn-danger btn-sm" onClick={() => removeAdditional(i)}>Remove</button>
          </div>
        ))}
        <button type="button" className="btn btn-secondary btn-sm" onClick={addTax}>+ Add tax line</button>
      </div>

      <div className="card">
        <h3 className="card-title">Settlement defaults (%)</h3>
        <p className="card-subtitle">
          Default platform fee for suppliers and delivery share for riders. Override per supplier or rider on their admin pages.
          Applied when an order is delivered and wallets are credited.
        </p>
        <div className="filters-bar">
          <label className="form-group" style={{ marginBottom: 0 }}>
            <span className="form-label">Default supplier commission (platform fee)</span>
            <input
              type="number"
              min={0}
              max={100}
              className="input"
              style={{ width: 100 }}
              value={form.defaultCommissionPercent}
              onChange={(e) => setForm((p) => ({ ...p, defaultCommissionPercent: Number(e.target.value) }))}
            />
          </label>
          <label className="form-group" style={{ marginBottom: 0 }}>
            <span className="form-label">Default rider delivery share</span>
            <input
              type="number"
              min={0}
              max={100}
              className="input"
              style={{ width: 100 }}
              value={form.defaultDeliverySharePercent}
              onChange={(e) => setForm((p) => ({ ...p, defaultDeliverySharePercent: Number(e.target.value) }))}
            />
          </label>
        </div>
      </div>

      <div className="card">
        <h3 className="card-title">Razorpay gateway</h3>
        <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <input
            type="checkbox"
            checked={form.razorpayEnabled}
            onChange={(e) => setForm((p) => ({ ...p, razorpayEnabled: e.target.checked }))}
          />
          Enable Razorpay on mobile checkout
        </label>
        <p className="text-muted" style={{ margin: 0, fontSize: 14 }}>
          Server keys: {meta.razorpayConfigured ? "configured" : "not set — add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to backend .env"}
          {meta.razorpayConfigured && meta.razorpayTestMode ? " · test mode" : ""}
          {meta.razorpayKeyId ? ` · ${meta.razorpayKeyId}` : ""}
        </p>
      </div>

      <button type="button" className="btn btn-primary" disabled={saving} onClick={save}>
        {saving ? "Saving…" : "Save settings"}
      </button>
    </div>
  );
}
