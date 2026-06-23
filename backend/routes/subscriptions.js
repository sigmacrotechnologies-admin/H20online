const express = require("express");
const mongoose = require("mongoose");
const Subscription = require("../models/Subscription");
const SavedAddress = require("../models/SavedAddress");

const router = express.Router();
const { auth } = require("../middleware/auth");
router.use(auth);

function subscriptionChannelForRole(role) {
  if (role === "society") return "society";
  if (role === "supplier") return "supplier";
  return "customer";
}

router.get("/", async (req, res) => {
  try {
    const list = await Subscription.find({ userId: req.user._id, status: { $in: ["active", "inactive"] } })
      .sort({ createdAt: -1 })
      .lean();
    res.json(list.map((s) => ({
      id: s._id.toString(),
      subscriptionId: s.subscriptionId || s._id.toString(),
      planName: s.planName,
      productLabel: s.productLabel,
      productKey: s.productKey,
      productId: s.productId,
      frequency: s.frequency,
      unitPrice: s.unitPrice,
      quantity: s.quantity,
      totalPrice: s.totalPrice,
      selectedDates: s.selectedDates,
      preferredDeliveryTime: s.preferredDeliveryTime,
      preferredTimeRangeStart: s.preferredTimeRangeStart,
      preferredTimeRangeEnd: s.preferredTimeRangeEnd,
      status: s.status,
      subscriptionChannel: s.subscriptionChannel || "customer",
      planCategory: s.planCategory || "individual",
      createdAt: s.createdAt,
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const { planId, planName, productKey, productLabel, productId, frequency, unitPrice, quantity, selectedDates, preferredDeliveryTime, preferredTimeRangeStart, preferredTimeRangeEnd, addressId, deliveryAddress, locality, pinCode, planCategory } = req.body;
    if (!planId || !planName || !productKey || !productLabel || !frequency || !unitPrice || !Array.isArray(selectedDates)) {
      return res.status(400).json({ error: "planId, planName, productKey, productLabel, frequency, unitPrice, selectedDates required" });
    }
    const qty = Math.max(1, parseInt(quantity, 10) || 1);
    const totalPrice = unitPrice * qty * (selectedDates.length || 1);
    const rangeStart = preferredTimeRangeStart && String(preferredTimeRangeStart).trim() ? String(preferredTimeRangeStart).trim() : undefined;
    const rangeEnd = preferredTimeRangeEnd && String(preferredTimeRangeEnd).trim() ? String(preferredTimeRangeEnd).trim() : undefined;
    const displayTime = rangeStart && rangeEnd ? `${rangeStart} - ${rangeEnd}` : (preferredDeliveryTime && String(preferredDeliveryTime).trim() ? String(preferredDeliveryTime).trim() : undefined);
    let subDeliveryAddress = deliveryAddress && String(deliveryAddress).trim() ? String(deliveryAddress).trim() : "";
    let subLocality = locality && String(locality).trim() ? String(locality).trim() : "";
    let subPinCode = pinCode && String(pinCode).trim() ? String(pinCode).trim() : "";
    if (addressId && mongoose.Types.ObjectId.isValid(addressId)) {
      const addr = await SavedAddress.findOne({ _id: addressId, userId: req.user._id }).lean();
      if (addr) {
        subDeliveryAddress = addr.fullAddress || "";
        subLocality = addr.locality || "";
        subPinCode = addr.pinCode || "";
      }
    }
    const channel = subscriptionChannelForRole(req.user.role);
    const category = planCategory && ["individual", "bulk", "society"].includes(planCategory)
      ? planCategory
      : channel === "society"
        ? "society"
        : "individual";
    const sub = new Subscription({
      userId: req.user._id,
      planId,
      planName,
      productKey,
      productLabel,
      productId: productId && String(productId).trim() ? String(productId).trim() : undefined,
      frequency,
      unitPrice,
      quantity: qty,
      selectedDates,
      totalPrice,
      status: "active",
      preferredDeliveryTime: displayTime,
      preferredTimeRangeStart: rangeStart,
      preferredTimeRangeEnd: rangeEnd,
      deliveryAddress: subDeliveryAddress || undefined,
      locality: subLocality || undefined,
      pinCode: subPinCode || undefined,
      subscriptionChannel: channel,
      planCategory: category,
    });
    sub.subscriptionId = await Subscription.generateUniqueSubscriptionId();
    await sub.save();
    const s = sub.toObject();
    res.status(201).json({
      id: s._id.toString(),
      subscriptionId: s.subscriptionId,
      planName: s.planName,
      productLabel: s.productLabel,
      productId: s.productId,
      frequency: s.frequency,
      totalPrice: s.totalPrice,
      selectedDates: s.selectedDates,
      preferredDeliveryTime: s.preferredDeliveryTime,
      preferredTimeRangeStart: s.preferredTimeRangeStart,
      preferredTimeRangeEnd: s.preferredTimeRangeEnd,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/:id/cancel", async (req, res) => {
  try {
    const sub = await Subscription.findOne({ _id: req.params.id, userId: req.user._id });
    if (!sub) return res.status(404).json({ error: "Subscription not found" });
    sub.status = "cancelled";
    await sub.save();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
