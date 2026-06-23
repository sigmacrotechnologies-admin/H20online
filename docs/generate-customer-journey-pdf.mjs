import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const screenshotsDir = path.join(__dirname, "customer-journey-screenshots");
const manifestPath = path.join(screenshotsDir, "manifest.json");
const htmlPath = path.join(__dirname, "customer-journey.html");
const pdfPath = path.join(__dirname, "customer journey.pdf");

if (!fs.existsSync(manifestPath)) {
  console.error("Run capture-customer-journey.mjs first.");
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const captured = manifest.filter((m) => m.captured);
const categories = [...new Set(captured.map((m) => m.category))];
const today = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

function imgDataUri(filename) {
  const buf = fs.readFileSync(path.join(screenshotsDir, filename));
  return `data:image/png;base64,${buf.toString("base64")}`;
}

const journeySteps = [
  { phase: "1. Discover & Join", screens: ["Welcome & Role Selection", "Create Your Profile", "Customer Login", "OTP Login", "Forgot Password"], desc: "New users choose the Customer role, create a profile or sign in, and recover access if needed." },
  { phase: "2. Home & Daily Use", screens: ["Home Dashboard"], desc: "The dashboard is your daily hub — hydration stats, wallet, subscriptions, quick ordering, and AI health insights." },
  { phase: "3. Order Water", screens: ["Browse & Order Water", "Shopping Cart", "Checkout", "Payment", "Order Confirmed", "Track Your Order", "Order History"], desc: "Browse products, add to cart, pay, confirm, track live delivery, and revisit past orders." },
  { phase: "4. Subscriptions & Billing", screens: ["Water Subscription Plans", "Subscription Billing"], desc: "Set up recurring water delivery plans and pay monthly bills from your wallet." },
  { phase: "5. Stay Hydrated", screens: ["Water Intake Tracker"], desc: "Log daily intake, track goals, and get personalised hydration guidance." },
  { phase: "6. Manage Account", screens: ["Saved Addresses", "My Profile"], desc: "Update personal details, addresses, payment methods, and account security." },
  { phase: "7. Get Help", screens: ["Help & Support", "Privacy Policy"], desc: "Raise support tickets, follow up on issues, and review how your data is protected." },
];

const journeyHtml = journeySteps
  .map(
    (step) => `
    <div class="journey-phase">
      <h3>${step.phase}</h3>
      <p>${step.desc}</p>
      <ul>${step.screens.map((s) => `<li>${s}</li>`).join("")}</ul>
    </div>`
  )
  .join("");

const screenPages = captured
  .map(
    (m) => `
    <div class="screen-page">
      <div class="page-header">
        <span class="badge">${m.category}</span>
        <span class="num">Step ${m.journeyStep} of ${captured.length}</span>
      </div>
      <h2>${m.name}</h2>
      <div class="features-block">
        <h4>Features</h4>
        <p>${m.features}</p>
      </div>
      <div class="phone-wrap">
        <div class="phone-device">
          <div class="phone-notch"></div>
          <img src="${imgDataUri(m.filename)}" alt="${m.name}" />
        </div>
      </div>
      <p class="scroll-note">Full-scroll capture — entire screen content shown above</p>
    </div>`
  )
  .join("");

const tocItems = categories
  .map((cat) => {
    const items = captured.filter((m) => m.category === cat);
    const links = items.map((m) => `<li>Step ${m.journeyStep}: ${m.name}</li>`).join("");
    return `<li><strong>${cat}</strong><ol>${links}</ol></li>`;
  })
  .join("");

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>H2O Online — Customer Journey</title>
  <style>
    @page { size: A4; margin: 14mm; }
    * { box-sizing: border-box; }
    body {
      font-family: "Segoe UI", Calibri, Arial, sans-serif;
      color: #0f172a;
      margin: 0;
      background: #fff;
      font-size: 10pt;
      line-height: 1.5;
    }
    .cover {
      page-break-after: always;
      min-height: 250mm;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      background: linear-gradient(160deg, #e0f2fe, #fff);
      padding: 30mm 20mm;
    }
    .cover .logo {
      width: 80px; height: 80px; border-radius: 20px;
      background: linear-gradient(135deg, #0ea5e9, #06b6d4);
      color: #fff; font-size: 28pt; font-weight: 700;
      display: flex; align-items: center; justify-content: center;
      margin-bottom: 20px;
    }
    .cover h1 { font-size: 26pt; color: #0369a1; margin: 0 0 8px; }
    .cover .sub { color: #475569; font-size: 12pt; margin-bottom: 24px; max-width: 420px; }
    .cover .stats { display: flex; gap: 20px; margin-top: 16px; flex-wrap: wrap; justify-content: center; }
    .cover .stat { background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 20px; }
    .cover .stat strong { display: block; font-size: 18pt; color: #0ea5e9; }
    .journey-overview {
      page-break-after: always;
      padding: 8mm 0;
    }
    .journey-overview h2 {
      color: #0369a1;
      border-bottom: 2px solid #0ea5e9;
      padding-bottom: 6px;
      font-size: 16pt;
    }
    .journey-phase {
      margin-bottom: 16px;
      padding: 12px 14px;
      background: #f8fafc;
      border-left: 4px solid #0ea5e9;
      border-radius: 0 8px 8px 0;
    }
    .journey-phase h3 { margin: 0 0 6px; font-size: 11pt; color: #0f172a; }
    .journey-phase p { margin: 0 0 8px; color: #475569; font-size: 9.5pt; }
    .journey-phase ul { margin: 0; padding-left: 20px; font-size: 9pt; color: #334155; }
    .toc { page-break-after: always; padding: 8mm 0; }
    .toc h2 { color: #0369a1; border-bottom: 2px solid #0ea5e9; padding-bottom: 6px; }
    .toc ol { columns: 2; column-gap: 24px; font-size: 9pt; line-height: 1.55; }
    .screen-page {
      page-break-after: always;
      padding: 4mm 0 8mm;
    }
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    .badge {
      background: #e0f2fe;
      color: #0369a1;
      font-size: 8pt;
      font-weight: 600;
      padding: 3px 10px;
      border-radius: 999px;
    }
    .num { font-size: 8pt; color: #94a3b8; }
    .screen-page h2 {
      color: #0f172a;
      font-size: 17pt;
      margin: 0 0 10px;
    }
    .features-block {
      background: #f0f9ff;
      border-radius: 8px;
      padding: 10px 14px;
      margin-bottom: 14px;
    }
    .features-block h4 {
      margin: 0 0 6px;
      font-size: 9pt;
      color: #0369a1;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .features-block p { margin: 0; font-size: 9.5pt; color: #334155; }
    .phone-wrap { display: flex; justify-content: center; margin-top: 6px; }
    .phone-device {
      background: #1e293b;
      border-radius: 28px;
      padding: 12px 10px 14px;
      box-shadow: 0 12px 40px rgba(15,23,42,0.2);
      max-width: 260px;
      width: 100%;
    }
    .phone-notch {
      width: 80px; height: 6px; background: #334155;
      border-radius: 6px; margin: 0 auto 8px;
    }
    .phone-device img {
      width: 100%;
      border-radius: 16px;
      display: block;
    }
    .scroll-note {
      text-align: center;
      font-size: 7.5pt;
      color: #94a3b8;
      margin-top: 8px;
    }
  </style>
</head>
<body>
  <div class="cover">
    <div class="logo">H₂O</div>
    <h1>H2O Online Customer Journey</h1>
    <p class="sub">Complete guide to every customer app screen — features, user flows, and full-scroll visuals</p>
    <div class="stats">
      <div class="stat"><strong>${captured.length}</strong>Screens</div>
      <div class="stat"><strong>7</strong>Journey Phases</div>
      <div class="stat"><strong>Full Scroll</strong>Captures</div>
    </div>
    <p style="margin-top:28px;color:#64748b;font-size:9pt;">Generated ${today}</p>
  </div>

  <div class="journey-overview">
    <h2>Customer User Journey</h2>
    <p style="color:#475569;margin-bottom:16px;">The H2O Online customer app helps you order drinking water, manage subscriptions, track deliveries, log hydration, and manage your account — all from one mobile app.</p>
    ${journeyHtml}
  </div>

  <div class="toc">
    <h2>All Screens</h2>
    <ol>${tocItems}</ol>
  </div>

  ${screenPages}
</body>
</html>`;

fs.writeFileSync(htmlPath, html);

const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();
await page.goto(`file:///${htmlPath.replace(/\\/g, "/")}`, { waitUntil: "networkidle0" });
await page.pdf({
  path: pdfPath,
  format: "A4",
  printBackground: true,
  margin: { top: "12mm", right: "10mm", bottom: "14mm", left: "10mm" },
  displayHeaderFooter: true,
  headerTemplate: "<span></span>",
  footerTemplate:
    '<div style="width:100%;font-size:7px;color:#94a3b8;text-align:center;">H2O Online Customer Journey — <span class="pageNumber"></span> / <span class="totalPages"></span></div>',
});
await browser.close();
console.log("PDF generated:", pdfPath);
