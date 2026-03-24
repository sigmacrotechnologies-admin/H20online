const express = require("express");
const mongoose = require("mongoose");
const SavedAddress = require("../models/SavedAddress");
const { auth } = require("../middleware/auth");

const router = express.Router();
router.use(auth);

function toObjectId(v) {
  if (v == null || v === "") return null;
  if (typeof v === "string" && mongoose.Types.ObjectId.isValid(v) && v.length === 24) return v;
  return null;
}

router.get("/", async (req, res) => {
  try {
    const list = await SavedAddress.find({ userId: req.user._id }).sort({ isDefault: -1, createdAt: -1 }).lean();
    res.json(list.map((a) => ({
      id: a._id.toString(),
      houseNumber: a.houseNumber || "",
      locality: a.locality || "",
      city: a.city || "",
      state: a.state || "",
      pinCode: a.pinCode || "",
      phoneNumber: a.phoneNumber || "",
      fullAddress: a.fullAddress || "",
      isDefault: !!a.isDefault,
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const { houseNumber, locality, city, state, pinCode, phoneNumber, isDefault } = req.body;
    const phone = phoneNumber && String(phoneNumber).trim() ? String(phoneNumber).trim() : "";
    if (!phone) return res.status(400).json({ error: "Phone number is required" });
    const doc = {
      userId: req.user._id,
      houseNumber: houseNumber && String(houseNumber).trim() ? String(houseNumber).trim() : "",
      locality: locality && String(locality).trim() ? String(locality).trim() : "",
      city: city && String(city).trim() ? String(city).trim() : "",
      state: state && String(state).trim() ? String(state).trim() : "",
      pinCode: pinCode && String(pinCode).trim() ? String(pinCode).trim() : "",
      phoneNumber: phone,
    };
    const parts = [doc.houseNumber, doc.locality, doc.city, doc.state, doc.pinCode].filter(Boolean);
    doc.fullAddress = parts.join(", ");
    if (isDefault) {
      await SavedAddress.updateMany({ userId: req.user._id }, { isDefault: false });
      doc.isDefault = true;
    } else {
      doc.isDefault = false;
    }
    const saved = await SavedAddress.create(doc);
    const a = saved.toObject();
    res.status(201).json({
      id: a._id.toString(),
      houseNumber: a.houseNumber || "",
      locality: a.locality || "",
      city: a.city || "",
      state: a.state || "",
      pinCode: a.pinCode || "",
      phoneNumber: a.phoneNumber || "",
      fullAddress: a.fullAddress || "",
      isDefault: !!a.isDefault,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const id = toObjectId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid address id" });
    const addr = await SavedAddress.findOne({ _id: id, userId: req.user._id });
    if (!addr) return res.status(404).json({ error: "Address not found" });
    const { houseNumber, locality, city, state, pinCode, phoneNumber, isDefault } = req.body;
    if (houseNumber !== undefined) addr.houseNumber = houseNumber && String(houseNumber).trim() ? String(houseNumber).trim() : "";
    if (locality !== undefined) addr.locality = locality && String(locality).trim() ? String(locality).trim() : "";
    if (city !== undefined) addr.city = city && String(city).trim() ? String(city).trim() : "";
    if (state !== undefined) addr.state = state && String(state).trim() ? String(state).trim() : "";
    if (pinCode !== undefined) addr.pinCode = pinCode && String(pinCode).trim() ? String(pinCode).trim() : "";
    if (phoneNumber !== undefined) addr.phoneNumber = phoneNumber && String(phoneNumber).trim() ? String(phoneNumber).trim() : "";
    if (!addr.phoneNumber || !String(addr.phoneNumber).trim()) return res.status(400).json({ error: "Phone number is required" });
    if (isDefault) {
      await SavedAddress.updateMany({ userId: req.user._id }, { isDefault: false });
      addr.isDefault = true;
    }
    const parts = [addr.houseNumber, addr.locality, addr.city, addr.state, addr.pinCode].filter(Boolean);
    addr.fullAddress = parts.join(", ");
    await addr.save();
    const a = addr.toObject();
    res.json({
      id: a._id.toString(),
      houseNumber: a.houseNumber || "",
      locality: a.locality || "",
      city: a.city || "",
      state: a.state || "",
      pinCode: a.pinCode || "",
      phoneNumber: a.phoneNumber || "",
      fullAddress: a.fullAddress || "",
      isDefault: !!a.isDefault,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = toObjectId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid address id" });
    const addr = await SavedAddress.findOneAndDelete({ _id: id, userId: req.user._id });
    if (!addr) return res.status(404).json({ error: "Address not found" });
    res.json({ deleted: true, id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
