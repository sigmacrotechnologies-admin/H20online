import puppeteer from "puppeteer";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const htmlPath = path.join(__dirname, "H2O-Platform-Documentation.html");
const pdfPath = path.join(__dirname, "H2O-Platform-Documentation.pdf");

if (!fs.existsSync(htmlPath)) {
  console.error("HTML source not found:", htmlPath);
  process.exit(1);
}

const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();
await page.goto(`file:///${htmlPath.replace(/\\/g, "/")}`, {
  waitUntil: "networkidle0",
});
await page.pdf({
  path: pdfPath,
  format: "A4",
  printBackground: true,
  margin: { top: "18mm", right: "15mm", bottom: "18mm", left: "15mm" },
  displayHeaderFooter: true,
  headerTemplate: "<span></span>",
  footerTemplate:
    '<div style="width:100%;font-size:8px;color:#64748b;text-align:center;padding:0 15mm;">H2O Online Platform Documentation &mdash; <span class="pageNumber"></span> / <span class="totalPages"></span></div>',
});
await browser.close();
console.log("PDF generated:", pdfPath);
