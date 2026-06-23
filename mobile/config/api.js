/**
 * API base URL resolution (local dev vs production APK).
 *
 * Local dev:  mobile/.env  →  EXPO_PUBLIC_API_URL=http://YOUR_PC_IP:5000
 *             or run: npm run local
 * Production: eas.json production/preview env  →  AWS URL (set at EAS build time)
 */

import apiUrls from "./apiUrl.json";

export const PRODUCTION_API_URL = apiUrls.production;

export function resolveApiBaseUrl() {
  const envUrl =
    typeof process !== "undefined" && process.env && process.env.EXPO_PUBLIC_API_URL;
  if (envUrl && String(envUrl).trim()) {
    return String(envUrl).trim().replace(/\/$/, "");
  }

  if (typeof __DEV__ !== "undefined" && __DEV__) {
    const { Platform } = require("react-native");
    if (Platform.OS === "android") return "http://10.0.2.2:5000";
    return "http://localhost:5000";
  }

  return PRODUCTION_API_URL;
}
