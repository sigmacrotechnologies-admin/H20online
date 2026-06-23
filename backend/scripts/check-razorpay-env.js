#!/usr/bin/env node
/**
 * Verifies Razorpay env vars are set. Run: node scripts/check-razorpay-env.js
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const configured = Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
if (configured) {
  const id = process.env.RAZORPAY_KEY_ID;
  console.log("Razorpay: configured (" + id.slice(0, 12) + "...)");
  process.exit(0);
}
console.error("Razorpay: NOT configured.");
console.error("Add to backend/.env:");
console.error("  RAZORPAY_KEY_ID=rzp_test_your_key_id");
console.error("  RAZORPAY_KEY_SECRET=your_razorpay_key_secret");
console.error("Then restart the backend server.");
process.exit(1);
