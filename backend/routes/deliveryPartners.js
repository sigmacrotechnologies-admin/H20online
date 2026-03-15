const express = require("express");
const mongoose = require("mongoose");
const DeliveryPartner = require("../models/DeliveryPartner");
const Order = require("../models/Order");
const { auth } = require("../middleware/auth");

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
    const { name, phone } = req.body;
    if (name !== undefined && String(name).trim()) dp.name = String(name).trim();
    if (phone !== undefined && String(phone).trim()) dp.phone = String(phone).trim();
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

router.get("/orders/incoming", auth, async (req, res) => {
  try {
    const dpId = await getDpId(req);
    if (!dpId) return res.status(403).json({ error: "Delivery partner profile required" });
    const orders = await Order.find({
      "supplierResponses.deliveryPartnerId": dpId,
      status: { $ne: "cancelled" },
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
        supplierResponse: resp ? { eta: resp.eta, remarks: resp.remarks } : null,
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
    const orders = await Order.find({
      "supplierResponses.deliveryPartnerId": dpId,
      status: { $ne: "cancelled" },
    }).lean();
    const total = orders.length;
    const delivered = orders.filter((o) => o.status === "delivered").length;
    const inProgress = orders.filter((o) => o.status === "in_progress").length;
    const totalEarnings = orders.filter((o) => o.status === "delivered").reduce((sum, o) => sum + (o.total || 0), 0);
    res.json({ totalOrders: total, delivered, inProgress, totalEarnings });
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
