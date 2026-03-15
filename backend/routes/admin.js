const express = require("express");
const mongoose = require("mongoose");
const User = require("../models/User");
const Order = require("../models/Order");
const Supplier = require("../models/Supplier");
const Plan = require("../models/Plan");
const PlanProduct = require("../models/PlanProduct");
const DeliveryPartner = require("../models/DeliveryPartner");
const SupplierSupportThread = require("../models/SupplierSupportThread");
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
    const u = await User.findById(id).select("-password").lean();
    if (!u) return res.status(404).json({ error: "User not found" });
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
    const { name, email, phone, age, gender, activityLevel, familyMembers } = req.body;
    if (name != null && typeof name === "string" && name.trim()) user.name = name.trim();
    if (email != null && typeof email === "string" && email.trim()) user.email = email.trim().toLowerCase();
    if (phone != null) user.phone = typeof phone === "string" ? phone.trim() : String(phone || "");
    if (age != null && age !== undefined) user.age = age;
    if (gender != null && gender !== undefined) user.gender = gender;
    if (activityLevel != null && activityLevel !== undefined) user.activityLevel = activityLevel;
    if (familyMembers != null && familyMembers !== undefined) user.familyMembers = familyMembers;
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
      Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum).populate("userId", "name email").lean(),
      Order.countDocuments(filter),
    ]);
    res.json({
      orders: orders.map((o) => ({
        id: o._id.toString(),
        userId: o.userId?._id?.toString(),
        userName: o.userId?.name,
        userEmail: o.userId?.email,
        items: o.items,
        total: o.total,
        status: o.status,
        paymentMethod: o.paymentMethod,
        address: o.address,
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
    const o = await Order.findById(id).populate("userId", "name email phone").lean();
    if (!o) return res.status(404).json({ error: "Order not found" });
    res.json({
      id: o._id.toString(),
      userId: o.userId?._id?.toString(),
      userName: o.userId?.name,
      userEmail: o.userId?.email,
      userPhone: o.userId?.phone,
      items: o.items,
      total: o.total,
      status: o.status,
      paymentMethod: o.paymentMethod,
      address: o.address,
      receiverName: o.receiverName,
      receiverPhone: o.receiverPhone,
      scheduledAt: o.scheduledAt,
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
    const filter = {};
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
      Supplier.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      Supplier.countDocuments(filter),
    ]);
    res.json({
      suppliers: list.map((s) => ({ ...s, id: s._id.toString(), _id: s._id.toString() })),
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
    const s = await Supplier.findById(id).lean();
    if (!s) return res.status(404).json({ error: "Supplier not found" });
    res.json({ ...s, id: s._id.toString(), _id: s._id.toString() });
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
    const s = supplier.toObject();
    res.status(201).json({ ...s, id: s._id.toString(), _id: s._id.toString() });
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
    const { name, slug, maxQuantityPerProduct, comingSoon } = req.body;
    if (name != null && typeof name === "string") plan.name = name.trim();
    if (slug != null && typeof slug === "string") plan.slug = slug.trim();
    if (maxQuantityPerProduct != null) plan.maxQuantityPerProduct = Number(maxQuantityPerProduct);
    if (comingSoon != null) plan.comingSoon = Boolean(comingSoon);
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
    const { productLabel, priceDaily, priceWeekly, priceMonthly } = req.body;
    if (productLabel != null && typeof productLabel === "string") pp.productLabel = productLabel.trim();
    if (priceDaily != null && !Number.isNaN(Number(priceDaily))) pp.priceDaily = Number(priceDaily);
    if (priceWeekly != null && !Number.isNaN(Number(priceWeekly))) pp.priceWeekly = Number(priceWeekly);
    if (priceMonthly != null && !Number.isNaN(Number(priceMonthly))) pp.priceMonthly = Number(priceMonthly);
    await pp.save();
    const out = pp.toObject();
    res.json({ ...out, id: out._id.toString(), _id: out._id.toString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- Financials (master or admin only) ----------
router.get("/financials", requireCanSeeFinancials, async (req, res) => {
  try {
    const orders = await Order.find({ status: { $ne: "cancelled" } }).lean();
    let totalRevenue = 0;
    let platformCutTotal = 0;
    const byDay = {};
    for (const o of orders) {
      const dateStr = o.createdAt ? new Date(o.createdAt).toISOString().slice(0, 10) : "";
      if (!byDay[dateStr]) byDay[dateStr] = { revenue: 0, platformCut: 0, orderCount: 0 };
      byDay[dateStr].revenue += o.total;
      byDay[dateStr].orderCount += 1;
      totalRevenue += o.total;
      const supplierIds = [...new Set(o.items.map((i) => i.supplierId && i.supplierId.toString()).filter(Boolean))];
      const isMultiSupplier = supplierIds.length > 1;
      const cutRate = isMultiSupplier ? 0.3 : 0.2;
      const cut = o.total * cutRate;
      platformCutTotal += cut;
      byDay[dateStr].platformCut += cut;
    }
    const sortedDays = Object.entries(byDay).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 30);
    res.json({
      totalRevenue,
      platformCutTotal,
      platformCutPercent: totalRevenue > 0 ? (platformCutTotal / totalRevenue) * 100 : 0,
      byDay: sortedDays.map(([date, data]) => ({ date, ...data })),
      orderCount: orders.length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- Delivery partner onboarding ----------
router.get("/delivery-partners", async (req, res) => {
  try {
    const { status, vehicleType, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status && ["pending", "approved"].includes(status)) filter.onboardingStatus = status;
    if (vehicleType && ["bicycle", "bike", "truck", "minivan", "camper", "cycle"].includes(vehicleType)) filter.vehicleType = vehicleType;
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

router.patch("/delivery-partners/:id/verify", async (req, res) => {
  try {
    const id = toObjectId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid id" });
    const dp = await DeliveryPartner.findById(id);
    if (!dp) return res.status(404).json({ error: "Delivery partner not found" });
    const { documentLicenseVerified, documentIdentityVerified, approve } = req.body;
    if (documentLicenseVerified !== undefined) dp.documentLicenseVerified = Boolean(documentLicenseVerified);
    if (documentIdentityVerified !== undefined) dp.documentIdentityVerified = Boolean(documentIdentityVerified);
    if (approve === true) {
      dp.documentLicenseVerified = true;
      dp.documentIdentityVerified = true;
      dp.onboardingStatus = "approved";
    } else if (dp.documentLicenseVerified && dp.documentIdentityVerified) dp.onboardingStatus = "approved";
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

module.exports = router;
