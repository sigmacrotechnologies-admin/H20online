import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import SupplierScreenShell from "@/src/components/supplier/SupplierScreenShell";
import {
  SectionCard,
  GradientButton,
  SupplierPageHeader,
  ui,
} from "@/src/components/supplier/supplierUi";
import AddressMapPicker from "@/src/components/AddressMapPicker";
import SafeMapBoundary from "@/src/components/SafeMapBoundary";
import { ModernInput } from "@/src/components/modern";
import { api } from "@/src/api/client";
import { theme } from "@/src/theme";

export default function SupplierStoreLocationScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    address: "",
    location: "",
    city: "",
    latitude: null,
    longitude: null,
  });

  const loadProfile = useCallback(() => {
    setLoading(true);
    api.suppliers
      .me()
      .then((s) => {
        setForm({
          address: s.address || "",
          location: s.location || "",
          city: s.city || "",
          latitude: s.latitude ?? null,
          longitude: s.longitude ?? null,
        });
      })
      .catch(() => Alert.alert("Error", "Could not load store profile"))
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  const handleSave = async () => {
    if (!form.latitude || !form.longitude) {
      Alert.alert("Pin required", "Pick your store location on the map before saving.");
      return;
    }
    if (!String(form.address || "").trim()) {
      Alert.alert("Address required", "Enter your store address.");
      return;
    }
    setSaving(true);
    try {
      await api.suppliers.updateMe({
        address: form.address,
        location: form.location,
        city: form.city,
        latitude: form.latitude,
        longitude: form.longitude,
      });
      Alert.alert("Saved", "Store location updated.");
      router.back();
    } catch (err) {
      Alert.alert("Error", err.message || "Could not save store location");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SupplierScreenShell
      showMenu
      tallHeader
      headerExtra={
        <SupplierPageHeader
          icon="location-outline"
          title="Store location"
          subtitle="Legacy single shop pin — use My stores for multiple locations"
        />
      }
    >
      {loading ? (
        <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 24 }} />
      ) : (
        <ScrollView contentContainerStyle={ui.scrollContent} showsVerticalScrollIndicator={false}>
          <SectionCard icon="location-outline" title="Pin on map" subtitle="Customers see distance and ETA from this point">
            <SafeMapBoundary>
              <AddressMapPicker
                latitude={form.latitude}
                longitude={form.longitude}
                onCoordinatesChange={({ latitude, longitude }) =>
                  setForm((prev) => ({ ...prev, latitude, longitude }))
                }
                onAddressResolved={(parts) =>
                  setForm((prev) => ({
                    ...prev,
                    location: parts.locality || prev.location,
                    city: parts.city || prev.city,
                  }))
                }
              />
            </SafeMapBoundary>
          </SectionCard>

          <SectionCard icon="home-outline" title="Address details" subtitle="Building and area">
            <ModernInput
              label="Store address"
              icon="home-outline"
              value={form.address}
              onChangeText={(t) => setForm((prev) => ({ ...prev, address: t }))}
              placeholder="Building, street, area"
            />
            <ModernInput
              label="Area / locality"
              icon="map-outline"
              value={form.location}
              onChangeText={(t) => setForm((prev) => ({ ...prev, location: t }))}
              placeholder="e.g. Sector 5"
            />
            <ModernInput
              label="City"
              icon="business-outline"
              value={form.city}
              onChangeText={(t) => setForm((prev) => ({ ...prev, city: t }))}
              placeholder="e.g. Mumbai"
            />
          </SectionCard>

          <GradientButton
            label={saving ? "Saving..." : "Save store location"}
            icon="save-outline"
            onPress={handleSave}
            loading={saving}
            disabled={saving}
          />
        </ScrollView>
      )}
    </SupplierScreenShell>
  );
}

const styles = StyleSheet.create({});
