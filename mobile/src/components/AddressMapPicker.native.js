import React, { useEffect, useRef } from "react";
import { View, Text } from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import AddressMapPickerToolbar from "./AddressMapPickerToolbar";
import GoogleMapsWebViewPicker from "./GoogleMapsWebViewPicker";
import {
  DELTA,
  useAddressMapPicker,
  pickerStyles as styles,
} from "./addressMapPickerUtils";
import {
  hasGoogleMapsApiKey,
  shouldUseNativeGoogleMaps,
  shouldUseWebMapsFallback,
  isExpoGo,
} from "@/src/utils/mapRuntime";

export default function AddressMapPicker({
  latitude,
  longitude,
  onCoordinatesChange,
  onAddressResolved,
}) {
  const mapRef = useRef(null);
  const {
    lat,
    lng,
    locating,
    geocoding,
    updateLocation,
    useCurrentLocation,
  } = useAddressMapPicker({
    latitude,
    longitude,
    onCoordinatesChange,
    onAddressResolved,
    mapRef,
  });

  useEffect(() => {
    if (latitude != null && longitude != null && mapRef.current) {
      mapRef.current.animateToRegion(
        { latitude, longitude, latitudeDelta: DELTA, longitudeDelta: DELTA },
        250
      );
    }
  }, [latitude, longitude]);

  if (!hasGoogleMapsApiKey()) {
    return (
      <View style={styles.missingKey}>
        <Ionicons name="map-outline" size={24} color="#1E8FB1" />
        <Text style={styles.missingKeyText}>
          Add EXPO_PUBLIC_GOOGLE_MAPS_API_KEY to mobile/.env (same key as backend GOOGLE_MAPS_API_KEY), then restart Expo with -c.
        </Text>
        {isExpoGo() ? (
          <Text style={styles.missingKeyHint}>
            Expo Go uses the JavaScript Maps API — the key must be in .env, not only in app.config.
          </Text>
        ) : null}
      </View>
    );
  }

  const useWebFallback = shouldUseWebMapsFallback();

  return (
    <View style={styles.container}>
      {useWebFallback ? (
        <GoogleMapsWebViewPicker lat={lat} lng={lng} onPick={(la, lo) => updateLocation(la, lo)} />
      ) : (
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={shouldUseNativeGoogleMaps() ? PROVIDER_GOOGLE : undefined}
          initialRegion={{
            latitude: lat,
            longitude: lng,
            latitudeDelta: DELTA,
            longitudeDelta: DELTA,
          }}
          onPress={(e) =>
            updateLocation(e.nativeEvent.coordinate.latitude, e.nativeEvent.coordinate.longitude)
          }
        >
          <Marker
            coordinate={{ latitude: lat, longitude: lng }}
            draggable
            onDragEnd={(e) =>
              updateLocation(
                e.nativeEvent.coordinate.latitude,
                e.nativeEvent.coordinate.longitude
              )
            }
          />
        </MapView>
      )}
      <AddressMapPickerToolbar
        locating={locating}
        geocoding={geocoding}
        onUseCurrentLocation={useCurrentLocation}
      />
      {useWebFallback ? (
        <Text style={styles.expoGoHint}>Using Google Maps in Expo Go (tap map or drag pin).</Text>
      ) : null}
    </View>
  );
}
