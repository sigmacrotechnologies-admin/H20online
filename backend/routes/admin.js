const express = require("express");
const mongoose = require("mongoose");
const User = require("../models/User");
const Order = require("../models/Order");
const Supplier = require("../models/Supplier");
const Plan = require("../models/Plan");
const PlanProduct = require("../models/PlanProduct");
const DeliveryPartner = require("../models/DeliveryPartner");
const Subscription = require("../models/Subscription");
const SupplierSupportThread = require("../models/SupplierSupportThread");
const DeliveryPartnerSupportThread = require("../models/DeliveryPartnerSupportThread");
const CustomerSupportTicket = require("../models/CustomerSupportTicket");
const PickupHub = require("../models/PickupHub");
const Society = require("../models/Society");
const Store = require("../models/Store");
const Product = require("../models/Product");
const Wallet = require("../models/Wallet");
const { getOrCreateWallet } = require("./wallet");
const { getTaxSettings, updateTaxSettings } = require("../services/taxSettings");
const { isRazorpayConfigured, getPublicKeyId } = require("../services/razorpay");
const { getAdminFinancials } = require("../services/financials");
const { formatPaymentBlock } = require("../services/orderPayment");
const {
  listRedeemRequestsAdmin,
  approveRedeemRequest,
  rejectRedeemRequest,
} = require("../services/walletRedeem");
const ServiceableArea = require("../models/ServiceableArea");
const {
  normalizePin,
  geocodeAddress,
  DEFAULT_RADIUS_KM,
} = require("../services/serviceableArea");
const {
  adminAuth,
  requireCanCreateAdmin,
  requireCanDeleteUser,
  requireCanRemoveSupplier,
  requireCanSeeFinancials,
} = require("../middleware/adminAuth");

const router = express.Router();
router.use(adminAuth);

function toObjectId(v) {
  if (v == null || v === "") return null;
  if (typeof v === "string" && mongoose.Types.ObjectId.isValid(v) && v.length === 24) return v;
  return null;
}

// Time range: user gives e.g. "11:00 AM" - "12:00 PM". Convert to minutes for overlap check.
const SLOT_BLOCK_MINUTES = 13;
function preferredTimeToMinutes(str) {
  if (!str || typeof str !== "string") return null;
  const trimmed = str.trim();
  const match = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;
  let h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const ampm = (match[3] || "").toUpperCase();
  if (ampm === "PM" && h !== 12) h += 12;
  if (ampm === "AM" && h === 12) h = 0;
  return h * 60 + m;
}
// Two time ranges overlap if startA < endB && startB < endA (in minutes).
function timeRangesOverlap(startA, endA, startB, endB) {
  const minStartA = preferredTimeToMinutes(startA);
  const minEndA = preferredTimeToMinutes(endA);
  const minStartB = preferredTimeToMinutes(startB);
  const minEndB = preferredTimeToMinutes(endB);
  if (minStartA == null || minEndA == null || minStartB == null || minEndB == null) return false;
  return minStartA < minEndB && minStartB < minEndA;
}
// Get effective range for a subscription: prefer preferredTimeRangeStart/End; else treat preferredDeliveryTime as single time and use 13-min window.
function getSubscriptionTimeRange(sub) {
  if (sub.preferredTimeRangeStart && sub.preferredTimeRangeEnd) {
    return { start: sub.preferredTimeRangeStart, end: sub.preferredTimeRangeEnd };
  }
  const single = preferredTimeToMinutes(sub.preferredDeliveryTime);
  if (single != null) {
    const endMin = Math.min(24 * 60, single + SLOT_BLOCK_MINUTES);
    return { start: sub.preferredDeliveryTime, end: null }; // legacy: we only have one time; treat as overlapping if within 13 min
  }
  return null;
}
function rangesOverlapForSlot(subAStart, subAEnd, subB) {
  const rangeB = getSubscriptionTimeRange(subB);
  if (!rangeB) return false;
  const minAStart = preferredTimeToMinutes(subAStart);
  const minAEnd = preferredTimeToMinutes(subAEnd);
  if (minAStart == null || minAEnd == null) return false;
  const minBStart = preferredTimeToMinutes(rangeB.start);
  const minBEnd = rangeB.end ? preferredTimeToMinutes(rangeB.end) : minBStart + SLOT_BLOCK_MINUTES;
  if (minBStart == null || minBEnd == null) return false;
  return minAStart < minBEnd && minBStart < minAEnd;
}

async function isPartnerBusyInSlot(deliveryPartnerId, selectedDates, rangeStart, rangeEnd, excludeSubscriptionId) {
  if (!deliveryPartnerId || !selectedDates?.length) return false;
  // For assigned subscription: use range if set; else legacy single time (treat as 13-min window)
  const effectiveStart = rangeStart && String(rangeStart).trim() ? String(rangeStart).trim() : null;
  const effectiveEnd = rangeEnd && String(rangeEnd).trim() ? String(rangeEnd).trim() : null;
  if (!effectiveStart) return false;
  const assignStart = effectiveStart;
  const assignEnd = effectiveEnd || (() => { const m = preferredTimeToMinutes(effectiveStart); return m != null ? null : null; })(); // legacy: we'll compare using getSubscriptionTimeRange on others
  const assignEndMinutes = assignEnd ? preferredTimeToMinutes(assignEnd) : (preferredTimeToMinutes(assignStart) + SLOT_BLOCK_MINUTES);
  if (assignEndMinutes == null && !assignEnd) {
    const m = preferredTimeToMinutes(assignStart);
    if (m == null) return false;
  }
  const others = await Subscription.find({
    deliveryPartnerId: toObjectId(deliveryPartnerId),
    _id: excludeSubscriptionId ? { $ne: toObjectId(excludeSubscriptionId) } : { $exists: true },
    status: { $in: ["active", "inactive"] },
  }).select("selectedDates preferredDeliveryTime preferredTimeRangeStart preferredTimeRangeEnd").lean();
  for (const sub of others) {
    const dateOverlap = (sub.selectedDates || []).some((d) => selectedDates.includes(d));
    const otherRange = getSubscriptionTimeRange(sub);
    if (!otherRange) continue;
    const aStart = preferredTimeToMinutes(assignStart);
    const aEnd = assignEnd ? preferredTimeToMinutes(assignEnd) : (aStart != null ? aStart + SLOT_BLOCK_MINUTES : null);
    const bStart = preferredTimeToMinutes(otherRange.start);
    const bEnd = otherRange.end ? preferredTimeToMinutes(otherRange.end) : (bStart != null ? bStart + SLOT_BLOCK_MINUTES : null);
    if (dateOverlap && aStart != null && aEnd != null && bStart != null && bEnd != null && aStart < bEnd && bStart < aEnd) return true;
  }
  return false;
}

