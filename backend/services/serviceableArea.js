const ServiceableArea = require("../models/ServiceableArea");
const Supplier = require("../models/Supplier");
const { haversineMeters } = require("../utils/geo");

const DEFAULT_RADIUS_KM = 10;

function normalizePin(pin) {
  const digits = String(pin || "").replace(/\D/g, "");
  if (digits.length >= 6) return digits.slice(0, 6);
  return digits;
}

async function geocodeAddress(pinCode, city, state) {
  const key = process.env.GOOGLE_MAPS_API_KEY || process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!key) return null;
  const query = [pinCode, city, state, "India"].filter(Boolean).join(", ");
  try {
    const url =
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&region=in&key=${key}`;
    const res = await fetch(url);
    const data = await res.json();
    const loc = data?.results?.[0]?.geometry?.location;
    if (loc && Number.isFinite(loc.lat) && Number.isFinite(loc.lng)) {
      return { latitude: loc.lat, longitude: loc.lng };
    }
  } catch (_) {
    // fallback to pin-only matching
  }
  return null;
}

function isAreaMatch(customerPin, customerLat, customerLng, area) {
  const areaPin = normalizePin(area.pinCode);
  const custPin = normalizePin(customerPin);
  if (areaPin && custPin && areaPin === custPin) {
    return { matched: true, reason: "pin", distanceMeters: 0 };
  }

  const radiusKm = Number(area.radiusKm) || DEFAULT_RADIUS_KM;
  const areaLat = area.latitude;
  const areaLng = area.longitude;

  if (!Number.isFinite(areaLat) || !Number.isFinite(areaLng)) {
    return { matched: false, reason: "no_coords" };
  }

  if (!Number.isFinite(customerLat) || !Number.isFinite(customerLng)) {
    return { matched: false, reason: "no_customer_coords" };
  }

  const meters = haversineMeters(customerLat, customerLng, areaLat, areaLng);
  if (meters <= radiusKm * 1000) {
    return { matched: true, reason: "radius", distanceMeters: Math.round(meters) };
  }

  return { matched: false, reason: "out_of_range", distanceMeters: Math.round(meters) };
}

async function resolveCustomerPoint({ pinCode, latitude, longitude, city, state }) {
  const pin = normalizePin(pinCode);
  if (!pin || pin.length < 6) {
    return { ok: false, error: "Valid 6-digit PIN code is required" };
  }

  let lat = Number(latitude);
  let lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    const geo = await geocodeAddress(pin, city, state);
    if (geo) {
      lat = geo.latitude;
      lng = geo.longitude;
    }
  }

  return {
    ok: true,
    pinCode: pin,
    latitude: Number.isFinite(lat) ? lat : null,
    longitude: Number.isFinite(lng) ? lng : null,
  };
}

async function checkServiceability({ pinCode, latitude, longitude, city, state, supplierIds }) {
  const ids = [...new Set((supplierIds || []).filter((id) => id))].map(String);
  const customer = await resolveCustomerPoint({ pinCode, latitude, longitude, city, state });
  if (!customer.ok) {
    return {
      serviceable: false,
      error: customer.error,
      pinCode: normalizePin(pinCode),
      suppliers: {},
      unserviceableSupplierIds: ids,
    };
  }

  if (!ids.length) {
    return {
      serviceable: true,
      pinCode: customer.pinCode,
      customerLatitude: customer.latitude,
      customerLongitude: customer.longitude,
      suppliers: {},
      unserviceableSupplierIds: [],
    };
  }

  const areas = await ServiceableArea.find({
    supplierId: { $in: ids },
    isActive: true,
  }).lean();

  const areasBySupplier = new Map();
  for (const a of areas) {
    const sid = String(a.supplierId);
    if (!areasBySupplier.has(sid)) areasBySupplier.set(sid, []);
    areasBySupplier.get(sid).push(a);
  }

  const supplierDocs = await Supplier.find({ _id: { $in: ids } })
    .select("name")
    .lean();
  const supplierNames = Object.fromEntries(supplierDocs.map((s) => [String(s._id), s.name || "Supplier"]));

  const suppliers = {};
  const unserviceableSupplierIds = [];

  for (const sid of ids) {
    const list = areasBySupplier.get(sid) || [];
    if (list.length === 0) {
      unserviceableSupplierIds.push(sid);
      suppliers[sid] = {
        serviceable: false,
        supplierName: supplierNames[sid] || "",
        reason: "no_serviceable_areas",
        message: "Delivery is not available — no availability range configured for this supplier",
      };
      continue;
    }

    let best = null;
    for (const area of list) {
      const match = isAreaMatch(customer.pinCode, customer.latitude, customer.longitude, area);
      if (match.matched) {
        best = { area, match };
        break;
      }
      if (!best || (match.distanceMeters != null && match.distanceMeters < (best.match.distanceMeters ?? Infinity))) {
        best = { area, match };
      }
    }

    if (best?.match?.matched) {
      suppliers[sid] = {
        serviceable: true,
        supplierName: supplierNames[sid] || "",
        pinCode: best.area.pinCode,
        label: best.area.label || "",
        distanceMeters: best.match.distanceMeters ?? 0,
        radiusKm: best.area.radiusKm || DEFAULT_RADIUS_KM,
        matchReason: best.match.reason,
      };
    } else {
      unserviceableSupplierIds.push(sid);
      const radiusKm = best?.area?.radiusKm || DEFAULT_RADIUS_KM;
      suppliers[sid] = {
        serviceable: false,
        supplierName: supplierNames[sid] || "",
        reason: "out_of_range",
        nearestPinCode: best?.area?.pinCode || "",
        distanceMeters: best?.match?.distanceMeters ?? null,
        radiusKm,
        message: "This address is not within this supplier's availability range",
      };
    }
  }

  return {
    serviceable: unserviceableSupplierIds.length === 0,
    pinCode: customer.pinCode,
    customerLatitude: customer.latitude,
    customerLongitude: customer.longitude,
    suppliers,
    unserviceableSupplierIds,
    defaultRadiusKm: DEFAULT_RADIUS_KM,
  };
}

module.exports = {
  DEFAULT_RADIUS_KM,
  normalizePin,
  resolveCustomerPoint,
  checkServiceability,
  geocodeAddress,
};
