import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, "customer-journey-catalog.json"), "utf8"));
const demoDataPath = path.join(__dirname, "demo-data.json");
const outDir = path.join(__dirname, "customer-journey-screenshots");
const baseUrl = process.env.EXPO_WEB_URL || "http://127.0.0.1:8081";
const apiBase = process.env.API_BASE || "http://127.0.0.1:5000";
const viewport = { width: 390, height: 844, deviceScaleFactor: 2 };
const AUTH_KEY = "h20_auth_token";
const NAV_OPTS = { waitUntil: "domcontentloaded", timeout: 60000 };

const demoData = fs.existsSync(demoDataPath)
  ? JSON.parse(fs.readFileSync(demoDataPath, "utf8"))
  : null;

fs.mkdirSync(outDir, { recursive: true });

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function apiLogin(email, password) {
  const res = await fetch(`${apiBase}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Login failed for ${email}: ${res.status} ${body.slice(0, 80)}`);
  }
  const data = await res.json();
  if (!data.token) throw new Error(`No token for ${email}`);
  return data.token;
}

async function gotoSafe(page, url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      await page.goto(url, NAV_OPTS);
      return;
    } catch (err) {
      if (i === retries - 1) throw err;
      await delay(3000);
    }
  }
}

async function setAuthToken(page, token) {
  await gotoSafe(page, baseUrl);
  await page.evaluate(
    (key, t) => {
      localStorage.setItem(key, t);
    },
    AUTH_KEY,
    token
  );
}

async function clearAuth(page) {
  try {
    await gotoSafe(page, baseUrl);
    await page.evaluate((key) => localStorage.removeItem(key), AUTH_KEY);
  } catch (_) {}
}

let customerToken = null;

async function loginCustomer(page) {
  if (!demoData?.accounts?.customer) throw new Error("demo-data.json missing customer account");
  const { email, password } = demoData.accounts.customer;
  if (!customerToken) {
    customerToken = await apiLogin(email, password);
  }
  await setAuthToken(page, customerToken);
  await delay(1500);
}

function resolveRoute(screen) {
  if (screen.routeKey && demoData?.orders) {
    const id = demoData.orders[`${screen.routeKey}Id`] || demoData.orders[screen.routeKey];
    if (id) {
      const base = screen.route.split("?")[0];
      return `${base}?orderId=${encodeURIComponent(id)}`;
    }
  }
  return screen.route;
}

async function captureFullScroll(page, filepath) {
  const scrollHandle = await page.evaluateHandle(() => {
    const isScrollable = (el) => {
      if (!el || el === document.body) return false;
      const s = getComputedStyle(el);
      const oy = s.overflowY;
      return (oy === "auto" || oy === "scroll") && el.scrollHeight > el.clientHeight + 40;
    };
    let best = null;
    let bestH = 0;
    for (const el of document.querySelectorAll("div")) {
      if (isScrollable(el) && el.scrollHeight > bestH) {
        best = el;
        bestH = el.scrollHeight;
      }
    }
    if (best && bestH > 400) return best;
    return document.documentElement;
  });

  const element = scrollHandle.asElement();
  if (element) {
    await element.screenshot({ path: filepath });
  } else {
    await page.screenshot({ path: filepath, fullPage: true });
  }
  await scrollHandle.dispose();
}

async function waitForExpo(url, attempts = 40) {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, { method: "GET" });
      if (res.ok || res.status === 200) return;
    } catch (_) {}
    await delay(3000);
  }
  throw new Error(`Expo web not reachable at ${url}. Start: cd mobile && npx expo start --web --port 8081`);
}

await waitForExpo(baseUrl);

const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();
await page.setViewport(viewport);

let loggedIn = false;
const manifest = [];

for (let i = 0; i < catalog.length; i++) {
  const screen = catalog[i];
  const route = resolveRoute(screen);
  const url = `${baseUrl}${route}`;
  const filename = `${String(i + 1).padStart(2, "0")}-${slugify(screen.name)}.png`;
  const filepath = path.join(outDir, filename);
  const waitMs = screen.wait || 3000;

  try {
    if (screen.auth === "customer" && !loggedIn) {
      await loginCustomer(page);
      loggedIn = true;
    } else if (!screen.auth && loggedIn) {
      await clearAuth(page);
      loggedIn = false;
    }

    await gotoSafe(page, url);
    await delay(waitMs);
    await captureFullScroll(page, filepath);

    manifest.push({ ...screen, route, filename, captured: true, fullScroll: true });
    console.log(`[OK] ${screen.name}`);
  } catch (err) {
    manifest.push({ ...screen, route, filename, captured: false, error: err.message });
    console.error(`[FAIL] ${screen.name}: ${err.message}`);
  }
}

await browser.close();
fs.writeFileSync(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2));
console.log(`\nCaptured ${manifest.filter((m) => m.captured).length}/${catalog.length} screens → ${outDir}`);
