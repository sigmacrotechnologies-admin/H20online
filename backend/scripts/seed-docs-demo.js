/**
 * Idempotent demo data for app screen documentation.
 * Run: node backend/scripts/seed-docs-demo.js
 * Requires base seed (products/suppliers): npm run seed && npm run seed-plans && npm run seed-delivery-partners
 */
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Supplier = require("../models/Supplier");
const DeliveryPartner = require("../models/DeliveryPartner");
const Product = require("../models/Product");
const Order = require("../models/Order");
const Plan = require("../models/Plan");
const PlanProduct = require("../models/PlanProduct");
const Subscription = require("../models/Subscription");
const SubscriptionBill = require("../models/SubscriptionBill");
const Wallet = require("../models/Wallet");
const SavedAddress = require("../models/SavedAddress");
const WaterIntake = require("../models/WaterIntake");
const SupplierSupportThread = require("../models/SupplierSupportThread");
const DeliveryPartnerSupportThread = require("../models/DeliveryPartnerSupportThread");

const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/h20online";
const DEMO = {
  customer: { email: "customer@h2o.demo", password: "Demo@123", name: "Rohit Sharma", phone: "9988776655" },
  supplier: { email: "aquapure@example.com", password: "seedpass123" },
  delivery: { email: "rahul.dp@h2o.test", password: "delivery123" },
};

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function monthPeriod(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

async function upsertWallet(userId, balance, transactions) {
  await Wallet.findOneAndUpdate(
    { userId },
    { $set: { ownerType: "user", balance, transactions } },
    { upsert: true, new: true }
  );
}

async function seed() {
  await mongoose.connect(uri);
  console.log("Connected:", uri);

  const products = await Product.find().limit(8).lean();
  if (products.length === 0) {
    console.error("No products found. Run: cd backend && npm run seed && npm run seed-plans && npm run seed-delivery-partners");
    process.exit(1);
  }

  const supplierUser = await User.findOne({ email: DEMO.supplier.email });
  if (supplierUser) {
    supplierUser.password = DEMO.supplier.password;
    await supplierUser.save();
  }
  const supplier = supplierUser ? await Supplier.findOne({ userId: supplierUser._id }) : null;
  const deliveryUser = await User.findOne({ email: DEMO.delivery.email });
  const deliveryPartner = deliveryUser ? await DeliveryPartner.findOne({ userId: deliveryUser._id }) : null;

  if (!supplier || !deliveryPartner) {
    console.error("Supplier or delivery partner missing. Run npm run seed and npm run seed-delivery-partners");
    process.exit(1);
  }

  let customer = await User.findOne({ email: DEMO.customer.email });
  if (!customer) {
    customer = await User.create({
      name: DEMO.customer.name,
      email: DEMO.customer.email,
      phone: DEMO.customer.phone,
      password: DEMO.customer.password,
      role: "customer",
      age: 32,
      gender: "male",
      activityLevel: "moderate",
      familySize: 4,
    });
    console.log("Created demo customer:", DEMO.customer.email);
  }

  const addr1 = "Flat 402, Sunrise Apartments, Andheri West";
  const addr2 = "Office 12B, Sigma Tech Park, Powai";
  await SavedAddress.deleteMany({ userId: customer._id });
  await SavedAddress.insertMany([
    { userId: customer._id, houseNumber: "Flat 402", locality: "Andheri West", city: "Mumbai", state: "Maharashtra", pinCode: "400053", phoneNumber: DEMO.customer.phone, isDefault: true },
    { userId: customer._id, houseNumber: "Office 12B", locality: "Powai", city: "Mumbai", state: "Maharashtra", pinCode: "400076", phoneNumber: DEMO.customer.phone, isDefault: false },
  ]);

  await upsertWallet(customer._id, 8500, [
    { amount: 10000, type: "credit", ref: "topup", createdAt: new Date(Date.now() - 7 * 86400000) },
    { amount: 1500, type: "debit", ref: "order", createdAt: new Date(Date.now() - 3 * 86400000) },
    { amount: 380, type: "debit", ref: "bill", createdAt: new Date(Date.now() - 86400000) },
  ]);

  await upsertWallet(supplierUser._id, 12450, [
    { amount: 8200, type: "credit", ref: "supplier_payout", createdAt: new Date(Date.now() - 2 * 86400000) },
    { amount: 4250, type: "credit", ref: "supplier_payout", createdAt: new Date(Date.now() - 86400000) },
  ]);

  await upsertWallet(deliveryUser._id, 2340, [
    { amount: 1800, type: "credit", ref: "delivery", createdAt: new Date(Date.now() - 2 * 86400000) },
    { amount: 540, type: "credit", ref: "delivery", createdAt: new Date(Date.now() - 86400000) },
  ]);

  const p1 = products[0];
  const p2 = products[1] || products[0];
  const p3 = products[4] || products[0];
  const item = (p, qty = 1) => ({
    productId: p._id,
    productName: p.productName,
    supplierName: supplier.name || "AquaPure Water Co.",
    supplierId: p.supplierId || supplier._id,
    price: p.price,
    qty,
  });

  await Order.deleteMany({ userId: customer._id });

  const pendingOrder = await Order.create({
    userId: customer._id,
    orderId: "ORD_DEMO0001",
    items: [item(p1, 2), item(p2, 1)],
    total: p1.price * 2 + p2.price,
    paymentMethod: "wallet",
    status: "in_progress",
    address: addr1,
    receiverName: DEMO.customer.name,
    receiverPhone: DEMO.customer.phone,
    orderType: "instant",
    supplierResponses: [
      { supplierId: supplier._id, status: "pending", deliveryStage: "accepted", eta: "", remarks: "" },
    ],
  });

  const trackOrder = await Order.create({
    userId: customer._id,
    orderId: "ORD_DEMO0002",
    items: [item(p3, 1)],
    total: p3.price,
    paymentMethod: "wallet",
    status: "in_progress",
    address: addr1,
    receiverName: DEMO.customer.name,
    receiverPhone: DEMO.customer.phone,
    orderType: "instant",
    supplierResponses: [
      {
        supplierId: supplier._id,
        status: "accepted",
        deliveryStage: "picked_up",
        eta: "25 min",
        remarks: "Handle with care",
        deliveryPartnerId: deliveryPartner._id,
        deliveryPartnerName: deliveryPartner.name || "Rahul Rider",
        deliveryPartnerPhone: deliveryPartner.phone || "9876543210",
        requestedFleetType: "bike",
      },
    ],
  });

  const deliveredOrder = await Order.create({
    userId: customer._id,
    orderId: "ORD_DEMO0003",
    items: [item(p1, 1), item(p2, 2)],
    total: p1.price + p2.price * 2,
    paymentMethod: "wallet",
    status: "delivered",
    address: addr2,
    receiverName: DEMO.customer.name,
    receiverPhone: DEMO.customer.phone,
    orderType: "scheduled",
    scheduledAt: new Date(Date.now() - 2 * 86400000),
    supplierResponses: [
      {
        supplierId: supplier._id,
        status: "accepted",
        deliveryStage: "delivered",
        eta: "30 min",
        remarks: "Delivered on time",
        deliveryPartnerId: deliveryPartner._id,
        deliveryPartnerName: deliveryPartner.name || "Rahul Rider",
        deliveryPartnerPhone: deliveryPartner.phone || "9876543210",
      },
    ],
  });

  const supplierIncomingOrder = await Order.create({
    userId: customer._id,
    orderId: "ORD_DEMO0004",
    items: [item(p2, 3)],
    total: p2.price * 3,
    paymentMethod: "cod",
    status: "in_progress",
    address: "Shop 7, Link Road, Malad",
    receiverName: "Priya Mehta",
    receiverPhone: "9123456780",
    orderType: "instant",
    supplierResponses: [{ supplierId: supplier._id, status: "pending", deliveryStage: "accepted" }],
  });

  const basicPlan = await Plan.findOne({ slug: "basic" });
  let subscription = null;
  if (basicPlan) {
    const planProduct = await PlanProduct.findOne({ planId: basicPlan._id }).lean();
    await Subscription.deleteMany({ userId: customer._id });
    subscription = await Subscription.create({
      subscriptionId: "SUB-DEMO0001",
      userId: customer._id,
      planId: basicPlan._id,
      planName: basicPlan.name,
      productKey: planProduct?.productKey || "20l-jar",
      productLabel: planProduct?.productLabel || "20L Jar",
      frequency: "weekly",
      unitPrice: planProduct?.priceWeekly || 1100,
      quantity: 2,
      selectedDates: [],
      totalPrice: (planProduct?.priceWeekly || 1100) * 2,
      status: "active",
      preferredDeliveryTime: "7:00 AM - 8:00 AM",
      preferredTimeRangeStart: "7:00 AM",
      preferredTimeRangeEnd: "8:00 AM",
      deliveryPartnerId: deliveryPartner._id,
      deliveryAddress: addr1,
      locality: "Andheri West",
      pinCode: "400053",
    });

    const period = monthPeriod();
    await SubscriptionBill.deleteMany({ userId: customer._id });
    await SubscriptionBill.create({
      subscriptionId: subscription._id,
      userId: customer._id,
      amount: subscription.totalPrice,
      period,
      dueDate: new Date(new Date().getFullYear(), new Date().getMonth(), 5),
      status: "pending",
    });
    await SubscriptionBill.create({
      subscriptionId: subscription._id,
      userId: customer._id,
      amount: subscription.totalPrice,
      period: monthPeriod(new Date(Date.now() - 32 * 86400000)),
      dueDate: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 5),
      status: "paid",
      paidAt: new Date(Date.now() - 20 * 86400000),
    });
  }

  const today = todayStr();
  await WaterIntake.deleteMany({ userId: customer._id });
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });
  for (const date of weekDates) {
    const liters = date === today ? 1.8 : 1.2 + Math.random() * 1.5;
    await WaterIntake.create({
      userId: customer._id,
      date,
      entries: [
        { type: "glass", quantity: 4, volumeMl: 800, createdAt: new Date() },
        { type: "bottle", quantity: 2, volumeMl: Math.round(liters * 1000 - 800), createdAt: new Date() },
      ],
    });
  }

  await SupplierSupportThread.findOneAndUpdate(
    { supplierId: supplier._id },
    {
      $set: {
        messages: [
          { from: "supplier", text: "Hello, I need help updating my GST certificate.", createdAt: new Date(Date.now() - 3600000) },
          { from: "admin", text: "Hi! Please upload the new document in your profile. We will verify within 24 hours.", createdAt: new Date(Date.now() - 3000000) },
          { from: "supplier", text: "Uploaded. Please confirm.", createdAt: new Date(Date.now() - 1200000) },
        ],
      },
    },
    { upsert: true }
  );

  await DeliveryPartnerSupportThread.findOneAndUpdate(
    { deliveryPartnerId: deliveryPartner._id },
    {
      $set: {
        messages: [
          { from: "delivery_partner", text: "Route for Andheri West is unclear today.", createdAt: new Date(Date.now() - 7200000) },
          { from: "admin", text: "Use pickup hub Sigma Andheri. Subscription list updated.", createdAt: new Date(Date.now() - 6000000) },
        ],
      },
    },
    { upsert: true }
  );

  const demoData = {
    apiBase: process.env.API_BASE || "http://127.0.0.1:5000",
    accounts: DEMO,
    orders: {
      trackOrderId: trackOrder.orderId,
      confirmedOrderId: deliveredOrder.orderId,
      pendingOrderId: pendingOrder.orderId,
    },
    products: products.slice(0, 5).map((p) => ({ id: p._id.toString(), name: p.productName, price: p.price })),
  };

  const outPath = path.join(__dirname, "../../docs/demo-data.json");
  fs.writeFileSync(outPath, JSON.stringify(demoData, null, 2));
  console.log("Demo data written:", outPath);
  console.log("Customer login:", DEMO.customer.email, "/", DEMO.customer.password);
  console.log("Track order:", trackOrder.orderId);
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
