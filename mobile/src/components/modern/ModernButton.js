import React from "react";
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/src/theme";
import { surfaceShadow, clipRounded } from "@/src/utils/platformStyles";

export function ModernPrimaryButton({ label, onPress, disabled, loading, icon = "arrow-forward" }) {
  const isDisabled = disabled || loading;
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9} disabled={isDisabled} style={styles.wrap}>
      <LinearGradient
        colors={isDisabled ? ["#EEF3F7", "#E8EEF2"] : [theme.medium, theme.accent]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.primary, isDisabled && styles.primaryDisabled]}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <>
            <Text style={[styles.primaryText, isDisabled && styles.primaryTextDisabled]}>{label}</Text>
            {icon ? <Ionicons name={icon} size={18} color={isDisabled ? "#8A9AA3" : "#FFFFFF"} /> : null}
          </>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

export function ModernOutlineButton({ label, onPress, disabled, icon = "log-in-outline" }) {
  return (
    <TouchableOpacity
      style={[styles.outline, disabled && styles.outlineDisabled]}
      onPress={onPress}
      activeOpacity={0.85}
      disabled={disabled}
    >
      <Text style={[styles.outlineText, disabled && styles.outlineTextDisabled]}>{label}</Text>
      {icon ? <Ionicons name={icon} size={18} color={disabled ? "#8A9AA3" : theme.accent} /> : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 10, borderRadius: 16, ...clipRounded },
  primary: {
    minHeight: 54,
    borderRadius: 16,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    ...surfaceShadow("accent"),
  },
  primaryDisabled: {
    ...surfaceShadow("sm"),
  },
  primaryText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
    flex: 1,
    paddingRight: 8,
  },
  primaryTextDisabled: { color: "#8A9AA3" },
  outline: {
    marginTop: 10,
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "rgba(51,175,193,0.35)",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  outlineDisabled: { opacity: 0.6 },
  outlineText: { fontSize: 15, fontWeight: "600", color: theme.accent },
  outlineTextDisabled: { color: "#8A9AA3" },
});
