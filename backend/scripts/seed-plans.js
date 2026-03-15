require("dotenv").config();
const mongoose = require("mongoose");
const Plan = require("../models/Plan");
const PlanProduct = require("../models/PlanProduct");

const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/h20online";

const planSeeds = [
  { name: "Basic Plan", slug: "basic", maxQuantityPerProduct: 5, comingSoon: false },
  { name: "Family Pack", slug: "family", maxQuantityPerProduct: 99, comingSoon: false },
  { name: "Active Plan", slug: "active", maxQuantityPerProduct: 5, comingSoon: true },
  { name: "Premium Plan", slug: "premium", maxQuantityPerProduct: 5, comingSoon: true },
];

const basicProducts = [
  { productKey: "1l-bottle", productLabel: "1L Bottle", priceDaily: 20, priceWeekly: 120, priceMonthly: 400 },
  { productKey: "2l-bottle", productLabel: "2L Bottle", priceDaily: 30, priceWeekly: 180, priceMonthly: 600 },
  { productKey: "5l-bottle", productLabel: "5L Bottle", priceDaily: 70, priceWeekly: 400, priceMonthly: 1400 },
  { productKey: "10l-jar", productLabel: "10L Jar", priceDaily: 120, priceWeekly: 700, priceMonthly: 2400 },
  { productKey: "20l-jar", productLabel: "20L Jar", priceDaily: 200, priceWeekly: 1100, priceMonthly: 3800 },
  { productKey: "20l-can", productLabel: "20L Can", priceDaily: 200, priceWeekly: 1100, priceMonthly: 3800 },
];

async function seedPlans() {
  await mongoose.connect(uri);
  console.log("Connected to", uri);

  for (const p of planSeeds) {
    await Plan.findOneAndUpdate({ slug: p.slug }, p, { upsert: true, new: true });
  }
  console.log("Plans upserted.");

  const basicPlan = await Plan.findOne({ slug: "basic" });
  const familyPlan = await Plan.findOne({ slug: "family" });
  if (basicPlan) {
    for (const prod of basicProducts) {
      await PlanProduct.findOneAndUpdate(
        { planId: basicPlan._id, productKey: prod.productKey },
        { ...prod, planId: basicPlan._id },
        { upsert: true }
      );
    }
    console.log("Basic plan products upserted.");
  }
  if (familyPlan) {
    for (const prod of basicProducts) {
      await PlanProduct.findOneAndUpdate(
        { planId: familyPlan._id, productKey: prod.productKey },
        { ...prod, planId: familyPlan._id },
        { upsert: true }
      );
    }
    console.log("Family plan products upserted.");
  }

  console.log("Seed plans done.");
  process.exit(0);
}

seedPlans().catch((err) => {
  console.error(err);
  process.exit(1);
});
