import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const readmePath = path.join(__dirname, "..", "README.md");
const htmlPath = path.join(__dirname, "H2O-Platform-README.html");
const pdfPath = path.join(__dirname, "H2O-Platform-README.pdf");

if (!fs.existsSync(readmePath)) {
  console.error("README.md not found at repo root.");
  process.exit(1);
}

const md = fs.readFileSync(readmePath, "utf8");
const today = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

function escapeHtml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function inlineFormat(text) {
  let s = escapeHtml(text);
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/`([^`]+)`/g, '<code class="inline">$1</code>');
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
      const lang = line.slice(3).trim();
      i++;
      const codeLines = [];
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++;
      out.push(`<pre><code class="block${lang ? ` lang-${lang}` : ""}">${escapeHtml(codeLines.join("\n"))}</code></pre>`);
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
        row.forEach((cell) => {
          table += `<td>${inlineFormat(cell)}</td>`;
        });
        table += "</tr>";
      });
      table += "</tbody></table>";
      out.push(table);
      continue;
    }

    if (/^-\s+\[[ x]\]/.test(line.trim())) {
      const items = [];
      while (i < lines.length && /^-\s+\[[ x]\]/.test(lines[i].trim())) {
        const checked = /\[x\]/i.test(lines[i]);
        const label = lines[i].replace(/^-\s+\[[ x]\]\s*/i, "");
        items.push(`<li class="${checked ? "checked" : ""}">${inlineFormat(label)}</li>`);
        i++;
      }
      out.push(`<ul class="checklist">${items.join("")}</ul>`);
      continue;
    }

    if (/^-\s+/.test(line.trim())) {
      const items = [];
      while (i < lines.length && /^-\s+/.test(lines[i].trim()) && !/^-\s+\[[ x]\]/.test(lines[i].trim())) {
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
  <title>H2O Online Platform — Configuration & Deployment Guide</title>
  <style>
    @page { size: A4; margin: 16mm 14mm 18mm; }
    * { box-sizing: border-box; }
    body {
      font-family: "Segoe UI", Calibri, Arial, sans-serif;
      color: #0f172a;
      font-size: 9.5pt;
      line-height: 1.45;
      margin: 0;
      padding: 0;
    }
    .cover {
      page-break-after: always;
      min-height: 240mm;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      background: linear-gradient(160deg, #e0f2fe 0%, #fff 55%);
      padding: 24mm 18mm;
    }
    .cover .logo {
      width: 72px; height: 72px; border-radius: 18px;
      background: linear-gradient(135deg, #0ea5e9, #06b6d4);
      color: #fff; font-size: 24pt; font-weight: 700;
      display: flex; align-items: center; justify-content: center;
      margin-bottom: 18px;
    }
    .cover h1 { font-size: 24pt; color: #0369a1; margin: 0 0 10px; max-width: 420px; }
    .cover p { color: #475569; font-size: 11pt; max-width: 440px; margin: 0 0 8px; }
    .cover .date { margin-top: 28px; color: #64748b; font-size: 9pt; }
    .content { padding: 0; }
    h1 { font-size: 18pt; color: #0369a1; margin: 18pt 0 8pt; page-break-after: avoid; }
    h2 {
      font-size: 13pt; color: #0f172a; margin: 16pt 0 6pt;
      padding-bottom: 4px; border-bottom: 1.5px solid #bae6fd;
      page-break-after: avoid;
    }
    h3 { font-size: 11pt; color: #1e40af; margin: 12pt 0 5pt; page-break-after: avoid; }
    h4 { font-size: 10pt; color: #334155; margin: 10pt 0 4pt; page-break-after: avoid; }
    p { margin: 0 0 8pt; color: #334155; }
    a { color: #0284c7; text-decoration: none; }
    hr { border: none; border-top: 1px solid #e2e8f0; margin: 14pt 0; }
    ul, ol { margin: 0 0 10pt; padding-left: 18pt; color: #334155; }
    li { margin-bottom: 3pt; }
    ul.checklist { list-style: none; padding-left: 4pt; }
    ul.checklist li::before { content: "☐ "; color: #64748b; }
    ul.checklist li.checked::before { content: "☑ "; color: #059669; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 0 0 12pt;
      font-size: 8.5pt;
      page-break-inside: avoid;
    }
    th {
      background: #e0f2fe;
      color: #0369a1;
      font-weight: 600;
      text-align: left;
      padding: 6px 8px;
      border: 1px solid #bae6fd;
    }
    td {
      padding: 5px 8px;
      border: 1px solid #e2e8f0;
      vertical-align: top;
    }
    tr:nth-child(even) td { background: #f8fafc; }
    code.inline {
      background: #f1f5f9;
      color: #0f172a;
      padding: 1px 5px;
      border-radius: 3px;
      font-family: Consolas, "Courier New", monospace;
      font-size: 8.5pt;
    }
    pre {
      background: #0f172a;
      color: #e2e8f0;
      padding: 10px 12px;
      border-radius: 6px;
      overflow-x: auto;
      margin: 0 0 12pt;
      page-break-inside: avoid;
    }
    pre code.block {
      font-family: Consolas, "Courier New", monospace;
      font-size: 8pt;
      line-height: 1.4;
      white-space: pre-wrap;
      word-break: break-word;
    }
  </style>
</head>
<body>
  <div class="cover">
    <div class="logo">H₂O</div>
    <h1>H2O Online Platform</h1>
    <p>Complete configuration, deployment, API reference, and settings guide</p>
    <p>Backend · Mobile · Admin · Production</p>
    <p class="date">Generated ${today}</p>
  </div>
  <div class="content">
    ${bodyHtml}
  </div>
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
  margin: { top: "14mm", right: "12mm", bottom: "16mm", left: "12mm" },
  displayHeaderFooter: true,
  headerTemplate: "<span></span>",
  footerTemplate:
    '<div style="width:100%;font-size:7px;color:#94a3b8;text-align:center;font-family:Segoe UI,sans-serif;">H2O Online Platform Guide — <span class="pageNumber"></span> / <span class="totalPages"></span></div>',
});
await browser.close();

console.log("HTML:", htmlPath);
console.log("PDF:", pdfPath);
