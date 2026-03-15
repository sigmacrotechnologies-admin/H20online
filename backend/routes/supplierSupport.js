const express = require("express");
const Supplier = require("../models/Supplier");
const SupplierSupportThread = require("../models/SupplierSupportThread");
const { auth } = require("../middleware/auth");

const router = express.Router();
router.use(auth);

router.get("/thread", async (req, res) => {
  try {
    const supplier = await Supplier.findOne({ userId: req.user._id });
    if (!supplier) return res.status(403).json({ error: "Supplier profile required" });
    let thread = await SupplierSupportThread.findOne({ supplierId: supplier._id }).lean();
    if (!thread) {
      thread = await SupplierSupportThread.create({ supplierId: supplier._id, messages: [] });
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
    const supplier = await Supplier.findOne({ userId: req.user._id });
    if (!supplier) return res.status(403).json({ error: "Supplier profile required" });
    const { text } = req.body;
    if (!text || typeof text !== "string" || !text.trim()) return res.status(400).json({ error: "Message text required" });
    let thread = await SupplierSupportThread.findOne({ supplierId: supplier._id });
    if (!thread) thread = await SupplierSupportThread.create({ supplierId: supplier._id, messages: [] });
    thread.messages.push({ from: "supplier", text: text.trim() });
    await thread.save();
    const m = thread.messages[thread.messages.length - 1];
    res.status(201).json({ from: m.from, text: m.text, createdAt: m.createdAt });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
