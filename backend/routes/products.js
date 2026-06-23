const express = require("express");
const Product = require("../models/Product");
const Supplier = require("../models/Supplier");
const Store = require("../models/Store");
const { auth } = require("../middleware/auth");

const router = express.Router();
const DEFAULT_PRODUCT_IMAGE = "https://placehold.co/400x300?text=H2O+Product";
const { WATER_QUALITY_LEVELS } = require("../constants/waterQuality");

function mapProduct(p) {
  const sid = p.supplierId;
  const supplierIdStr = sid != null ? (sid._id ? String(sid._id) : String(sid)) : "";
  const supplierName = sid && typeof sid === "object" && sid.name ? String(sid.name) : "";
  const st = p.storeId;
  const storeIdStr = st != null ? (st._id ? String(st._id) : String(st)) : "";
  const storeObj = st && typeof st === "object" ? st : null;
  const storeApproved = storeObj && storeObj.status === "approved";
  const storeName = storeApproved && storeObj.name ? String(storeObj.name) : "";
  const storeLat = storeApproved && storeObj.latitude != null ? Number(storeObj.latitude) : null;
  const storeLng = storeApproved && storeObj.longitude != null ? Number(storeObj.longitude) : null;
  const supplierLat =
    sid && typeof sid === "object" && sid.latitude != null ? Number(sid.latitude) : null;
  const supplierLng =
    sid && typeof sid === "object" && sid.longitude != null ? Number(sid.longitude) : null;
  return {
    id: (p._id && p._id.toString) ? p._id.toString() : String(p._id),
    productName: p.productName != null ? String(p.productName) : "",
    productType: p.productType != null ? String(p.productType) : "jar",
    imageUrl: p.imageUrl != null && String(p.imageUrl).trim() ? String(p.imageUrl).trim() : DEFAULT_PRODUCT_IMAGE,
    supplierName,
    supplierId: supplierIdStr,
    supplierLatitude: Number.isFinite(supplierLat) ? supplierLat : null,
    supplierLongitude: Number.isFinite(supplierLng) ? supplierLng : null,
    storeId: storeApproved ? storeIdStr : "",
    storeName,
    storeType: storeApproved && storeObj?.storeType ? storeObj.storeType : "",
    storeLatitude: Number.isFinite(storeLat) ? storeLat : null,
    storeLongitude: Number.isFinite(storeLng) ? storeLng : null,
    hasRegisteredStore: !!storeApproved,
    price: typeof p.price === "number" ? p.price : Number(p.price) || 0,
    priceUnit: p.priceUnit != null ? String(p.priceUnit) : "20L Jar",
    delivery: p.delivery != null ? String(p.delivery) : "",
    inStock: p.inStock !== false,
    stockQty: typeof p.stockQty === "number" ? p.stockQty : Number(p.stockQty) || 0,
    capacityL: typeof p.capacityL === "number" ? p.capacityL : Number(p.capacityL) || 20,
    categories: Array.isArray(p.categories) ? p.categories : [],
    badge: p.badge != null ? String(p.badge) : "",
    audience: p.audience || "customer",
    waterQuality: p.waterQuality || "",
    rating: typeof p.rating === "number" ? p.rating : Number(p.rating) || 4,
    reviewCount: p.reviewCount != null ? String(p.reviewCount) : "0",
  };
}

