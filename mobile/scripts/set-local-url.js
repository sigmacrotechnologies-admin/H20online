#!/usr/bin/env node
/**
 * Sets EXPO_PUBLIC_API_URL in mobile/.env to your PC's LAN IP so Expo Go on your phone
 * can reach the backend. Run from repo root or from mobile folder.
 * Then run: npx expo start -c
 */
const fs = require("fs");
const os = require("os");
const path = require("path");

const root = path.resolve(__dirname, "..");
const envPath = path.join(root, ".env");
const PORT = 5000;

function getLocalIP() {
  const nets = os.networkInterfaces();
  let fallback = null;
  const prefer = /wi-?fi|wireless|wlan|ethernet|eth0|en0/i;
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family !== "IPv4" || net.internal) continue;
      if (prefer.test(name)) return net.address;
      if (!fallback) fallback = net.address;
    }
  }
  return fallback;
}

const ip = getLocalIP();
if (!ip) {
  console.error("Could not detect your PC's LAN IP. Set EXPO_PUBLIC_API_URL in mobile/.env manually (e.g. http://192.168.1.x:5000).");
  process.exit(1);
}

const newUrl = `http://${ip}:${PORT}`;
let content = "";
const key = "EXPO_PUBLIC_API_URL=";
let replaced = false;

if (fs.existsSync(envPath)) {
  content = fs.readFileSync(envPath, "utf8");
  const lines = content.split(/\r?\n/);
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
  content = `# Auto-set for local Expo. Backend must be running (npm run dev in backend).\n${key}${newUrl}\n`;
}

fs.writeFileSync(envPath, content, "utf8");
console.log("mobile/.env updated:");
console.log("  EXPO_PUBLIC_API_URL=" + newUrl);
console.log("");
console.log("Next: npx expo start -c   (then open app on your phone; same Wi-Fi as PC)");
console.log("Backend: in backend folder run  npm run dev   (and have MongoDB running)");
