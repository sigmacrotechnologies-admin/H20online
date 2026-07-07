import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mdPath = path.join(__dirname, "SECURITY-ASSESSMENT-AND-REMEDIATION.md");
const htmlPath = path.join(__dirname, "security-assessment.html");
const pdfPath = path.join(__dirname, "H2O-Security-Assessment-and-Remediation.pdf");

if (!fs.existsSync(mdPath)) {
  console.error("SECURITY-ASSESSMENT-AND-REMEDIATION.md not found.");
  process.exit(1);
}

const md = fs.readFileSync(mdPath, "utf8");
const today = new Date().toLocaleDateString("en-IN", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

function escapeHtml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function inlineFormat(text) {
  let s = escapeHtml(text);
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/`([^`]+)`/g, '<code class="inline">$1</code>');
  s = s.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  return s;
}

function parseTableRow(line) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim());
}

function isTableSep(line) {
  return /^\|?[\s\-:|]+\|?$/.test(line.trim()) && line.includes("-");
}

function severityClass(cell) {
  const t = cell.toLowerCase();
  if (t.includes("critical") || t.includes("fail")) return "sev-critical";
  if (t.includes("high")) return "sev-high";
  if (t.includes("medium") || t.includes("partial")) return "sev-medium";
  if (t.includes("good") || t.includes("ok")) return "sev-good";
  if (t.includes("low") || t.includes("informational")) return "sev-low";
  return "";
}

function markdownToHtml(source) {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const out = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === "---") {
      out.push("<hr />");
      i++;
      continue;
    }

    if (line.startsWith("```")) {
      i++;
      const codeLines = [];
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++;
      const code = codeLines.join("\n");
      out.push(`<pre><code class="block">${escapeHtml(code)}</code></pre>`);
      continue;
    }

    if (line.startsWith("# ")) {
      out.push(`<h1>${inlineFormat(line.slice(2))}</h1>`);
      i++;
      continue;
    }
    if (line.startsWith("## ")) {
      out.push(`<h2>${inlineFormat(line.slice(3))}</h2>`);
      i++;
      continue;
    }
    if (line.startsWith("### ")) {
      out.push(`<h3>${inlineFormat(line.slice(4))}</h3>`);
      i++;
      continue;
    }
    if (line.startsWith("#### ")) {
      out.push(`<h4>${inlineFormat(line.slice(5))}</h4>`);
      i++;
      continue;
    }

    if (line.trim().startsWith("|") && i + 1 < lines.length && isTableSep(lines[i + 1])) {
      const headers = parseTableRow(line);
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        rows.push(parseTableRow(lines[i]));
        i++;
      }
      let table = "<table><thead><tr>";
      headers.forEach((h) => {
        table += `<th>${inlineFormat(h)}</th>`;
      });
      table += "</tr></thead><tbody>";
      rows.forEach((row) => {
        table += "<tr>";
        row.forEach((cell, ci) => {
          const cls = severityClass(cell);
          table += cls ? `<td class="${cls}">${inlineFormat(cell)}</td>` : `<td>${inlineFormat(cell)}</td>`;
        });
        table += "</tr>";
      });
      table += "</tbody></table>";
      out.push(table);
      continue;
    }

    if (/^-\s+\[[ xX]\]\s+/.test(line.trim())) {
      const items = [];
      while (i < lines.length && /^-\s+\[[ xX]\]\s+/.test(lines[i].trim())) {
        const checked = /\[x\]/i.test(lines[i]);
        const text = lines[i].replace(/^-\s+\[[ xX]\]\s+/, "");
        items.push(
          `<li class="checklist-item${checked ? " checked" : ""}"><span class="checkbox">${checked ? "☑" : "☐"}</span> ${inlineFormat(text)}</li>`
        );
        i++;
      }
      out.push(`<ul class="checklist">${items.join("")}</ul>`);
      continue;
    }

    if (/^-\s+/.test(line.trim())) {
      const items = [];
      while (i < lines.length && /^-\s+/.test(lines[i].trim()) && !/^-\s+\[[ xX]\]/.test(lines[i].trim())) {
        items.push(`<li>${inlineFormat(lines[i].replace(/^-\s+/, ""))}</li>`);
        i++;
      }
      out.push(`<ul>${items.join("")}</ul>`);
      continue;
    }

    if (/^\d+\.\s+/.test(line.trim())) {
      const items = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(`<li>${inlineFormat(lines[i].replace(/^\d+\.\s+/, ""))}</li>`);
        i++;
      }
      out.push(`<ol>${items.join("")}</ol>`);
      continue;
    }

    if (line.trim() === "") {
      i++;
      continue;
    }

    out.push(`<p>${inlineFormat(line)}</p>`);
    i++;
  }

  return out.join("\n");
}

