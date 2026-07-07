import { useCallback, useState } from "react";
import { StyleSheet, Alert } from "react-native";
import * as Location from "expo-location";
import { theme } from "@/src/theme";
import {
  getGoogleMapsApiKey,
  reverseGeocode,
  parseAddressFromGeocode,
} from "@/src/utils/googleMaps";

export const DEFAULT_LAT = 19.076;
export const DEFAULT_LNG = 72.8777;
export const DELTA = 0.01;

export function useAddressMapPicker({
  latitude,
  longitude,
  onCoordinatesChange,
  onAddressResolved,
  mapRef,
}) {
  const [locating, setLocating] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const apiKey = getGoogleMapsApiKey();

  const lat = latitude ?? DEFAULT_LAT;
  const lng = longitude ?? DEFAULT_LNG;

  const updateLocation = useCallback(
    async (newLat, newLng) => {
      onCoordinatesChange?.({ latitude: newLat, longitude: newLng });
      if (!apiKey) return;
      setGeocoding(true);
      try {
        const result = await reverseGeocode(newLat, newLng);
        if (result) {
          onAddressResolved?.(parseAddressFromGeocode(result));
        }
      } catch (err) {
        Alert.alert(
          "Could not read address from map",
          (err.message || "Geocoding failed") +
            "\n\nYou can still save — fill locality, city, state, PIN and phone below manually."
        );
      } finally {
        setGeocoding(false);
      }
    },
    [apiKey, onCoordinatesChange, onAddressResolved]
  );

  const useCurrentLocation = async () => {
    if (!apiKey) {
      Alert.alert("Maps not configured", "Add EXPO_PUBLIC_GOOGLE_MAPS_API_KEY to your .env file.");
      return;
    }
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Allow location access to use your current location.");
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude: la, longitude: lo } = pos.coords;
      if (mapRef?.current?.animateToRegion) {
        mapRef.current.animateToRegion(
          { latitude: la, longitude: lo, latitudeDelta: DELTA, longitudeDelta: DELTA },
          300
        );
      }
      await updateLocation(la, lo);
    } catch (err) {
      Alert.alert("Location error", err.message || "Could not get current location");
    } finally {
      setLocating(false);
    }
  };

  return {
    lat,
    lng,
    apiKey,
    locating,
    geocoding,
    updateLocation,
    useCurrentLocation,
  };
}

export const pickerStyles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: "#F8FDFF",
  },
  map: {
    width: "100%",
    height: 200,
  },
  toolbar: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
  },
  locationBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: theme.border,
  },
  locationBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.textPrimary,
  },
  hintText: {
    fontSize: 12,
    color: theme.textMuted,
  },
  geocodeHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  geocodeHintText: {
    fontSize: 12,
    color: theme.textMuted,
  },
  missingKey: {
    padding: 16,
    alignItems: "center",
    gap: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: "#F8FDFF",
  },
  missingKeyText: {
    fontSize: 12,
    color: theme.textMuted,
    textAlign: "center",
    lineHeight: 18,
  },
  missingKeyHint: {
    fontSize: 11,
    color: theme.textMuted,
    textAlign: "center",
    lineHeight: 16,
    marginTop: 4,
  },
  expoGoHint: {
    fontSize: 11,
    color: theme.textMuted,
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
});
