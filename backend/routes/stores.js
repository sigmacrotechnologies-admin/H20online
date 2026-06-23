const express = require("express");
const mongoose = require("mongoose");
const Store = require("../models/Store");
const Supplier = require("../models/Supplier");
const { auth } = require("../middleware/auth");

const router = express.Router();
router.use(auth);

function parseCoord(v) {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function mapStore(s, supplierName) {
  return {
    id: s._id.toString(),
    supplierId: s.supplierId?.toString?.() || String(s.supplierId),
    supplierName: supplierName || "",
    name: s.name || "",
    storeType: s.storeType || "store",
    address: s.address || "",
    locality: s.locality || "",
    city: s.city || "",
    latitude: s.latitude,
    longitude: s.longitude,
    status: s.status || "pending",
    rejectionReason: s.rejectionReason || "",
    createdAt: s.createdAt,
    approvedAt: s.approvedAt || null,
  };
}

async function getSupplierForUser(userId) {
  return Supplier.findOne({ userId }).lean();
}

router.get("/", async (req, res) => {
  try {
    const supplier = await getSupplierForUser(req.user._id);
    if (!supplier) return res.status(403).json({ error: "Supplier profile required" });
    const list = await Store.find({ supplierId: supplier._id }).sort({ createdAt: -1 }).lean();
    res.json(list.map((s) => mapStore(s, supplier.name)));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/approved", async (req, res) => {
  try {
    const supplier = await getSupplierForUser(req.user._id);
    if (!supplier) return res.status(403).json({ error: "Supplier profile required" });
    const list = await Store.find({ supplierId: supplier._id, status: "approved" }).sort({ name: 1 }).lean();
    res.json(list.map((s) => mapStore(s, supplier.name)));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const supplier = await getSupplierForUser(req.user._id);
    if (!supplier) return res.status(403).json({ error: "Supplier profile required" });

    const { name, storeType, address, locality, city, latitude, longitude } = req.body || {};
    const lat = parseCoord(latitude);
    const lng = parseCoord(longitude);
    if (!String(name || "").trim()) return res.status(400).json({ error: "Store name is required" });
    if (lat == null || lng == null) {
      return res.status(400).json({ error: "Map location (latitude & longitude) is required" });
    }

    const type = storeType === "warehouse" ? "warehouse" : "store";
    const store = await Store.create({
      supplierId: supplier._id,
      name: String(name).trim(),
      storeType: type,
      address: String(address || "").trim(),
      locality: String(locality || "").trim(),
      city: String(city || "").trim(),
      latitude: lat,
      longitude: lng,
      status: "pending",
    });
    res.status(201).json(mapStore(store.toObject(), supplier.name));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const supplier = await getSupplierForUser(req.user._id);
    if (!supplier) return res.status(403).json({ error: "Supplier profile required" });
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ error: "Invalid store id" });

    const store = await Store.findOne({ _id: id, supplierId: supplier._id });
    if (!store) return res.status(404).json({ error: "Store not found" });
    if (store.status === "rejected") {
      return res.status(400).json({ error: "Rejected stores cannot be edited. Submit a new store request." });
    }

    const { name, storeType, address, locality, city, latitude, longitude } = req.body || {};
    if (name !== undefined && String(name).trim()) store.name = String(name).trim();
    if (storeType !== undefined) store.storeType = storeType === "warehouse" ? "warehouse" : "store";
    if (address !== undefined) store.address = String(address || "").trim();
    if (locality !== undefined) store.locality = String(locality || "").trim();
    if (city !== undefined) store.city = String(city || "").trim();
    if (latitude !== undefined) {
      const lat = parseCoord(latitude);
      if (lat == null) return res.status(400).json({ error: "Invalid latitude" });
      store.latitude = lat;
    }
    if (longitude !== undefined) {
      const lng = parseCoord(longitude);
      if (lng == null) return res.status(400).json({ error: "Invalid longitude" });
      store.longitude = lng;
    }
    if (store.status === "approved") {
      // edits to approved stores go back for review
      store.status = "pending";
      store.approvedAt = undefined;
      store.approvedBy = undefined;
    }

    await store.save();
    res.json(mapStore(store.toObject(), supplier.name));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
