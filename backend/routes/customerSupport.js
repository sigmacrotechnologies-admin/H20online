const express = require("express");
const CustomerSupportTicket = require("../models/CustomerSupportTicket");
const { auth } = require("../middleware/auth");

const router = express.Router();
router.use(auth);

const VALID_CATEGORIES = ["order", "delivery", "payment", "account", "product", "other"];

function serializeTicket(doc) {
  const t = doc.toObject ? doc.toObject() : doc;
  return {
    id: t._id.toString(),
    ticketId: t.ticketId,
    category: t.category,
    subject: t.subject,
    description: t.description,
    status: t.status,
    messages: (t.messages || []).map((m) => ({
      from: m.from,
      text: m.text,
      createdAt: m.createdAt,
    })),
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}

router.get("/tickets", async (req, res) => {
  try {
    const tickets = await CustomerSupportTicket.find({ userId: req.user._id })
      .sort({ updatedAt: -1 })
      .lean();
    res.json(
      tickets.map((t) => ({
        id: t._id.toString(),
        ticketId: t.ticketId,
        category: t.category,
        subject: t.subject,
        status: t.status,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
        messageCount: (t.messages || []).length,
      }))
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/tickets", async (req, res) => {
  try {
    const { category, subject, description } = req.body;
    const cat = VALID_CATEGORIES.includes(category) ? category : "other";
    const subj = String(subject || "").trim();
    const desc = String(description || "").trim();
    if (!subj) return res.status(400).json({ error: "Subject is required" });
    if (!desc) return res.status(400).json({ error: "Description is required" });
    if (subj.length > 200) return res.status(400).json({ error: "Subject too long" });
    if (desc.length > 2000) return res.status(400).json({ error: "Description too long" });

    const ticket = await CustomerSupportTicket.create({
      userId: req.user._id,
      category: cat,
      subject: subj,
      description: desc,
      status: "open",
      messages: [{ from: "customer", text: desc }],
    });
    res.status(201).json(serializeTicket(ticket));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/tickets/:id", async (req, res) => {
  try {
    const ticket = await CustomerSupportTicket.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!ticket) return res.status(404).json({ error: "Ticket not found" });
    res.json(serializeTicket(ticket));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/tickets/:id/reply", async (req, res) => {
  try {
    const { text } = req.body;
    const trimmed = String(text || "").trim();
    if (!trimmed) return res.status(400).json({ error: "Message is required" });
    if (trimmed.length > 2000) return res.status(400).json({ error: "Message too long" });

    const ticket = await CustomerSupportTicket.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!ticket) return res.status(404).json({ error: "Ticket not found" });
    if (ticket.status === "closed") {
      return res.status(400).json({ error: "This ticket is closed" });
    }

    ticket.messages.push({ from: "customer", text: trimmed });
    if (ticket.status === "resolved") ticket.status = "open";
    await ticket.save();

    const m = ticket.messages[ticket.messages.length - 1];
    res.status(201).json({ from: m.from, text: m.text, createdAt: m.createdAt });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
