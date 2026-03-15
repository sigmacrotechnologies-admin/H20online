const express = require("express");
const mongoose = require("mongoose");
const Order = require("../models/Order");
const { auth } = require("../middleware/auth");

const router = express.Router();
router.use(auth);

function toObjectId(v) {
  if (v == null || v === "") return null;
  if (typeof v === "string" && mongoose.Types.ObjectId.isValid(v) && v.length === 24) return v;
  return null;
}

router.get("/", async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user._id }).sort({ createdAt: -1 }).lean();
    const list = orders.map((o) => ({
      id: o._id.toString(),
      items: o.items,
      total: o.total,
      paymentMethod: o.paymentMethod,
      status: o.status,
      date: o.createdAt,
      address: o.address,
      supplierResponses: o.supplierResponses || [],
    }));
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const o = await Order.findOne({ _id: req.params.id, userId: req.user._id }).lean();
    if (!o) return res.status(404).json({ error: "Order not found" });
    res.json({
      id: o._id.toString(),
      items: o.items,
      total: o.total,
      status: o.status,
      date: o.createdAt,
      address: o.address,
      receiverName: o.receiverName,
      receiverPhone: o.receiverPhone,
      supplierResponses: o.supplierResponses || [],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const body = req.body;
    const items = body.items;
    if (!items || !Array.isArray(items) || items.length === 0) return res.status(400).json({ error: "Items required" });
    const orderItems = items.map((i) => ({
      productId: toObjectId(i.id || i.productId),
      productName: i.productName || "",
      supplierName: i.supplierName || "",
      supplierId: toObjectId(i.supplierId),
      price: Number(i.price) || 0,
      qty: Number(i.qty) || 1,
    }));
    const orderTotal = typeof body.total === "number" ? body.total : orderItems.reduce((s, i) => s + (i.price || 0) * (i.qty || 1), 0);
    const uniqueSupplierIds = [...new Set(orderItems.map((i) => i.supplierId).filter(Boolean))];
    const supplierResponses = uniqueSupplierIds.map((sid) => ({ supplierId: sid, status: "pending" }));
    const order = await Order.create({
      userId: req.user._id,
      items: orderItems,
      total: orderTotal,
      paymentMethod: body.paymentMethod || "card",
      address: body.address || "",
      receiverName: body.receiverName || null,
      receiverPhone: body.receiverPhone || null,
      supplierResponses,
    });
    const out = order.toObject();
    res.status(201).json({ id: out._id.toString(), items: out.items, total: out.total, status: out.status, date: out.createdAt, address: out.address });
    console.log("Order created:", out._id.toString());
  } catch (err) {
    console.error("Order error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

router.patch("/:id/cancel", async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, userId: req.user._id });
    if (!order) return res.status(404).json({ error: "Order not found" });
    if (order.status !== "in_progress") return res.status(400).json({ error: "Cannot cancel" });
    order.status = "cancelled";
    await order.save();
    res.json({ id: order._id.toString(), status: order.status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
