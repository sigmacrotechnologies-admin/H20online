const express = require("express");
const Product = require("../models/Product");
const Supplier = require("../models/Supplier");
const { auth } = require("../middleware/auth");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const { search, minL, maxL, category, sort } = req.query;
    const filter = {};
    if (search && search.trim()) {
      filter.$or = [
        { productName: new RegExp(search.trim(), "i") },
        { categories: new RegExp(search.trim(), "i") },
      ];
    }
    if (minL != null && minL !== "") { filter.capacityL = filter.capacityL || {}; filter.capacityL.$gte = Number(minL); }
    if (maxL != null && maxL !== "") { filter.capacityL = filter.capacityL || {}; filter.capacityL.$lte = Number(maxL); }
    if (category && category.length) filter.categories = category;
    let q = Product.find(filter).populate("supplierId", "name");
    if (sort === "price") q = q.sort({ price: 1 });
    else if (sort === "rating") q = q.sort({ rating: -1 });
    else if (sort === "delivery") q = q.sort({ delivery: 1 });
    const products = await q.lean();
    const list = [];
    for (const p of products) {
      try {
        const sid = p.supplierId;
        const supplierIdStr = sid != null ? (sid._id ? String(sid._id) : String(sid)) : "";
        const supplierName = sid && typeof sid === "object" && sid.name ? String(sid.name) : "";
        list.push({
          id: (p._id && p._id.toString) ? p._id.toString() : String(p._id),
          productName: p.productName != null ? String(p.productName) : "",
          supplierName,
          supplierId: supplierIdStr,
          price: typeof p.price === "number" ? p.price : Number(p.price) || 0,
          priceUnit: p.priceUnit != null ? String(p.priceUnit) : "20L Jar",
          delivery: p.delivery != null ? String(p.delivery) : "",
          inStock: p.inStock !== false,
          capacityL: typeof p.capacityL === "number" ? p.capacityL : Number(p.capacityL) || 20,
          categories: Array.isArray(p.categories) ? p.categories : [],
          badge: p.badge != null ? String(p.badge) : "",
          rating: typeof p.rating === "number" ? p.rating : Number(p.rating) || 4,
          reviewCount: p.reviewCount != null ? String(p.reviewCount) : "0",
        });
      } catch (e) {
        console.error("Product map skip:", p._id, e.message);
      }
    }
    console.log("GET /api/products ->", list.length, "products");
    res.json(list);
  } catch (err) {
    console.error("Products list error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post("/", auth, async (req, res) => {
  try {
    const supplier = await Supplier.findOne({ userId: req.user._id });
    if (!supplier) return res.status(403).json({ error: "Supplier profile required to add products" });
    const {
      productName,
      price,
      priceUnit,
      delivery,
      inStock,
      capacityL,
      categories,
      badge,
      rating,
      reviewCount,
    } = req.body;
    if (!productName || price == null || price === "") {
      return res.status(400).json({ error: "Product name and price are required" });
    }
    const product = await Product.create({
      productName: String(productName).trim(),
      supplierId: supplier._id,
      price: Number(price),
      priceUnit: priceUnit != null ? String(priceUnit) : "20L Jar",
      delivery: delivery != null ? String(delivery) : "20-30 min",
      inStock: inStock !== false,
      capacityL: capacityL != null ? Number(capacityL) : 20,
      categories: Array.isArray(categories) ? categories : [],
      badge: badge && ["subscription", "premium"].includes(badge) ? badge : "",
      rating: rating != null ? Number(rating) : 4,
      reviewCount: reviewCount != null ? String(reviewCount) : "0",
    });
    const p = await Product.findById(product._id).populate("supplierId", "name").lean();
    const sid = p.supplierId;
    res.status(201).json({
      id: p._id.toString(),
      productName: p.productName || "",
      supplierName: sid && typeof sid === "object" && sid.name ? sid.name : "",
      supplierId: sid ? String(sid._id) : "",
      price: p.price,
      priceUnit: p.priceUnit,
      delivery: p.delivery,
      inStock: p.inStock !== false,
      capacityL: p.capacityL || 20,
      categories: p.categories || [],
      badge: p.badge || "",
      rating: p.rating,
      reviewCount: p.reviewCount,
    });
  } catch (err) {
    console.error("Product create error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const p = await Product.findById(req.params.id).populate("supplierId", "name").lean();
    if (!p) return res.status(404).json({ error: "Product not found" });
    const sid = p.supplierId;
    const supplierName = sid && typeof sid === "object" && sid.name ? sid.name : "";
    const supplierIdStr = sid ? (sid._id ? String(sid._id) : String(sid)) : "";
    res.json({
      id: p._id.toString(),
      productName: p.productName || "",
      supplierName,
      supplierId: supplierIdStr,
      price: p.price,
      priceUnit: p.priceUnit,
      delivery: p.delivery,
      inStock: p.inStock !== false,
      capacityL: p.capacityL || 20,
      categories: p.categories || [],
      badge: p.badge || "",
      rating: p.rating,
      reviewCount: p.reviewCount,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", auth, async (req, res) => {
  try {
    const supplier = await Supplier.findOne({ userId: req.user._id });
    if (!supplier) return res.status(403).json({ error: "Supplier profile required" });
    const p = await Product.findOne({ _id: req.params.id, supplierId: supplier._id });
    if (!p) return res.status(404).json({ error: "Product not found" });
    await Product.findByIdAndDelete(p._id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
