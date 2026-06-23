import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import SupplierScreenShell from "@/src/components/supplier/SupplierScreenShell";
import {
  SectionCard,
  GradientButton,
  EmptyState,
  SupplierPageHeader,
  ModernSheet,
  FilterChip,
  ui,
} from "@/src/components/supplier/supplierUi";
import { theme } from "@/src/theme";
import { api } from "@/src/api/client";

const VEHICLE_OPTIONS = [
  { key: "bike", label: "Bike" },
  { key: "van", label: "Van" },
  { key: "bicycle", label: "Bicycle" },
  { key: "tanker", label: "Tanker" },
  { key: "miniTruck", label: "Mini truck" },
];

const EMPTY_FORM = {
  name: "",
  email: "",
  phone: "",
  password: "",
  vehicleType: "bike",
  vehicleNumber: "",
};

export default function SupplierDeliveryPartnersScreen() {
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const load = useCallback(() => {
    setLoading(true);
    api.supplier.deliveryPartners
      .list()
      .then((list) => setPartners(Array.isArray(list) ? list : []))
      .catch(() => setPartners([]))
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const ownFleet = partners.filter((p) => p.isOwnFleet);
  const platformPool = partners.filter((p) => !p.isOwnFleet);

  const closeForm = () => {
    setShowForm(false);
    setForm(EMPTY_FORM);
  };

  const handleCreate = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.phone.trim() || !form.password.trim()) {
      Alert.alert("Missing fields", "Name, email, phone and password are required.");
      return;
    }
    setSubmitting(true);
    try {
      await api.supplier.deliveryPartners.create({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: form.password,
        vehicleType: form.vehicleType,
        vehicleNumber: form.vehicleNumber.trim(),
      });
      closeForm();
      load();
      Alert.alert("Partner added", "Your delivery partner can sign in from the partner portal.");
    } catch (e) {
      Alert.alert("Could not add partner", e.message || "Request failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SupplierScreenShell
      showMenu
      tallHeader
      headerExtra={
        <SupplierPageHeader
          icon="bicycle-outline"
          title="Delivery partners"
          subtitle="Your fleet + H2Online partner pool"
          stats={[
            { icon: "people-outline", label: "Your fleet", value: String(ownFleet.length) },
            { icon: "globe-outline", label: "Platform", value: String(platformPool.length) },
          ]}
        />
      }
    >
      <ScrollView contentContainerStyle={ui.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <GradientButton
          label="Add your delivery partner"
          icon="person-add-outline"
          onPress={() => setShowForm(true)}
          style={styles.addBtn}
        />

        {loading ? (
          <ActivityIndicator color={theme.accent} style={styles.loader} />
        ) : (
          <>
            <SectionCard title="Your fleet" subtitle="Partners you manage" icon="people-outline">
              {ownFleet.length === 0 ? (
                <EmptyState
                  icon="bicycle-outline"
                  title="No own partners yet"
                  subtitle="Add a rider with vehicle details. They can log in via the partner portal."
                  actionLabel="Add partner"
                  onAction={() => setShowForm(true)}
                />
              ) : (
                ownFleet.map((p) => (
                  <View key={p.id} style={styles.partnerRow}>
                    <View style={styles.partnerIcon}>
                      <Ionicons name="bicycle-outline" size={20} color={theme.accent} />
                    </View>
                    <View style={styles.partnerText}>
                      <Text style={styles.partnerName}>{p.name}</Text>
                      <Text style={styles.partnerMeta}>
                        {p.vehicleType}
                        {p.vehicleNumber ? ` · ${p.vehicleNumber}` : ""}
                        {" · "}
                        {p.phone}
                      </Text>
                    </View>
                    <View style={styles.ownBadge}>
                      <Text style={styles.ownBadgeText}>Your fleet</Text>
                    </View>
                  </View>
                ))
              )}
            </SectionCard>

            <SectionCard title="Platform partners" subtitle="Admin-approved pool" icon="globe-outline">
              {platformPool.length === 0 ? (
                <Text style={styles.muted}>No platform partners available yet.</Text>
              ) : (
                platformPool.map((p) => (
                  <View key={p.id} style={styles.partnerRow}>
                    <View style={styles.partnerIcon}>
                      <Ionicons name="shield-checkmark-outline" size={20} color={theme.accent} />
                    </View>
                    <View style={styles.partnerText}>
                      <Text style={styles.partnerName}>{p.name}</Text>
                      <Text style={styles.partnerMeta}>{p.vehicleType} · {p.phone}</Text>
                    </View>
                  </View>
                ))
              )}
            </SectionCard>
          </>
        )}
      </ScrollView>

      <ModernSheet
        visible={showForm}
        title="Add delivery partner"
        subtitle="Person + vehicle — partner portal login"
        icon="person-add-outline"
        onClose={closeForm}
        footer={
          <GradientButton
            label="Create partner"
            onPress={handleCreate}
            loading={submitting}
            disabled={submitting}
            icon="checkmark-outline"
          />
        }
      >
        <Text style={styles.formHint}>
          Create login credentials for your rider. Platform admin partners remain available when assigning orders.
        </Text>

        <Text style={ui.inputLabel}>Full name *</Text>
        <TextInput
          style={ui.input}
          value={form.name}
          onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
          placeholder="Rider name"
          placeholderTextColor={theme.textMuted}
        />

        <Text style={ui.inputLabel}>Email *</Text>
        <TextInput
          style={ui.input}
          value={form.email}
          onChangeText={(v) => setForm((f) => ({ ...f, email: v }))}
          placeholder="rider@example.com"
          placeholderTextColor={theme.textMuted}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <Text style={ui.inputLabel}>Phone *</Text>
        <TextInput
          style={ui.input}
          value={form.phone}
          onChangeText={(v) => setForm((f) => ({ ...f, phone: v }))}
          placeholder="10-digit mobile"
          placeholderTextColor={theme.textMuted}
          keyboardType="phone-pad"
        />

        <Text style={ui.inputLabel}>Password *</Text>
        <TextInput
          style={ui.input}
          value={form.password}
          onChangeText={(v) => setForm((f) => ({ ...f, password: v }))}
          placeholder="Login password"
          placeholderTextColor={theme.textMuted}
          secureTextEntry
        />

        <Text style={ui.inputLabel}>Vehicle type *</Text>
        <View style={styles.chipRow}>
          {VEHICLE_OPTIONS.map((v) => (
            <FilterChip
              key={v.key}
              label={v.label}
              selected={form.vehicleType === v.key}
              onPress={() => setForm((f) => ({ ...f, vehicleType: v.key }))}
            />
          ))}
        </View>

        <Text style={ui.inputLabel}>Vehicle number</Text>
        <TextInput
          style={ui.input}
          value={form.vehicleNumber}
          onChangeText={(v) => setForm((f) => ({ ...f, vehicleNumber: v }))}
          placeholder="e.g. MH-12-AB-1234"
          placeholderTextColor={theme.textMuted}
          autoCapitalize="characters"
        />
      </ModernSheet>
    </SupplierScreenShell>
  );
}

const styles = StyleSheet.create({
  addBtn: { marginBottom: 4 },
  loader: { marginTop: 32 },
  partnerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(214,234,242,0.6)",
  },
  partnerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(51,175,193,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  partnerText: { flex: 1, minWidth: 0 },
  partnerName: { fontSize: 15, fontWeight: "700", color: theme.textPrimary },
  partnerMeta: { fontSize: 12, color: theme.textMuted, marginTop: 2 },
  ownBadge: {
    backgroundColor: "rgba(51,175,193,0.12)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  ownBadgeText: { fontSize: 10, fontWeight: "700", color: theme.accent },
  muted: { fontSize: 13, color: theme.textMuted, lineHeight: 18 },
  formHint: {
    fontSize: 13,
    color: theme.textMuted,
    lineHeight: 18,
    marginBottom: 16,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
});
