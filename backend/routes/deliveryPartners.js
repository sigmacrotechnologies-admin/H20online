const express = require("express");
const mongoose = require("mongoose");
const DeliveryPartner = require("../models/DeliveryPartner");
const Order = require("../models/Order");
const Subscription = require("../models/Subscription");
const Wallet = require("../models/Wallet");
const { runPayoutOnDelivered } = require("../services/orderPayout");
const { auth } = require("../middleware/auth");

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
    res.json({ ...dp, id: dp._id.toString(), _id: dp._id.toString() });
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
    if (vehicleType !== undefined && ["bicycle", "bike", "truck", "minivan", "camper", "cycle"].includes(vehicleType)) dp.vehicleType = vehicleType;
    if (profileImageUrl !== undefined && typeof profileImageUrl === "string") dp.profileImageUrl = profileImageUrl;
    await dp.save();
    const out = await DeliveryPartner.findById(dp._id).lean();
    res.json({ ...out, id: out._id.toString(), _id: out._id.toString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/", auth, async (req, res) => {
  try {
    const { vehicleType } = req.query;
    const filter = { onboardingStatus: "approved" };
    if (vehicleType && ["bicycle", "bike", "truck", "minivan", "camper", "cycle"].includes(vehicleType)) {
      filter.vehicleType = vehicleType;
    }
    const list = await DeliveryPartner.find(filter).select("name phone vehicleType").sort({ name: 1 }).lean();
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
    await order.save();
    const o = order.toObject();
    res.json({ id: o._id.toString(), supplierResponses: o.supplierResponses });
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
    if (order.paymentMethod === "wallet") {
      await runPayoutOnDelivered(order, req.user._id);
    } else {
      const deliveryShare = Math.round((order.total || 0) * 0.1);
      if (deliveryShare > 0) {
        const w = await getOrCreateWallet(req.user._id);
        w.balance = (w.balance || 0) + deliveryShare;
        w.transactions = w.transactions || [];
        w.transactions.push({ amount: deliveryShare, type: "credit", ref: "delivery" });
        await w.save();
      }
    }
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
    const orders = await Order.find({
      "supplierResponses.deliveryPartnerId": dpId,
      status: "delivered",
    }).lean();
    const totalEarnings = orders.reduce((sum, o) => sum + (o.total || 0), 0);
    const deliveryShare = Math.round(totalEarnings * 0.1);
    res.json({
      totalDeliveries: orders.length,
      totalEarnings,
      deliveryShare,
      currency: "INR",
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
