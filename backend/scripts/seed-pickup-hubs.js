/**
 * Seed 2–3 pickup hubs. Run from repo root: node backend/scripts/seed-pickup-hubs.js
 * Requires MONGODB_URI or .env in backend.
 */
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const mongoose = require("mongoose");
const PickupHub = require("../models/PickupHub");

const HUBS = [
  { name: "Hub North", address: "123 North Avenue, Industrial Area, City 400001" },
  { name: "Hub Central", address: "456 Central Road, Midtown, City 400002" },
  { name: "Hub South", address: "789 South Street, Warehouse Zone, City 400003" },
];

async function seed() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI || "mongodb://localhost:27017/h20online";
  await mongoose.connect(uri);
  const existing = await PickupHub.countDocuments();
  if (existing > 0) {
    console.log("Pickup hubs already exist, skipping seed.");
    await mongoose.disconnect();
    return;
  }
  await PickupHub.insertMany(HUBS);
  console.log("Seeded", HUBS.length, "pickup hubs.");
  await mongoose.disconnect();
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
