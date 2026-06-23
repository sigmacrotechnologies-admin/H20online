/**
 * Test store create with any supplier user in DB.
 * Usage: node scripts/test-stores-api.js
 */
require("dotenv").config();
const jwt = require("jsonwebtoken");
const connectDB = require("../config/db");
const User = require("../models/User");
const Supplier = require("../models/Supplier");

const BASE = process.env.TEST_API_URL || "http://localhost:5000";
const JWT_SECRET = process.env.JWT_SECRET || "h20-secret";

async function main() {
  await connectDB();

  const supplier = await Supplier.findOne().lean();
  if (!supplier) {
    console.error("No supplier in DB — run npm run seed");
    process.exit(1);
  }
  const user = await User.findById(supplier.userId).lean();
  const token = jwt.sign({ userId: user._id.toString() }, JWT_SECRET);
  console.log("Using supplier:", supplier.name, "user:", user.email);

  const getRes = await fetch(`${BASE}/api/stores`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const getBody = await getRes.json().catch(() => ({}));
  console.log("GET /api/stores", getRes.status, getBody);

  const postRes = await fetch(`${BASE}/api/stores`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      name: "API Test Store",
      storeType: "store",
      address: "Test address",
      city: "Mumbai",
      latitude: 19.076,
      longitude: 72.8777,
    }),
  });
  const postBody = await postRes.json().catch(() => ({}));
  console.log("POST /api/stores", postRes.status, postBody);

  if (!postRes.ok) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
