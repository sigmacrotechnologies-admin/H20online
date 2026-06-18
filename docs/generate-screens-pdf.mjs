import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const screenshotsDir = path.join(__dirname, "screenshots");
const manifestPath = path.join(screenshotsDir, "manifest.json");
const htmlPath = path.join(__dirname, "H2O-Screens-Documentation.html");
const pdfPath = path.join(__dirname, "H2O-Screens-Documentation.pdf");

if (!fs.existsSync(manifestPath)) {
  console.error("Run capture-screenshots.mjs first.");
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const captured = manifest.filter((m) => m.captured);

const categories = [...new Set(captured.map((m) => m.category))];

function imgDataUri(filename) {
  const buf = fs.readFileSync(path.join(screenshotsDir, filename));
  return `data:image/png;base64,${buf.toString("base64")}`;
}

const screenPages = captured
  .map(
    (m, idx) => `
    <div class="screen-page">
      <div class="page-header">
        <span class="badge">${m.category}</span>
        <span class="num">${idx + 1} / ${captured.length}</span>
      </div>
      <h2>${m.name}</h2>
      <p class="route">Route: <code>${m.route}</code></p>
      <p class="features">${m.features}</p>
      <div class="phone-wrap">
        <div class="phone-device">
          <div class="phone-notch"></div>
          <img src="${imgDataUri(m.filename)}" alt="${m.name}" />
        </div>
      </div>
    </div>`
  )
  .join("");

const tocItems = categories
  .map((cat) => {
    const items = captured.filter((m) => m.category === cat);
    const links = items.map((m) => `<li>${m.name}</li>`).join("");
    return `<li><strong>${cat}</strong> (${items.length})<ol>${links}</ol></li>`;
  })
  .join("");

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>H2O Online — App Screens Documentation</title>
  <style>
    @page { size: A4; margin: 14mm; }
    * { box-sizing: border-box; }
    body {
      font-family: "Segoe UI", Calibri, Arial, sans-serif;
      color: #0f172a;
      margin: 0;
      background: #fff;
      font-size: 10pt;
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
    .cover h1 { font-size: 28pt; color: #0369a1; margin: 0 0 8px; }
    .cover .sub { color: #475569; font-size: 13pt; margin-bottom: 30px; }
    .cover .stats { display: flex; gap: 24px; margin-top: 20px; }
    .cover .stat { background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 22px; }
    .cover .stat strong { display: block; font-size: 20pt; color: #0ea5e9; }
  </style>
</head>
<body>
  <div class="cover">
    <div class="logo">H₂O</div>
    <h1>H2O Online Mobile App</h1>
    <p class="sub">Screen-by-Screen Visual Documentation<br>All Features &amp; User Flows</p>
    <div class="stats">
      <div class="stat"><strong>${captured.length}</strong>Screens</div>
      <div class="stat"><strong>${categories.length}</strong>Categories</div>
      <div class="stat"><strong>4</strong>User Roles</div>
    </div>
    <p style="margin-top:24px;color:#64748b;font-size:9pt;">Sample data loaded · Full-scroll captures · June 12, 2026</p>
    <p style="color:#64748b;font-size:8pt;">Demo logins: customer@h2o.demo · aquapure@example.com · rahul.dp@h2o.test</p>
  </div>
  <div class="toc" style="page-break-after:always;padding:10mm 0;">
    <h2 style="color:#0369a1;border-bottom:2px solid #0ea5e9;padding-bottom:6px;">Table of Contents</h2>
    <ol style="columns:2;column-gap:24px;font-size:9pt;line-height:1.5;">${tocItems}</ol>
  </div>
  <style>
    .screen-page {
      page-break-after: always;
      padding: 4mm 0 8mm;
      min-height: 255mm;
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
      font-size: 18pt;
      margin: 0 0 6px;
      border: none;
      padding: 0;
    }
    .route { margin: 0 0 6px; font-size: 9pt; color: #64748b; }
    .route code { background: #f1f5f9; padding: 2px 8px; border-radius: 4px; font-size: 8.5pt; }
    .features { margin: 0 0 16px; font-size: 10pt; color: #475569; max-width: 90%; }
    .phone-wrap { display: flex; justify-content: center; margin-top: 8px; }
    .phone-device {
      background: #1e293b;
      border-radius: 28px;
      padding: 12px 10px 14px;
      box-shadow: 0 16px 48px rgba(15,23,42,0.25);
      width: 240px;
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
  </style>
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
    '<div style="width:100%;font-size:7px;color:#94a3b8;text-align:center;">H2O Online App Screens — <span class="pageNumber"></span> / <span class="totalPages"></span></div>',
});
await browser.close();
console.log("PDF generated:", pdfPath);
