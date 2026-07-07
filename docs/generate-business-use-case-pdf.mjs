import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mdPath = path.join(__dirname, "BUSINESS-USE-CASE-PUNE.md");
const htmlPath = path.join(__dirname, "business-use-case-pune.html");
const pdfPath = path.join(__dirname, "H2O-Business-Use-Case-Pune.pdf");

if (!fs.existsSync(mdPath)) {
  console.error("BUSINESS-USE-CASE-PUNE.md not found.");
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

let mermaidCount = 0;

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
      const lang = line.slice(3).trim().toLowerCase();
      i++;
      const codeLines = [];
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++;
      const code = codeLines.join("\n");

      if (lang === "mermaid") {
        mermaidCount++;
        out.push(
          `<div class="diagram-wrap"><div class="diagram-label">Diagram ${mermaidCount}</div><pre class="mermaid">${escapeHtml(code)}</pre></div>`
        );
      } else {
        out.push(
          `<pre><code class="block">${escapeHtml(code)}</code></pre>`
        );
      }
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
  <title>H2O Online — Business Use Case: Pune</title>
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
  <style>
    @page { size: A4; margin: 12mm 10mm 14mm; }
    * { box-sizing: border-box; }
    body {
      font-family: "Segoe UI", Calibri, Arial, sans-serif;
      color: #1e293b;
      font-size: 8.5pt;
      line-height: 1.4;
      margin: 0;
    }
    .cover {
      page-break-after: always;
      min-height: 255mm;
      display: flex;
      flex-direction: column;
      justify-content: center;
      padding: 18mm 16mm;
      background: linear-gradient(145deg, #ecfdf5 0%, #fff 40%, #fef3c7 100%);
    }
    .cover-badge {
      display: inline-block;
      background: #047857;
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
      font-size: 22pt;
      color: #064e3b;
      margin: 0 0 10px;
      line-height: 1.15;
      max-width: 520px;
    }
    .cover .subtitle {
      font-size: 10pt;
      color: #475569;
      margin: 0 0 20px;
      max-width: 500px;
      line-height: 1.5;
    }
    .cover-highlights {
      margin: 12px 0 16px;
      padding: 12px 14px;
      background: rgba(255,255,255,0.9);
      border-left: 4px solid #059669;
      border-radius: 4px;
      max-width: 520px;
      font-size: 8pt;
      color: #334155;
    }
    .cover-highlights ul { margin: 6px 0 0; padding-left: 16pt; }
    .cover-highlights li { margin-bottom: 3pt; }
    .cover-stats {
      display: flex;
      gap: 10px;
      margin: 20px 0;
      flex-wrap: wrap;
    }
    .stat-box {
      background: #fff;
      border: 1px solid #a7f3d0;
      border-radius: 8px;
      padding: 10px 14px;
      min-width: 88px;
    }
    .stat-box strong { display: block; font-size: 13pt; color: #047857; }
    .stat-box span { font-size: 7pt; color: #64748b; }
    .cover-toc {
      margin-top: 16px;
      padding: 14px 16px;
      background: rgba(255,255,255,0.85);
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      max-width: 520px;
    }
    .cover-toc h2 {
      font-size: 10pt;
      color: #064e3b;
      margin: 0 0 8px;
      border: none;
      padding: 0;
    }
    .cover-toc ol {
      margin: 0;
      padding-left: 18pt;
      font-size: 7.5pt;
      color: #334155;
      columns: 2;
      column-gap: 16px;
    }
    .cover-toc li { margin-bottom: 2pt; break-inside: avoid; }
    .cover-meta {
      border-top: 2px solid #34d399;
      padding-top: 12px;
      margin-top: 14px;
      font-size: 8pt;
      color: #64748b;
    }
    .cover-meta div { margin-bottom: 3px; }
    h1 {
      font-size: 15pt;
      color: #064e3b;
      margin: 12pt 0 5pt;
      page-break-after: avoid;
    }
    h2 {
      font-size: 11pt;
      color: #0f172a;
      margin: 12pt 0 4pt;
      border-bottom: 2px solid #6ee7b7;
      padding-bottom: 2px;
      page-break-after: avoid;
    }
    h3 {
      font-size: 9.5pt;
      color: #1d4ed8;
      margin: 9pt 0 3pt;
      page-break-after: avoid;
    }
    h4 {
      font-size: 8.5pt;
      color: #334155;
      margin: 7pt 0 2pt;
      page-break-after: avoid;
    }
    p { margin: 0 0 6pt; color: #334155; }
    hr { border: none; border-top: 1px solid #cbd5e1; margin: 10pt 0; }
    ul, ol { margin: 0 0 7pt; padding-left: 15pt; }
    li { margin-bottom: 2pt; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 0 0 8pt;
      font-size: 7pt;
      page-break-inside: auto;
    }
    thead { display: table-header-group; }
    tr { page-break-inside: avoid; }
    th {
      background: #047857;
      color: #fff;
      font-weight: 600;
      text-align: left;
      padding: 4px 5px;
      border: 1px solid #059669;
    }
    td {
      padding: 3px 5px;
      border: 1px solid #e2e8f0;
      vertical-align: top;
    }
    tr:nth-child(even) td { background: #f8fafc; }
    code.inline {
      background: #f1f5f9;
      padding: 1px 3px;
      border-radius: 3px;
      font-size: 7.5pt;
    }
    pre {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      padding: 6px 8px;
      border-radius: 4px;
      margin: 0 0 8pt;
      page-break-inside: avoid;
    }
    pre code.block {
      font-size: 6.8pt;
      white-space: pre-wrap;
      font-family: Consolas, monospace;
    }
    .diagram-wrap {
      margin: 0 0 12pt;
      page-break-inside: avoid;
      background: #fafafa;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 8px 6px 4px;
      overflow: hidden;
    }
    .diagram-label {
      font-size: 6.5pt;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin: 0 0 4px 4px;
    }
    pre.mermaid {
      background: transparent;
      border: none;
      padding: 0;
      margin: 0;
      text-align: center;
      overflow: visible;
    }
    pre.mermaid svg {
      max-width: 100% !important;
      height: auto !important;
    }
  </style>
</head>
<body>
  <div class="cover">
    <div class="cover-badge">Business Operations Guide</div>
    <h1>H2O Online<br>Pune City Launch &amp; Business Use Case</h1>
    <p class="subtitle">
      How to launch, manage, and scale a water delivery business in Pune, Maharashtra using the H2O Online platform —
      covering demand &amp; supply management, stock &amp; inventory, order workflows, admin operations,
      financial model, risks, and a 90-day rollout plan.
    </p>
    <div class="cover-highlights">
      <strong>Covers:</strong>
      <ul>
        <li>Phased Pune rollout (Kothrud → Baner → Wakad / Hinjewadi)</li>
        <li>Stock, demand &amp; supply balancing workflows</li>
        <li>Supplier onboarding, rider fleet &amp; store management</li>
        <li>15 risks with mitigation controls</li>
        <li>Daily admin ops routine &amp; KPI targets</li>
      </ul>
    </div>
    <div class="cover-stats">
      <div class="stat-box"><strong>18</strong><span>Sections</span></div>
      <div class="stat-box"><strong>${mermaidCount}</strong><span>Workflow Diagrams</span></div>
      <div class="stat-box"><strong>90</strong><span>Day Roadmap</span></div>
      <div class="stat-box"><strong>15</strong><span>Risk Items</span></div>
    </div>
    <div class="cover-toc">
      <h2>Contents</h2>
      <ol>
        <li>Executive Summary</li>
        <li>Pune Market Context</li>
        <li>Business Model &amp; Unit Economics</li>
        <li>Platform as Operations Engine</li>
        <li>Pune Launch Strategy</li>
        <li>Demand Management</li>
        <li>Supply Management</li>
        <li>Stock &amp; Inventory</li>
        <li>Order Fulfilment Workflow</li>
        <li>Admin Roles &amp; Daily Routine</li>
        <li>Subscriptions &amp; Revenue</li>
        <li>Financial Management</li>
        <li>Risks &amp; Challenges</li>
        <li>Mitigation &amp; Controls</li>
        <li>90-Day Launch Roadmap</li>
        <li>Complete Business Workflow</li>
        <li>Success Criteria</li>
        <li>Related Documentation</li>
      </ol>
    </div>
    <div class="cover-meta">
      <div><strong>Version:</strong> 1.0</div>
      <div><strong>City focus:</strong> Pune, Maharashtra, India</div>
      <div><strong>Platform:</strong> H2O Online Mobile + Admin Portal</div>
      <div><strong>Generated:</strong> ${today}</div>
    </div>
  </div>
  <div class="content">${bodyHtml}</div>
  <script>
    mermaid.initialize({
      startOnLoad: false,
      theme: "default",
      securityLevel: "loose",
      flowchart: { useMaxWidth: true, htmlLabels: true, curve: "basis" },
      sequence: { useMaxWidth: true, wrap: true },
      er: { useMaxWidth: true },
    });
    (async function () {
      const nodes = document.querySelectorAll("pre.mermaid");
      for (let i = 0; i < nodes.length; i++) {
        const el = nodes[i];
        const src = el.textContent;
        try {
          const id = "mmd-" + i;
          const { svg } = await mermaid.render(id, src);
          el.outerHTML = '<div class="mermaid-rendered">' + svg + "</div>";
        } catch (err) {
          el.outerHTML =
            '<pre class="mermaid-error">Diagram render error: ' +
            (err.message || err) +
            "</pre>";
        }
      }
      document.body.setAttribute("data-mermaid-ready", "true");
    })();
  </script>
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

console.log("Rendering HTML with Mermaid diagrams...");
const browser = await puppeteer.launch(launchOptions);
const page = await browser.newPage();
await page.goto(`file:///${htmlPath.replace(/\\/g, "/")}`, {
  waitUntil: "networkidle0",
  timeout: 120000,
});

await page.waitForFunction(
  () => document.body.getAttribute("data-mermaid-ready") === "true",
  { timeout: 120000 }
);

await page.evaluate(async () => {
  await new Promise((r) => setTimeout(r, 1500));
});

console.log(`Mermaid diagrams rendered: ${mermaidCount}`);
console.log("Generating PDF...");

await page.pdf({
  path: pdfPath,
  format: "A4",
  printBackground: true,
  margin: { top: "10mm", right: "8mm", bottom: "12mm", left: "8mm" },
  displayHeaderFooter: true,
  headerTemplate: "<span></span>",
  footerTemplate:
    '<div style="width:100%;font-size:6.5px;color:#94a3b8;text-align:center;font-family:Segoe UI,sans-serif;">H2O Online — Business Use Case: Pune v1.0 — <span class="pageNumber"></span> / <span class="totalPages"></span></div>',
});

await browser.close();

console.log("HTML:", htmlPath);
console.log("PDF:", pdfPath);
