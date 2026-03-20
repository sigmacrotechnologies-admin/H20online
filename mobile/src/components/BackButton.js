import React from "react";
import { TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

/** Standard position for back button across the app: top 14, left 20. Use for gradient/overlay headers. */
export const backButtonContainerStyle = {
  position: "absolute",
  top: 14,
  left: 20,
  zIndex: 10,
  elevation: 10,
};

/** Standard header row padding so back button sits at same position (top 14, left 20). Use for flat headers. */
export const headerRowWithBackStyle = {
  paddingTop: 14,
  paddingHorizontal: 20,
  paddingBottom: 12,
};

/**
 * Reusable back button with consistent styling.
 * Use onPress to define where to go (e.g. router.back() or custom handler).
 * Wrap in a container with backButtonContainerStyle (absolute) or a row with headerRowWithBackStyle for identical position.
 *
 * @param {function} onPress - Called when the button is pressed
 * @param {string} [iconColor="#FFFFFF"] - Icon color; use "#1B2B34" on light backgrounds
 * @param {object} [style] - Optional style override for the button container
 */
export default function BackButton({ onPress, iconColor = "#FFFFFF", style }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.backButton, style]}
      activeOpacity={0.7}
    >
      <Ionicons name="chevron-back" size={24} color={iconColor} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
});
