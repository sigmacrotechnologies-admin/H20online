const express = require("express");
const Wallet = require("../models/Wallet");
const { auth } = require("../middleware/auth");

const router = express.Router();
router.use(auth);

async function getOrCreateWallet(userId) {
  let w = await Wallet.findOne({ userId });
  if (!w) w = await Wallet.create({ userId, balance: 500 });
  return w;
}

router.get("/", async (req, res) => {
  try {
    const w = await getOrCreateWallet(req.user._id);
    res.json({ balance: w.balance });
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
    if (!amount || amount <= 0) return res.status(400).json({ error: "Invalid amount" });
    const w = await getOrCreateWallet(req.user._id);
    if (w.balance < amount) return res.status(400).json({ error: "Insufficient balance" });
    w.balance -= amount;
    w.transactions = w.transactions || [];
    w.transactions.push({ amount, type: "debit", ref: "withdraw" });
    await w.save();
    res.json({ balance: w.balance });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
