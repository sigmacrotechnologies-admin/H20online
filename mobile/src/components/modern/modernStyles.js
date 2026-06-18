import { Platform, StyleSheet } from "react-native";
import { theme } from "@/src/theme";
import { surfaceShadow } from "@/src/utils/platformStyles";

export const MODERN_PANEL_BG = "#F8FCFD";

export const modern = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.screenBackground,
  },
  contentScroll: {
    flex: 1,
    marginTop: -30,
  },
  scrollContent: {
    paddingBottom: Platform.OS === "android" ? 36 : 24,
  },
  contentPanel: {
    backgroundColor: MODERN_PANEL_BG,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 28,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === "android" ? 34 : 20,
    minHeight: "100%",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.9)",
    ...(Platform.OS === "android" ? { overflow: "hidden", elevation: 0 } : surfaceShadow("panel")),
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: theme.textPrimary,
    letterSpacing: -0.4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: theme.textMuted,
    marginTop: 5,
    marginBottom: 20,
    lineHeight: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.textPrimary,
    marginBottom: 10,
  },
  inputSection: {
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "rgba(214,234,242,0.95)",
    ...(Platform.OS === "android" ? { overflow: "hidden", elevation: 0 } : surfaceShadow("md")),
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: theme.textPrimary,
    padding: 0,
    margin: 0,
    borderWidth: 0,
    backgroundColor: "transparent",
    ...(Platform.OS === "android" ? { textAlignVertical: "center", includeFontPadding: false } : {}),
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(214,234,242,0.95)",
    ...(Platform.OS === "android" ? { overflow: "hidden", elevation: 0 } : surfaceShadow("lg")),
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: theme.textPrimary,
    marginBottom: 4,
  },
  errorText: {
    fontSize: 14,
    color: "#DC2626",
    marginBottom: 12,
    fontWeight: "500",
  },
  linkText: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.link,
  },
});
