require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const User = require("../models/User");
const jwt = require("jsonwebtoken");

(async () => {
  await connectDB();
  const user = await User.findOne({ role: { $ne: "supplier" } }).select("email role name");
  if (!user) {
    console.log("No customer user in DB");
    process.exit(1);
  }
  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || "h20-secret");
  const res = await fetch("http://localhost:5000/api/ai/water-insight", {
    headers: { Authorization: "Bearer " + token },
  });
  const data = await res.json();
  console.log("User:", user.email);
  console.log("Status:", res.status);
  console.log("Insight:", (data.insight || data.error || "").slice(0, 200));
  process.exit(res.ok ? 0 : 1);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
