const express = require("express");
const WaterIntake = require("../models/WaterIntake");
const { auth } = require("../middleware/auth");

const router = express.Router();
router.use(auth);

const MAX_DAYS_BACK = 7;
const GOAL_LITERS = 2.4;
const MAX_GRAPH_LITERS = 5;

function dateString(d) {
  const x = d instanceof Date ? d : new Date(d);
  return x.toISOString().slice(0, 10);
}

function isWithinLast7Days(dateStr) {
  const today = dateString(new Date());
  const d = new Date(dateStr + "T12:00:00Z");
  const t = new Date(today + "T12:00:00Z");
  const diffDays = Math.floor((t - d) / (24 * 60 * 60 * 1000));
  return diffDays >= 0 && diffDays <= MAX_DAYS_BACK;
}

router.get("/", async (req, res) => {
  try {
    const { date } = req.query;
    const userId = req.user._id;
    const d = date || dateString(new Date());
    if (!isWithinLast7Days(d)) {
      return res.status(400).json({ error: "Date must be within last 7 days or today" });
    }
    let doc = await WaterIntake.findOne({ userId, date: d });
    if (!doc) doc = { userId, date: d, entries: [] };
    res.json({ date: doc.date, entries: doc.entries || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const { date, type, quantity, volumeMl } = req.body;
    const userId = req.user._id;
    const d = date || dateString(new Date());
    if (!isWithinLast7Days(d)) {
      return res.status(400).json({ error: "Date must be within last 7 days or today" });
    }
    if (!["glass", "jar", "bottle", "total"].includes(type)) {
      return res.status(400).json({ error: "Invalid type" });
    }
    const vol = Math.round(Number(volumeMl) || 0);
    if (vol <= 0) return res.status(400).json({ error: "Volume must be positive" });
    const qty = Math.max(1, Math.round(Number(quantity) || 1));

    let doc = await WaterIntake.findOne({ userId, date: d });
    if (!doc) doc = await WaterIntake.create({ userId, date: d, entries: [] });
    doc.entries.push({ type, quantity: qty, volumeMl: vol });
    await doc.save();
    console.log("[water-intake] Saved:", { userId: userId.toString(), date: d, type, quantity: qty, volumeMl: vol });
    res.json({ date: doc.date, entries: doc.entries });
  } catch (err) {
    console.error("[water-intake] Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get("/summary", async (req, res) => {
  try {
    const { from, to } = req.query;
    const userId = req.user._id;
    const today = dateString(new Date());
    const toDate = to || today;
    const fromDate = from || (() => {
      const d = new Date(today + "T12:00:00Z");
      d.setDate(d.getDate() - 6);
      return dateString(d);
    })();
    const docs = await WaterIntake.find({
      userId,
      date: { $gte: fromDate, $lte: toDate },
    }).lean();
    const byDate = {};
    for (let d = new Date(fromDate + "T12:00:00Z"); d <= new Date(toDate + "T12:00:00Z"); d.setDate(d.getDate() + 1)) {
      const key = dateString(d);
      byDate[key] = 0;
    }
    docs.forEach((doc) => {
      const total = (doc.entries || []).reduce((s, e) => s + (e.volumeMl || 0), 0);
      byDate[doc.date] = (byDate[doc.date] || 0) + total;
    });
    const days = Object.keys(byDate).sort();
    const summary = days.map((date) => ({
      date,
      totalMl: byDate[date],
      totalLiters: Math.round((byDate[date] / 1000) * 10) / 10,
    }));
    const todayTotal = (byDate[today] || 0) / 1000;
    const goalLiters = GOAL_LITERS;
    const pct = goalLiters > 0 ? Math.min(100, Math.round((todayTotal / goalLiters) * 100)) : 0;
    res.json({
      summary,
      today: { totalLiters: Math.round(todayTotal * 10) / 10, goalLiters, percentage: pct },
      maxGraphLiters: MAX_GRAPH_LITERS,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
