import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mdPath = path.join(__dirname, "requirement-capture.md");
const htmlPath = path.join(__dirname, "requirement-capture.html");
const pdfPath = path.join(__dirname, "requirement capture.pdf");

if (!fs.existsSync(mdPath)) {
  console.error("requirement-capture.md not found.");
  process.exit(1);
}

const md = fs.readFileSync(mdPath, "utf8");
const today = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function inlineFormat(text) {
  let s = escapeHtml(text);
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/`([^`]+)`/g, '<code class="inline">$1</code>');
  return s;
}

function parseTableRow(line) {
  return line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
}

function isTableSep(line) {
  return /^\|?[\s\-:|]+\|?$/.test(line.trim()) && line.includes("-");
}

function markdownToHtml(source) {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const out = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === "---") { out.push("<hr />"); i++; continue; }
    if (line.startsWith("```")) {
      i++;
      const codeLines = [];
      while (i < lines.length && !lines[i].startsWith("```")) { codeLines.push(lines[i]); i++; }
      i++;
      out.push(`<pre><code class="block">${escapeHtml(codeLines.join("\n"))}</code></pre>`);
      continue;
    }
    if (line.startsWith("# ")) { out.push(`<h1>${inlineFormat(line.slice(2))}</h1>`); i++; continue; }
    if (line.startsWith("## ")) { out.push(`<h2>${inlineFormat(line.slice(3))}</h2>`); i++; continue; }
    if (line.startsWith("### ")) { out.push(`<h3>${inlineFormat(line.slice(4))}</h3>`); i++; continue; }
    if (line.startsWith("#### ")) { out.push(`<h4>${inlineFormat(line.slice(5))}</h4>`); i++; continue; }

    if (line.trim().startsWith("|") && i + 1 < lines.length && isTableSep(lines[i + 1])) {
      const headers = parseTableRow(line);
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) { rows.push(parseTableRow(lines[i])); i++; }
      let table = "<table><thead><tr>";
      headers.forEach((h) => { table += `<th>${inlineFormat(h)}</th>`; });
      table += "</tr></thead><tbody>";
      rows.forEach((row) => {
        table += "<tr>";
        row.forEach((cell) => { table += `<td>${inlineFormat(cell)}</td>`; });
        table += "</tr>";
      });
      table += "</tbody></table>";
      out.push(table);
      continue;
    }

    if (/^-\s+/.test(line.trim())) {
      const items = [];
      while (i < lines.length && /^-\s+/.test(lines[i].trim())) {
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

    if (line.trim() === "") { i++; continue; }
    if (line.startsWith("*") && line.endsWith("*")) {
      out.push(`<p class="footnote">${inlineFormat(line.replace(/^\*|\*$/g, ""))}</p>`);
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
  <title>H2O Online — Requirement Capture</title>
  <style>
    @page { size: A4; margin: 14mm 12mm 16mm; }
    * { box-sizing: border-box; }
    body {
      font-family: "Segoe UI", Calibri, Arial, sans-serif;
      color: #1e293b;
      font-size: 9pt;
      line-height: 1.42;
      margin: 0;
    }
    .cover {
      page-break-after: always;
      min-height: 255mm;
      display: flex;
      flex-direction: column;
      justify-content: center;
      padding: 22mm 20mm;
      background: linear-gradient(145deg, #f0f9ff 0%, #fff 50%, #ecfdf5 100%);
    }
    .cover-badge {
      display: inline-block;
      background: #0369a1;
      color: #fff;
      font-size: 8pt;
      font-weight: 600;
      letter-spacing: 1px;
      text-transform: uppercase;
      padding: 5px 12px;
      border-radius: 4px;
      margin-bottom: 16px;
      width: fit-content;
    }
    .cover h1 {
      font-size: 26pt;
      color: #0c4a6e;
      margin: 0 0 12px;
      line-height: 1.2;
      max-width: 480px;
    }
    .cover .subtitle { font-size: 12pt; color: #475569; margin: 0 0 24px; max-width: 460px; }
    .cover-meta {
      border-top: 2px solid #0ea5e9;
      padding-top: 16px;
      margin-top: 8px;
      font-size: 9pt;
      color: #64748b;
    }
    .cover-meta div { margin-bottom: 4px; }
    .cover-stats {
      display: flex;
      gap: 16px;
      margin-top: 28px;
      flex-wrap: wrap;
    }
    .stat-box {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px 16px;
      min-width: 100px;
    }
    .stat-box strong { display: block; font-size: 16pt; color: #0284c7; }
    .stat-box span { font-size: 8pt; color: #64748b; }
    h1 { font-size: 16pt; color: #0c4a6e; margin: 14pt 0 6pt; page-break-after: avoid; }
    h2 {
      font-size: 12pt; color: #0f172a; margin: 14pt 0 5pt;
      border-bottom: 2px solid #7dd3fc; padding-bottom: 3px;
      page-break-after: avoid;
    }
    h3 { font-size: 10.5pt; color: #1d4ed8; margin: 10pt 0 4pt; page-break-after: avoid; }
    h4 { font-size: 9.5pt; color: #334155; margin: 8pt 0 3pt; page-break-after: avoid; }
    p { margin: 0 0 7pt; color: #334155; }
    p.footnote { font-style: italic; font-size: 8.5pt; color: #64748b; }
    hr { border: none; border-top: 1px solid #cbd5e1; margin: 12pt 0; }
    ul, ol { margin: 0 0 8pt; padding-left: 16pt; }
    li { margin-bottom: 2pt; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 0 0 10pt;
      font-size: 7.8pt;
      page-break-inside: auto;
    }
    thead { display: table-header-group; }
    tr { page-break-inside: avoid; }
    th {
      background: #0369a1;
      color: #fff;
      font-weight: 600;
      text-align: left;
      padding: 5px 6px;
      border: 1px solid #0284c7;
    }
    td {
      padding: 4px 6px;
      border: 1px solid #e2e8f0;
      vertical-align: top;
    }
    tr:nth-child(even) td { background: #f8fafc; }
    code.inline {
      background: #f1f5f9;
      padding: 1px 4px;
      border-radius: 3px;
      font-size: 8pt;
    }
    pre {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      padding: 8px 10px;
      border-radius: 4px;
      margin: 0 0 10pt;
      page-break-inside: avoid;
    }
    pre code.block { font-size: 7.5pt; white-space: pre-wrap; }
  </style>
</head>
<body>
  <div class="cover">
    <div class="cover-badge">Business Analysis</div>
    <h1>H2O Online<br>Requirement Capture</h1>
    <p class="subtitle">Comprehensive functional requirements, business workflows, user personas, and product scope for stakeholder review and sign-off.</p>
    <div class="cover-stats">
      <div class="stat-box"><strong>150+</strong><span>Requirements</span></div>
      <div class="stat-box"><strong>6</strong><span>User Roles</span></div>
      <div class="stat-box"><strong>18</strong><span>Sections</span></div>
    </div>
    <div class="cover-meta">
      <div><strong>Document version:</strong> 1.0</div>
      <div><strong>Document type:</strong> Functional &amp; Business Requirements</div>
      <div><strong>Generated:</strong> ${today}</div>
    </div>
  </div>
  <div class="content">${bodyHtml}</div>
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
    '<div style="width:100%;font-size:7px;color:#94a3b8;text-align:center;font-family:Segoe UI,sans-serif;">H2O Online — Requirement Capture v1.0 — <span class="pageNumber"></span> / <span class="totalPages"></span></div>',
});
await browser.close();

console.log("HTML:", htmlPath);
console.log("PDF:", pdfPath);