// ---------- App users (customers/suppliers) ----------
router.get("/users", async (req, res) => {
  try {
    const { search, role, sort = "createdAt", order = "desc", page = 1, limit = 20 } = req.query;
    const filter = {};
    if (role && ["customer", "supplier"].includes(role)) filter.role = role;
    if (search && String(search).trim()) {
      const s = String(search).trim();
      filter.$or = [
        { name: new RegExp(s, "i") },
        { email: new RegExp(s, "i") },
        { phone: new RegExp(s, "i") },
      ];
    }
    const skip = Math.max(0, (Number(page) || 1) - 1) * Math.min(50, Math.max(1, Number(limit) || 20));
    const limitNum = Math.min(50, Math.max(1, Number(limit) || 20));
    const sortOrder = order === "asc" ? 1 : -1;
    const sortObj = { [sort === "name" ? "name" : sort === "email" ? "email" : "createdAt"]: sortOrder };
    const [list, total] = await Promise.all([
      User.find(filter).select("-password").sort(sortObj).skip(skip).limit(limitNum).lean(),
      User.countDocuments(filter),
    ]);
    for (const u of list) {
      if (!u.userCode) {
        const code = await User.generateUniqueUserCode(u.role || "customer");
        await User.updateOne({ _id: u._id }, { $set: { userCode: code } });
        u.userCode = code;
      }
    }
    res.json({
      users: list.map((u) => ({ ...u, id: u._id.toString(), _id: u._id.toString() })),
      total,
      page: Number(page) || 1,
      limit: limitNum,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/users/:id", async (req, res) => {
  try {
    const id = toObjectId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid user id" });
    let u = await User.findById(id).select("-password").lean();
    if (!u) return res.status(404).json({ error: "User not found" });
    if (!u.userCode) {
      const code = await User.generateUniqueUserCode(u.role || "customer");
      await User.updateOne({ _id: u._id }, { $set: { userCode: code } });
      u = { ...u, userCode: code };
    }
    res.json({ ...u, id: u._id.toString(), _id: u._id.toString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/users/:id", async (req, res) => {
  try {
    const id = toObjectId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid user id" });
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ error: "User not found" });
    const { name, email, phone, age, gender, activityLevel, familyMembers, segment } = req.body;
    if (name != null && typeof name === "string" && name.trim()) user.name = name.trim();
    if (email != null && typeof email === "string" && email.trim()) user.email = email.trim().toLowerCase();
    if (phone != null) user.phone = typeof phone === "string" ? phone.trim() : String(phone || "");
    if (age != null && age !== undefined) user.age = age;
    if (gender != null && gender !== undefined) user.gender = gender;
    if (activityLevel != null && activityLevel !== undefined) user.activityLevel = activityLevel;
    if (familyMembers != null && familyMembers !== undefined) user.familyMembers = familyMembers;
    if (segment !== undefined && ["", "corporate", "organization", "institute", "college"].includes(segment)) user.segment = segment;
    await user.save();
    const u = await User.findById(user._id).select("-password").lean();
    res.json({ ...u, id: u._id.toString(), _id: u._id.toString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/users/:id", requireCanDeleteUser, async (req, res) => {
  try {
    const id = toObjectId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid user id" });
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ error: "User not found" });
    if (["admin", "sub-admin", "master"].includes(user.role)) {
      return res.status(400).json({ error: "Cannot delete admin users from this endpoint" });
    }
    await User.findByIdAndDelete(id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- Create admin/sub-admin user (master or admin only) ----------
router.post("/admins", requireCanCreateAdmin, async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email and password required" });
    }
    if (!["admin", "sub-admin"].includes(role)) {
      return res.status(400).json({ error: "Role must be admin or sub-admin" });
    }
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(400).json({ error: "Email already registered" });
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase(),
      password: password,
      role,
    });
    const u = await User.findById(user._id).select("-password").lean();
    res.status(201).json({ ...u, id: u._id.toString(), _id: u._id.toString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- Orders ----------
router.get("/orders", async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status && ["in_progress", "delivered", "cancelled"].includes(status)) filter.status = status;
    const skip = Math.max(0, (Number(page) || 1) - 1) * Math.min(100, Math.max(1, Number(limit) || 20));
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
    const [orders, total] = await Promise.all([
      Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum).populate("userId", "name email userCode").lean(),
      Order.countDocuments(filter),
    ]);
    for (const o of orders) {
      if (!o.orderId) {
        const orderId = await Order.generateUniqueOrderId();
        await Order.updateOne({ _id: o._id }, { $set: { orderId } });
        o.orderId = orderId;
      }
    }
    res.json({
      orders: orders.map((o) => ({
        id: o._id.toString(),
        orderId: o.orderId || o._id.toString(),
        userId: o.userId?._id?.toString(),
        userCode: o.userId?.userCode || null,
        userName: o.userId?.name,
        userEmail: o.userId?.email,
        items: o.items,
        total: o.total,
        status: o.status,
        paymentMethod: o.paymentMethod,
        paymentStatus: o.paymentStatus || "",
        paidAt: o.paidAt || null,
        payment: formatPaymentBlock(o),
        orderChannel: o.orderChannel || "customer",
        orderPlatform: o.orderPlatform || "mobile",
        address: o.address,
        supplierResponses: o.supplierResponses || [],
        createdAt: o.createdAt,
      })),
      total,
      page: Number(page) || 1,
      limit: limitNum,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/orders/:id", async (req, res) => {
  try {
    const id = toObjectId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid order id" });
    let o = await Order.findById(id).populate("userId", "name email phone userCode").lean();
    if (!o) return res.status(404).json({ error: "Order not found" });
    if (!o.orderId) {
      const orderId = await Order.generateUniqueOrderId();
      await Order.updateOne({ _id: o._id }, { $set: { orderId } });
      o = { ...o, orderId };
    }
    res.json({
      id: o._id.toString(),
      orderId: o.orderId,
      userId: o.userId?._id?.toString(),
      userCode: o.userId?.userCode || null,
      userName: o.userId?.name,
      userEmail: o.userId?.email,
      userPhone: o.userId?.phone,
      items: o.items,
      total: o.total,
      subtotal: o.subtotal ?? o.total,
      taxLines: o.taxLines || [],
      taxTotal: o.taxTotal ?? 0,
      status: o.status,
      paymentMethod: o.paymentMethod,
      paymentStatus: o.paymentStatus || "",
      paidAt: o.paidAt || null,
      payment: formatPaymentBlock(o),
      orderChannel: o.orderChannel || "customer",
      orderPlatform: o.orderPlatform || "mobile",
      razorpayOrderId: o.razorpayOrderId || "",
      razorpayPaymentId: o.razorpayPaymentId || "",
      address: o.address,
      receiverName: o.receiverName,
      receiverPhone: o.receiverPhone,
      scheduledAt: o.scheduledAt,
      supplierResponses: o.supplierResponses || [],
      createdAt: o.createdAt,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- Suppliers ----------
router.get("/suppliers", async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const filter = { businessType: { $ne: "deliveryAgent" } };
    if (status && ["pending", "approved"].includes(status)) filter.onboardingStatus = status;
    if (search && String(search).trim()) {
      const s = String(search).trim();
      filter.$or = [
        { name: new RegExp(s, "i") },
        { email: new RegExp(s, "i") },
        { contactPerson: new RegExp(s, "i") },
      ];
    }
    const skip = Math.max(0, (Number(page) || 1) - 1) * Math.min(50, Math.max(1, Number(limit) || 20));
    const limitNum = Math.min(50, Math.max(1, Number(limit) || 20));
    const [list, total] = await Promise.all([
      Supplier.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum).populate("userId", "userCode").lean(),
      Supplier.countDocuments(filter),
    ]);
    for (const s of list) {
      if (s.userId && !s.userId.userCode) {
        const code = await User.generateUniqueUserCode(s.userId.role || "supplier");
        await User.updateOne({ _id: s.userId._id }, { $set: { userCode: code } });
        s.userId.userCode = code;
      }
    }
    res.json({
      suppliers: list.map((s) => ({
        ...s,
        id: s._id.toString(),
        _id: s._id.toString(),
        supplierId: s.userId?.userCode || null,
      })),
      total,
      page: Number(page) || 1,
      limit: limitNum,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/suppliers/:id", async (req, res) => {
  try {
    const id = toObjectId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid supplier id" });
    let s = await Supplier.findById(id).populate("userId", "userCode").lean();
    if (!s) return res.status(404).json({ error: "Supplier not found" });
    if (s.userId && !s.userId.userCode) {
      const code = await User.generateUniqueUserCode(s.userId.role || "supplier");
      await User.updateOne({ _id: s.userId._id }, { $set: { userCode: code } });
      s = { ...s, userId: { ...s.userId, userCode: code } };
    }
    const supplierId = s.userId?.userCode || null;
    res.json({ ...s, id: s._id.toString(), _id: s._id.toString(), supplierId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/suppliers", async (req, res) => {
  try {
    const {
      businessName,
      contactPerson,
      email,
      phone,
      password,
      address,
      city,
      businessType,
      gstNumber,
      bankAccount,
      ifscCode,
    } = req.body;
    if (!businessName || !contactPerson || !email || !phone || !password || !address || !city || !businessType) {
      return res.status(400).json({ error: "Business name, contact person, email, phone, password, address, city and business type required" });
    }
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) return res.status(400).json({ error: "Email already registered" });
    const user = await User.create({
      name: contactPerson.trim(),
      email: email.toLowerCase(),
      phone: phone.trim(),
      password,
      role: "supplier",
    });
    const supplier = await Supplier.create({
      name: businessName.trim(),
      contactPerson: contactPerson.trim(),
      email: email.toLowerCase(),
      phone: phone.trim(),
      address: address.trim(),
      location: (req.body.location || "").trim(),
      city: city.trim(),
      businessType,
      gstNumber: (gstNumber || "").trim(),
      bankAccount: (bankAccount || "").trim(),
      ifscCode: (ifscCode || "").trim(),
      userId: user._id,
      onboardingStatus: "approved",
    });
    const u = await User.findById(user._id).select("userCode").lean();
    const s = supplier.toObject();
    res.status(201).json({ ...s, id: s._id.toString(), _id: s._id.toString(), supplierId: u?.userCode || null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/suppliers/:id", requireCanRemoveSupplier, async (req, res) => {
  try {
    const id = toObjectId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid supplier id" });
    const supplier = await Supplier.findById(id);
    if (!supplier) return res.status(404).json({ error: "Supplier not found" });
    await User.findByIdAndDelete(supplier.userId);
    await Supplier.findByIdAndDelete(id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/suppliers/:id", async (req, res) => {
  try {
    const id = toObjectId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid supplier id" });
    const supplier = await Supplier.findById(id);
    if (!supplier) return res.status(404).json({ error: "Supplier not found" });
    const { commissionPercentage } = req.body;
    if (commissionPercentage !== undefined) {
      const pct = Number(commissionPercentage);
      if (isNaN(pct) || pct < 0 || pct > 100) return res.status(400).json({ error: "Commission percentage must be between 0 and 100" });
      supplier.commissionPercentage = pct;
    }
    await supplier.save();
    const s = supplier.toObject();
    return res.json({ ...s, id: s._id.toString(), _id: s._id.toString(), supplierId: null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/suppliers/:id/verify", async (req, res) => {
  try {
    const id = toObjectId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid supplier id" });
    const supplier = await Supplier.findById(id);
    if (!supplier) return res.status(404).json({ error: "Supplier not found" });
    const {
      documentIdProofVerified,
      documentAddressProofVerified,
      documentBusinessLicenseVerified,
      tentativeVerificationTime,
      approve,
    } = req.body;
    if (documentIdProofVerified !== undefined) supplier.documentIdProofVerified = Boolean(documentIdProofVerified);
    if (documentAddressProofVerified !== undefined) supplier.documentAddressProofVerified = Boolean(documentAddressProofVerified);
    if (documentBusinessLicenseVerified !== undefined) supplier.documentBusinessLicenseVerified = Boolean(documentBusinessLicenseVerified);
    if (tentativeVerificationTime !== undefined && typeof tentativeVerificationTime === "string") {
      supplier.tentativeVerificationTime = tentativeVerificationTime.trim() || "24-48 hours";
    }
    if (approve === true) {
      supplier.documentIdProofVerified = true;
      supplier.documentAddressProofVerified = true;
      supplier.documentBusinessLicenseVerified = true;
      supplier.onboardingStatus = "approved";
    } else if (
      supplier.documentIdProofVerified &&
      supplier.documentAddressProofVerified &&
      supplier.documentBusinessLicenseVerified
    ) {
      supplier.onboardingStatus = "approved";
    }
    await supplier.save();
    const s = supplier.toObject();
    res.json({ ...s, id: s._id.toString(), _id: s._id.toString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function parseCoordinate(v) {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// ---------- Serviceable areas ----------
router.get("/serviceable-areas", async (req, res) => {
  try {
    const areas = await ServiceableArea.find().sort({ createdAt: -1 }).lean();
    const supplierIds = areas.map((a) => a.supplierId).filter(Boolean);
    const suppliers = await Supplier.find({ _id: { $in: supplierIds } })
      .select("name")
      .lean();
    const nameMap = Object.fromEntries(suppliers.map((s) => [String(s._id), s.name || ""]));
    res.json(
      areas.map((a) => ({
        id: a._id.toString(),
        pinCode: a.pinCode,
        label: a.label || "",
        city: a.city || "",
        latitude: a.latitude ?? null,
        longitude: a.longitude ?? null,
        supplierId: String(a.supplierId),
        supplierName: nameMap[String(a.supplierId)] || "",
        radiusKm: a.radiusKm ?? DEFAULT_RADIUS_KM,
        isActive: !!a.isActive,
        createdAt: a.createdAt,
      }))
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/serviceable-areas", async (req, res) => {
  try {
    const { pinCode, label, city, state, supplierId, radiusKm, isActive, latitude, longitude } = req.body || {};
    const pin = normalizePin(pinCode);
    if (!pin || pin.length < 6) return res.status(400).json({ error: "Valid 6-digit PIN code is required" });
    const sid = toObjectId(supplierId);
    if (!sid) return res.status(400).json({ error: "Supplier is required" });
    const supplier = await Supplier.findById(sid);
    if (!supplier) return res.status(404).json({ error: "Supplier not found" });

    let lat = parseCoordinate(latitude);
    let lng = parseCoordinate(longitude);
    if (lat == null || lng == null) {
      const geo = await geocodeAddress(pin, city, state);
      if (geo) {
        lat = geo.latitude;
        lng = geo.longitude;
      }
    }

    const radius = Number(radiusKm);
    const doc = await ServiceableArea.create({
      pinCode: pin,
      label: label && String(label).trim() ? String(label).trim() : "",
      city: city && String(city).trim() ? String(city).trim() : "",
      latitude: lat,
      longitude: lng,
      supplierId: sid,
      radiusKm: Number.isFinite(radius) && radius >= 1 ? Math.min(radius, 50) : DEFAULT_RADIUS_KM,
      isActive: isActive !== false,
    });
    const a = doc.toObject();
    res.status(201).json({
      id: a._id.toString(),
      pinCode: a.pinCode,
      label: a.label || "",
      city: a.city || "",
      latitude: a.latitude ?? null,
      longitude: a.longitude ?? null,
      supplierId: String(a.supplierId),
      supplierName: supplier.name || "",
      radiusKm: a.radiusKm ?? DEFAULT_RADIUS_KM,
      isActive: !!a.isActive,
      createdAt: a.createdAt,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/serviceable-areas/:id", async (req, res) => {
  try {
    const id = toObjectId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid id" });
    const area = await ServiceableArea.findById(id);
    if (!area) return res.status(404).json({ error: "Serviceable area not found" });

    const { pinCode, label, city, state, supplierId, radiusKm, isActive, latitude, longitude } = req.body || {};
    if (pinCode !== undefined) {
      const pin = normalizePin(pinCode);
      if (!pin || pin.length < 6) return res.status(400).json({ error: "Valid 6-digit PIN code is required" });
      area.pinCode = pin;
    }
    if (label !== undefined) area.label = label && String(label).trim() ? String(label).trim() : "";
    if (city !== undefined) area.city = city && String(city).trim() ? String(city).trim() : "";
    if (supplierId !== undefined) {
      const sid = toObjectId(supplierId);
      if (!sid) return res.status(400).json({ error: "Invalid supplier" });
      const supplier = await Supplier.findById(sid);
      if (!supplier) return res.status(404).json({ error: "Supplier not found" });
      area.supplierId = sid;
    }
    if (radiusKm !== undefined) {
      const radius = Number(radiusKm);
      if (Number.isFinite(radius) && radius >= 1) area.radiusKm = Math.min(radius, 50);
    }
    if (isActive !== undefined) area.isActive = !!isActive;
    if (latitude !== undefined) area.latitude = parseCoordinate(latitude);
    if (longitude !== undefined) area.longitude = parseCoordinate(longitude);

    if (area.latitude == null || area.longitude == null) {
      const geo = await geocodeAddress(area.pinCode, area.city, state);
      if (geo) {
        area.latitude = geo.latitude;
        area.longitude = geo.longitude;
      }
    }

    await area.save();
    const supplier = await Supplier.findById(area.supplierId).select("name").lean();
    const a = area.toObject();
    res.json({
      id: a._id.toString(),
      pinCode: a.pinCode,
      label: a.label || "",
      city: a.city || "",
      latitude: a.latitude ?? null,
      longitude: a.longitude ?? null,
      supplierId: String(a.supplierId),
      supplierName: supplier?.name || "",
      radiusKm: a.radiusKm ?? DEFAULT_RADIUS_KM,
      isActive: !!a.isActive,
      createdAt: a.createdAt,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/serviceable-areas/:id", async (req, res) => {
  try {
    const id = toObjectId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid id" });
    const deleted = await ServiceableArea.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ error: "Serviceable area not found" });
    res.json({ deleted: true, id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- Tax & payment settings ----------
router.get("/tax-settings", async (req, res) => {
  try {
    const settings = await getTaxSettings();
    res.json({
      ...settings,
      razorpayConfigured: isRazorpayConfigured(),
      razorpayKeyId: getPublicKeyId() ? `${getPublicKeyId().slice(0, 12)}...` : "",
      razorpayTestMode: String(getPublicKeyId()).startsWith("rzp_test_"),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/tax-settings", async (req, res) => {
  try {
    const settings = await updateTaxSettings(req.body || {});
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- Plans & rates ----------
router.get("/plans", async (req, res) => {
  try {
    const plans = await Plan.find().sort({ slug: 1 }).lean();
    const withProducts = await Promise.all(
      plans.map(async (p) => {
        const products = await PlanProduct.find({ planId: p._id }).sort({ productKey: 1 }).lean();
        return {
          ...p,
          id: p._id.toString(),
          _id: p._id.toString(),
          products: products.map((pp) => ({
            ...pp,
            id: pp._id.toString(),
            _id: pp._id.toString(),
            planId: pp.planId.toString(),
            productId: pp.productId || null,
            imageUrl: pp.imageUrl || "",
          })),
        };
      })
    );
    res.json(withProducts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/plans/:id", async (req, res) => {
  try {
    const id = toObjectId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid plan id" });
    const plan = await Plan.findById(id);
    if (!plan) return res.status(404).json({ error: "Plan not found" });
    const { name, slug, maxQuantityPerProduct, comingSoon, planCategory } = req.body;
    if (name != null && typeof name === "string") plan.name = name.trim();
    if (slug != null && typeof slug === "string") plan.slug = slug.trim();
    if (maxQuantityPerProduct != null) plan.maxQuantityPerProduct = Number(maxQuantityPerProduct);
    if (comingSoon != null) plan.comingSoon = Boolean(comingSoon);
    if (planCategory != null && ["individual", "bulk", "society"].includes(planCategory)) plan.planCategory = planCategory;
    await plan.save();
    const p = await Plan.findById(plan._id).lean();
    res.json({ ...p, id: p._id.toString(), _id: p._id.toString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/plan-products/:id", async (req, res) => {
  try {
    const id = toObjectId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid plan product id" });
    const pp = await PlanProduct.findById(id);
    if (!pp) return res.status(404).json({ error: "Plan product not found" });
    const { productId, productKey, productLabel, imageUrl, priceDaily, priceWeekly, priceMonthly } = req.body;
    if (productId !== undefined) pp.productId = productId === "" || productId == null ? undefined : String(productId).trim();
    if (productKey != null && typeof productKey === "string") {
      const key = productKey.trim();
      if (key) {
        const existing = await PlanProduct.findOne({ planId: pp.planId, productKey: key, _id: { $ne: pp._id } });
        if (existing) return res.status(400).json({ error: "Another product with this key already exists in this plan" });
        pp.productKey = key;
      }
    }
    if (productLabel != null && typeof productLabel === "string") pp.productLabel = productLabel.trim();
    if (imageUrl !== undefined) pp.imageUrl = imageUrl == null ? "" : String(imageUrl).trim();
    if (priceDaily != null && !Number.isNaN(Number(priceDaily))) pp.priceDaily = Number(priceDaily);
    if (priceWeekly != null && !Number.isNaN(Number(priceWeekly))) pp.priceWeekly = Number(priceWeekly);
    if (priceMonthly != null && !Number.isNaN(Number(priceMonthly))) pp.priceMonthly = Number(priceMonthly);
    await pp.save();
    const out = pp.toObject();
    res.json({ ...out, id: out._id.toString(), _id: out._id.toString(), productId: out.productId || null, imageUrl: out.imageUrl || "" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/plan-products", async (req, res) => {
  try {
    const { planId, productId, productKey, productLabel, imageUrl, priceDaily, priceWeekly, priceMonthly } = req.body;
    const planObjId = toObjectId(planId);
    if (!planObjId) return res.status(400).json({ error: "Invalid plan id" });
    const plan = await Plan.findById(planObjId);
    if (!plan) return res.status(404).json({ error: "Plan not found" });
    const key = (productKey && String(productKey).trim()) || "";
    const label = (productLabel && String(productLabel).trim()) || "";
    if (!key || !label) return res.status(400).json({ error: "productKey and productLabel are required" });
    const daily = Number(priceDaily);
    const weekly = Number(priceWeekly);
    const monthly = Number(priceMonthly);
    if (Number.isNaN(daily) || Number.isNaN(weekly) || Number.isNaN(monthly) || daily < 0 || weekly < 0 || monthly < 0)
      return res.status(400).json({ error: "Valid priceDaily, priceWeekly, priceMonthly are required" });
    const existing = await PlanProduct.findOne({ planId: plan._id, productKey: key });
    if (existing) return res.status(400).json({ error: "A product with this product key already exists in this plan" });
    const pp = await PlanProduct.create({
      planId: plan._id,
      productId: productId && String(productId).trim() ? String(productId).trim() : undefined,
      productKey: key,
      productLabel: label,
      imageUrl: imageUrl && String(imageUrl).trim() ? String(imageUrl).trim() : "",
      priceDaily: daily,
      priceWeekly: weekly,
      priceMonthly: monthly,
    });
    const out = pp.toObject();
    res.status(201).json({ ...out, id: out._id.toString(), _id: out._id.toString(), productId: out.productId || null, imageUrl: out.imageUrl || "" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/plan-products/:id", async (req, res) => {
  try {
    const id = toObjectId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid plan product id" });
    const pp = await PlanProduct.findByIdAndDelete(id);
    if (!pp) return res.status(404).json({ error: "Plan product not found" });
    res.json({ deleted: true, id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- Pickup hubs ----------
router.get("/pickup-hubs", async (req, res) => {
  try {
    const hubs = await PickupHub.find({ isActive: true }).sort({ name: 1 }).lean();
    res.json(hubs.map((h) => ({ id: h._id.toString(), name: h.name, address: h.address })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/pickup-hubs", async (req, res) => {
  try {
    const { name, address } = req.body;
    if (!name || !address) return res.status(400).json({ error: "name and address required" });
    const hub = await PickupHub.create({ name: String(name).trim(), address: String(address).trim() });
    res.status(201).json({ id: hub._id.toString(), name: hub.name, address: hub.address });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- Subscriptions (admin) ----------
router.get("/subscriptions", async (req, res) => {
  try {
    const { status, frequency, search, subscriptionId, locality, pinCode, channel, page = 1, limit = 50 } = req.query;
    const andParts = [];
    if (channel && ["customer", "society", "supplier"].includes(String(channel))) {
      andParts.push({ subscriptionChannel: String(channel) });
    }
    if (status && ["active", "cancelled", "inactive"].includes(status)) andParts.push({ status });
    if (frequency && ["daily", "weekly", "monthly"].includes(frequency)) andParts.push({ frequency });
    if (locality && String(locality).trim()) andParts.push({ locality: new RegExp(String(locality).trim(), "i") });
    if (pinCode && String(pinCode).trim()) andParts.push({ pinCode: new RegExp(String(pinCode).trim(), "i") });
    if (subscriptionId && String(subscriptionId).trim()) {
      const sidTrim = String(subscriptionId).trim();
      const oid = toObjectId(sidTrim);
      const orClause = [{ subscriptionId: new RegExp(sidTrim, "i") }];
      if (oid) orClause.push({ _id: oid });
      andParts.push({ $or: orClause });
    }
    if (search && String(search).trim()) {
      const s = String(search).trim();
      const users = await User.find({
        $or: [
          { name: new RegExp(s, "i") },
          { email: new RegExp(s, "i") },
          { phone: new RegExp(s, "i") },
        ],
      })
        .select("_id")
        .lean();
      const userIds = users.map((u) => u._id);
      if (userIds.length) andParts.push({ userId: { $in: userIds } });
      else andParts.push({ userId: { $in: [] } });
    }
    const filter = andParts.length ? { $and: andParts } : {};
    const skip = (Math.max(1, Number(page)) - 1) * Math.min(100, Math.max(1, Number(limit)));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));
    const [list, total] = await Promise.all([
      Subscription.find(filter)
        .populate("userId", "name email phone userCode role")
        .populate("deliveryPartnerId", "name phone")
        .populate("pickupHubId", "name address")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Subscription.countDocuments(filter),
    ]);
    const subscriptions = list.map((s) => {
      const u = s.userId;
      const dp = s.deliveryPartnerId;
      const hub = s.pickupHubId;
      const userId = u?._id?.toString() || (s.userId && typeof s.userId === "string" ? s.userId : null);
      return {
        id: s._id.toString(),
        subscriptionId: s.subscriptionId || s._id.toString(),
        userId,
        customerId: u?.userCode || null,
        customerName: u?.name || "",
        customerEmail: u?.email || "",
        customerPhone: u?.phone || "",
        planName: s.planName,
        productKey: s.productKey,
        productLabel: s.productLabel,
        productId: s.productId || "",
        frequency: s.frequency,
        unitPrice: s.unitPrice,
        quantity: s.quantity,
        totalPrice: s.totalPrice,
        selectedDates: s.selectedDates,
        status: s.status,
        preferredDeliveryTime: s.preferredDeliveryTime || "",
        preferredTimeRangeStart: s.preferredTimeRangeStart || "",
        preferredTimeRangeEnd: s.preferredTimeRangeEnd || "",
        deliveryAddress: s.deliveryAddress || "",
        locality: s.locality || "",
        pinCode: s.pinCode || "",
        deliveryPartnerId: s.deliveryPartnerId ? (typeof s.deliveryPartnerId === "object" ? s.deliveryPartnerId._id.toString() : s.deliveryPartnerId.toString()) : null,
        deliveryPartnerName: dp && typeof dp === "object" ? dp.name || "" : "",
        pickupHubId: s.pickupHubId ? (typeof s.pickupHubId === "object" ? s.pickupHubId._id.toString() : s.pickupHubId.toString()) : null,
        pickupHubName: hub && typeof hub === "object" ? hub.name || "" : "",
        pickupHubAddress: hub && typeof hub === "object" ? hub.address || "" : "",
        subscriptionChannel: s.subscriptionChannel || "customer",
        planCategory: s.planCategory || "individual",
        customerRole: u?.role || "",
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      };
    });
    res.json({ subscriptions, total, page: Number(page) || 1, limit: limitNum });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/subscriptions/financials", async (req, res) => {
  try {
    const active = await Subscription.find({ status: "active" }).lean();
    const inactive = await Subscription.find({ status: "inactive" }).lean();
    const cancelled = await Subscription.find({ status: "cancelled" }).lean();
    let totalActiveRevenue = 0;
    let totalInactiveRevenue = 0;
    const byFrequency = { daily: { count: 0, revenue: 0 }, weekly: { count: 0, revenue: 0 }, monthly: { count: 0, revenue: 0 } };
    for (const s of active) {
      totalActiveRevenue += s.totalPrice || 0;
      if (s.frequency && byFrequency[s.frequency]) {
        byFrequency[s.frequency].count += 1;
        byFrequency[s.frequency].revenue += s.totalPrice || 0;
      }
    }
    for (const s of inactive) {
      totalInactiveRevenue += s.totalPrice || 0;
    }
    res.json({
      activeCount: active.length,
      inactiveCount: inactive.length,
      cancelledCount: cancelled.length,
      totalActiveRevenue,
      totalInactiveRevenue,
      byFrequency: Object.entries(byFrequency).map(([freq, data]) => ({ frequency: freq, ...data })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/subscriptions/:id/status", async (req, res) => {
  try {
    const id = toObjectId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid subscription id" });
    const sub = await Subscription.findById(id);
    if (!sub) return res.status(404).json({ error: "Subscription not found" });
    const { status } = req.body;
    if (!status || !["active", "inactive"].includes(status)) return res.status(400).json({ error: "status must be active or inactive" });
    sub.status = status;
    await sub.save();
    const s = sub.toObject();
    res.json({ id: s._id.toString(), subscriptionId: s.subscriptionId, status: s.status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/subscriptions/:id", async (req, res) => {
  try {
    const id = toObjectId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid subscription id" });
    const sub = await Subscription.findByIdAndDelete(id);
    if (!sub) return res.status(404).json({ error: "Subscription not found" });
    res.json({ deleted: true, id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/subscriptions/:id/delivery", async (req, res) => {
  try {
    const id = toObjectId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid subscription id" });
    const sub = await Subscription.findById(id);
    if (!sub) return res.status(404).json({ error: "Subscription not found" });
    const { deliveryPartnerId, pickupHubId } = req.body;
    if (deliveryPartnerId) {
      const busy = await isPartnerBusyInSlot(deliveryPartnerId, sub.selectedDates, sub.preferredTimeRangeStart || sub.preferredDeliveryTime, sub.preferredTimeRangeEnd || null, sub._id);
      if (busy) {
        return res.status(400).json({
          error: "This delivery partner is already assigned to another subscription in the same 13-minute slot. Choose a different partner or time.",
        });
      }
    }
    if (deliveryPartnerId !== undefined) sub.deliveryPartnerId = deliveryPartnerId ? toObjectId(deliveryPartnerId) : null;
    if (pickupHubId !== undefined) sub.pickupHubId = pickupHubId ? toObjectId(pickupHubId) : null;
    await sub.save();
    const s = sub.toObject();
    res.json({
      id: s._id.toString(),
      subscriptionId: s.subscriptionId,
      deliveryPartnerId: s.deliveryPartnerId ? s.deliveryPartnerId.toString() : null,
      pickupHubId: s.pickupHubId ? s.pickupHubId.toString() : null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Bulk assign same delivery partner to multiple subscriptions (clubbing - same locality)
router.post("/subscriptions/assign-delivery-bulk", async (req, res) => {
  try {
    const { subscriptionIds, deliveryPartnerId } = req.body;
    if (!Array.isArray(subscriptionIds) || subscriptionIds.length === 0) {
      return res.status(400).json({ error: "subscriptionIds array required" });
    }
    if (!deliveryPartnerId) return res.status(400).json({ error: "deliveryPartnerId required" });
    const ids = subscriptionIds.map((sid) => toObjectId(sid)).filter(Boolean);
    const subs = await Subscription.find({ _id: { $in: ids } }).lean();
    if (subs.length !== ids.length) return res.status(400).json({ error: "One or more subscription ids invalid" });
    for (const sub of subs) {
      const busy = await isPartnerBusyInSlot(deliveryPartnerId, sub.selectedDates, sub.preferredTimeRangeStart || sub.preferredDeliveryTime, sub.preferredTimeRangeEnd || null, sub._id);
      if (busy) {
        return res.status(400).json({
          error: `Subscription ${sub.subscriptionId || sub._id} would conflict with partner's existing slot. Partner cannot be assigned to overlapping 13-minute slots.`,
        });
      }
    }
    await Subscription.updateMany({ _id: { $in: ids } }, { deliveryPartnerId: toObjectId(deliveryPartnerId) });
    res.json({ assigned: ids.length, deliveryPartnerId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/subscriptions/:id", async (req, res) => {
  try {
    const id = toObjectId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid subscription id" });
    const sub = await Subscription.findById(id);
    if (!sub) return res.status(404).json({ error: "Subscription not found" });
    const { preferredDeliveryTime, status, pickupHubId, deliveryAddress, locality, pinCode } = req.body;
    if (preferredDeliveryTime !== undefined) sub.preferredDeliveryTime = preferredDeliveryTime && String(preferredDeliveryTime).trim() ? String(preferredDeliveryTime).trim() : null;
    if (status && ["active", "inactive", "cancelled"].includes(status)) sub.status = status;
    if (pickupHubId !== undefined) sub.pickupHubId = pickupHubId ? toObjectId(pickupHubId) : null;
    if (deliveryAddress !== undefined) sub.deliveryAddress = deliveryAddress && String(deliveryAddress).trim() ? String(deliveryAddress).trim() : null;
    if (locality !== undefined) sub.locality = locality && String(locality).trim() ? String(locality).trim() : null;
    if (pinCode !== undefined) sub.pinCode = pinCode && String(pinCode).trim() ? String(pinCode).trim() : null;
    await sub.save();
    const s = sub.toObject();
    res.json({
      id: s._id.toString(),
      subscriptionId: s.subscriptionId,
      preferredDeliveryTime: s.preferredDeliveryTime || null,
      status: s.status,
      pickupHubId: s.pickupHubId ? s.pickupHubId.toString() : null,
      deliveryAddress: s.deliveryAddress || null,
      locality: s.locality || null,
      pinCode: s.pinCode || null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- Wallet management (admin) ----------
const WALLET_TABS = ["customer", "supplier", "deliveryPartner", "corporate", "organization", "institute", "college"];

router.get("/wallet-management", async (req, res) => {
  try {
    const { type = "customer", search, page = 1, limit = 100 } = req.query;
    if (!WALLET_TABS.includes(type)) return res.status(400).json({ error: "Invalid type" });
    const skip = Math.max(0, (Number(page) || 1) - 1) * Math.min(500, Math.max(1, Number(limit) || 100));
    const limitNum = Math.min(500, Math.max(1, Number(limit) || 100));
    const rawSearch = search != null ? String(search).trim() : "";
    const searchStr = rawSearch && rawSearch !== "undefined" ? rawSearch : null;
    let list = [];
    let total = 0;

    // All wallet tabs are driven by User collection: filter by role (and segment for customer sub-types)
    const filter = {};
    if (type === "supplier") {
      filter.role = "supplier";
    } else if (type === "deliveryPartner") {
      filter.role = "deliveryPartner";
    } else {
      // customer, corporate, organization, institute, college
      filter.role = "customer";
      if (type !== "customer" && ["corporate", "organization", "institute", "college"].includes(type)) {
        filter.segment = type;
      }
      // "customer" tab: no segment filter = show all customers (same as Users list with role=customer)
    }

    if (searchStr) {
      const searchOr = [{ name: new RegExp(searchStr, "i") }, { email: new RegExp(searchStr, "i") }, { phone: new RegExp(searchStr, "i") }];
      filter.$and = (filter.$and || []).concat([{ $or: searchOr }]);
    }

    const users = await User.find(filter)
      .select("userCode name email phone role segment")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();
    total = await User.countDocuments(filter);

    for (const u of users) {
      let userCode = u.userCode;
      if (!userCode) {
        userCode = await User.generateUniqueUserCode(u.role || "customer");
        await User.updateOne({ _id: u._id }, { $set: { userCode } });
      }
      const uidStr = u._id.toString();
      const w = await Wallet.findOne({ userId: u._id, ownerType: "user" }).lean();
      list.push({
        id: uidStr,
        userId: uidStr,
        displayId: userCode || uidStr,
        userCode: userCode || null,
        name: u.name,
        email: u.email,
        balance: w ? w.balance : 0,
      });
    }

    res.json({ list, total, page: Number(page) || 1, limit: limitNum });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/wallet-management/:userId", async (req, res) => {
  try {
    const userId = toObjectId(req.params.userId);
    if (!userId) return res.status(400).json({ error: "Invalid user id" });
    const w = await getOrCreateWallet(userId);
    const transactions = (w.transactions || []).slice(-100).reverse();
    res.json({
      balance: w.balance,
      transactions: transactions.map((t) => ({ amount: t.amount, type: t.type, ref: t.ref || "", createdAt: t.createdAt })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/wallet-management/:userId/adjust", async (req, res) => {
  try {
    const userId = toObjectId(req.params.userId);
    if (!userId) return res.status(400).json({ error: "Invalid user id" });
    const { action, amount: rawAmount, note } = req.body;
    const amount = Number(rawAmount);
    if (isNaN(amount) || amount <= 0) return res.status(400).json({ error: "Invalid amount" });
    if (!["add", "deduct", "set"].includes(action)) return res.status(400).json({ error: "Invalid action: use add, deduct, or set" });

    const w = await getOrCreateWallet(userId);
    const ref = `admin_adjustment${note ? `_${String(note).slice(0, 50)}` : ""}`;

    if (action === "set") {
      const prev = w.balance;
      w.balance = amount;
      w.transactions = w.transactions || [];
      w.transactions.push({ amount: amount - prev, type: amount >= prev ? "credit" : "debit", ref, createdAt: new Date() });
    } else if (action === "add") {
      w.balance = (w.balance || 0) + amount;
      w.transactions = w.transactions || [];
      w.transactions.push({ amount, type: "credit", ref, createdAt: new Date() });
    } else {
      if ((w.balance || 0) < amount) return res.status(400).json({ error: "Insufficient balance" });
      w.balance -= amount;
      w.transactions = w.transactions || [];
      w.transactions.push({ amount, type: "debit", ref, createdAt: new Date() });
    }
    await w.save();
    res.json({ balance: w.balance, transactions: (w.transactions || []).slice(-100).reverse().map((t) => ({ amount: t.amount, type: t.type, ref: t.ref || "", createdAt: t.createdAt })) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- Supplier wallet redeem requests ----------
router.get("/wallet-redeem-requests", async (req, res) => {
  try {
    const { status, page, limit, search } = req.query;
    const data = await listRedeemRequestsAdmin({ status, page, limit, search });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/wallet-redeem-requests/:id/approve", async (req, res) => {
  try {
    const id = toObjectId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid request id" });
    const { adminNote } = req.body || {};
    const result = await approveRedeemRequest(id, req.user, adminNote);
    res.json(result);
  } catch (err) {
    const status = err.statusCode || 500;
    res.status(status).json({ error: err.message });
  }
});

router.patch("/wallet-redeem-requests/:id/reject", async (req, res) => {
  try {
    const id = toObjectId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid request id" });
    const { adminNote } = req.body || {};
    const result = await rejectRedeemRequest(id, req.user, adminNote);
    res.json(result);
  } catch (err) {
    const status = err.statusCode || 500;
    res.status(status).json({ error: err.message });
  }
});

// ---------- Financials (master or admin only) ----------
router.get("/financials", requireCanSeeFinancials, async (req, res) => {
  try {
    const data = await getAdminFinancials();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- Delivery partner onboarding ----------
router.get("/delivery-partners", async (req, res) => {
  try {
    const { status, vehicleType, search, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status && ["pending", "approved"].includes(status)) filter.onboardingStatus = status;
    if (vehicleType && ["bike", "van", "bicycle", "tanker", "miniTruck"].includes(vehicleType)) filter.vehicleType = vehicleType;
    if (search && String(search).trim()) {
      const s = String(search).trim();
      filter.$or = [
        { name: new RegExp(s, "i") },
        { email: new RegExp(s, "i") },
        { phone: new RegExp(s, "i") },
        { vehicleNumber: new RegExp(s, "i") },
      ];
    }
    const skip = (Math.max(1, Number(page)) - 1) * Math.min(50, Math.max(1, Number(limit)));
    const limitNum = Math.min(50, Math.max(1, Number(limit)));
    const [list, total] = await Promise.all([
      DeliveryPartner.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      DeliveryPartner.countDocuments(filter),
    ]);
    res.json({ deliveryPartners: list.map((d) => ({ ...d, id: d._id.toString(), _id: d._id.toString() })), total, page: Number(page) || 1, limit: limitNum });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/delivery-partners/:id", async (req, res) => {
  try {
    const id = toObjectId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid delivery partner id" });
    const dp = await DeliveryPartner.findById(id);
    if (!dp) return res.status(404).json({ error: "Delivery partner not found" });
    const { deliverySharePercentage } = req.body;
    if (deliverySharePercentage !== undefined) {
      if (deliverySharePercentage === null || deliverySharePercentage === "") {
        dp.deliverySharePercentage = null;
      } else {
        const pct = Number(deliverySharePercentage);
        if (isNaN(pct) || pct < 0 || pct > 100) {
          return res.status(400).json({ error: "Delivery share percentage must be between 0 and 100" });
        }
        dp.deliverySharePercentage = pct;
      }
    }
    await dp.save();
    const d = dp.toObject();
    res.json({ ...d, id: d._id.toString(), _id: d._id.toString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/delivery-partners/:id/verify", async (req, res) => {
  try {
    const id = toObjectId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid id" });
    const dp = await DeliveryPartner.findById(id);
    if (!dp) return res.status(404).json({ error: "Delivery partner not found" });
    const { documentLicenseVerified, documentIdentityVerified, documentVehicleIdentificationVerified, tentativeVerificationTime, approve } = req.body;
    if (documentLicenseVerified !== undefined) dp.documentLicenseVerified = Boolean(documentLicenseVerified);
    if (documentIdentityVerified !== undefined) dp.documentIdentityVerified = Boolean(documentIdentityVerified);
    if (documentVehicleIdentificationVerified !== undefined) dp.documentVehicleIdentificationVerified = Boolean(documentVehicleIdentificationVerified);
    if (tentativeVerificationTime !== undefined) dp.tentativeVerificationTime = String(tentativeVerificationTime).trim() || dp.tentativeVerificationTime;
    if (approve === true) {
      dp.documentLicenseVerified = true;
      dp.documentIdentityVerified = true;
      dp.documentVehicleIdentificationVerified = true;
      dp.onboardingStatus = "approved";
    } else if (dp.documentLicenseVerified && dp.documentIdentityVerified && (!dp.vehicleIdentificationDocument || dp.documentVehicleIdentificationVerified)) dp.onboardingStatus = "approved";
    await dp.save();
    const d = dp.toObject();
    res.json({ ...d, id: d._id.toString(), _id: d._id.toString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- Supplier support (threads) ----------
router.get("/supplier-support", async (req, res) => {
  try {
    const threads = await SupplierSupportThread.find().populate("supplierId", "name email contactPerson").sort({ updatedAt: -1 }).lean();
    const list = threads.map((t) => {
      const lastMsg = (t.messages || [])[t.messages.length - 1];
      const sid = t.supplierId?._id ?? t.supplierId;
      return {
        id: t._id.toString(),
        supplierId: sid ? sid.toString() : null,
        supplierName: (t.supplierId && typeof t.supplierId === "object" ? t.supplierId.name || t.supplierId.contactPerson : null) || "Supplier",
        supplierEmail: t.supplierId?.email || "",
        lastMessage: lastMsg ? lastMsg.text : null,
        lastAt: lastMsg ? lastMsg.createdAt : t.updatedAt,
        messageCount: (t.messages || []).length,
      };
    });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/supplier-support/:supplierId", async (req, res) => {
  try {
    const sid = toObjectId(req.params.supplierId);
    if (!sid) return res.status(400).json({ error: "Invalid supplier id" });
    const thread = await SupplierSupportThread.findOne({ supplierId: sid }).populate("supplierId", "name email").lean();
    if (!thread) return res.json({ messages: [], supplier: null });
    res.json({
      id: thread._id.toString(),
      supplier: thread.supplierId ? { name: thread.supplierId.name, email: thread.supplierId.email } : null,
      messages: (thread.messages || []).map((m) => ({ from: m.from, text: m.text, createdAt: m.createdAt })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/supplier-support/:supplierId/reply", async (req, res) => {
  try {
    const sid = toObjectId(req.params.supplierId);
    if (!sid) return res.status(400).json({ error: "Invalid supplier id" });
    const { text } = req.body;
    if (!text || typeof text !== "string" || !text.trim()) return res.status(400).json({ error: "Message text required" });
    let thread = await SupplierSupportThread.findOne({ supplierId: sid });
    if (!thread) thread = await SupplierSupportThread.create({ supplierId: sid, messages: [] });
    thread.messages.push({ from: "admin", text: text.trim() });
    await thread.save();
    const m = thread.messages[thread.messages.length - 1];
    res.status(201).json({ from: m.from, text: m.text, createdAt: m.createdAt });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- Delivery partner support (threads) ----------
router.get("/delivery-support", async (req, res) => {
  try {
    const threads = await DeliveryPartnerSupportThread.find()
      .populate("deliveryPartnerId", "name email phone")
      .sort({ updatedAt: -1 })
      .lean();
    const list = threads.map((t) => {
      const lastMsg = (t.messages || [])[t.messages.length - 1];
      const dpid = t.deliveryPartnerId?._id ?? t.deliveryPartnerId;
      const dp = t.deliveryPartnerId && typeof t.deliveryPartnerId === "object" ? t.deliveryPartnerId : null;
      return {
        id: t._id.toString(),
        deliveryPartnerId: dpid ? dpid.toString() : null,
        deliveryPartnerName: dp?.name || "Delivery partner",
        deliveryPartnerEmail: dp?.email || "",
        lastMessage: lastMsg ? lastMsg.text : null,
        lastAt: lastMsg ? lastMsg.createdAt : t.updatedAt,
        messageCount: (t.messages || []).length,
      };
    });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/delivery-support/:deliveryPartnerId", async (req, res) => {
  try {
    const dpid = toObjectId(req.params.deliveryPartnerId);
    if (!dpid) return res.status(400).json({ error: "Invalid delivery partner id" });
    const thread = await DeliveryPartnerSupportThread.findOne({ deliveryPartnerId: dpid })
      .populate("deliveryPartnerId", "name email phone")
      .lean();
    if (!thread) return res.json({ messages: [], deliveryPartner: null });
    res.json({
      id: thread._id.toString(),
      deliveryPartner: thread.deliveryPartnerId
        ? { name: thread.deliveryPartnerId.name, email: thread.deliveryPartnerId.email, phone: thread.deliveryPartnerId.phone }
        : null,
      messages: (thread.messages || []).map((m) => ({ from: m.from, text: m.text, createdAt: m.createdAt })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/delivery-support/:deliveryPartnerId/reply", async (req, res) => {
  try {
    const dpid = toObjectId(req.params.deliveryPartnerId);
    if (!dpid) return res.status(400).json({ error: "Invalid delivery partner id" });
    const { text } = req.body;
    if (!text || typeof text !== "string" || !text.trim()) return res.status(400).json({ error: "Message text required" });
    let thread = await DeliveryPartnerSupportThread.findOne({ deliveryPartnerId: dpid });
    if (!thread) thread = await DeliveryPartnerSupportThread.create({ deliveryPartnerId: dpid, messages: [] });
    thread.messages.push({ from: "admin", text: text.trim() });
    await thread.save();
    const m = thread.messages[thread.messages.length - 1];
    res.status(201).json({ from: m.from, text: m.text, createdAt: m.createdAt });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/customer-support", async (req, res) => {
  try {
    const tickets = await CustomerSupportTicket.find()
      .populate("userId", "name email phone")
      .sort({ updatedAt: -1 })
      .lean();
    res.json(
      tickets.map((t) => ({
        id: t._id.toString(),
        ticketId: t.ticketId,
        category: t.category,
        subject: t.subject,
        status: t.status,
        customerName: t.userId?.name,
        customerEmail: t.userId?.email,
        customerPhone: t.userId?.phone,
        userId: t.userId?._id?.toString(),
        lastMessage: t.messages?.length ? t.messages[t.messages.length - 1].text : t.description,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      }))
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/customer-support/:ticketId", async (req, res) => {
  try {
    const tid = toObjectId(req.params.ticketId);
    if (!tid) return res.status(400).json({ error: "Invalid ticket id" });
    const ticket = await CustomerSupportTicket.findById(tid)
      .populate("userId", "name email phone")
      .lean();
    if (!ticket) return res.status(404).json({ error: "Ticket not found" });
    res.json({
      id: ticket._id.toString(),
      ticketId: ticket.ticketId,
      category: ticket.category,
      subject: ticket.subject,
      description: ticket.description,
      status: ticket.status,
      customer: ticket.userId
        ? { name: ticket.userId.name, email: ticket.userId.email, phone: ticket.userId.phone }
        : null,
      messages: (ticket.messages || []).map((m) => ({ from: m.from, text: m.text, createdAt: m.createdAt })),
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/customer-support/:ticketId/reply", async (req, res) => {
  try {
    const tid = toObjectId(req.params.ticketId);
    if (!tid) return res.status(400).json({ error: "Invalid ticket id" });
    const { text } = req.body;
    if (!text || typeof text !== "string" || !text.trim()) return res.status(400).json({ error: "Message text required" });
    const ticket = await CustomerSupportTicket.findById(tid);
    if (!ticket) return res.status(404).json({ error: "Ticket not found" });
    ticket.messages.push({ from: "admin", text: text.trim() });
    if (ticket.status === "open") ticket.status = "in_progress";
    await ticket.save();
    const m = ticket.messages[ticket.messages.length - 1];
    res.status(201).json({ from: m.from, text: m.text, createdAt: m.createdAt });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/customer-support/:ticketId/status", async (req, res) => {
  try {
    const tid = toObjectId(req.params.ticketId);
    if (!tid) return res.status(400).json({ error: "Invalid ticket id" });
    const { status } = req.body;
    const allowed = ["open", "in_progress", "resolved", "closed"];
    if (!allowed.includes(status)) return res.status(400).json({ error: "Invalid status" });
    const ticket = await CustomerSupportTicket.findByIdAndUpdate(tid, { status }, { new: true });
    if (!ticket) return res.status(404).json({ error: "Ticket not found" });
    res.json({ id: ticket._id.toString(), status: ticket.status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- Societies (admin) ----------
router.get("/societies", async (req, res) => {
  try {
    const { search, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (search && String(search).trim()) {
      const s = String(search).trim();
      filter.$or = [
        { societyName: new RegExp(s, "i") },
        { registrationNo: new RegExp(s, "i") },
        { pocName: new RegExp(s, "i") },
        { pocEmail: new RegExp(s, "i") },
        { city: new RegExp(s, "i") },
      ];
    }
    const skip = (Math.max(1, Number(page)) - 1) * Math.min(100, Math.max(1, Number(limit)));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));
    const [list, total] = await Promise.all([
      Society.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      Society.countDocuments(filter),
    ]);
    const societies = await Promise.all(
      list.map(async (soc) => {
        const memberCount = await User.countDocuments({ societyId: soc._id, role: "customer" });
        const activeSubscriptions = await Subscription.countDocuments({ userId: soc.userId, status: "active" });
        return {
          id: soc._id.toString(),
          societyName: soc.societyName,
          registrationNo: soc.registrationNo,
          gstNumber: soc.gstNumber || "",
          pocName: soc.pocName,
          pocEmail: soc.pocEmail,
          pocPhone: soc.pocPhone,
          address: soc.address || "",
          city: soc.city || "",
          userId: soc.userId?.toString() || "",
          onboardingStatus: soc.onboardingStatus || "approved",
          memberCount,
          activeSubscriptions,
          createdAt: soc.createdAt,
        };
      })
    );
    res.json({ societies, total, page: Number(page) || 1, limit: limitNum });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/societies/:id", async (req, res) => {
  try {
    const sid = toObjectId(req.params.id);
    if (!sid) return res.status(400).json({ error: "Invalid society id" });
    const society = await Society.findById(sid).lean();
    if (!society) return res.status(404).json({ error: "Society not found" });
    const members = await User.find({ societyId: society._id, role: "customer" })
      .select("name email phone userCode createdAt")
      .sort({ createdAt: -1 })
      .lean();
    const subscriptions = await Subscription.find({ userId: society.userId })
      .sort({ createdAt: -1 })
      .lean();
    const deliveryPartners = await DeliveryPartner.find({ onboardingStatus: "approved" })
      .select("name phone vehicleType")
      .lean();
    res.json({
      society: {
        id: society._id.toString(),
        societyName: society.societyName,
        registrationNo: society.registrationNo,
        gstNumber: society.gstNumber || "",
        pocName: society.pocName,
        pocEmail: society.pocEmail,
        pocPhone: society.pocPhone,
        address: society.address || "",
        city: society.city || "",
        userId: society.userId?.toString() || "",
        onboardingStatus: society.onboardingStatus || "approved",
        memberCount: members.length,
        createdAt: society.createdAt,
      },
      members: members.map((m) => ({
        id: m._id.toString(),
        name: m.name,
        email: m.email,
        phone: m.phone || "",
        userCode: m.userCode || "",
        createdAt: m.createdAt,
      })),
      subscriptions: subscriptions.map((s) => ({
        id: s._id.toString(),
        subscriptionId: s.subscriptionId || s._id.toString(),
        planName: s.planName,
        productLabel: s.productLabel,
        productKey: s.productKey,
        frequency: s.frequency,
        totalPrice: s.totalPrice,
        quantity: s.quantity,
        selectedDates: s.selectedDates,
        status: s.status,
        subscriptionChannel: s.subscriptionChannel || "society",
        planCategory: s.planCategory || "society",
        deliveryPartnerId: s.deliveryPartnerId ? String(s.deliveryPartnerId) : null,
        preferredDeliveryTime: s.preferredDeliveryTime || "",
        deliveryAddress: s.deliveryAddress || "",
        locality: s.locality || "",
        pinCode: s.pinCode || "",
        createdAt: s.createdAt,
      })),
      deliveryPartners: deliveryPartners.map((d) => ({
        id: d._id.toString(),
        name: d.name,
        phone: d.phone || "",
        vehicleType: d.vehicleType || "",
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/societies/:societyId/subscriptions/:subscriptionId/delivery", async (req, res) => {
  try {
    const societyId = toObjectId(req.params.societyId);
    const subId = toObjectId(req.params.subscriptionId);
    if (!societyId || !subId) return res.status(400).json({ error: "Invalid id" });
    const society = await Society.findById(societyId).lean();
    if (!society) return res.status(404).json({ error: "Society not found" });
    const sub = await Subscription.findOne({ _id: subId, userId: society.userId });
    if (!sub) return res.status(404).json({ error: "Subscription not found" });
    const { deliveryPartnerId, pickupHubId } = req.body;
    if (deliveryPartnerId !== undefined) {
      sub.deliveryPartnerId = deliveryPartnerId ? toObjectId(deliveryPartnerId) : null;
    }
    if (pickupHubId !== undefined) {
      sub.pickupHubId = pickupHubId ? toObjectId(pickupHubId) : null;
    }
    await sub.save();
    res.json({ id: sub._id.toString(), deliveryPartnerId: sub.deliveryPartnerId?.toString() || null, pickupHubId: sub.pickupHubId?.toString() || null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/stores", async (req, res) => {
  try {
    const { status, search } = req.query;
    const filter = {};
    if (status && ["pending", "approved", "rejected"].includes(status)) filter.status = status;
    let list = await Store.find(filter)
      .sort({ createdAt: -1 })
      .populate("supplierId", "name contactPerson email phone")
      .lean();
    if (search && String(search).trim()) {
      const re = new RegExp(String(search).trim(), "i");
      list = list.filter(
        (s) =>
          re.test(s.name || "") ||
          re.test(s.city || "") ||
          re.test(s.supplierId?.name || "") ||
          re.test(s.supplierId?.contactPerson || "")
      );
    }
    res.json({
      stores: list.map((s) => ({
        id: s._id.toString(),
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
        supplier: s.supplierId
          ? {
              id: s.supplierId._id.toString(),
              name: s.supplierId.name || s.supplierId.contactPerson || "",
              email: s.supplierId.email || "",
              phone: s.supplierId.phone || "",
            }
          : null,
      })),
      total: list.length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/stores/:id/approve", async (req, res) => {
  try {
    const id = toObjectId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid store id" });
    const store = await Store.findById(id);
    if (!store) return res.status(404).json({ error: "Store not found" });
    store.status = "approved";
    store.rejectionReason = "";
    store.approvedAt = new Date();
    store.approvedBy = req.adminUser?._id || req.user?._id;
    await store.save();
    res.json({ id: store._id.toString(), status: store.status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/stores/:id/reject", async (req, res) => {
  try {
    const id = toObjectId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid store id" });
    const store = await Store.findById(id);
    if (!store) return res.status(404).json({ error: "Store not found" });
    store.status = "rejected";
    store.rejectionReason = String(req.body?.reason || "Not approved").trim();
    store.approvedAt = undefined;
    await store.save();
    res.json({ id: store._id.toString(), status: store.status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function mapAdminProduct(p) {
  const sid = p.supplierId;
  const supplierIdStr = sid != null ? (sid._id ? String(sid._id) : String(sid)) : "";
  const supplierName =
    sid && typeof sid === "object" ? String(sid.name || sid.contactPerson || "") : "";
  return {
    id: p._id.toString(),
    productName: p.productName || "",
    productType: p.productType || "jar",
    price: typeof p.price === "number" ? p.price : Number(p.price) || 0,
    priceUnit: p.priceUnit || "",
    delivery: p.delivery || "",
    inStock: p.inStock !== false,
    stockQty: typeof p.stockQty === "number" ? p.stockQty : Number(p.stockQty) || 0,
    capacityL: typeof p.capacityL === "number" ? p.capacityL : Number(p.capacityL) || 20,
    audience: p.audience || "customer",
    waterQuality: p.waterQuality || "",
    supplierId: supplierIdStr,
    supplierName,
    createdAt: p.createdAt,
  };
}

/** List all supplier catalog products (any supplier). */
router.get("/products", async (req, res) => {
  try {
    const { search, supplierId, audience, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (supplierId && mongoose.Types.ObjectId.isValid(String(supplierId))) {
      filter.supplierId = supplierId;
    }
    if (audience === "society" || audience === "customer") filter.audience = audience;

    const q = String(search || "").trim();
    if (q) {
      const re = new RegExp(q, "i");
      const supplierMatches = await Supplier.find({
        $or: [{ name: re }, { contactPerson: re }, { email: re }],
      })
        .select("_id")
        .lean();
      const supplierIds = supplierMatches.map((s) => s._id);
      const or = [{ productName: re }, { productType: re }];
      if (supplierIds.length) or.push({ supplierId: { $in: supplierIds } });
      if (mongoose.Types.ObjectId.isValid(q) && q.length === 24) or.push({ _id: q });
      filter.$or = or;
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const total = await Product.countDocuments(filter);
    const list = await Product.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate("supplierId", "name contactPerson email")
      .lean();

    res.json({
      products: list.map(mapAdminProduct),
      total,
      page: pageNum,
      limit: limitNum,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** Delete any supplier product (master / admin / sub-admin). */
router.delete("/products/:id", async (req, res) => {
  try {
    const id = toObjectId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid product id" });
    const p = await Product.findByIdAndDelete(id);
    if (!p) return res.status(404).json({ error: "Product not found" });
    res.json({ ok: true, id: p._id.toString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
