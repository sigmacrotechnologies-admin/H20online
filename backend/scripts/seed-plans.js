require("dotenv").config();
const mongoose = require("mongoose");
const Plan = require("../models/Plan");
const PlanProduct = require("../models/PlanProduct");

const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/h20online";

const planSeeds = [
  { name: "Basic Plan", slug: "basic", planCategory: "individual", maxQuantityPerProduct: 5, comingSoon: false },
  { name: "Family Pack", slug: "family", planCategory: "individual", maxQuantityPerProduct: 99, comingSoon: false },
  { name: "Active Plan", slug: "active", planCategory: "individual", maxQuantityPerProduct: 5, comingSoon: true },
  { name: "Premium Plan", slug: "premium", planCategory: "individual", maxQuantityPerProduct: 5, comingSoon: true },
  { name: "Bulk Supply Plan", slug: "bulk", planCategory: "bulk", maxQuantityPerProduct: 50, comingSoon: false },
  { name: "Society Tanker Plan", slug: "society-tanker", planCategory: "society", maxQuantityPerProduct: 20, comingSoon: false },
];

const individualProducts = [
  { productKey: "1l-bottle", productLabel: "1L Bottle", priceDaily: 20, priceWeekly: 120, priceMonthly: 400 },
  { productKey: "2l-bottle", productLabel: "2L Bottle", priceDaily: 30, priceWeekly: 180, priceMonthly: 600 },
  { productKey: "5l-bottle", productLabel: "5L Bottle", priceDaily: 70, priceWeekly: 400, priceMonthly: 1400 },
  { productKey: "10l-jar", productLabel: "10L Jar", priceDaily: 120, priceWeekly: 700, priceMonthly: 2400 },
  { productKey: "20l-jar", productLabel: "20L Jar", priceDaily: 200, priceWeekly: 1100, priceMonthly: 3800 },
  { productKey: "20l-can", productLabel: "20L Can", priceDaily: 200, priceWeekly: 1100, priceMonthly: 3800 },
];

const bulkProducts = [
  { productKey: "tanker-5000l", productLabel: "5000L Water Tanker", priceDaily: 2500, priceWeekly: 15000, priceMonthly: 55000 },
  { productKey: "tanker-3000l", productLabel: "3000L Mini Tanker", priceDaily: 1800, priceWeekly: 11000, priceMonthly: 40000 },
  { productKey: "commercial-20l-case", productLabel: "Commercial 20L Jar (Case)", priceDaily: 350, priceWeekly: 2100, priceMonthly: 7500 },
  { productKey: "commercial-dispenser", productLabel: "Commercial Dispenser Refill", priceDaily: 450, priceWeekly: 2800, priceMonthly: 9800 },
  { productKey: "bulk-50l", productLabel: "50L Commercial Drum", priceDaily: 280, priceWeekly: 1650, priceMonthly: 5800 },
];

const societyProducts = [
  { productKey: "society-tanker-standard", productLabel: "Standard Tanker Load", priceDaily: 2200, priceWeekly: 14000, priceMonthly: 52000 },
  { productKey: "society-tanker-purified", productLabel: "Purified Tanker Load", priceDaily: 2600, priceWeekly: 16000, priceMonthly: 58000 },
  { productKey: "society-tanker-ro", productLabel: "RO Tanker Load", priceDaily: 3000, priceWeekly: 18500, priceMonthly: 65000 },
  { productKey: "society-commercial-jar", productLabel: "Commercial Jar Bulk", priceDaily: 400, priceWeekly: 2400, priceMonthly: 8500 },
];

async function upsertPlanProducts(plan, products) {
  if (!plan) return;
  for (const prod of products) {
    await PlanProduct.findOneAndUpdate(
      { planId: plan._id, productKey: prod.productKey },
      { ...prod, planId: plan._id },
      { upsert: true }
    );
  }
}

async function seedPlans() {
  await mongoose.connect(uri);
  console.log("Connected to", uri);

  for (const p of planSeeds) {
    await Plan.findOneAndUpdate({ slug: p.slug }, p, { upsert: true, new: true });
  }
  console.log("Plans upserted.");

  const basicPlan = await Plan.findOne({ slug: "basic" });
  const familyPlan = await Plan.findOne({ slug: "family" });
  const bulkPlan = await Plan.findOne({ slug: "bulk" });
  const societyPlan = await Plan.findOne({ slug: "society-tanker" });

  await upsertPlanProducts(basicPlan, individualProducts);
  await upsertPlanProducts(familyPlan, individualProducts);
  await upsertPlanProducts(bulkPlan, bulkProducts);
  await upsertPlanProducts(societyPlan, societyProducts);

  console.log("Plan products upserted (individual, bulk, society).");
  console.log("Seed plans done.");
  process.exit(0);
}

seedPlans().catch((err) => {
  console.error(err);
  process.exit(1);
});
