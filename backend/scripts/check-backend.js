#!/usr/bin/env node
/**
 * Quick check that the backend is running and register works.
 * Run from backend folder: node scripts/check-backend.js
 * Uses BASE_URL from env or http://localhost:5000
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const BASE = process.env.BASE_URL || process.env.API_URL || "http://localhost:5000";

async function checkHealth() {
  const res = await fetch(`${BASE}/api/health`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error("Health check failed:", res.status, data);
    return false;
  }
  console.log("Health:", data);
  if (data.db !== "connected") {
    console.error("MongoDB is not connected. Start MongoDB and the backend.");
    return false;
  }
  return true;
}

async function checkRegister() {
  const testEmail = `test-${Date.now()}@example.com`;
  const body = {
    name: "Test User",
    email: testEmail,
    phone: "1234567890",
    password: "test12",
  };
  const res = await fetch(`${BASE}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error("Register failed:", res.status, data);
    return false;
  }
  if (data.user && data.token) {
    console.log("Register OK. User id:", data.user._id || data.user.id);
    return true;
  }
  console.error("Register response missing user/token:", data);
  return false;
}

async function main() {
  console.log("Backend base URL:", BASE);
  console.log("");

  try {
    if (!(await checkHealth())) process.exit(1);
    console.log("");
    if (!(await checkRegister())) process.exit(1);
    console.log("");
    console.log("Backend is working. You can create a profile from the app.");
  } catch (err) {
    console.error("Error:", err.message);
    console.error("\nMake sure:");
    console.error("  1. Backend is running: npm run dev (in backend folder)");
    console.error("  2. MongoDB is running (e.g. mongod or MongoDB Atlas)");
    console.error("  3. If testing from another machine, set BASE_URL or API_URL to http://YOUR_IP:5000");
    process.exit(1);
  }
}

main();
