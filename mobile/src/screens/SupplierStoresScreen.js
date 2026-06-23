import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AddressMapPicker from "@/src/components/AddressMapPicker";
import SafeMapBoundary from "@/src/components/SafeMapBoundary";
import { ModernInput } from "@/src/components/modern";
import SupplierScreenShell from "@/src/components/supplier/SupplierScreenShell";
import {
  SectionCard,
  GradientButton,
  EmptyState,
  SupplierPageHeader,
  FilterChip,
  ui,
} from "@/src/components/supplier/supplierUi";
import { api } from "@/src/api/client";
import { theme } from "@/src/theme";

const STATUS_META = {
  pending: { label: "Pending approval", color: "#D97706", bg: "#FEF3C7" },
  approved: { label: "Approved", color: "#059669", bg: "#D1FAE5" },
  rejected: { label: "Rejected", color: "#DC2626", bg: "#FEE2E2" },
};

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.pending;
  return (
    <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
      <Text style={[styles.statusBadgeText, { color: meta.color }]}>{meta.label}</Text>
    </View>
  );
}

function friendlyStoreError(err) {
  const msg = err?.message || "Could not complete request";
  if (
    msg === "Request failed" ||
    msg.includes("404") ||
    msg.toLowerCase().includes("not found")
  ) {
    return "Store API is not running on your backend. In the backend folder run: npm run dev (stop any old node server on port 5000 first).";
  }
  if (msg.includes("Supplier profile required")) {
    return "Supplier profile not found. Finish supplier onboarding, then try again.";
  }
  if (msg.includes("No token") || msg.includes("Invalid token")) {
    return "Please log in again as a supplier.";
  }
  return msg;
}

