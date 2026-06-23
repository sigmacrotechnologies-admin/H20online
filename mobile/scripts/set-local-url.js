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
const apiUrls = require("../config/apiUrl.json");
const backendEnvPath = path.join(root, "..", "backend", ".env");

function readBackendPort() {
  try {
    const content = fs.readFileSync(backendEnvPath, "utf8");
    const line = content.split(/\r?\n/).find((l) => /^\s*PORT\s*=/.test(l));
    if (!line) return null;
    const m = line.match(/^\s*PORT\s*=\s*(\d+)/);
    return m ? Number(m[1]) : null;
  } catch (_) {
    return null;
  }
}

const PORT = readBackendPort() || apiUrls.localPort || 5000;

function getLocalIP() {
  const nets = os.networkInterfaces();
  const candidates = [];
  const skipName = /virtual|vethernet|vmware|hyper-v|wsl|loopback|bluetooth/i;
  const preferName = /wi-?fi|wireless|wlan/i;

  for (const name of Object.keys(nets)) {
    if (skipName.test(name)) continue;
    for (const net of nets[name]) {
      if (net.family !== "IPv4" || net.internal) continue;
      if (net.address.startsWith("192.168.56.")) continue; // VirtualBox host-only
      candidates.push({ name, address: net.address, score: preferName.test(name) ? 2 : name.match(/ethernet/i) ? 1 : 0 });
    }
  }

  candidates.sort((a, b) => b.score - a.score);
  return candidates[0]?.address || null;
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
console.log("Backend: cd backend && npm run dev  (uses MongoDB Atlas from backend/.env)");
