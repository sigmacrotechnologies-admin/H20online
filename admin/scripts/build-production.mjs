#!/usr/bin/env node
/**
 * Production admin build for AWS EC2.
 * Always sets VITE_API_URL from config/aws-production.json (never localhost).
 *
 * Server:  cd admin && npm run deploy:prod
 * Local:  only run this when preparing a production build — does not change admin/.env
 */
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const prodEnv = path.join(root, ".env.production");
const distDir = path.join(root, "dist");
const awsConfigPath = path.join(root, "..", "config", "aws-production.json");

function readAwsApiUrl() {
  try {
    const aws = JSON.parse(fs.readFileSync(awsConfigPath, "utf8"));
    const url = (aws.apiUrl || "").replace(/\/$/, "");
    if (url) return url;
  } catch (_) {}
  return "http://13.62.57.255:5000";
}

function writeProductionEnv(apiUrl) {
  const content = [
    "# Production admin build — API calls go to AWS backend (auto-generated)",
    "# Source: config/aws-production.json",
    "# Local dev uses admin/.env (localhost) — this file is for deploy only",
    "",
    `VITE_API_URL=${apiUrl}`,
    "",
  ].join("\n");
  fs.writeFileSync(prodEnv, content, "utf8");
  console.log("admin/.env.production →", apiUrl);
}

function cleanDist() {
  if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true, force: true });
    console.log("Removed old admin/dist/");
  }
}

function printVerify(apiUrl) {
  const indexPath = path.join(distDir, "index.html");
  if (!fs.existsSync(indexPath)) {
    console.error("Build failed — admin/dist/index.html missing");
    process.exit(1);
  }
  const html = fs.readFileSync(indexPath, "utf8");
  const jsMatch = html.match(/assets\/(index-[^"]+\.js)/);
  console.log("\n✓ Production admin build ready");
  console.log("  API (all admin calls):", apiUrl);
  console.log("  Surveys create:       POST", apiUrl + "/api/admin/surveys");
  if (jsMatch) console.log("  Bundle:", jsMatch[1]);
  console.log("\nNext on EC2: pm2 restart h20-admin && pm2 restart h20-backend");
}

const apiUrl = readAwsApiUrl();
writeProductionEnv(apiUrl);
cleanDist();
console.log("\nRunning vite production build...\n");
execSync("npm run build:prod", { cwd: root, stdio: "inherit" });
printVerify(apiUrl);
