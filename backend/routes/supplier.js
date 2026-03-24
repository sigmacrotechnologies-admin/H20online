const express = require("express");
const mongoose = require("mongoose");
const Order = require("../models/Order");
const Supplier = require("../models/Supplier");
const DeliveryPartner = require("../models/DeliveryPartner");
const { auth } = require("../middleware/auth");

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
    const { eta, remarks, deliveryPartnerId, requestedFleetType } = req.body;
    resp.status = "accepted";
    resp.deliveryStage = "accepted";
    if (eta != null && typeof eta === "string") {
      const normalizedEta = eta.trim();
      if (normalizedEta && !/^\d{1,2}h\s+[0-5]?\dm$/i.test(normalizedEta)) {
        return res.status(400).json({ error: "ETA must be in '<hours>h <minutes>m' format" });
      }
      resp.eta = normalizedEta;
    }
    if (remarks != null && typeof remarks === "string") resp.remarks = remarks.trim();
    if (requestedFleetType != null && typeof requestedFleetType === "string") resp.requestedFleetType = requestedFleetType.trim();
    if (deliveryPartnerId && toObjectId(deliveryPartnerId)) {
      const dp = await DeliveryPartner.findOne({ _id: deliveryPartnerId, onboardingStatus: "approved" }).lean();
      if (dp) {
        resp.deliveryPartnerId = dp._id;
        resp.deliveryPartnerName = dp.name;
        resp.deliveryPartnerPhone = dp.phone || "";
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
      const dp = await DeliveryPartner.findOne({ _id: deliveryPartnerId, onboardingStatus: "approved" }).lean();
      if (dp) {
        resp.deliveryPartnerId = dp._id;
        resp.deliveryPartnerName = dp.name;
        resp.deliveryPartnerPhone = dp.phone || "";
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

router.get("/financials", async (req, res) => {
  try {
    const supplier = await Supplier.findOne({ userId: req.user._id }).lean();
    if (!supplier) return res.status(403).json({ error: "Supplier profile required" });
    const supplierId = supplier._id;
    const orders = await Order.find({ "items.supplierId": supplierId, status: { $ne: "cancelled" } }).lean();
    let totalRevenue = 0;
    const orderCount = orders.length;
    for (const o of orders) {
      const myItems = (o.items || []).filter((i) => String(i.supplierId) === String(supplierId));
      totalRevenue += myItems.reduce((s, i) => s + (i.price || 0) * (i.qty || 1), 0);
    }
    const platformDeductionPercent = 30;
    const platformDeduction = totalRevenue * (platformDeductionPercent / 100);
    const bonusAmount = Number(supplier.bonusAmount || 0);
    const netEarnings = totalRevenue - platformDeduction + bonusAmount;
    res.json({
      totalRevenue,
      platformDeductionPercent,
      platformDeduction,
      netEarnings,
      orderCount,
      bonusAmount,
      bonusLabel: supplier.bonusLabel || "H2O Online extra benefit",
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
