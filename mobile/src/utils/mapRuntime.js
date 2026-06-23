import { Platform } from "react-native";
import Constants from "expo-constants";

/**
 * Expo Go cannot embed your Google Maps Android API key in native code.
 * Use a WebView / Static Maps fallback there, or a development build for native maps.
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

/** Use Google Maps JS / Static API fallback (works in Expo Go). */
export function shouldUseWebMapsFallback() {
  return isExpoGo() && hasGoogleMapsApiKey();
}

/** Native react-native-maps with PROVIDER_GOOGLE (dev client / APK only). */
export function shouldUseNativeGoogleMaps() {
  return !isExpoGo() && Platform.OS === "android" && hasGoogleMapsApiKey();
}
