const express = require("express");
const mongoose = require("mongoose");
const DeliveryPartner = require("../models/DeliveryPartner");
const Order = require("../models/Order");
const Subscription = require("../models/Subscription");
const Wallet = require("../models/Wallet");
const { runPayoutOnDelivered } = require("../services/orderPayout");
const { getDeliveryPartnerFinancials } = require("../services/financials");
const { auth } = require("../middleware/auth");
const { etaFromPartnerToCustomer } = require("../utils/deliveryEta");
const { haversineMeters, formatDistanceMeters } = require("../utils/geo");
const { getActiveDeliveryForPartner } = require("../utils/partnerAvailability");

async function getOrCreateWallet(userId) {
  let w = await Wallet.findOne({ userId });
  if (!w) w = await Wallet.create({ userId, balance: 0 });
  return w;
}

const router = express.Router();

function toObjectId(v) {
  if (v == null || v === "") return null;
  if (typeof v === "string" && mongoose.Types.ObjectId.isValid(v) && v.length === 24) return v;
  return null;
}

async function getDpId(req) {
  const dp = await DeliveryPartner.findOne({ userId: req.user._id }).lean();
  return dp ? dp._id : null;
}

router.get("/me", auth, async (req, res) => {
  try {
    const dp = await DeliveryPartner.findOne({ userId: req.user._id }).lean();
    if (!dp) return res.status(404).json({ error: "Delivery partner profile not found" });
    const active = await getActiveDeliveryForPartner(dp._id);
    res.json({
      ...dp,
      id: dp._id.toString(),
      _id: dp._id.toString(),
      inFlight: Boolean(active),
      activeDeliveryOrderId: active?.orderId || null,
      activeDeliveryStage: active?.deliveryStage || null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/me", auth, async (req, res) => {
  try {
    const dp = await DeliveryPartner.findOne({ userId: req.user._id });
    if (!dp) return res.status(404).json({ error: "Delivery partner profile not found" });
    const { name, phone, vehicleType, profileImageUrl } = req.body;
    if (name !== undefined && String(name).trim()) dp.name = String(name).trim();
    if (phone !== undefined && String(phone).trim()) dp.phone = String(phone).trim();
  const validVehicle = ["bicycle", "bike", "van", "tanker", "miniTruck", "truck", "minivan", "camper", "cycle"];
    if (vehicleType !== undefined && validVehicle.includes(vehicleType)) dp.vehicleType = vehicleType;
    if (profileImageUrl !== undefined && typeof profileImageUrl === "string") dp.profileImageUrl = profileImageUrl;
    await dp.save();
    const out = await DeliveryPartner.findById(dp._id).lean();
    res.json({ ...out, id: out._id.toString(), _id: out._id.toString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/me/online", auth, async (req, res) => {
  try {
    const dp = await DeliveryPartner.findOne({ userId: req.user._id });
    if (!dp) return res.status(404).json({ error: "Delivery partner profile not found" });
    const isOnline = Boolean(req.body?.isOnline);
    dp.isOnline = isOnline;
    const lat = Number(req.body?.latitude);
    const lng = Number(req.body?.longitude);
    if (isOnline && Number.isFinite(lat) && Number.isFinite(lng)) {
      dp.lastLatitude = lat;
      dp.lastLongitude = lng;
      dp.locationUpdatedAt = new Date();
    }
    if (!isOnline) {
      dp.locationUpdatedAt = undefined;
    }
    await dp.save();
    const out = await DeliveryPartner.findById(dp._id).lean();
    res.json({ ...out, id: out._id.toString(), _id: out._id.toString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/me/location", auth, async (req, res) => {
  try {
    const dp = await DeliveryPartner.findOne({ userId: req.user._id });
    if (!dp) return res.status(404).json({ error: "Delivery partner profile not found" });
    if (!dp.isOnline) return res.status(400).json({ error: "Go online to share live location" });
    const lat = Number(req.body?.latitude);
    const lng = Number(req.body?.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ error: "latitude and longitude required" });
    }
    dp.lastLatitude = lat;
    dp.lastLongitude = lng;
    dp.locationUpdatedAt = new Date();
    await dp.save();
    res.json({
      id: dp._id.toString(),
      isOnline: dp.isOnline,
      lastLatitude: lat,
      lastLongitude: lng,
      locationUpdatedAt: dp.locationUpdatedAt,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/", auth, async (req, res) => {
  try {
    const { vehicleType } = req.query;
    const filter = { onboardingStatus: "approved" };
    if (vehicleType && ["bicycle", "bike", "truck", "minivan", "camper", "cycle", "van", "tanker", "miniTruck"].includes(vehicleType)) {
      filter.vehicleType = vehicleType;
    }
    const list = await DeliveryPartner.find(filter).select("name phone vehicleType isOnline lastLatitude lastLongitude locationUpdatedAt").sort({ name: 1 }).lean();
    res.json(list.map((d) => ({ ...d, id: d._id.toString(), _id: d._id.toString() })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function timeToMinutes(str) {
  if (!str || typeof str !== "string") return null;
  const trimmed = str.trim();
  const match = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;
  let h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const ampm = (match[3] || "").toUpperCase();
  if (ampm === "PM" && h !== 12) h += 12;
  if (ampm === "AM" && h === 12) h = 0;
  return h * 60 + m;
}
function timeRangesOverlap(startA, endA, startB, endB) {
  const a1 = timeToMinutes(startA);
  const a2 = timeToMinutes(endA);
  const b1 = timeToMinutes(startB);
  const b2 = timeToMinutes(endB);
  if (a1 == null || a2 == null || b1 == null || b2 == null) return false;
  return a1 < b2 && b1 < a2;
}
function getWeekBounds() {
  const now = new Date();
  const day = now.getDay();
  const start = new Date(now);
  start.setDate(now.getDate() - day);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return {
    startKey: start.toISOString().slice(0, 10),
    endKey: end.toISOString().slice(0, 10),
  };
}

// Subscription orders assigned to this delivery partner (with filters: all, today, this_week, time range)
router.get("/subscriptions", auth, async (req, res) => {
  try {
    const dpId = await getDpId(req);
    if (!dpId) return res.status(403).json({ error: "Delivery partner profile required" });
    const { scheduleFilter, timeRangeStart, timeRangeEnd } = req.query;
    const subs = await Subscription.find({
      deliveryPartnerId: dpId,
      status: { $in: ["active", "inactive"] },
    })
      .populate("userId", "name email phone")
      .populate("pickupHubId", "name address")
      .sort({ preferredTimeRangeStart: 1, preferredDeliveryTime: 1, createdAt: -1 })
      .lean();
    const todayKey = new Date().toISOString().slice(0, 10);
    const { startKey: weekStart, endKey: weekEnd } = getWeekBounds();
    let list = subs.map((s) => {
      const u = s.userId;
      const hub = s.pickupHubId;
      return {
        id: s._id.toString(),
        subscriptionId: s.subscriptionId || s._id.toString(),
        preferredDeliveryTime: s.preferredDeliveryTime || (s.preferredTimeRangeStart && s.preferredTimeRangeEnd ? `${s.preferredTimeRangeStart} - ${s.preferredTimeRangeEnd}` : ""),
        preferredTimeRangeStart: s.preferredTimeRangeStart || "",
        preferredTimeRangeEnd: s.preferredTimeRangeEnd || "",
        customerName: u?.name || "",
        customerEmail: u?.email || "",
        customerPhone: u?.phone || "",
        deliveryAddress: s.deliveryAddress || "",
        locality: s.locality || "",
        pinCode: s.pinCode || "",
        frequency: s.frequency,
        productLabel: s.productLabel,
        productKey: s.productKey,
        planName: s.planName,
        quantity: s.quantity,
        selectedDates: s.selectedDates || [],
        pickupHubName: hub?.name || "",
        pickupHubAddress: hub?.address || "",
      };
    });
    if (scheduleFilter === "today") {
      list = list.filter((s) => (s.selectedDates || []).includes(todayKey));
    } else if (scheduleFilter === "this_week") {
      list = list.filter((s) => (s.selectedDates || []).some((d) => d >= weekStart && d <= weekEnd));
    }
    if (timeRangeStart && timeRangeEnd) {
      const start = String(timeRangeStart).trim();
      const end = String(timeRangeEnd).trim();
      const filterStartMin = timeToMinutes(start);
      const filterEndMin = timeToMinutes(end);
      list = list.filter((s) => {
        const subStart = s.preferredTimeRangeStart || (s.preferredDeliveryTime && s.preferredDeliveryTime.split(" - ")[0]) || "";
        const subEnd = s.preferredTimeRangeEnd || (s.preferredDeliveryTime && s.preferredDeliveryTime.split(" - ")[1]) || subStart;
        if (!subStart || filterStartMin == null || filterEndMin == null) return false;
        if (subEnd && subEnd !== subStart) return timeRangesOverlap(subStart, subEnd, start, end);
        const subMin = timeToMinutes(subStart);
        return subMin != null && subMin >= filterStartMin && subMin <= filterEndMin;
      });
    }
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/orders/incoming", auth, async (req, res) => {
  try {
    const dpId = await getDpId(req);
    if (!dpId) return res.status(403).json({ error: "Delivery partner profile required" });
    const orders = await Order.find({
      "supplierResponses.deliveryPartnerId": dpId,
      status: "in_progress",
    })
      .sort({ createdAt: -1 })
      .populate("userId", "name email phone")
      .lean();
    const list = orders.map((o) => {
      const resp = (o.supplierResponses || []).find((r) => r.deliveryPartnerId && String(r.deliveryPartnerId) === String(dpId));
      return {
        id: o._id.toString(),
        total: o.total,
        address: o.address,
        receiverName: o.receiverName,
        receiverPhone: o.receiverPhone,
        status: o.status,
        orderType: o.orderType || "instant",
        scheduledAt: o.scheduledAt || null,
        supplierResponse: resp ? { eta: resp.eta, remarks: resp.remarks, deliveryStage: resp.deliveryStage || "accepted" } : null,
        customerName: o.userId?.name,
        customerEmail: o.userId?.email,
        createdAt: o.createdAt,
      };
    });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/orders/history", auth, async (req, res) => {
  try {
    const dpId = await getDpId(req);
    if (!dpId) return res.status(403).json({ error: "Delivery partner profile required" });
    const { status } = req.query;
    const filter = { "supplierResponses.deliveryPartnerId": dpId };
    if (status && ["in_progress", "delivered", "cancelled"].includes(status)) filter.status = status;
    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .populate("userId", "name email phone")
      .lean();
    const list = orders.map((o) => {
      const resp = (o.supplierResponses || []).find((r) => r.deliveryPartnerId && String(r.deliveryPartnerId) === String(dpId));
      return {
        id: o._id.toString(),
        total: o.total,
        address: o.address,
        receiverName: o.receiverName,
        receiverPhone: o.receiverPhone,
        status: o.status,
        orderType: o.orderType || "instant",
        scheduledAt: o.scheduledAt || null,
        supplierResponse: resp ? { eta: resp.eta, remarks: resp.remarks, deliveryStage: resp.deliveryStage || "accepted" } : null,
        customerName: o.userId?.name,
        customerEmail: o.userId?.email,
        createdAt: o.createdAt,
      };
    });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/orders/summary", auth, async (req, res) => {
  try {
    const dpId = await getDpId(req);
    if (!dpId) return res.status(403).json({ error: "Delivery partner profile required" });
    const allAssigned = await Order.find({ "supplierResponses.deliveryPartnerId": dpId }).lean();
    const notCancelled = allAssigned.filter((o) => o.status !== "cancelled");
    const total = notCancelled.length;
    const delivered = notCancelled.filter((o) => o.status === "delivered").length;
    const inProgress = notCancelled.filter((o) => o.status === "in_progress").length;
    const cancelled = allAssigned.filter((o) => o.status === "cancelled").length;
    res.json({ totalOrders: total, delivered, inProgress, cancelled });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mark order as picked up by delivery partner
router.patch("/orders/:id/picked-up", auth, async (req, res) => {
  try {
    const dpId = await getDpId(req);
    if (!dpId) return res.status(403).json({ error: "Delivery partner profile required" });
    const orderId = toObjectId(req.params.id);
    if (!orderId) return res.status(400).json({ error: "Invalid order id" });
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ error: "Order not found" });
    const resp = (order.supplierResponses || []).find((r) => r.deliveryPartnerId && String(r.deliveryPartnerId) === String(dpId));
    if (!resp) return res.status(404).json({ error: "Order not assigned to you" });
    if (resp.status !== "accepted") return res.status(400).json({ error: "Order not accepted" });
    if (order.status !== "in_progress") return res.status(400).json({ error: "Order no longer in progress" });
    resp.deliveryStage = "picked_up";
    const lat = Number(req.body?.latitude);
    const lng = Number(req.body?.longitude);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      resp.partnerLatitude = lat;
      resp.partnerLongitude = lng;
      resp.partnerLocationUpdatedAt = new Date();
    }
    await order.save();
    const o = order.toObject();
    res.json({ id: o._id.toString(), supplierResponses: o.supplierResponses });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Live location while en route to customer (after pick-up)
router.patch("/orders/:id/location", auth, async (req, res) => {
  try {
    const dpId = await getDpId(req);
    if (!dpId) return res.status(403).json({ error: "Delivery partner profile required" });
    const orderId = toObjectId(req.params.id);
    if (!orderId) return res.status(400).json({ error: "Invalid order id" });
    const lat = Number(req.body?.latitude);
    const lng = Number(req.body?.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ error: "latitude and longitude required" });
    }
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ error: "Order not found" });
    const resp = (order.supplierResponses || []).find(
      (r) => r.deliveryPartnerId && String(r.deliveryPartnerId) === String(dpId)
    );
    if (!resp) return res.status(404).json({ error: "Order not assigned to you" });
    if (resp.deliveryStage !== "picked_up") {
      return res.status(400).json({ error: "Live tracking only after order is picked up" });
    }
    if (order.status !== "in_progress") {
      return res.status(400).json({ error: "Order no longer in progress" });
    }

    resp.partnerLatitude = lat;
    resp.partnerLongitude = lng;
    resp.partnerLocationUpdatedAt = new Date();

    const custLat = order.customerLatitude;
    const custLng = order.customerLongitude;
    if (custLat != null && custLng != null) {
      const live = etaFromPartnerToCustomer(lat, lng, custLat, custLng);
      const acceptedEta = resp.eta || order.estimatedDeliveryText || "";
      resp.liveDistanceText = live.distanceText || "";
      resp.liveDistanceMeters = live.distanceMeters || 0;
      resp.liveEtaText = acceptedEta || live.etaText;
      resp.liveEtaSeconds = (live.max || live.min || 0) * 60;
    }

    await order.save();
    res.json({
      id: order._id.toString(),
      partnerLatitude: lat,
      partnerLongitude: lng,
      partnerLocationUpdatedAt: resp.partnerLocationUpdatedAt,
      liveEtaText: resp.liveEtaText,
      liveEtaSeconds: resp.liveEtaSeconds,
      liveDistanceText: resp.liveDistanceText,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mark order as delivered (complete delivery)
router.patch("/orders/:id/delivered", auth, async (req, res) => {
  try {
    const dpId = await getDpId(req);
    if (!dpId) return res.status(403).json({ error: "Delivery partner profile required" });
    const orderId = toObjectId(req.params.id);
    if (!orderId) return res.status(400).json({ error: "Invalid order id" });
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ error: "Order not found" });
    const resp = (order.supplierResponses || []).find((r) => r.deliveryPartnerId && String(r.deliveryPartnerId) === String(dpId));
    if (!resp) return res.status(404).json({ error: "Order not assigned to you" });
    if (order.status !== "in_progress") return res.status(400).json({ error: "Order no longer in progress" });
    resp.deliveryStage = "delivered";
    order.status = "delivered";
    await order.save();
    await runPayoutOnDelivered(order, req.user._id);
    const o = order.toObject();
    res.json({ id: o._id.toString(), status: o.status, supplierResponses: o.supplierResponses });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/financials", auth, async (req, res) => {
  try {
    const dpId = await getDpId(req);
    if (!dpId) return res.status(403).json({ error: "Delivery partner profile required" });
    const result = await getDeliveryPartnerFinancials(dpId, req.user._id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