const bodyHtml = markdownToHtml(md);

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>H2O Online — Security Assessment &amp; Remediation Guide</title>
  <style>
    @page { size: A4; margin: 12mm 10mm 14mm; }
    * { box-sizing: border-box; }
    body {
      font-family: "Segoe UI", Calibri, Arial, sans-serif;
      color: #1e293b;
      font-size: 8.2pt;
      line-height: 1.38;
      margin: 0;
    }
    .cover {
      page-break-after: always;
      min-height: 255mm;
      display: flex;
      flex-direction: column;
      justify-content: center;
      padding: 16mm 14mm;
      background: linear-gradient(145deg, #fef2f2 0%, #fff 35%, #eff6ff 100%);
    }
    .cover-badge {
      display: inline-block;
      background: #b91c1c;
      color: #fff;
      font-size: 7.5pt;
      font-weight: 600;
      letter-spacing: 1px;
      text-transform: uppercase;
      padding: 5px 12px;
      border-radius: 4px;
      margin-bottom: 14px;
      width: fit-content;
    }
    .cover h1 {
      font-size: 21pt;
      color: #991b1b;
      margin: 0 0 10px;
      line-height: 1.15;
      max-width: 540px;
    }
    .cover .subtitle {
      font-size: 9.5pt;
      color: #475569;
      margin: 0 0 18px;
      max-width: 520px;
      line-height: 1.5;
    }
    .cover-highlights {
      margin: 12px 0 16px;
      padding: 12px 14px;
      background: rgba(255,255,255,0.92);
      border-left: 4px solid #dc2626;
      border-radius: 4px;
      max-width: 540px;
      font-size: 7.8pt;
      color: #334155;
    }
    .cover-highlights ul { margin: 6px 0 0; padding-left: 16pt; }
    .cover-highlights li { margin-bottom: 3pt; }
    .cover-stats {
      display: flex;
      gap: 8px;
      margin: 18px 0;
      flex-wrap: wrap;
    }
    .stat-box {
      background: #fff;
      border: 1px solid #fecaca;
      border-radius: 8px;
      padding: 10px 12px;
      min-width: 82px;
    }
    .stat-box.critical { border-color: #fca5a5; background: #fef2f2; }
    .stat-box strong { display: block; font-size: 13pt; color: #b91c1c; }
    .stat-box span { font-size: 6.8pt; color: #64748b; }
    .cover-toc {
      margin-top: 14px;
      padding: 12px 14px;
      background: rgba(255,255,255,0.88);
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      max-width: 540px;
    }
    .cover-toc h2 {
      font-size: 9.5pt;
      color: #991b1b;
      margin: 0 0 8px;
      border: none;
      padding: 0;
    }
    .cover-toc ol {
      margin: 0;
      padding-left: 18pt;
      font-size: 7.2pt;
      color: #334155;
      columns: 2;
      column-gap: 14px;
    }
    .cover-toc li { margin-bottom: 2pt; break-inside: avoid; }
    .cover-meta {
      border-top: 2px solid #f87171;
      padding-top: 12px;
      margin-top: 14px;
      font-size: 7.8pt;
      color: #64748b;
    }
    .cover-meta div { margin-bottom: 3px; }
    .confidential {
      margin-top: 10px;
      font-size: 7pt;
      color: #b91c1c;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    h1 {
      font-size: 14pt;
      color: #991b1b;
      margin: 11pt 0 5pt;
      page-break-after: avoid;
    }
    h2 {
      font-size: 10.5pt;
      color: #0f172a;
      margin: 11pt 0 4pt;
      border-bottom: 2px solid #fca5a5;
      padding-bottom: 2px;
      page-break-after: avoid;
    }
    h3 {
      font-size: 9pt;
      color: #1d4ed8;
      margin: 8pt 0 3pt;
      page-break-after: avoid;
    }
    h4 {
      font-size: 8.2pt;
      color: #334155;
      margin: 6pt 0 2pt;
      page-break-after: avoid;
    }
    p { margin: 0 0 5pt; color: #334155; }
    hr { border: none; border-top: 1px solid #cbd5e1; margin: 9pt 0; }
    ul, ol { margin: 0 0 6pt; padding-left: 14pt; }
    li { margin-bottom: 2pt; }
    ul.checklist { list-style: none; padding-left: 4pt; }
    .checklist-item { display: flex; gap: 6px; align-items: flex-start; margin-bottom: 3pt; }
    .checkbox { font-size: 9pt; color: #64748b; flex-shrink: 0; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 0 0 7pt;
      font-size: 6.8pt;
      page-break-inside: auto;
    }
    thead { display: table-header-group; }
    tr { page-break-inside: avoid; }
    th {
      background: #991b1b;
      color: #fff;
      font-weight: 600;
      text-align: left;
      padding: 3px 4px;
      border: 1px solid #b91c1c;
    }
    td {
      padding: 2px 4px;
      border: 1px solid #e2e8f0;
      vertical-align: top;
    }
    tr:nth-child(even) td { background: #f8fafc; }
    td.sev-critical { background: #fef2f2 !important; color: #991b1b; font-weight: 600; }
    td.sev-high { background: #fff7ed !important; color: #c2410c; font-weight: 600; }
    td.sev-medium { background: #fffbeb !important; color: #b45309; }
    td.sev-good { background: #ecfdf5 !important; color: #047857; }
    td.sev-low { background: #f1f5f9 !important; color: #475569; }
    code.inline {
      background: #f1f5f9;
      padding: 1px 3px;
      border-radius: 3px;
      font-size: 7pt;
      word-break: break-all;
    }
    pre {
      background: #0f172a;
      color: #e2e8f0;
      border: 1px solid #334155;
      padding: 6px 8px;
      border-radius: 4px;
      margin: 0 0 7pt;
      page-break-inside: avoid;
    }
    pre code.block {
      font-size: 6.5pt;
      white-space: pre-wrap;
      font-family: Consolas, "Courier New", monospace;
      color: #e2e8f0;
    }
  </style>
</head>
<body>
  <div class="cover">
    <div class="cover-badge">Security &amp; Vulnerability Assessment</div>
    <h1>H2O Online<br>Security Assessment &amp; Remediation Guide</h1>
    <p class="subtitle">
      Comprehensive end-to-end security review of the H2O Online platform — backend API, admin portal,
      mobile application, payment flows, and AWS deployment. Includes live test results, detailed findings
      (authentication, authorization, API, mobile, payments, network), OWASP Top 10 mapping, required fixes,
      full remediation catalog (80+ options), verification checklist, and PCI-DSS notes.
    </p>
    <div class="cover-highlights">
      <strong>Assessment covered:</strong>
      <ul>
        <li>Authentication, RBAC, session/token management, API security</li>
        <li>Input validation, injection, business logic &amp; payment bypass testing</li>
        <li>Mobile &amp; admin portal security, network/TLS, data security</li>
        <li>Dependency scanning, OWASP Top 10, URL/page access control</li>
        <li>Live probes on production API (July 2026)</li>
      </ul>
    </div>
    <div class="cover-stats">
      <div class="stat-box critical"><strong>5</strong><span>Critical Issues</span></div>
      <div class="stat-box"><strong>10</strong><span>High Severity</span></div>
      <div class="stat-box"><strong>8</strong><span>Medium</span></div>
      <div class="stat-box"><strong>80+</strong><span>Remediation Options</span></div>
      <div class="stat-box"><strong>11</strong><span>Document Sections</span></div>
    </div>
    <div class="cover-toc">
      <h2>Contents</h2>
      <ol>
        <li>Executive Summary</li>
        <li>Scope &amp; Methodology</li>
        <li>Architecture &amp; Trust Boundaries</li>
        <li>Live Test Results</li>
        <li>Detailed Findings (12 categories)</li>
        <li>URL &amp; Page Access Control</li>
        <li>Required Fixes (Priority 0–2)</li>
        <li>Possible Fixes Catalog</li>
        <li>Verification Checklist</li>
        <li>PCI-DSS &amp; Privacy</li>
        <li>Appendix: Key Files</li>
      </ol>
    </div>
    <div class="cover-meta">
      <div><strong>Version:</strong> 1.0</div>
      <div><strong>Assessment date:</strong> July 2026</div>
      <div><strong>Production API:</strong> http://13.62.57.255:5000</div>
      <div><strong>Production Admin:</strong> http://13.62.57.255:3000</div>
      <div><strong>Generated:</strong> ${today}</div>
      <div class="confidential">Confidential — Internal use only</div>
    </div>
  </div>
  <div class="content">${bodyHtml}</div>
</body>
</html>`;

fs.writeFileSync(htmlPath, html);

const chromePaths = [
  process.env.PUPPETEER_EXECUTABLE_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
].filter(Boolean);

let launchOptions = { headless: true };
for (const p of chromePaths) {
  if (fs.existsSync(p)) {
    launchOptions.executablePath = p;
    break;
  }
}

console.log("Rendering security assessment HTML...");
const browser = await puppeteer.launch(launchOptions);
const page = await browser.newPage();
await page.goto(`file:///${htmlPath.replace(/\\/g, "/")}`, {
  waitUntil: "networkidle0",
  timeout: 120000,
});

await page.evaluate(async () => {
  await new Promise((r) => setTimeout(r, 800));
});

console.log("Generating PDF...");

await page.pdf({
  path: pdfPath,
  format: "A4",
  printBackground: true,
  margin: { top: "10mm", right: "8mm", bottom: "12mm", left: "8mm" },
  displayHeaderFooter: true,
  headerTemplate: "<span></span>",
  footerTemplate:
    '<div style="width:100%;font-size:6.5px;color:#94a3b8;text-align:center;font-family:Segoe UI,sans-serif;">H2O Online — Security Assessment &amp; Remediation Guide v1.0 — <span class="pageNumber"></span> / <span class="totalPages"></span></div>',
});

await browser.close();

console.log("HTML:", htmlPath);
console.log("PDF:", pdfPath);
