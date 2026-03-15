const express = require("express");
const Subscription = require("../models/Subscription");

const router = express.Router();
const { auth } = require("../middleware/auth");
router.use(auth);

router.get("/", async (req, res) => {
  try {
    const list = await Subscription.find({ userId: req.user._id, status: "active" })
      .sort({ createdAt: -1 })
      .lean();
    res.json(list.map((s) => ({
      id: s._id.toString(),
      planName: s.planName,
      productLabel: s.productLabel,
      productKey: s.productKey,
      frequency: s.frequency,
      unitPrice: s.unitPrice,
      quantity: s.quantity,
      totalPrice: s.totalPrice,
      selectedDates: s.selectedDates,
      createdAt: s.createdAt,
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const { planId, planName, productKey, productLabel, frequency, unitPrice, quantity, selectedDates } = req.body;
    if (!planId || !planName || !productKey || !productLabel || !frequency || !unitPrice || !Array.isArray(selectedDates)) {
      return res.status(400).json({ error: "planId, planName, productKey, productLabel, frequency, unitPrice, selectedDates required" });
    }
    const qty = Math.max(1, parseInt(quantity, 10) || 1);
    const totalPrice = unitPrice * qty * (selectedDates.length || 1);
    const sub = await Subscription.create({
      userId: req.user._id,
      planId,
      planName,
      productKey,
      productLabel,
      frequency,
      unitPrice,
      quantity: qty,
      selectedDates,
      totalPrice,
      status: "active",
    });
    const s = sub.toObject();
    res.status(201).json({
      id: s._id.toString(),
      planName: s.planName,
      productLabel: s.productLabel,
      frequency: s.frequency,
      totalPrice: s.totalPrice,
      selectedDates: s.selectedDates,
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
