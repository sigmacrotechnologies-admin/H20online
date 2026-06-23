export const DEFAULT_TAX_SETTINGS = {
  gstPercent: 18,
  serviceTaxPercent: 0,
  additionalTaxes: [],
  razorpayEnabled: true,
};

function roundRupee(n) {
  return Math.round(Number(n) || 0);
}

export function computeBilling(subtotal, settings = DEFAULT_TAX_SETTINGS) {
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

  addLine("GST", settings.gstPercent);
  addLine("Service Tax", settings.serviceTaxPercent);
  for (const t of settings.additionalTaxes || []) {
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
