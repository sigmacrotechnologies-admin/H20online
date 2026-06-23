import React, { useEffect, useRef } from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AddressMapPickerToolbar from "./AddressMapPickerToolbar";
import {
  useAddressMapPicker,
  pickerStyles as styles,
} from "./addressMapPickerUtils";

function loadGoogleMapsScript(apiKey) {
  if (typeof window !== "undefined" && window.google?.maps) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const existing = document.querySelector("script[data-google-maps]");
    if (existing) {
      existing.addEventListener("load", () => resolve());
      if (window.google?.maps) resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
    script.dataset.googleMaps = "true";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(script);
  });
}

function WebGoogleMap({ lat, lng, apiKey, onPick }) {
  const containerRef = useRef(null);
  const mapStateRef = useRef({ map: null, marker: null });
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !apiKey) return undefined;

    let cancelled = false;

    loadGoogleMapsScript(apiKey)
      .then(() => {
        if (cancelled || !el) return;
        const center = { lat, lng };
        const map = new window.google.maps.Map(el, {
          center,
          zoom: 16,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });
        const marker = new window.google.maps.Marker({
          position: center,
          map,
          draggable: true,
        });
        marker.addListener("dragend", () => {
          const p = marker.getPosition();
          onPickRef.current(p.lat(), p.lng());
        });
        map.addListener("click", (e) => {
          marker.setPosition(e.latLng);
          onPickRef.current(e.latLng.lat(), e.latLng.lng());
        });
        mapStateRef.current = { map, marker };
      })
      .catch(() => {
        // map script load failed — toolbar / manual entry still works
      });

    return () => {
      cancelled = true;
    };
  }, [apiKey]);

  useEffect(() => {
    const { map, marker } = mapStateRef.current;
    if (!map || !marker) return;
    const pos = { lat, lng };
    marker.setPosition(pos);
    map.panTo(pos);
  }, [lat, lng]);

  return <View ref={containerRef} style={styles.map} />;
}

export default function AddressMapPicker({
  latitude,
  longitude,
  onCoordinatesChange,
  onAddressResolved,
}) {
  const {
    lat,
    lng,
    apiKey,
    locating,
    geocoding,
    updateLocation,
    useCurrentLocation,
  } = useAddressMapPicker({
    latitude,
    longitude,
    onCoordinatesChange,
    onAddressResolved,
  });

  if (!apiKey) {
    return (
      <View style={styles.missingKey}>
        <Ionicons name="map-outline" size={24} color="#1E8FB1" />
        <Text style={styles.missingKeyText}>
          Set EXPO_PUBLIC_GOOGLE_MAPS_API_KEY in mobile/.env and restart Expo.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebGoogleMap
        lat={lat}
        lng={lng}
        apiKey={apiKey}
        onPick={(la, lo) => updateLocation(la, lo)}
      />
      <AddressMapPickerToolbar
        locating={locating}
        geocoding={geocoding}
        onUseCurrentLocation={useCurrentLocation}
      />
    </View>
  );
}
