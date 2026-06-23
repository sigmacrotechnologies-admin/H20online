const express = require("express");
const Product = require("../models/Product");
const Society = require("../models/Society");
const User = require("../models/User");
const WaterIntake = require("../models/WaterIntake");
const { auth } = require("../middleware/auth");

const router = express.Router();
const DEFAULT_PRODUCT_IMAGE = "https://placehold.co/400x300?text=H2O+Product";

async function getSocietyConsumptionStats(societyId) {
  const members = await User.find({ societyId, role: "customer" }).select("_id").lean();
  const memberIds = members.map((m) => m._id);
  if (memberIds.length === 0) {
    return { totalLiters: 0, week: [] };
  }
  const week = [];
  let totalMl = 0;
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const docs = await WaterIntake.find({ userId: { $in: memberIds }, date: dateStr }).lean();
    let dayMl = 0;
    for (const doc of docs) {
      for (const entry of doc.entries || []) {
        dayMl += Number(entry.volumeMl || 0);
      }
    }
    totalMl += dayMl;
    week.push({
      date: dateStr,
      totalLiters: Math.round((dayMl / 1000) * 10) / 10,
    });
  }
  return {
    totalLiters: Math.round((totalMl / 1000) * 10) / 10,
    week,
  };
}

router.use(auth);

router.get("/list", async (req, res) => {
  try {
    const list = await Society.find({ onboardingStatus: "approved" })
      .select("societyName city registrationNo")
      .sort({ societyName: 1 })
      .lean();
    res.json(
      list.map((s) => ({
        id: s._id.toString(),
        societyName: s.societyName,
        city: s.city || "",
        registrationNo: s.registrationNo,
      }))
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/me", async (req, res) => {
  try {
    if (req.user.role !== "society") return res.status(403).json({ error: "Society account required" });
    const society = await Society.findOne({ userId: req.user._id }).lean();
    if (!society) return res.status(404).json({ error: "Society profile not found" });
    const memberCount = await User.countDocuments({ societyId: society._id, role: "customer" });
    const consumption = await getSocietyConsumptionStats(society._id);
    res.json({
      id: society._id.toString(),
      societyName: society.societyName,
      registrationNo: society.registrationNo,
      gstNumber: society.gstNumber || "",
      pocName: society.pocName,
      pocEmail: society.pocEmail,
      pocPhone: society.pocPhone,
      address: society.address || "",
      city: society.city || "",
      onboardingStatus: society.onboardingStatus || "approved",
      memberCount,
      waterConsumptionLiters: consumption.totalLiters,
      consumptionWeek: consumption.week,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/products", async (req, res) => {
  try {
    const { waterQuality } = req.query;
    const filter = { audience: "society" };
    if (waterQuality && String(waterQuality).trim()) {
      filter.waterQuality = String(waterQuality).trim();
    }
    const products = await Product.find(filter).populate("supplierId", "name").sort({ createdAt: -1 }).lean();
    const list = products.map((p) => {
      const sid = p.supplierId;
      const supplierIdStr = sid != null ? (sid._id ? String(sid._id) : String(sid)) : "";
      const supplierName = sid && typeof sid === "object" && sid.name ? String(sid.name) : "";
      return {
        id: p._id.toString(),
        productName: p.productName || "",
        productType: p.productType || "tanker",
        imageUrl: p.imageUrl || DEFAULT_PRODUCT_IMAGE,
        supplierName,
        supplierId: supplierIdStr,
        price: typeof p.price === "number" ? p.price : Number(p.price) || 0,
        priceUnit: p.priceUnit || "",
        delivery: p.delivery || "",
        inStock: p.inStock !== false,
        stockQty: Number(p.stockQty) || 0,
        capacityL: Number(p.capacityL) || 5000,
        categories: Array.isArray(p.categories) ? p.categories : [],
        badge: p.badge || "",
        audience: p.audience || "society",
        waterQuality: p.waterQuality || "",
        rating: Number(p.rating) || 4,
        reviewCount: p.reviewCount != null ? String(p.reviewCount) : "0",
      };
    });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
