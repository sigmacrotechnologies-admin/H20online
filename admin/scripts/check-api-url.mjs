/**
 * Verify VITE_API_URL before production admin build.
 * Rejects localhost/LAN URLs — production admin must call AWS API.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const prodEnv = path.join(root, ".env.production");
const awsConfigPath = path.join(root, "..", "config", "aws-production.json");

function readExpectedApiUrl() {
  try {
    const aws = JSON.parse(fs.readFileSync(awsConfigPath, "utf8"));
    return (aws.apiUrl || "").replace(/\/$/, "");
  } catch (_) {
    return "";
  }
}

if (!fs.existsSync(prodEnv)) {
  console.error("Missing admin/.env.production");
  console.error("On server run: npm run deploy:prod  (auto-creates from config/aws-production.json)");
  console.error("Or copy: cp .env.production.aws.example .env.production");
  process.exit(1);
}

const text = fs.readFileSync(prodEnv, "utf8");
const match = text.match(/^\s*VITE_API_URL\s*=\s*(.+)\s*$/m);
const url = match?.[1]?.trim().replace(/^["']|["']$/g, "").replace(/\/$/, "");

if (!url || url.includes("yourdomain") || url.includes("YOUR_")) {
  console.error("Set a real production VITE_API_URL in admin/.env.production");
  process.exit(1);
}

const blocked = /localhost|127\.0\.0\.1|10\.0\.2\.2|192\.168\./i;
if (blocked.test(url)) {
  console.error("Production admin cannot use a local API URL:", url);
  console.error("Use AWS API, e.g. http://13.62.57.255:5000 (see config/aws-production.json)");
  console.error("Local dev uses admin/.env with localhost — do not use that for deploy:prod");
  process.exit(1);
}

const expected = readExpectedApiUrl();
if (expected && url !== expected) {
  console.warn("Warning: VITE_API_URL differs from config/aws-production.json");
  console.warn("  .env.production:", url);
  console.warn("  aws-production: ", expected);
}

console.log("OK — production API URL:", url);
