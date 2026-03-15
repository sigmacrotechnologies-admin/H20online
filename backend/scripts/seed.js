require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Supplier = require("../models/Supplier");
const Product = require("../models/Product");

const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/h20online";

const supplierSeeds = [
  { name: "AquaPure Water Co.", contactPerson: "John Doe", email: "aquapure@example.com", phone: "9876543210", address: "123 Main St", city: "Mumbai", businessType: "waterSupplier" },
  { name: "BlueSprings Hydration Hub", contactPerson: "Jane Smith", email: "bluesprings@example.com", phone: "9876543211", address: "456 Park Ave", city: "Delhi", businessType: "distributor" },
  { name: "Himalayan Springs Pvt. Ltd.", contactPerson: "Raj Kumar", email: "himalayan@example.com", phone: "9876543212", address: "789 Hill Rd", city: "Bangalore", businessType: "manufacturer" },
  { name: "Crystal Hydration Services", contactPerson: "Priya Singh", email: "crystal@example.com", phone: "9876543213", address: "321 Lake Dr", city: "Chennai", businessType: "waterSupplier" },
];

const productSeeds = [
  { productName: "AquaPure Premium 20L Jar", supplierIndex: 0, price: 180, priceUnit: "20L Jar", delivery: "20-30 min", inStock: true, capacityL: 20, categories: ["party", "office"], badge: "subscription", rating: 4.8, reviewCount: "1.2k" },
  { productName: "BlueSprings Local 20L Jar", supplierIndex: 1, price: 120, priceUnit: "20L Jar", delivery: "45 min", inStock: true, capacityL: 20, categories: ["office"], rating: 4.2, reviewCount: "450" },
  { productName: "Himalayan Mineral Pack (12x Bottles)", supplierIndex: 2, price: 340, priceUnit: "Box (12x)", delivery: "Next Day", inStock: true, capacityL: 12, categories: ["party"], badge: "premium", rating: 4.9, reviewCount: "2.1k" },
  { productName: "Crystal Clear 20L Jar", supplierIndex: 3, price: 140, priceUnit: "20L Jar", delivery: "60 min", inStock: false, capacityL: 20, categories: [], rating: 3.8, reviewCount: "120" },
  { productName: "PureDrop 20L Jar", supplierIndex: 0, price: 165, priceUnit: "20L Jar", delivery: "25-35 min", inStock: true, capacityL: 20, categories: ["party", "office"], rating: 4.5, reviewCount: "890" },
  { productName: "Mountain Fresh 1L Bottles (24x)", supplierIndex: 2, price: 399, priceUnit: "Case", delivery: "Next Day", inStock: true, capacityL: 1, categories: ["party"], badge: "premium", rating: 4.7, reviewCount: "560" },
  { productName: "Bulk Water 500L Tank", supplierIndex: 0, price: 2500, priceUnit: "500L", delivery: "1-2 days", inStock: true, capacityL: 500, categories: ["bulk"], rating: 4.6, reviewCount: "89" },
  { productName: "Water Tanker 2000L", supplierIndex: 3, price: 8000, priceUnit: "2000L", delivery: "2-3 days", inStock: true, capacityL: 2000, categories: ["tanker"], rating: 4.4, reviewCount: "56" },
];

async function seed() {
  await mongoose.connect(uri);
  console.log("Connected to", uri);

  await Product.deleteMany({});
  await Supplier.deleteMany({});
  await User.deleteMany({});

  const hashedPassword = await bcrypt.hash("seedpass123", 10);
  const createdSuppliers = [];

  for (let i = 0; i < supplierSeeds.length; i++) {
    const s = supplierSeeds[i];
    const user = await User.create({
      name: s.contactPerson,
      email: s.email,
      phone: s.phone,
      password: hashedPassword,
      role: "supplier",
    });
    const supplier = await Supplier.create({
      name: s.name,
      contactPerson: s.contactPerson,
      email: s.email,
      phone: s.phone,
      address: s.address,
      city: s.city,
      businessType: s.businessType,
      userId: user._id,
      onboardingStatus: "approved",
      verificationCode: "123456",
    });
    createdSuppliers.push(supplier);
  }

  const productDocs = productSeeds.map((p) => {
    const { supplierIndex, ...rest } = p;
    return { ...rest, supplierId: createdSuppliers[supplierIndex]._id };
  });
  await Product.insertMany(productDocs);

  console.log("Seed done: users, suppliers, products. DB name:", mongoose.connection.db.databaseName);
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
