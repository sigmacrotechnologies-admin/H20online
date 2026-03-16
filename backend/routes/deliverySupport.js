const express = require("express");
const DeliveryPartner = require("../models/DeliveryPartner");
const DeliveryPartnerSupportThread = require("../models/DeliveryPartnerSupportThread");
const { auth } = require("../middleware/auth");

const router = express.Router();
router.use(auth);

router.get("/thread", async (req, res) => {
  try {
    const dp = await DeliveryPartner.findOne({ userId: req.user._id });
    if (!dp) return res.status(403).json({ error: "Delivery partner profile required" });
    let thread = await DeliveryPartnerSupportThread.findOne({ deliveryPartnerId: dp._id }).lean();
    if (!thread) {
      thread = await DeliveryPartnerSupportThread.create({ deliveryPartnerId: dp._id, messages: [] });
      thread = thread.toObject();
    }
    res.json({
      id: thread._id.toString(),
      messages: (thread.messages || []).map((m) => ({
        from: m.from,
        text: m.text,
        createdAt: m.createdAt,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/message", async (req, res) => {
  try {
    const dp = await DeliveryPartner.findOne({ userId: req.user._id });
    if (!dp) return res.status(403).json({ error: "Delivery partner profile required" });
    const { text } = req.body;
    if (!text || typeof text !== "string" || !text.trim()) return res.status(400).json({ error: "Message text required" });
    let thread = await DeliveryPartnerSupportThread.findOne({ deliveryPartnerId: dp._id });
    if (!thread) thread = await DeliveryPartnerSupportThread.create({ deliveryPartnerId: dp._id, messages: [] });
    thread.messages.push({ from: "delivery_partner", text: text.trim() });
    await thread.save();
    const m = thread.messages[thread.messages.length - 1];
    res.status(201).json({ from: m.from, text: m.text, createdAt: m.createdAt });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
