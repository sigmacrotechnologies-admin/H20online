/**
 * Verify VITE_API_URL is set before production build.
 * Usage: npm run check:api
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const prodEnv = path.join(root, ".env.production");

if (!fs.existsSync(prodEnv)) {
  console.error("Missing admin/.env.production");
  console.error("Copy .env.production.example and set VITE_API_URL to your public API, e.g.:");
  console.error("  VITE_API_URL=https://api.yourdomain.com");
  process.exit(1);
}

const text = fs.readFileSync(prodEnv, "utf8");
const match = text.match(/^\s*VITE_API_URL\s*=\s*(.+)\s*$/m);
const url = match?.[1]?.trim().replace(/^["']|["']$/g, "");

if (!url || url.includes("yourdomain")) {
  console.error("Set a real production VITE_API_URL in admin/.env.production");
  process.exit(1);
}

console.log("OK — production API URL:", url);
