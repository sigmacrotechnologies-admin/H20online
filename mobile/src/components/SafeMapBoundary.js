import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/src/theme";

export default class SafeMapBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    // Map SDK errors should not break checkout / track screens.
  }

  render() {
    if (this.state.failed) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <View style={styles.fallback}>
          <Ionicons name="map-outline" size={22} color={theme.accent} />
          <Text style={styles.fallbackText}>
            {this.props.fallbackText || "Map preview unavailable — distance & ETA still work below."}
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  fallback: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: "#F8FDFF",
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  fallbackText: {
    flex: 1,
    fontSize: 12,
    color: theme.textMuted,
    lineHeight: 18,
  },
});
