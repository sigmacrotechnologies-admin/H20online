import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, "screens-catalog.json"), "utf8"));
const demoDataPath = path.join(__dirname, "demo-data.json");
const outDir = path.join(__dirname, "screenshots");
const baseUrl = process.env.EXPO_WEB_URL || "http://127.0.0.1:8081";
const apiBase = process.env.API_BASE || "http://127.0.0.1:5000";
const viewport = { width: 390, height: 844, deviceScaleFactor: 2 };
const AUTH_KEY = "h20_auth_token";
const NAV_OPTS = { waitUntil: "domcontentloaded", timeout: 60000 };

const demoData = fs.existsSync(demoDataPath)
  ? JSON.parse(fs.readFileSync(demoDataPath, "utf8"))
  : null;

const authOrder = { "": 0, customer: 1, supplier: 2, delivery: 3 };
let sortedCatalog = [...catalog].sort(
  (a, b) => (authOrder[a.auth || ""] ?? 0) - (authOrder[b.auth || ""] ?? 0)
);

if (process.env.CAPTURE_ONLY) {
  const ids = new Set(process.env.CAPTURE_ONLY.split(",").map((s) => s.trim()));
  sortedCatalog = sortedCatalog.filter((s, _i) => {
    const num = String(catalog.indexOf(s) + 1).padStart(2, "0");
    return ids.has(num) || ids.has(s.name);
  });
}

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

const tokenCache = {};

async function loginRole(page, role) {
  if (!demoData?.accounts) throw new Error("demo-data.json missing. Run: node backend/scripts/seed-docs-demo.js");
  const account = demoData.accounts[role];
  if (!account) return;
  if (!tokenCache[role]) {
    tokenCache[role] = await apiLogin(account.email, account.password);
  }
  await setAuthToken(page, tokenCache[role]);
  await delay(1500);
}

async function clickByText(page, text, limit = 1) {
  await page.evaluate(
    (label, max) => {
      const matches = [...document.querySelectorAll("*")].filter(
        (el) => el.children.length <= 2 && el.textContent?.trim() === label
      );
      matches.slice(0, max).forEach((el) => el.click());
    },
    text,
    limit
  );
}

async function clickButtons(page, label, count = 1) {
  const points = await page.evaluate((text, max) => {
    const fire = (el) => {
      el.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      el.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
      el.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
      el.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
      el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    };
    const hits = [...document.querySelectorAll("*")].filter(
      (el) => el.children.length === 0 && el.textContent?.trim() === text
    );
    return hits.slice(0, max).map((el) => {
      let node = el;
      for (let i = 0; i < 8 && node; i++) {
        fire(node);
        node = node.parentElement;
      }
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    });
  }, label, count);
  for (const p of points) {
    if (p.x > 0) await page.mouse.click(p.x, p.y);
    await delay(600);
  }
}

async function fillCart(page) {
  await gotoSafe(page, `${baseUrl}/order`);
  await delay(5000);
  await clickButtons(page, "Add to Cart", 2);
  await delay(1500);
}

async function fillCheckout(page) {
  await gotoSafe(page, `${baseUrl}/order`);
  await delay(5000);
  await clickButtons(page, "Buy Now", 1);
  await delay(3000);
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
  throw new Error(`Expo web not reachable at ${url}. Start: EXPO_PUBLIC_API_URL=http://127.0.0.1:5000 npx expo start --web --port 8081`);
}

await waitForExpo(baseUrl);

const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();
await page.setViewport(viewport);

let currentAuth = null;
const manifest = [];

for (let i = 0; i < sortedCatalog.length; i++) {
  const screen = sortedCatalog[i];
  const origIndex = catalog.indexOf(screen);
  const route = resolveRoute(screen);
  const url = `${baseUrl}${route}`;
  const filename = `${String(origIndex + 1).padStart(2, "0")}-${slugify(screen.name)}.png`;
  const filepath = path.join(outDir, filename);
  const waitMs = screen.wait || 3000;

  try {
    if (screen.auth !== currentAuth) {
      if (screen.auth) {
        await loginRole(page, screen.auth);
      } else if (currentAuth) {
        await clearAuth(page);
      }
      currentAuth = screen.auth || null;
    }

    if (screen.prep === "fillCart") {
      await fillCart(page);
    } else if (screen.prep === "fillCheckout") {
      await fillCheckout(page);
    }

    await gotoSafe(page, url);
    await delay(waitMs);
    await captureFullScroll(page, filepath);

    manifest.push({ ...screen, route, filename, captured: true, fullScroll: true, sampleData: !!screen.auth });
    console.log(`[OK] ${screen.name}`);
  } catch (err) {
    manifest.push({ ...screen, route, filename, captured: false, error: err.message });
    console.error(`[FAIL] ${screen.name}: ${err.message}`);
  }
}

await browser.close();
manifest.sort((a, b) => a.filename.localeCompare(b.filename));
fs.writeFileSync(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2));
console.log(`\nCaptured ${manifest.filter((m) => m.captured).length}/${catalog.length} screens → ${outDir}`);
