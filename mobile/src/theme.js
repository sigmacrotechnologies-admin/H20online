/**
 * App theme - single source of truth for mobile app colors.
 * Matches role selection screen. Change here to switch the entire app theme.
 */
export const theme = {
  // Teal shades (same as role selection)
  light: "#42C4C8",
  medium: "#33AFC1",
  accent: "#1E8FB1",

  // Screen background (same as role selection - light teal)
  background: "#C2EEF0",

  // Semantic usage - no black, same as role selection
  primary: "#1E8FB1",
  primaryLight: "#33AFC1",
  screenBackground: "#C2EEF0",
  cardBackground: "rgba(255,255,255,0.75)",
  cardBackgroundSolid: "#FFFFFF",
  border: "#33AFC1",
  textPrimary: "#1B2B34",
  textSecondary: "#334155",
  textMuted: "#6B7C85",
  white: "#FFFFFF",
  link: "#1E8FB1",
  selectedTint: "rgba(194,238,240,0.85)",

  // Gradient (same as role selection)
  gradient: ["#42C4C8", "#33AFC1", "#1E8FB1"],
  gradientWithEnd: ["#42C4C8", "#33AFC1", "#1E8FB1", "#1780a0"],
};

export default theme;