export default function SupplierStoresScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [stores, setStores] = useState([]);
  const [listError, setListError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    name: "",
    storeType: "store",
    address: "",
    locality: "",
    city: "",
    latitude: null,
    longitude: null,
  });

  const clearForm = () => {
    setForm({
      name: "",
      storeType: "store",
      address: "",
      locality: "",
      city: "",
      latitude: null,
      longitude: null,
    });
    setEditingId(null);
  };

  const closeForm = () => {
    clearForm();
    setShowForm(false);
  };

  const loadStores = useCallback(() => {
    setLoading(true);
    setListError("");
    api.stores
      .list()
      .then((list) => setStores(Array.isArray(list) ? list : []))
      .catch((err) => {
        setStores([]);
        setListError(friendlyStoreError(err));
      })
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadStores();
    }, [loadStores])
  );

  const openAdd = () => {
    clearForm();
    setShowForm(true);
  };

  const openEdit = (store) => {
    if (store.status === "rejected") {
      Alert.alert("Cannot edit", "This store was rejected. Submit a new store request.");
      return;
    }
    setEditingId(store.id);
    setForm({
      name: store.name || "",
      storeType: store.storeType || "store",
      address: store.address || "",
      locality: store.locality || "",
      city: store.city || "",
      latitude: store.latitude ?? null,
      longitude: store.longitude ?? null,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!String(form.name || "").trim()) {
      Alert.alert("Name required", "Enter a name for this store or warehouse.");
      return;
    }
    if (form.latitude == null || form.longitude == null) {
      Alert.alert("Map pin required", "Pick the store location on the map before saving.");
      return;
    }
    setSaving(true);
    try {
      const body = {
        name: form.name.trim(),
        storeType: form.storeType,
        address: form.address,
        locality: form.locality,
        city: form.city,
        latitude: form.latitude,
        longitude: form.longitude,
      };
      if (editingId) {
        await api.stores.update(editingId, body);
        Alert.alert("Updated", "Store updated. Approved stores go back to admin for review.");
      } else {
        await api.stores.create(body);
        Alert.alert("Submitted", "Store request sent to admin for approval.");
      }
      closeForm();
      loadStores();
    } catch (err) {
      Alert.alert("Error", friendlyStoreError(err));
    } finally {
      setSaving(false);
    }
  };

  const pendingCount = stores.filter((s) => s.status === "pending").length;
  const approvedCount = stores.filter((s) => s.status === "approved").length;

  return (
    <SupplierScreenShell
      showMenu
      tallHeader
      headerExtra={
        <SupplierPageHeader
          icon="storefront-outline"
          title="My stores"
          subtitle="Stores & warehouses for fulfilment"
          stats={[
            { icon: "layers-outline", label: "Total", value: String(stores.length) },
            { icon: "time-outline", label: "Pending", value: String(pendingCount) },
            { icon: "checkmark-circle-outline", label: "Approved", value: String(approvedCount) },
          ]}
        />
      }
    >
      <ScrollView contentContainerStyle={ui.scrollContent} showsVerticalScrollIndicator={false}>
        {listError ? (
          <View style={styles.errorBanner}>
            <Ionicons name="warning-outline" size={18} color="#B45309" />
            <Text style={styles.errorBannerText}>{listError}</Text>
          </View>
        ) : null}

        {!showForm ? (
          <GradientButton
            label="Add store / warehouse"
            icon="add-circle-outline"
            onPress={openAdd}
            style={styles.addBtn}
          />
        ) : null}

        {loading ? (
          <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 24 }} />
        ) : showForm ? (
          <SectionCard
            icon="location-outline"
            title={editingId ? "Edit store" : "Add store / warehouse"}
            subtitle="Map pin required — admin approves before products can use this location"
          >
            <View style={styles.chipRow}>
              <FilterChip
                label="Store"
                selected={form.storeType === "store"}
                onPress={() => setForm((p) => ({ ...p, storeType: "store" }))}
              />
              <FilterChip
                label="Warehouse"
                selected={form.storeType === "warehouse"}
                onPress={() => setForm((p) => ({ ...p, storeType: "warehouse" }))}
              />
            </View>

            <Text style={ui.inputLabel}>Name *</Text>
            <TextInput
              style={ui.input}
              value={form.name}
              onChangeText={(t) => setForm((p) => ({ ...p, name: t }))}
              placeholder="e.g. Andheri outlet"
              placeholderTextColor={theme.textMuted}
            />

            <Text style={ui.inputLabel}>Pin on map *</Text>
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
                    locality: parts.locality || prev.locality,
                    city: parts.city || prev.city,
                  }))
                }
              />
            </SafeMapBoundary>

            <ModernInput
              label="Address"
              icon="home-outline"
              value={form.address}
              onChangeText={(t) => setForm((p) => ({ ...p, address: t }))}
              placeholder="Building, street, area"
            />
            <ModernInput
              label="Area / locality"
              icon="map-outline"
              value={form.locality}
              onChangeText={(t) => setForm((p) => ({ ...p, locality: t }))}
              placeholder="e.g. Sector 5"
            />
            <ModernInput
              label="City"
              icon="business-outline"
              value={form.city}
              onChangeText={(t) => setForm((p) => ({ ...p, city: t }))}
              placeholder="e.g. Mumbai"
            />

            <View style={styles.formActions}>
              <GradientButton label="Cancel" variant="outline" onPress={closeForm} style={styles.formActionBtn} />
              <GradientButton
                label={editingId ? "Update" : "Submit for approval"}
                icon="save-outline"
                onPress={handleSave}
                loading={saving}
                disabled={saving}
                style={styles.formActionBtn}
              />
            </View>
          </SectionCard>
        ) : stores.length === 0 ? (
          <EmptyState
            icon="storefront-outline"
            title="No stores yet"
            subtitle="Add a store or warehouse with a map pin. After admin approval, link it to products for customer tracking."
            actionLabel="Add store"
            onAction={openAdd}
          />
        ) : (
          <SectionCard icon="storefront-outline" title="Your locations" subtitle={`${stores.length} store${stores.length === 1 ? "" : "s"}`}>
            {stores.map((store) => (
              <View key={store.id} style={styles.storeCard}>
                <View style={styles.storeCardHeader}>
                  <View style={styles.storeIconWrap}>
                    <Ionicons
                      name={store.storeType === "warehouse" ? "business-outline" : "storefront-outline"}
                      size={20}
                      color={theme.accent}
                    />
                  </View>
                  <View style={styles.storeCardTitleWrap}>
                    <Text style={styles.storeName}>{store.name}</Text>
                    <Text style={styles.storeType}>
                      {store.storeType === "warehouse" ? "Warehouse" : "Store"}
                      {store.city ? ` · ${store.city}` : ""}
                    </Text>
                  </View>
                  <StatusBadge status={store.status} />
                </View>
                {store.address ? <Text style={styles.storeAddress} numberOfLines={2}>{store.address}</Text> : null}
                {store.status === "rejected" && store.rejectionReason ? (
                  <Text style={styles.rejectionText}>Reason: {store.rejectionReason}</Text>
                ) : null}
                {store.status !== "rejected" ? (
                  <TouchableOpacity style={styles.editLink} onPress={() => openEdit(store)} activeOpacity={0.85}>
                    <Ionicons name="create-outline" size={16} color={theme.accent} />
                    <Text style={styles.editLinkText}>Edit</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ))}
          </SectionCard>
        )}
      </ScrollView>
    </SupplierScreenShell>
  );
}

const styles = StyleSheet.create({
  errorBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#FEF3C7",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  errorBannerText: { flex: 1, fontSize: 12, color: "#92400E", lineHeight: 18 },
  addBtn: { marginBottom: 16 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  formActions: { flexDirection: "row", gap: 10, marginTop: 8 },
  formActionBtn: { flex: 1 },
  storeCard: {
    backgroundColor: theme.contentPanelBackground,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(214,234,242,0.95)",
    gap: 6,
  },
  storeCardHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  storeIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#E0F7FA",
    alignItems: "center",
    justifyContent: "center",
  },
  storeCardTitleWrap: { flex: 1 },
  storeName: { fontSize: 15, fontWeight: "700", color: theme.textPrimary },
  storeType: { fontSize: 12, color: theme.textMuted, marginTop: 2 },
  storeAddress: { fontSize: 12, color: theme.textMuted, lineHeight: 18 },
  rejectionText: { fontSize: 12, color: "#DC2626", lineHeight: 18 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusBadgeText: { fontSize: 10, fontWeight: "700" },
  editLink: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start" },
  editLinkText: { fontSize: 13, fontWeight: "600", color: theme.accent },
});
