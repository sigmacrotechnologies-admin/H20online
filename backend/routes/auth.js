const express = require("express");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../models/User");
const Supplier = require("../models/Supplier");
const DeliveryPartner = require("../models/DeliveryPartner");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "h20-secret";

function isValidObjectId(v) {
  if (v == null || v === "") return false;
  return mongoose.Types.ObjectId.isValid(v) && String(new mongoose.Types.ObjectId(v)) === String(v);
}

function randomSixDigit() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

router.post("/register", async (req, res) => {
  try {
    const { name, email, phone, password, age, gender, activityLevel, familyMembers, planId, avatarUrl } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email and password required" });
    }
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(400).json({ error: "Email already registered" });

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      phone: phone || "",
      password,
      age: age ?? undefined,
      gender: gender ?? undefined,
      activityLevel: activityLevel ?? undefined,
      familyMembers: familyMembers ?? undefined,
      planId: isValidObjectId(planId) ? planId : undefined,
      avatarUrl: avatarUrl ?? undefined,
    });

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: "7d" });
    const u = await User.findById(user._id).select("-password");
    res.status(201).json({ user: u, token });
    console.log("User created:", u._id.toString());
  } catch (err) {
    console.error("Register error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post("/register-supplier", async (req, res) => {
  try {
    const {
      businessName,
      contactPerson,
      email,
      phone,
      password,
      address,
      location,
      city,
      businessType,
      gstNumber,
      bankAccount,
      ifscCode,
      documentIdProof,
      documentAddressProof,
      documentBusinessLicense,
    } = req.body;

    const isDeliveryAgent = businessType === "deliveryAgent";
    if (isDeliveryAgent) {
      if (!contactPerson || !email || !phone || !password || !address || !city || !businessType) {
        return res.status(400).json({ error: "Contact person, email, phone, password, address, city and partner type are required" });
      }
      const vehicleType = req.body.vehicleType;
      const vehicleNumber = (req.body.vehicleNumber || "").trim();
      const validVehicle = ["bike", "van", "bicycle", "tanker", "miniTruck"].includes(vehicleType);
      if (!vehicleType || !validVehicle) {
        return res.status(400).json({ error: "Valid vehicle type is required (bike, van, bicycle, tanker, miniTruck)" });
      }
      if (!vehicleNumber) {
        return res.status(400).json({ error: "Vehicle number is required" });
      }
    } else {
      if (!businessName || !contactPerson || !email || !phone || !password || !address || !city || !businessType) {
        return res.status(400).json({ error: "Business name, contact person, email, phone, password, address, city and business type are required" });
      }
    }
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) return res.status(400).json({ error: "Email already registered" });

    const user = await User.create({
      name: contactPerson.trim(),
      email: email.toLowerCase(),
      phone: phone.trim(),
      password,
      role: isDeliveryAgent ? "deliveryPartner" : "supplier",
    });

    const verificationCode = randomSixDigit();
    const supplierName = isDeliveryAgent ? (contactPerson || "Delivery Partner").trim() : businessName.trim();
    const supplier = await Supplier.create({
      name: supplierName,
      contactPerson: contactPerson.trim(),
      email: email.toLowerCase(),
      phone: phone.trim(),
      address: address.trim(),
      location: (location || "").trim(),
      city: city.trim(),
      businessType,
      gstNumber: isDeliveryAgent ? "" : (gstNumber || "").trim(),
      bankAccount: isDeliveryAgent ? "" : (bankAccount || "").trim(),
      ifscCode: isDeliveryAgent ? "" : (ifscCode || "").trim(),
      documentIdProof: documentIdProof || "",
      documentAddressProof: documentAddressProof || "",
      documentBusinessLicense: isDeliveryAgent ? "" : (documentBusinessLicense || ""),
      userId: user._id,
      onboardingStatus: "pending",
      verificationCode,
    });

    if (isDeliveryAgent) {
      const vehicleType = req.body.vehicleType;
      const vehicleNumber = (req.body.vehicleNumber || "").trim();
      const documentVehicleIdentification = req.body.documentVehicleIdentification || "";
      await DeliveryPartner.create({
        name: contactPerson.trim(),
        email: email.toLowerCase(),
        phone: phone.trim(),
        vehicleType,
        vehicleNumber,
        licenseDocument: documentIdProof || "",
        identityDocument: documentAddressProof || "",
        vehicleIdentificationDocument: documentVehicleIdentification,
        userId: user._id,
        onboardingStatus: "pending",
      });
    }

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: "7d" });
    const u = await User.findById(user._id).select("-password").lean();
    const out = { ...u, _id: u._id.toString(), id: u._id.toString(), role: u.role || "supplier" };
    res.status(201).json({
      user: out,
      token,
      supplierId: supplier._id.toString(),
      verificationCode,
      onboardingStatus: "pending",
    });
  } catch (err) {
    console.error("Register supplier error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post("/register-delivery", async (req, res) => {
  try {
    const { name, email, phone, password, vehicleType, vehicleNumber, licenseDocument, identityDocument, documentVehicleIdentification } = req.body;
    if (!name || !email || !phone || !password || !vehicleType) {
      return res.status(400).json({ error: "Name, email, phone, password and vehicle type are required" });
    }
    const validVehicle = ["bike", "van", "bicycle", "tanker", "miniTruck"].includes(vehicleType);
    if (!validVehicle) return res.status(400).json({ error: "Invalid vehicle type (bike, van, bicycle, tanker, miniTruck)" });
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) return res.status(400).json({ error: "Email already registered" });
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase(),
      phone: phone.trim(),
      password,
      role: "deliveryPartner",
    });
    const dp = await DeliveryPartner.create({
      name: name.trim(),
      email: email.toLowerCase(),
      phone: phone.trim(),
      vehicleType,
      vehicleNumber: (vehicleNumber || "").trim(),
      licenseDocument: licenseDocument || "",
      identityDocument: identityDocument || "",
      vehicleIdentificationDocument: documentVehicleIdentification || "",
      userId: user._id,
      onboardingStatus: "pending",
    });
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: "7d" });
    const u = await User.findById(user._id).select("-password").lean();
    const out = { ...u, id: u._id.toString(), role: "deliveryPartner" };
    res.status(201).json({ user: out, token, deliveryPartnerId: dp._id.toString(), onboardingStatus: "pending" });
  } catch (err) {
    console.error("Register delivery error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password required" });
    const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
    if (!user) return res.status(401).json({ error: "Invalid email or password" });
    const ok = await user.comparePassword(password);
    if (!ok) return res.status(401).json({ error: "Invalid email or password" });
    let effectiveRole = user.role || "customer";
    if (effectiveRole === "supplier") {
      const supplier = await Supplier.findOne({ userId: user._id }).lean();
      if (supplier && supplier.businessType === "deliveryAgent") {
        effectiveRole = "deliveryPartner";
        let dp = await DeliveryPartner.findOne({ userId: user._id }).lean();
        if (!dp) {
          await DeliveryPartner.create({
            name: supplier.contactPerson || user.name,
            email: user.email,
            phone: supplier.phone || user.phone || "",
            vehicleType: "bike",
            userId: user._id,
            onboardingStatus: supplier.onboardingStatus || "pending",
          });
        }
      }
    }
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: "7d" });
    const u = await User.findById(user._id).select("-password").lean();
    const out = { ...u, id: u._id.toString(), role: effectiveRole };
    res.json({ user: out, token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
