const PlatformSettings = require("../models/PlatformSettings");

const SETTINGS_KEY = "tax-global";

const DEFAULT_SETTINGS = {
  gstPercent: 18,
  serviceTaxPercent: 0,
  additionalTaxes: [],
  razorpayEnabled: true,
  defaultCommissionPercent: 20,
  defaultDeliverySharePercent: 10,
};

function roundRupee(n) {
  return Math.round(Number(n) || 0);
}

function computeBilling(subtotal, settings) {
  const sub = roundRupee(subtotal);
  const taxLines = [];
  let taxTotal = 0;

  const addLine = (label, percent) => {
    const pct = Number(percent) || 0;
    if (pct <= 0) return;
    const amount = roundRupee(sub * pct / 100);
    taxLines.push({ label, percent: pct, amount });
    taxTotal += amount;
  };

  addLine("GST", settings?.gstPercent);
  addLine("Service Tax", settings?.serviceTaxPercent);
  for (const t of settings?.additionalTaxes || []) {
    if (t?.enabled && t.label && Number(t.percent) > 0) {
      addLine(String(t.label).trim(), t.percent);
    }
  }

  return {
    subtotal: sub,
    taxLines,
    taxTotal,
    grandTotal: sub + taxTotal,
  };
}

async function getTaxSettings() {
  let doc = await PlatformSettings.findOne({ key: SETTINGS_KEY }).lean();
  if (!doc) {
    doc = await PlatformSettings.create({ key: SETTINGS_KEY, ...DEFAULT_SETTINGS });
    doc = doc.toObject();
  }
  return {
    gstPercent: doc.gstPercent ?? DEFAULT_SETTINGS.gstPercent,
    serviceTaxPercent: doc.serviceTaxPercent ?? DEFAULT_SETTINGS.serviceTaxPercent,
    additionalTaxes: doc.additionalTaxes || [],
    razorpayEnabled: doc.razorpayEnabled ?? DEFAULT_SETTINGS.razorpayEnabled,
    defaultCommissionPercent: doc.defaultCommissionPercent ?? DEFAULT_SETTINGS.defaultCommissionPercent,
    defaultDeliverySharePercent: doc.defaultDeliverySharePercent ?? DEFAULT_SETTINGS.defaultDeliverySharePercent,
  };
}

async function updateTaxSettings(body) {
  const updates = {};
  if (body.gstPercent != null) updates.gstPercent = Math.min(100, Math.max(0, Number(body.gstPercent) || 0));
  if (body.serviceTaxPercent != null) updates.serviceTaxPercent = Math.min(100, Math.max(0, Number(body.serviceTaxPercent) || 0));
  if (body.razorpayEnabled != null) updates.razorpayEnabled = Boolean(body.razorpayEnabled);
  if (body.defaultCommissionPercent != null) {
    updates.defaultCommissionPercent = Math.min(100, Math.max(0, Number(body.defaultCommissionPercent) || 0));
  }
  if (body.defaultDeliverySharePercent != null) {
    updates.defaultDeliverySharePercent = Math.min(100, Math.max(0, Number(body.defaultDeliverySharePercent) || 0));
  }
  if (Array.isArray(body.additionalTaxes)) {
    updates.additionalTaxes = body.additionalTaxes
      .map((t) => ({
        label: String(t.label || "").trim(),
        percent: Math.min(100, Math.max(0, Number(t.percent) || 0)),
        enabled: Boolean(t.enabled),
      }))
      .filter((t) => t.label);
  }
  const doc = await PlatformSettings.findOneAndUpdate(
    { key: SETTINGS_KEY },
    { $set: updates },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  return getTaxSettingsFromDoc(doc);
}

function getTaxSettingsFromDoc(doc) {
  const d = doc?.toObject?.() || doc || {};
  return {
    gstPercent: d.gstPercent ?? DEFAULT_SETTINGS.gstPercent,
    serviceTaxPercent: d.serviceTaxPercent ?? DEFAULT_SETTINGS.serviceTaxPercent,
    additionalTaxes: d.additionalTaxes || [],
    razorpayEnabled: d.razorpayEnabled ?? DEFAULT_SETTINGS.razorpayEnabled,
    defaultCommissionPercent: d.defaultCommissionPercent ?? DEFAULT_SETTINGS.defaultCommissionPercent,
    defaultDeliverySharePercent: d.defaultDeliverySharePercent ?? DEFAULT_SETTINGS.defaultDeliverySharePercent,
  };
}

function validateOrderBilling(subtotal, body, settings) {
  const expected = computeBilling(subtotal, settings);
  const bodySubtotal = roundRupee(body.subtotal ?? subtotal);
  const bodyTaxTotal = roundRupee(body.taxTotal ?? expected.taxTotal);
  const bodyTotal = roundRupee(body.total ?? expected.grandTotal);

  if (bodySubtotal !== expected.subtotal) {
    return { ok: false, error: "Subtotal mismatch" };
  }
  if (bodyTaxTotal !== expected.taxTotal) {
    return { ok: false, error: "Tax total mismatch" };
  }
  if (bodyTotal !== expected.grandTotal) {
    return { ok: false, error: "Order total mismatch" };
  }
  return { ok: true, billing: expected };
}

module.exports = {
  SETTINGS_KEY,
  DEFAULT_SETTINGS,
  computeBilling,
  getTaxSettings,
  updateTaxSettings,
  validateOrderBilling,
  roundRupee,
};
