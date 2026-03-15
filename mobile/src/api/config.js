import { Platform } from "react-native";

function getBaseUrl() {
  // Expo Go on physical device: set EXPO_PUBLIC_API_URL in mobile/.env to http://YOUR_PC_IP:5000, then run: npx expo start -c
  if (typeof process !== "undefined" && process.env && process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;
  if (typeof __DEV__ !== "undefined" && __DEV__ && Platform.OS === "android") return "http://10.0.2.2:5000";
  return "http://localhost:5000";
}

export const API_BASE = getBaseUrl();
