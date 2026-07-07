#!/usr/bin/env node
/**
 * Smoke test: health, auth, serviceability, maps, razorpay config hints.
 * Usage: node scripts/integration-smoke-test.js [baseUrl]
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const BASE = process.argv[2] || process.env.BASE_URL || "http://localhost:5000";

async function req(path, opts = {}) {
  const url = `${BASE}${path}`;
  const res = await fetch(url, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text.slice(0, 200) };
  }
  return { status: res.status, data };
}

async function registerAndLogin() {
  const email = `smoke-${Date.now()}@example.com`;
  const body = { name: "Smoke Test", email, phone: "9876543210", password: "test1234" };
  const reg = await req("/api/auth/register", { method: "POST", body: JSON.stringify(body) });
  if (reg.status === 200 || reg.status === 201) return reg.data.token;
  const login = await req("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password: "test1234" }),
  });
  return login.data?.token || null;
}

async function main() {
  const report = { base: BASE, ok: [], warn: [], fail: [] };
  const pass = (m) => report.ok.push(m);
  const warn = (m) => report.warn.push(m);
  const fail = (m) => report.fail.push(m);

  console.log("\n=== Integration smoke test ===");
  console.log("Base URL:", BASE);

  try {
    const health = await req("/api/health");
    if (health.status === 200 && health.data?.ok !== false) {
      pass(`Health OK (db: ${health.data?.db || "unknown"})`);
    } else {
      fail(`Health failed: ${health.status} ${JSON.stringify(health.data)}`);
    }
  } catch (e) {
    fail(`Health unreachable: ${e.message}`);
    console.log(JSON.stringify(report, null, 2));
    process.exit(1);
  }

  let token;
  try {
    token = await registerAndLogin();
    if (token) pass("Auth register/login OK");
    else fail("Auth register/login failed");
  } catch (e) {
    fail(`Auth error: ${e.message}`);
  }

  if (token) {
    const auth = { Authorization: `Bearer ${token}` };

    const svcMatch = await req("/api/serviceability/check", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ pinCode: "400001", supplierIds: ["000000000000000000000000"] }),
    });
    if (svcMatch.status === 200) {
      pass(`Serviceability API OK (serviceable=${svcMatch.data?.serviceable})`);
    } else {
      fail(`Serviceability API: ${svcMatch.status} ${JSON.stringify(svcMatch.data)}`);
    }

    const svcBadPin = await req("/api/serviceability/check", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ pinCode: "12", supplierIds: [] }),
    });
    if (svcBadPin.status === 200 && svcBadPin.data?.serviceable === false) {
      pass("Serviceability rejects invalid PIN");
    } else {
      warn(`Serviceability invalid PIN response: ${svcBadPin.status}`);
    }

    const maps = await req("/api/maps/travel", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({
        fromLat: 19.076,
        fromLng: 72.877,
        toLat: 19.0896,
        toLng: 72.8656,
      }),
    });
    if (maps.status === 200 && maps.data?.distanceText) {
      pass(`Maps travel OK (${maps.data.distanceText}, ${maps.data.durationText || "duration n/a"})`);
    } else if (maps.status === 404) {
      warn("Maps travel: route not computed (Google API key or Directions API may be missing)");
    } else {
      fail(`Maps travel: ${maps.status} ${JSON.stringify(maps.data)}`);
    }

    const rzCreate = await req("/api/payments/razorpay/create-order", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ subtotal: 100 }),
    });
    if (rzCreate.status === 200 && rzCreate.data?.order_id) {
      pass("Razorpay create-order OK");
    } else if (rzCreate.status === 503) {
      warn(`Razorpay: ${rzCreate.data?.error || "not configured/disabled"}`);
    } else {
      fail(`Razorpay create-order: ${rzCreate.status} ${JSON.stringify(rzCreate.data)}`);
    }

    const products = await req("/api/products", { headers: auth });
    if (products.status === 200 && Array.isArray(products.data)) {
      const withSupplier = products.data.filter((p) => p.supplierId).length;
      pass(`Products API OK (${products.data.length} products, ${withSupplier} with supplierId)`);
    } else if (products.status === 401) {
      const pub = await req("/api/products");
      if (Array.isArray(pub.data)) {
        const withSupplier = pub.data.filter((p) => p.supplierId).length;
        pass(`Products API OK public (${pub.data.length} products, ${withSupplier} with supplierId)`);
      }
    } else {
      warn(`Products API: ${products.status}`);
    }
  }

  console.log("\n--- Results ---");
  report.ok.forEach((m) => console.log("  OK  ", m));
  report.warn.forEach((m) => console.log("  WARN", m));
  report.fail.forEach((m) => console.log("  FAIL", m));
  console.log("");
  process.exit(report.fail.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
