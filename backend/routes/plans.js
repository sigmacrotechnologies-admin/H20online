const express = require("express");
const Plan = require("../models/Plan");
const PlanProduct = require("../models/PlanProduct");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const plans = await Plan.find().sort({ slug: 1 }).lean();
    res.json(plans.map((p) => ({
      id: p._id.toString(),
      name: p.name,
      slug: p.slug,
      maxQuantityPerProduct: p.maxQuantityPerProduct,
      comingSoon: p.comingSoon,
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:slug/products", async (req, res) => {
  try {
    const plan = await Plan.findOne({ slug: req.params.slug }).lean();
    if (!plan) return res.status(404).json({ error: "Plan not found" });
    const products = await PlanProduct.find({ planId: plan._id }).sort({ productKey: 1 }).lean();
    res.json({
      plan: { id: plan._id.toString(), name: plan.name, slug: plan.slug, maxQuantityPerProduct: plan.maxQuantityPerProduct, comingSoon: plan.comingSoon },
      products: products.map((p) => ({
        id: p._id.toString(),
        productKey: p.productKey,
        productLabel: p.productLabel,
        priceDaily: p.priceDaily,
        priceWeekly: p.priceWeekly,
        priceMonthly: p.priceMonthly,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