router.get("/", async (req, res) => {
  try {
    const { search, minL, maxL, category, sort, audience, waterQuality } = req.query;
    const filter = {};
    if (audience === "society") {
      filter.audience = "society";
    } else {
      filter.$or = [{ audience: "customer" }, { audience: { $exists: false } }];
    }
    if (waterQuality && String(waterQuality).trim()) {
      filter.waterQuality = String(waterQuality).trim();
    }
    if (search && search.trim()) {
      filter.$or = [
        { productName: new RegExp(search.trim(), "i") },
        { categories: new RegExp(search.trim(), "i") },
      ];
    }
    if (minL != null && minL !== "") { filter.capacityL = filter.capacityL || {}; filter.capacityL.$gte = Number(minL); }
    if (maxL != null && maxL !== "") { filter.capacityL = filter.capacityL || {}; filter.capacityL.$lte = Number(maxL); }
    if (category && category.length) filter.categories = category;
    let q = Product.find(filter)
      .populate("supplierId", "name latitude longitude")
      .populate("storeId", "name latitude longitude status storeType");
    if (sort === "price") q = q.sort({ price: 1 });
    else if (sort === "rating") q = q.sort({ rating: -1 });
    else if (sort === "delivery") q = q.sort({ delivery: 1 });
    const products = await q.lean();
    const list = [];
    for (const p of products) {
      try {
        list.push(mapProduct(p));
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
      productType,
      imageUrl,
      price,
      priceUnit,
      delivery,
      inStock,
      stockQty,
      capacityL,
      categories,
      badge,
      rating,
      reviewCount,
      audience,
      waterQuality,
      storeId,
    } = req.body;
    if (!productName || price == null || price === "") {
      return res.status(400).json({ error: "Product name and price are required" });
    }
    const productAudience = audience === "society" ? "society" : "customer";
    let quality = waterQuality && WATER_QUALITY_LEVELS.includes(waterQuality) ? waterQuality : "";
    if (productAudience === "society" && !quality) {
      return res.status(400).json({ error: "Water quality is required for society products" });
    }
    let linkedStoreId = null;
    if (storeId && String(storeId).trim()) {
      const storeDoc = await Store.findOne({
        _id: storeId,
        supplierId: supplier._id,
        status: "approved",
      });
      if (!storeDoc) {
        return res.status(400).json({ error: "Select an approved store/warehouse for this product" });
      }
      linkedStoreId = storeDoc._id;
    }
    const product = await Product.create({
      productName: String(productName).trim(),
      supplierId: supplier._id,
      storeId: linkedStoreId,
      productType: productType != null && String(productType).trim() ? String(productType).trim() : productAudience === "society" ? "tanker" : "jar",
      imageUrl: imageUrl != null && String(imageUrl).trim() ? String(imageUrl).trim() : DEFAULT_PRODUCT_IMAGE,
      price: Number(price),
      priceUnit: priceUnit != null ? String(priceUnit) : productAudience === "society" ? "Tanker load" : "20L Jar",
      delivery: delivery != null ? String(delivery) : productAudience === "society" ? "Same day" : "20-30 min",
      inStock: stockQty != null ? Number(stockQty) > 0 : inStock !== false,
      stockQty: stockQty != null ? Math.max(0, Number(stockQty) || 0) : 0,
      capacityL: capacityL != null ? Number(capacityL) : productAudience === "society" ? 5000 : 20,
      categories: Array.isArray(categories) ? categories : [],
      badge: badge && ["subscription", "premium"].includes(badge) ? badge : "",
      audience: productAudience,
      waterQuality: productAudience === "society" ? quality : "",
      rating: rating != null ? Number(rating) : 4,
      reviewCount: reviewCount != null ? String(reviewCount) : "0",
    });
    const p = await Product.findById(product._id)
      .populate("supplierId", "name latitude longitude")
      .populate("storeId", "name latitude longitude status storeType")
      .lean();
    res.status(201).json(mapProduct(p));
  } catch (err) {
    console.error("Product create error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const p = await Product.findById(req.params.id)
      .populate("supplierId", "name latitude longitude")
      .populate("storeId", "name latitude longitude status storeType")
      .lean();
    if (!p) return res.status(404).json({ error: "Product not found" });
    res.json(mapProduct(p));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id", auth, async (req, res) => {
  try {
    const supplier = await Supplier.findOne({ userId: req.user._id });
    if (!supplier) return res.status(403).json({ error: "Supplier profile required" });
    const p = await Product.findOne({ _id: req.params.id, supplierId: supplier._id });
    if (!p) return res.status(404).json({ error: "Product not found" });

    const {
      productName,
      productType,
      imageUrl,
      price,
      priceUnit,
      delivery,
      inStock,
      stockQty,
      capacityL,
      categories,
      badge,
      rating,
      reviewCount,
      audience,
      waterQuality,
      storeId,
    } = req.body || {};

    if (productName !== undefined && String(productName).trim()) p.productName = String(productName).trim();
    if (productType !== undefined) p.productType = String(productType || "jar").trim() || "jar";
    if (imageUrl !== undefined) p.imageUrl = String(imageUrl || "").trim() || DEFAULT_PRODUCT_IMAGE;
    if (price !== undefined && price !== null && price !== "") p.price = Number(price);
    if (priceUnit !== undefined) p.priceUnit = String(priceUnit || "20L Jar");
    if (delivery !== undefined) p.delivery = String(delivery || "20-30 min");
    if (stockQty !== undefined && stockQty !== null && stockQty !== "") {
      p.stockQty = Math.max(0, Number(stockQty) || 0);
      p.inStock = p.stockQty > 0;
    } else if (inStock !== undefined) {
      p.inStock = inStock !== false;
    }
    if (capacityL !== undefined && capacityL !== null && capacityL !== "") p.capacityL = Number(capacityL) || 20;
    if (categories !== undefined) p.categories = Array.isArray(categories) ? categories : [];
    if (badge !== undefined) p.badge = badge && ["subscription", "premium"].includes(badge) ? badge : "";
    if (rating !== undefined) p.rating = Number(rating) || 4;
    if (reviewCount !== undefined) p.reviewCount = String(reviewCount);
    if (audience !== undefined) {
      const nextAudience = audience === "society" ? "society" : "customer";
      p.audience = nextAudience;
      if (nextAudience === "customer") p.waterQuality = "";
    }
    if (waterQuality !== undefined) {
      const q = waterQuality && WATER_QUALITY_LEVELS.includes(waterQuality) ? waterQuality : "";
      if (p.audience === "society" && !q) {
        return res.status(400).json({ error: "Water quality is required for society products" });
      }
      p.waterQuality = p.audience === "society" ? q : "";
    }
    if (storeId !== undefined) {
      if (!storeId || storeId === "") {
        p.storeId = null;
      } else {
        const storeDoc = await Store.findOne({
          _id: storeId,
          supplierId: supplier._id,
          status: "approved",
        });
        if (!storeDoc) {
          return res.status(400).json({ error: "Select an approved store/warehouse" });
        }
        p.storeId = storeDoc._id;
      }
    }

    await p.save();
    const out = await Product.findById(p._id)
      .populate("supplierId", "name latitude longitude")
      .populate("storeId", "name latitude longitude status storeType")
      .lean();
    res.json(mapProduct(out));
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
