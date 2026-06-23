const express = require("express");
const Supplier = require("../models/Supplier");
const { auth } = require("../middleware/auth");

const router = express.Router();
router.use(auth);

router.get("/me", async (req, res) => {
  try {
    const supplier = await Supplier.findOne({ userId: req.user._id }).lean();
    if (!supplier) return res.status(404).json({ error: "Supplier profile not found" });
    const out = {
      ...supplier,
      id: supplier._id.toString(),
      _id: supplier._id.toString(),
      latitude: supplier.latitude ?? null,
      longitude: supplier.longitude ?? null,
    };
    res.json(out);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function parseCoord(v) {
  if (v == null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

router.patch("/me", async (req, res) => {
  try {
    const supplier = await Supplier.findOne({ userId: req.user._id });
    if (!supplier) return res.status(404).json({ error: "Supplier profile not found" });

    const {
      address,
      location,
      city,
      latitude,
      longitude,
    } = req.body || {};

    if (address !== undefined) supplier.address = String(address || "").trim();
    if (location !== undefined) supplier.location = String(location || "").trim();
    if (city !== undefined && String(city).trim()) supplier.city = String(city).trim();
    if (latitude !== undefined) {
      const lat = parseCoord(latitude);
      supplier.latitude = lat != null ? lat : undefined;
    }
    if (longitude !== undefined) {
      const lng = parseCoord(longitude);
      supplier.longitude = lng != null ? lng : undefined;
    }

    await supplier.save();
    const s = supplier.toObject();
    res.json({
      ...s,
      id: s._id.toString(),
      _id: s._id.toString(),
      latitude: s.latitude ?? null,
      longitude: s.longitude ?? null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
