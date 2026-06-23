#!/usr/bin/env node
/**
 * Point mobile/.env at the AWS production API (for testing prod backend in Expo Go
 * without rebuilding the APK). Revert with: npm run local
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const envPath = path.join(root, ".env");
const apiUrls = require("../config/apiUrl.json");
const awsConfig = require("../../config/aws-production.json");

const key = "EXPO_PUBLIC_API_URL=";
const newUrl = awsConfig.apiUrl || apiUrls.production;

let content = "";
let replaced = false;

if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  const out = lines.map((line) => {
    if (line.startsWith(key)) {
      replaced = true;
      return key + newUrl;
    }
    return line;
  });
  if (!replaced) out.push(key + newUrl);
  content = out.join("\n");
} else {
  content = `# Production API (AWS). Revert: npm run local\n${key}${newUrl}\n`;
}

fs.writeFileSync(envPath, content, "utf8");
console.log("mobile/.env → production API:");
console.log("  EXPO_PUBLIC_API_URL=" + newUrl);
console.log("");
console.log("Next: npx expo start -c");
console.log("Revert to PC LAN IP: npm run local");
