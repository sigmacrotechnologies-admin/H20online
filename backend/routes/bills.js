const express = require("express");
const mongoose = require("mongoose");
const Subscription = require("../models/Subscription");
const SubscriptionBill = require("../models/SubscriptionBill");
const { auth } = require("../middleware/auth");
const { getOrCreateWallet, getOrCreatePlatformWallet } = require("./wallet");

const router = express.Router();
router.use(auth);

function toObjectId(v) {
  if (v == null || v === "") return null;
  if (typeof v === "string" && mongoose.Types.ObjectId.isValid(v) && v.length === 24) return v;
  return null;
}

function getMonthKey(date) {
  const d = date || new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function getDueDateForMonth(year, month) {
  return new Date(year, month, 5, 23, 59, 59);
}

async function ensureBillsForMonth(userId, year, month) {
  const period = `${year}-${String(month).padStart(2, "0")}`;
  const subs = await Subscription.find({ userId, status: "active" }).lean();
  for (const sub of subs) {
    const exists = await SubscriptionBill.findOne({ subscriptionId: sub._id, period });
    if (exists) continue;
    const dueDate = getDueDateForMonth(year, month);
    const amount = sub.totalPrice || 0;
    if (amount <= 0) continue;
    await SubscriptionBill.create({
      subscriptionId: sub._id,
      userId,
      amount,
      period,
      dueDate,
      status: dueDate < new Date() ? "overdue" : "pending",
    });
  }
}

router.get("/", async (req, res) => {
  try {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    await ensureBillsForMonth(req.user._id, currentYear, currentMonth);
    const list = await SubscriptionBill.find({ userId: req.user._id })
      .populate("subscriptionId", "subscriptionId planName productLabel frequency")
      .sort({ period: -1 })
      .limit(24)
      .lean();
    const bills = list.map((b) => {
      const sub = b.subscriptionId;
      return {
        id: b._id.toString(),
        subscriptionId: b.subscriptionId ? (typeof b.subscriptionId === "object" ? b.subscriptionId._id.toString() : b.subscriptionId.toString()) : null,
        subscriptionLabel: sub && typeof sub === "object" ? `${sub.planName || ""} – ${sub.productLabel || ""}` : "",
        amount: b.amount,
        period: b.period,
        dueDate: b.dueDate,
        status: b.status,
        paidAt: b.paidAt,
      };
    });
    res.json(bills);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/:id/pay", async (req, res) => {
  try {
    const id = toObjectId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid bill id" });
    const bill = await SubscriptionBill.findOne({ _id: id, userId: req.user._id });
    if (!bill) return res.status(404).json({ error: "Bill not found" });
    if (bill.status === "paid") return res.status(400).json({ error: "Bill already paid" });
    const amount = bill.amount;
    const userWallet = await getOrCreateWallet(req.user._id);
    if (userWallet.balance < amount) return res.status(400).json({ error: "Insufficient wallet balance" });
    const platformWallet = await getOrCreatePlatformWallet();
    userWallet.balance -= amount;
    userWallet.transactions = userWallet.transactions || [];
    userWallet.transactions.push({ amount, type: "debit", ref: `bill_${bill._id}` });
    await userWallet.save();
    platformWallet.balance += amount;
    platformWallet.transactions = platformWallet.transactions || [];
    platformWallet.transactions.push({ amount, type: "credit", ref: `bill_${bill._id}` });
    await platformWallet.save();
    bill.status = "paid";
    bill.paidAt = new Date();
    await bill.save();
    res.json({ id: bill._id.toString(), status: "paid", balance: userWallet.balance });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
