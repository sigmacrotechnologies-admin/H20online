import React from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/src/theme";
import { pickerStyles as styles } from "./addressMapPickerUtils";

export default function AddressMapPickerToolbar({
  locating,
  geocoding,
  onUseCurrentLocation,
}) {
  return (
    <View style={styles.toolbar}>
      <TouchableOpacity
        style={styles.locationBtn}
        onPress={onUseCurrentLocation}
        disabled={locating || geocoding}
        activeOpacity={0.88}
      >
        {locating ? (
          <ActivityIndicator size="small" color={theme.accent} />
        ) : (
          <Ionicons name="navigate" size={16} color={theme.accent} />
        )}
        <Text style={styles.locationBtnText}>Use current location</Text>
      </TouchableOpacity>
      {geocoding ? (
        <View style={styles.geocodeHint}>
          <ActivityIndicator size="small" color={theme.textMuted} />
          <Text style={styles.geocodeHintText}>Finding address…</Text>
        </View>
      ) : (
        <Text style={styles.hintText}>Tap map or drag pin to set location</Text>
      )}
    </View>
  );
}
