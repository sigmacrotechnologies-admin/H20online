import React from "react";
import { TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

/**
 * Reusable back button with consistent styling (matches Login screen).
 * Use onPress to define where to go (e.g. router.back() or custom handler).
 *
 * @param {function} onPress - Called when the button is pressed (e.g. () => router.back())
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
    marginLeft: 8,
  },
});
