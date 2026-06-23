const express = require("express");
const mongoose = require("mongoose");
const Store = require("../models/Store");
const Supplier = require("../models/Supplier");
const { auth } = require("../middleware/auth");
const { travelInfo, travelInfoBatch } = require("../services/googleMaps");

const router = express.Router();
router.use(auth);

function parseCoord(v) {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

router.post("/travel", async (req, res) => {
  try {
    const fromLat = parseCoord(req.body.fromLat);
    const fromLng = parseCoord(req.body.fromLng);
    if (fromLat == null || fromLng == null) {
      return res.status(400).json({ error: "fromLat and fromLng are required" });
    }

    const rawDestinations = Array.isArray(req.body.destinations) ? req.body.destinations : [];
    if (rawDestinations.length > 0) {
      const destinations = rawDestinations
        .filter((d) => d && d.id && Number.isFinite(Number(d.lat)) && Number.isFinite(Number(d.lng)))
        .map((d) => ({
          id: String(d.id),
          lat: Number(d.lat),
          lng: Number(d.lng),
          name: d.name || "",
        }));
      const results = await travelInfoBatch(fromLat, fromLng, destinations);
      return res.json({ results });
    }

    const storeIds = Array.isArray(req.body.storeIds)
      ? req.body.storeIds.filter((id) => mongoose.Types.ObjectId.isValid(id))
      : [];

    if (storeIds.length > 0) {
      const stores = await Store.find({ _id: { $in: storeIds }, status: "approved" }).lean();
      const destinations = stores
        .filter((s) => s.latitude != null && s.longitude != null)
        .map((s) => ({
          id: s._id.toString(),
          lat: s.latitude,
          lng: s.longitude,
          name: s.name || "",
        }));
      const results = await travelInfoBatch(fromLat, fromLng, destinations);
      return res.json({ results });
    }

    const supplierIds = Array.isArray(req.body.supplierIds)
      ? req.body.supplierIds.filter((id) => mongoose.Types.ObjectId.isValid(id))
      : [];

    if (supplierIds.length > 0) {
      const suppliers = await Supplier.find({ _id: { $in: supplierIds } }).lean();
      const destinations = suppliers
        .filter((s) => s.latitude != null && s.longitude != null)
        .map((s) => ({
          id: s._id.toString(),
          lat: s.latitude,
          lng: s.longitude,
          name: s.name || s.contactPerson || "",
        }));
      const results = await travelInfoBatch(fromLat, fromLng, destinations);
      return res.json({ results });
    }

    const toLat = parseCoord(req.body.toLat);
    const toLng = parseCoord(req.body.toLng);
    if (toLat == null || toLng == null) {
      return res.status(400).json({ error: "destinations, storeIds, supplierIds, or toLat/toLng required" });
    }

    const info = await travelInfo(fromLat, fromLng, toLat, toLng);
    if (!info) return res.status(404).json({ error: "Could not compute route" });
    res.json({
      ...info,
      storeLatitude: toLat,
      storeLongitude: toLng,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
