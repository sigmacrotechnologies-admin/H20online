import { Platform } from "react-native";
import Constants from "expo-constants";

/**
 * Expo Go cannot embed your Google Maps Android API key in native code.
 * Production APK: native MapView + PROVIDER_GOOGLE often crashes unless Maps SDK
 * for Android is configured with the EAS release SHA-1 in Google Cloud.
 * Default: WebView (address picker) + Static Maps (checkout/track) on Android.
 */
export function isExpoGo() {
  return Constants.appOwnership === "expo";
}

export function getGoogleMapsApiKey() {
  const fromEnv = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || "";
  const fromExtra = Constants.expoConfig?.extra?.googleMapsApiKey || "";
  return (fromEnv || fromExtra).trim();
}

export function hasGoogleMapsApiKey() {
  return Boolean(getGoogleMapsApiKey());
}

/** Opt-in only: set EXPO_PUBLIC_NATIVE_MAPS=true after Maps SDK + SHA-1 are configured. */
export function shouldUseNativeGoogleMaps() {
  if (isExpoGo() || Platform.OS !== "android" || !hasGoogleMapsApiKey()) return false;
  return process.env.EXPO_PUBLIC_NATIVE_MAPS === "true";
}

/**
 * Stable maps: Google Maps JS in WebView (picker) or Static Maps API (previews).
 * Used in Expo Go and Android APK by default.
 */
export function shouldUseWebMapsFallback() {
  if (!hasGoogleMapsApiKey()) return false;
  if (isExpoGo()) return true;
  if (Platform.OS === "android") return !shouldUseNativeGoogleMaps();
  return false;
}
