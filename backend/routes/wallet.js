const express = require("express");
const mongoose = require("mongoose");
const Wallet = require("../models/Wallet");
const { auth } = require("../middleware/auth");

const router = express.Router();
router.use(auth);

function toObjectId(v) {
  if (!v) return null;
  if (v instanceof mongoose.Types.ObjectId) return v;
  if (typeof v === "string" && mongoose.Types.ObjectId.isValid(v) && String(v).length === 24) return new mongoose.Types.ObjectId(v);
  return null;
}

async function getOrCreateWallet(userId) {
  const uid = toObjectId(userId);
  if (!uid) throw new Error("Invalid userId");

  let w = await Wallet.findOne({ userId: uid }).exec();
  if (w) return w;

  try {
    w = await Wallet.create({ userId: uid, ownerType: "user", balance: 0, transactions: [] });
    return w;
  } catch (err) {
    if (err.code === 11000) {
      w = await Wallet.findOne({ userId: uid }).exec();
      if (w) return w;
    }
    throw err;
  }
}

async function getOrCreatePlatformWallet() {
  const w = await Wallet.findOneAndUpdate(
    { ownerType: "platform" },
    { $setOnInsert: { userId: null, balance: 0, transactions: [] } },
    { upsert: true, new: true }
  );
  return w;
}

router.get("/", async (req, res) => {
  try {
    const w = await getOrCreateWallet(req.user._id);
    const transactions = (w.transactions || []).slice(-50).reverse();
    res.json({
      balance: w.balance,
      transactions: transactions.map((t) => ({ amount: t.amount, type: t.type, ref: t.ref || "", createdAt: t.createdAt })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/credit", async (req, res) => {
  try {
    const amount = Number(req.body.amount);
    if (!amount || amount <= 0) return res.status(400).json({ error: "Invalid amount" });
    const w = await getOrCreateWallet(req.user._id);
    w.balance += amount;
    w.transactions = w.transactions || [];
    w.transactions.push({ amount, type: "credit", ref: "add" });
    await w.save();
    res.json({ balance: w.balance });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/debit", async (req, res) => {
  try {
    const amount = Number(req.body.amount);
    const ref = req.body.ref ? String(req.body.ref) : "withdraw";
    if (!amount || amount <= 0) return res.status(400).json({ error: "Invalid amount" });
    const w = await getOrCreateWallet(req.user._id);
    if (w.balance < amount) return res.status(400).json({ error: "Insufficient balance" });
    w.balance -= amount;
    w.transactions = w.transactions || [];
    w.transactions.push({ amount, type: "debit", ref });
    await w.save();
    res.json({ balance: w.balance });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
module.exports.getOrCreateWallet = getOrCreateWallet;
module.exports.getOrCreatePlatformWallet = getOrCreatePlatformWallet;
