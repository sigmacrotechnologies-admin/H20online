import { Platform } from "react-native";

function getBaseUrl() {
  // Local Expo: set in mobile/.env or run "npm run local" in mobile folder (auto-sets your PC IP)
  const envUrl = typeof process !== "undefined" && process.env && process.env.EXPO_PUBLIC_API_URL;
  if (envUrl && envUrl.trim()) return envUrl.trim();
  // Android emulator: emulator sees host as 10.0.2.2
  if (typeof __DEV__ !== "undefined" && __DEV__ && Platform.OS === "android") return "http://10.0.2.2:5000";
  return "http://localhost:5000";
}

export const API_BASE = getBaseUrl();
