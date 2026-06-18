import { Platform } from "react-native";

const IOS_SHADOWS = {
  sm: {
    shadowColor: "#0B3A4A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  md: {
    shadowColor: "#0B3A4A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  lg: {
    shadowColor: "#0B3A4A",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  panel: {
    shadowColor: "#0B3A4A",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  accent: {
    shadowColor: "#1E8FB1",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
  },
};

/**
 * iOS soft shadow / Android flat (no elevation).
 * Elevation on rounded or translucent Android views causes grey "patches" inside tiles.
 */
export function surfaceShadow(size = "md") {
  if (Platform.OS === "android") return { elevation: 0 };
  return IOS_SHADOWS[size] || IOS_SHADOWS.md;
}

/** Frosted glass chips (logo, header controls). Never use elevation on Android. */
export const glassSurface = {
  backgroundColor: Platform.OS === "android" ? "rgba(255,255,255,0.32)" : "rgba(255,255,255,0.2)",
  borderWidth: 1,
  borderColor: Platform.OS === "android" ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.34)",
  ...(Platform.OS === "android" ? { elevation: 0, overflow: "hidden" } : {}),
};

/** Clip children to border radius on Android (gradient buttons, cards). */
export const clipRounded = Platform.OS === "android" ? { overflow: "hidden" } : {};
