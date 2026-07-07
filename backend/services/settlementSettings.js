const PlatformSettings = require("../models/PlatformSettings");
const { SETTINGS_KEY } = require("./taxSettings");

const FALLBACK_COMMISSION = 20;
const FALLBACK_DELIVERY_SHARE = 10;

function clampPercent(value, fallback) {
  const n = Number(value);
  if (value == null || value === "" || Number.isNaN(n)) return fallback;
  return Math.min(100, Math.max(0, n));
}

async function getSettlementDefaults() {
  const doc = await PlatformSettings.findOne({ key: SETTINGS_KEY }).lean();
  return {
    defaultCommissionPercent: clampPercent(doc?.defaultCommissionPercent, FALLBACK_COMMISSION),
    defaultDeliverySharePercent: clampPercent(doc?.defaultDeliverySharePercent, FALLBACK_DELIVERY_SHARE),
  };
}

function resolveSupplierCommissionPercent(supplier, defaults) {
  const fallback = defaults?.defaultCommissionPercent ?? FALLBACK_COMMISSION;
  if (supplier && supplier.commissionPercentage != null && supplier.commissionPercentage !== "") {
    return clampPercent(supplier.commissionPercentage, fallback);
  }
  return fallback;
}

function resolveDeliverySharePercent(deliveryPartner, defaults) {
  const fallback = defaults?.defaultDeliverySharePercent ?? FALLBACK_DELIVERY_SHARE;
  if (
    deliveryPartner &&
    deliveryPartner.deliverySharePercentage != null &&
    deliveryPartner.deliverySharePercentage !== ""
  ) {
    return clampPercent(deliveryPartner.deliverySharePercentage, fallback);
  }
  return fallback;
}

function getAssignedDeliveryPartnerId(order) {
  const responses = order?.supplierResponses || [];
  const withPartner = responses.find((r) => r.deliveryPartnerId);
  return withPartner?.deliveryPartnerId || null;
}

module.exports = {
  FALLBACK_COMMISSION,
  FALLBACK_DELIVERY_SHARE,
  clampPercent,
  getSettlementDefaults,
  resolveSupplierCommissionPercent,
  resolveDeliverySharePercent,
  getAssignedDeliveryPartnerId,
};
