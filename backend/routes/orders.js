const express = require("express");
const mongoose = require("mongoose");
const Order = require("../models/Order");
const { auth } = require("../middleware/auth");
const { getOrCreateWallet, getOrCreatePlatformWallet } = require("./wallet");

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
    for (const o of orders) {
      if (!o.orderId) {
        const orderId = await Order.generateUniqueOrderId();
        await Order.updateOne({ _id: o._id }, { $set: { orderId } });
        o.orderId = orderId;
      }
    }
    const list = orders.map((o) => ({
      id: o._id.toString(),
      orderId: o.orderId || o._id.toString(),
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
    let o = await Order.findOne({ _id: req.params.id, userId: req.user._id }).lean();
    if (!o) return res.status(404).json({ error: "Order not found" });
    if (!o.orderId) {
      const orderId = await Order.generateUniqueOrderId();
      await Order.updateOne({ _id: o._id }, { $set: { orderId } });
      o = { ...o, orderId };
    }
    res.json({
      id: o._id.toString(),
      orderId: o.orderId,
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
    const paymentMethod = body.paymentMethod || "card";
    let didWalletDebit = false;
    if (paymentMethod === "wallet") {
      const userWallet = await getOrCreateWallet(req.user._id);
      if (userWallet.balance < orderTotal) return res.status(400).json({ error: "Insufficient wallet balance" });
      const platformWallet = await getOrCreatePlatformWallet();
      userWallet.balance -= orderTotal;
      userWallet.transactions = userWallet.transactions || [];
      userWallet.transactions.push({ amount: orderTotal, type: "debit", ref: "order" });
      await userWallet.save();
      platformWallet.balance += orderTotal;
      platformWallet.transactions = platformWallet.transactions || [];
      platformWallet.transactions.push({ amount: orderTotal, type: "credit", ref: "order" });
      await platformWallet.save();
      didWalletDebit = true;
    }
    const uniqueSupplierIds = [...new Set(orderItems.map((i) => i.supplierId).filter(Boolean))];
    const supplierResponses = uniqueSupplierIds.map((sid) => ({ supplierId: sid, status: "pending" }));
    const scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null;
    let order;
    try {
      order = await Order.create({
        userId: req.user._id,
        items: orderItems,
        total: orderTotal,
        paymentMethod,
        address: body.address || "",
        receiverName: body.receiverName || null,
        receiverPhone: body.receiverPhone || null,
        scheduledAt,
        supplierResponses,
      });
    } catch (createErr) {
      if (didWalletDebit) {
        const userWallet = await getOrCreateWallet(req.user._id);
        const platformWallet = await getOrCreatePlatformWallet();
        userWallet.balance += orderTotal;
        userWallet.transactions.push({ amount: orderTotal, type: "credit", ref: "order_refund" });
        await userWallet.save();
        platformWallet.balance -= orderTotal;
        platformWallet.transactions.push({ amount: orderTotal, type: "debit", ref: "order_refund" });
        await platformWallet.save();
      }
      throw createErr;
    }
    const out = order.toObject();
    res.status(201).json({
      id: out._id.toString(),
      orderId: out.orderId || out._id.toString(),
      items: out.items,
      total: out.total,
      status: out.status,
      date: out.createdAt,
      address: out.address,
    });
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
