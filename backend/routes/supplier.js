const express = require("express");
const mongoose = require("mongoose");
const Order = require("../models/Order");
const Supplier = require("../models/Supplier");
const DeliveryPartner = require("../models/DeliveryPartner");
const User = require("../models/User");
const { auth } = require("../middleware/auth");
const { etaFromTravelInfo } = require("../utils/deliveryEta");
const { haversineMeters, formatDistanceMeters } = require("../utils/geo");
const {
  getInFlightPartnerIds,
  partnerAssignmentError,
} = require("../utils/partnerAvailability");
const { getSupplierFinancials } = require("../services/financials");

const router = express.Router();
router.use(auth);

function toObjectId(v) {
  if (v == null || v === "") return null;
  if (typeof v === "string" && mongoose.Types.ObjectId.isValid(v) && v.length === 24) return v;
  return null;
}

async function getSupplierId(userId) {
  const s = await Supplier.findOne({ userId }).lean();
  return s ? s._id : null;
}

router.get("/orders/incoming", async (req, res) => {
  try {
    const supplierId = await getSupplierId(req.user._id);
    if (!supplierId) return res.status(403).json({ error: "Supplier profile required" });
    const orders = await Order.find({
      status: { $in: ["in_progress"] },
      "supplierResponses.supplierId": supplierId,
      "supplierResponses.status": "pending",
    })
      .sort({ createdAt: -1 })
      .populate("userId", "name email phone")
      .lean();
    const list = orders.map((o) => {
      const myResp = (o.supplierResponses || []).find((r) => String(r.supplierId) === String(supplierId));
      const myItems = (o.items || []).filter((i) => String(i.supplierId) === String(supplierId));
      const myTotal = myItems.reduce((s, i) => s + (i.price || 0) * (i.qty || 1), 0);
      return {
        id: o._id.toString(),
        items: o.items,
        myItems,
        myTotal,
        total: o.total,
        status: o.status,
        orderType: o.orderType || "instant",
        scheduledAt: o.scheduledAt || null,
        createdAt: o.createdAt,
        address: o.address,
        receiverName: o.receiverName,
        receiverPhone: o.receiverPhone,
        customerName: o.userId?.name,
        customerEmail: o.userId?.email,
        customerPhone: o.userId?.phone,
        supplierResponse: myResp,
        travelInfo: o.travelInfo || [],
        estimatedDeliveryText: o.estimatedDeliveryText || "",
        customerLatitude: o.customerLatitude ?? null,
        customerLongitude: o.customerLongitude ?? null,
      };
    });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/orders/history", async (req, res) => {
  try {
    const supplierId = await getSupplierId(req.user._id);
    if (!supplierId) return res.status(403).json({ error: "Supplier profile required" });
    const { status, customerId, search, page = 1, limit = 20 } = req.query;
    const filter = { "items.supplierId": supplierId };
    if (status && ["in_progress", "delivered", "cancelled"].includes(status)) filter.status = status;
    if (customerId && toObjectId(customerId)) filter.userId = toObjectId(customerId);
    const skip = (Math.max(1, Number(page)) - 1) * Math.min(50, Math.max(1, Number(limit)));
    const limitNum = Math.min(50, Math.max(1, Number(limit)));
    let orders = await Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum).populate("userId", "name email").lean();
    if (search && search.trim()) {
      const re = new RegExp(search.trim(), "i");
      orders = orders.filter((o) => re.test(o.userId?.name) || re.test(o.userId?.email) || re.test(o.address) || re.test(o._id.toString()));
    }
    const total = await Order.countDocuments(filter);
    const list = orders.map((o) => {
      const myResp = (o.supplierResponses || []).find((r) => String(r.supplierId) === String(supplierId));
      const myItems = (o.items || []).filter((i) => String(i.supplierId) === String(supplierId));
      const myTotal = myItems.reduce((s, i) => s + (i.price || 0) * (i.qty || 1), 0);
      return {
        id: o._id.toString(),
        items: o.items,
        myItems,
        myTotal,
        total: o.total,
        status: o.status,
        orderType: o.orderType || "instant",
        scheduledAt: o.scheduledAt || null,
        createdAt: o.createdAt,
        address: o.address,
        customerName: o.userId?.name,
        customerEmail: o.userId?.email,
        supplierResponse: myResp,
      };
    });
    res.json({ orders: list, total, page: Number(page) || 1, limit: limitNum });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/orders/:id/accept", async (req, res) => {
  try {
    const supplierId = await getSupplierId(req.user._id);
    if (!supplierId) return res.status(403).json({ error: "Supplier profile required" });
    const orderId = toObjectId(req.params.id);
    if (!orderId) return res.status(400).json({ error: "Invalid order id" });
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ error: "Order not found" });
    const resp = (order.supplierResponses || []).find((r) => String(r.supplierId) === String(supplierId));
    if (!resp) return res.status(404).json({ error: "Order not found for this supplier" });
    if (resp.status !== "pending") return res.status(400).json({ error: "Order already responded" });
    const { eta, etaBufferMinutes, remarks, deliveryPartnerId, requestedFleetType } = req.body;
    resp.status = "accepted";
    resp.deliveryStage = "accepted";
    const buffer = Math.max(0, Math.min(120, Number(etaBufferMinutes) || 0));
    const band = etaFromTravelInfo(order.travelInfo || [], buffer);
    resp.etaBufferMinutes = buffer;
    if (eta != null && typeof eta === "string" && eta.trim()) {
      resp.eta = eta.trim();
    } else {
      resp.eta = band.text;
    }
    order.estimatedDeliveryMinMinutes = band.min;
    order.estimatedDeliveryMaxMinutes = band.max;
    order.estimatedDeliveryText = resp.eta;
    if (remarks != null && typeof remarks === "string") resp.remarks = remarks.trim();
    if (requestedFleetType != null && typeof requestedFleetType === "string") resp.requestedFleetType = requestedFleetType.trim();
    if (deliveryPartnerId && toObjectId(deliveryPartnerId)) {
      const dp = await DeliveryPartner.findOne({
        _id: deliveryPartnerId,
        onboardingStatus: "approved",
        $or: [{ supplierId: supplierId }, { supplierId: null }, { supplierId: { $exists: false } }],
      }).lean();
      const inFlightIds = await getInFlightPartnerIds();
      const assignErr = partnerAssignmentError(dp, inFlightIds);
      if (assignErr) return res.status(400).json({ error: assignErr });
      resp.deliveryPartnerId = dp._id;
      resp.deliveryPartnerName = dp.name;
      resp.deliveryPartnerPhone = dp.phone || "";
      if (dp.lastLatitude != null && dp.lastLongitude != null) {
        resp.partnerLatitude = dp.lastLatitude;
        resp.partnerLongitude = dp.lastLongitude;
        resp.partnerLocationUpdatedAt = dp.locationUpdatedAt || new Date();
      }
    }
    await order.save();
    const o = order.toObject();
    res.json({ id: o._id.toString(), supplierResponses: o.supplierResponses });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/orders/:id/reject", async (req, res) => {
  try {
    const supplierId = await getSupplierId(req.user._id);
    if (!supplierId) return res.status(403).json({ error: "Supplier profile required" });
    const orderId = toObjectId(req.params.id);
    if (!orderId) return res.status(400).json({ error: "Invalid order id" });
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ error: "Order not found" });

    const resp = (order.supplierResponses || []).find((r) => String(r.supplierId) === String(supplierId));
    if (!resp) return res.status(404).json({ error: "Order not found for this supplier" });
    if (resp.status !== "pending") return res.status(400).json({ error: "Order already responded" });

    const { remarks } = req.body || {};
    resp.status = "rejected";
    if (remarks != null && typeof remarks === "string") resp.remarks = remarks.trim();

    const responses = order.supplierResponses || [];
    const hasAccepted = responses.some((r) => r.status === "accepted");
    const hasPending = responses.some((r) => r.status === "pending");
    if (!hasAccepted && !hasPending) {
      order.status = "cancelled";
    }

    await order.save();
    const o = order.toObject();
    res.json({ id: o._id.toString(), status: o.status, supplierResponses: o.supplierResponses });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List orders where this supplier has accepted (in_progress) - for assign rider screen
router.get("/orders/accepted", async (req, res) => {
  try {
    const supplierId = await getSupplierId(req.user._id);
    if (!supplierId) return res.status(403).json({ error: "Supplier profile required" });
    const orders = await Order.find({
      status: "in_progress",
      "supplierResponses.supplierId": supplierId,
      "supplierResponses.status": "accepted",
    })
      .sort({ createdAt: -1 })
      .populate("userId", "name email phone")
      .lean();
    const list = orders.map((o) => {
      const myResp = (o.supplierResponses || []).find((r) => String(r.supplierId) === String(supplierId));
      const myItems = (o.items || []).filter((i) => String(i.supplierId) === String(supplierId));
      const myTotal = myItems.reduce((s, i) => s + (i.price || 0) * (i.qty || 1), 0);
      return {
        id: o._id.toString(),
        items: o.items,
        myItems,
        myTotal,
        total: o.total,
        status: o.status,
        orderType: o.orderType || "instant",
        scheduledAt: o.scheduledAt || null,
        createdAt: o.createdAt,
        address: o.address,
        receiverName: o.receiverName,
        receiverPhone: o.receiverPhone,
        customerName: o.userId?.name,
        customerEmail: o.userId?.email,
        supplierResponse: myResp,
      };
    });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Assign or change delivery partner for an already-accepted order
router.patch("/orders/:id/assign-rider", async (req, res) => {
  try {
    const supplierId = await getSupplierId(req.user._id);
    if (!supplierId) return res.status(403).json({ error: "Supplier profile required" });
    const orderId = toObjectId(req.params.id);
    if (!orderId) return res.status(400).json({ error: "Invalid order id" });
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ error: "Order not found" });
    const resp = (order.supplierResponses || []).find((r) => String(r.supplierId) === String(supplierId));
    if (!resp) return res.status(404).json({ error: "Order not found for this supplier" });
    if (resp.status !== "accepted") return res.status(400).json({ error: "Order not accepted yet" });
    if (order.status !== "in_progress") return res.status(400).json({ error: "Order no longer in progress" });
    const { deliveryPartnerId } = req.body;
    if (deliveryPartnerId && toObjectId(deliveryPartnerId)) {
      const dp = await DeliveryPartner.findOne({
        _id: deliveryPartnerId,
        onboardingStatus: "approved",
        $or: [{ supplierId: supplierId }, { supplierId: null }, { supplierId: { $exists: false } }],
      }).lean();
      const inFlightIds = await getInFlightPartnerIds();
      const assignErr = partnerAssignmentError(dp, inFlightIds);
      if (assignErr) return res.status(400).json({ error: assignErr });
      resp.deliveryPartnerId = dp._id;
      resp.deliveryPartnerName = dp.name;
      resp.deliveryPartnerPhone = dp.phone || "";
      if (dp.lastLatitude != null && dp.lastLongitude != null) {
        resp.partnerLatitude = dp.lastLatitude;
        resp.partnerLongitude = dp.lastLongitude;
        resp.partnerLocationUpdatedAt = dp.locationUpdatedAt || new Date();
      }
    }
    await order.save();
    const o = order.toObject();
    res.json({ id: o._id.toString(), supplierResponses: o.supplierResponses });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/products", async (req, res) => {
  try {
    const supplierId = await getSupplierId(req.user._id);
    if (!supplierId) return res.status(403).json({ error: "Supplier profile required" });
    const Product = require("../models/Product");
    const list = await Product.find({ supplierId }).sort({ createdAt: -1 }).lean();
    res.json(list.map((p) => ({ ...p, id: p._id.toString(), _id: p._id.toString() })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Supplier cancel order (order in progress, for this supplier's part)
router.patch("/orders/:id/cancel", async (req, res) => {
  try {
    const supplierId = await getSupplierId(req.user._id);
    if (!supplierId) return res.status(403).json({ error: "Supplier profile required" });
    const orderId = toObjectId(req.params.id);
    if (!orderId) return res.status(400).json({ error: "Invalid order id" });
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ error: "Order not found" });
    const resp = (order.supplierResponses || []).find((r) => String(r.supplierId) === String(supplierId));
    if (!resp) return res.status(404).json({ error: "Order not found for this supplier" });
    if (order.status !== "in_progress") return res.status(400).json({ error: "Order cannot be cancelled" });
    order.status = "cancelled";
    await order.save();
    res.json({ id: order._id.toString(), status: order.status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List delivery partners available to this supplier (own fleet + platform pool)
router.get("/delivery-partners", async (req, res) => {
  try {
    const supplierId = await getSupplierId(req.user._id);
    if (!supplierId) return res.status(403).json({ error: "Supplier profile required" });
    const { vehicleType, nearLat, nearLng, onlineOnly } = req.query;
    const filter = {
      onboardingStatus: "approved",
      $or: [{ supplierId: supplierId }, { supplierId: null }, { supplierId: { $exists: false } }],
    };
    if (vehicleType && DeliveryPartner.VEHICLE_TYPES.includes(vehicleType)) {
      filter.vehicleType = vehicleType;
    }
    if (onlineOnly === "1" || onlineOnly === "true") {
      filter.isOnline = true;
    }
    const nearLatN = Number(nearLat);
    const nearLngN = Number(nearLng);
    const hasNear = Number.isFinite(nearLatN) && Number.isFinite(nearLngN);

    const list = await DeliveryPartner.find(filter)
      .select("name phone vehicleType vehicleNumber supplierId managedBySupplier isOnline lastLatitude lastLongitude locationUpdatedAt")
      .lean();

    const inFlightIds = await getInFlightPartnerIds();

    let mapped = list.map((d) => {
      const inFlight = inFlightIds.has(String(d._id));
      const availableForAssignment = !inFlight && Boolean(d.isOnline);
      const item = {
        ...d,
        id: d._id.toString(),
        _id: d._id.toString(),
        isOwnFleet: String(d.supplierId) === String(supplierId),
        inFlight,
        availableForAssignment,
      };
      if (hasNear && d.lastLatitude != null && d.lastLongitude != null) {
        const meters = haversineMeters(nearLatN, nearLngN, d.lastLatitude, d.lastLongitude);
        item.distanceMeters = Math.round(meters);
        item.distanceText = formatDistanceMeters(meters);
      }
      return item;
    });

    mapped.sort((a, b) => {
      if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1;
      const da = a.distanceMeters ?? 999999999;
      const db = b.distanceMeters ?? 999999999;
      return da - db;
    });

    res.json(mapped);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Supplier adds their own delivery partner (person + vehicle)
router.post("/delivery-partners", async (req, res) => {
  try {
    const supplierId = await getSupplierId(req.user._id);
    if (!supplierId) return res.status(403).json({ error: "Supplier profile required" });
    const { name, email, phone, password, vehicleType, vehicleNumber } = req.body || {};
    if (!name || !email || !phone || !password || !vehicleType) {
      return res.status(400).json({ error: "Name, email, phone, password and vehicle type are required" });
    }
    if (!DeliveryPartner.VEHICLE_TYPES.includes(vehicleType)) {
      return res.status(400).json({ error: "Invalid vehicle type" });
    }
    const emailNorm = String(email).trim().toLowerCase();
    const existingUser = await User.findOne({ email: emailNorm });
    if (existingUser) return res.status(400).json({ error: "Email already registered" });

    const user = await User.create({
      name: String(name).trim(),
      email: emailNorm,
      phone: String(phone).trim(),
      password,
      role: "deliveryPartner",
    });

    const dp = await DeliveryPartner.create({
      name: String(name).trim(),
      email: emailNorm,
      phone: String(phone).trim(),
      vehicleType,
      vehicleNumber: (vehicleNumber || "").trim(),
      userId: user._id,
      supplierId,
      managedBySupplier: true,
      onboardingStatus: "approved",
      documentLicenseVerified: true,
      documentIdentityVerified: true,
      documentVehicleIdentificationVerified: true,
    });

    res.status(201).json({
      id: dp._id.toString(),
      name: dp.name,
      phone: dp.phone,
      vehicleType: dp.vehicleType,
      vehicleNumber: dp.vehicleNumber,
      isOwnFleet: true,
    });
  } catch (err) {
    console.error("Supplier create delivery partner error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get("/financials", async (req, res) => {
  try {
    const supplier = await Supplier.findOne({ userId: req.user._id }).lean();
    if (!supplier) return res.status(403).json({ error: "Supplier profile required" });
    const result = await getSupplierFinancials(supplier);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
