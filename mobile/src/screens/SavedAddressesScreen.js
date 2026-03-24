import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  StatusBar,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/src/api/client";
import BackButton from "@/src/components/BackButton";
import { theme } from "@/src/theme";

const FIELDS = [
  { key: "houseNumber", label: "House / Building no.", placeholder: "e.g. 12, Tower A" },
  { key: "locality", label: "Locality / Area", placeholder: "e.g. Sector 5" },
  { key: "city", label: "City", placeholder: "e.g. Mumbai" },
  { key: "state", label: "State", placeholder: "e.g. Maharashtra" },
  { key: "pinCode", label: "PIN code", placeholder: "e.g. 400001", keyboardType: "number-pad" },
  { key: "phoneNumber", label: "Phone number *", placeholder: "e.g. 9876543210", keyboardType: "phone-pad" },
];

export default function SavedAddressesScreen() {
  const router = useRouter();
  const androidTopInset = Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ houseNumber: "", locality: "", city: "", state: "", pinCode: "", phoneNumber: "", isDefault: false });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchAddresses = useCallback(() => {
    return api.addresses.list().then(setAddresses).catch(() => setAddresses([]));
  }, []);

  useEffect(() => {
    fetchAddresses().finally(() => setLoading(false));
  }, [fetchAddresses]);

  const openAdd = () => {
    setEditingId(null);
    setForm({ houseNumber: "", locality: "", city: "", state: "", pinCode: "", phoneNumber: "", isDefault: false });
    setError("");
    setShowForm(true);
  };

  const openEdit = (a) => {
    setEditingId(a.id);
    setForm({
      houseNumber: a.houseNumber || "",
      locality: a.locality || "",
      city: a.city || "",
      state: a.state || "",
      pinCode: a.pinCode || "",
      phoneNumber: a.phoneNumber || "",
      isDefault: a.isDefault || false,
    });
    setError("");
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
  };

  const validate = () => {
    const { locality, city, state, pinCode, phoneNumber } = form;
    if (!locality.trim() && !city.trim() && !state.trim() && !pinCode.trim()) {
      setError("Please fill at least locality, city, state or PIN code.");
      return false;
    }
    if (!String(phoneNumber || "").trim()) {
      setError("Phone number is required.");
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    setError("");
    if (!validate()) return;
    setSaving(true);
    try {
      if (editingId) {
        await api.addresses.update(editingId, form);
        setAddresses((prev) => prev.map((a) => (a.id === editingId ? { ...a, ...form, fullAddress: [form.houseNumber, form.locality, form.city, form.state, form.pinCode].filter(Boolean).join(", ") } : a)));
      } else {
        const created = await api.addresses.create(form);
        setAddresses((prev) => [created, ...prev]);
      }
      closeForm();
    } catch (err) {
      setError(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (a) => {
    Alert.alert("Delete address", `Remove "${a.fullAddress || "this address"}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => api.addresses.delete(a.id).then(() => setAddresses((prev) => prev.filter((x) => x.id !== a.id))).catch((e) => Alert.alert("Error", e.message || "Could not delete")),
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerSection}>
        <LinearGradient colors={theme.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.gradientBackground, { paddingTop: 20 + androidTopInset }]}>
          <View style={styles.headerTopRow}>
            <BackButton onPress={() => router.back()} />
            <Image source={require("../../assets/images/h20-logo-light-full.png")} style={styles.headerLogoLight} resizeMode="contain" />
            <TouchableOpacity style={styles.addBtn} onPress={openAdd} activeOpacity={0.8}>
              <Ionicons name="add" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <View style={styles.headerInfoRow}>
            <View style={styles.headerIconCircle}>
              <Ionicons name="location-outline" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.headerTextWrap}>
              <Text style={styles.headerTitle}>Saved addresses</Text>
              <Text style={styles.headerSubtitle}>Manage delivery locations and contact numbers</Text>
            </View>
          </View>
        </LinearGradient>
      </View>
      <View style={styles.contentSection}>
      {loading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color={theme.primary} /></View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {addresses.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="location-outline" size={48} color="#9CA3AF" />
              <Text style={styles.emptyText}>No saved addresses</Text>
              <Text style={styles.emptySub}>Add an address to use it for orders and subscription delivery.</Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={openAdd} activeOpacity={0.8}>
                <Text style={styles.emptyBtnText}>Add address</Text>
              </TouchableOpacity>
            </View>
          ) : (
            addresses.map((a) => (
              <View key={a.id} style={styles.card}>
                <View style={styles.cardRow}>
                  <Text style={styles.cardAddress} numberOfLines={2}>{a.fullAddress || "—"}</Text>
                  {a.isDefault && <View style={styles.defaultBadge}><Text style={styles.defaultBadgeText}>Default</Text></View>}
                </View>
                {(a.locality || a.pinCode) ? <Text style={styles.cardMeta}>{[a.locality, a.pinCode].filter(Boolean).join(" · ")}</Text> : null}
                <View style={styles.cardActions}>
                  <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(a)} activeOpacity={0.8}>
                    <Ionicons name="pencil-outline" size={18} color={theme.primary} />
                    <Text style={styles.editBtnText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.delBtn} onPress={() => handleDelete(a)} activeOpacity={0.8}>
                    <Ionicons name="trash-outline" size={18} color="#B91C1C" />
                    <Text style={styles.delBtnText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}
      </View>

      <Modal visible={showForm} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={closeForm}>
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingId ? "Edit address" : "Add address"}</Text>
              <TouchableOpacity onPress={closeForm}><Ionicons name="close" size={24} color="#1B2B34" /></TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
              {FIELDS.map((f) => (
                <View key={f.key} style={styles.field}>
                  <Text style={styles.fieldLabel}>{f.label}</Text>
                  <TextInput
                    style={styles.input}
                    value={form[f.key]}
                    onChangeText={(t) => setForm((prev) => ({ ...prev, [f.key]: t }))}
                    placeholder={f.placeholder}
                    placeholderTextColor="#9CA3AF"
                    keyboardType={f.keyboardType || "default"}
                  />
                </View>
              ))}
              <TouchableOpacity
                style={styles.defaultRow}
                onPress={() => setForm((prev) => ({ ...prev, isDefault: !prev.isDefault }))}
                activeOpacity={0.8}
              >
                <Ionicons name={form.isDefault ? "checkbox" : "square-outline"} size={24} color={theme.primary} />
                <Text style={styles.defaultLabel}>Set as default address</Text>
              </TouchableOpacity>
              {error ? <Text style={styles.errText}>{error}</Text> : null}
              <TouchableOpacity style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={handleSave} disabled={saving} activeOpacity={0.8}>
                <Text style={styles.saveBtnText}>{saving ? "Saving…" : "Save"}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.screenBackground },
  headerSection: { minHeight: 220, overflow: "hidden" },
  gradientBackground: { flex: 1, paddingHorizontal: 20, paddingBottom: 20 },
  headerTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 24 },
  headerLogoLight: { width: 124, height: 34 },
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center" },
  headerInfoRow: { flexDirection: "row", alignItems: "center" },
  headerIconCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: "rgba(255,255,255,0.25)", justifyContent: "center", alignItems: "center" },
  headerTextWrap: { flex: 1, marginLeft: 12 },
  headerTitle: { fontSize: 17, fontWeight: "700", color: "#FFFFFF" },
  headerSubtitle: { fontSize: 13, color: "rgba(255,255,255,0.95)", marginTop: 2, maxWidth: "95%" },
  contentSection: {
    marginTop: -24,
    backgroundColor: theme.screenBackground,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    flex: 1,
    overflow: "hidden",
  },
  scrollContent: { padding: 16, paddingBottom: 40, paddingTop: 18 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  empty: { alignItems: "center", paddingVertical: 48 },
  emptyText: { fontSize: 16, fontWeight: "600", color: "#6B7C85", marginTop: 12 },
  emptySub: { fontSize: 14, color: "#9CA3AF", marginTop: 4, textAlign: "center" },
  emptyBtn: { marginTop: 20, paddingVertical: 12, paddingHorizontal: 24, backgroundColor: theme.primary, borderRadius: 12 },
  emptyBtnText: { fontSize: 15, fontWeight: "600", color: "#FFF" },
  card: { backgroundColor: "rgba(255,255,255,0.78)", borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.85)" },
  cardRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  cardAddress: { flex: 1, fontSize: 15, color: "#1B2B34", marginBottom: 4 },
  defaultBadge: { backgroundColor: "#E0F2FE", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  defaultBadgeText: { fontSize: 11, fontWeight: "600", color: theme.primary },
  cardMeta: { fontSize: 13, color: "#6B7C85", marginBottom: 8 },
  cardActions: { flexDirection: "row", gap: 16 },
  editBtn: { flexDirection: "row", alignItems: "center", gap: 6 },
  editBtnText: { fontSize: 14, fontWeight: "600", color: theme.primary },
  delBtn: { flexDirection: "row", alignItems: "center", gap: 6 },
  delBtnText: { fontSize: 14, fontWeight: "600", color: "#B91C1C" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#FFF", borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "85%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#1B2B34" },
  modalScroll: { padding: 16 },
  field: { marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: "600", color: "#6B7C85", marginBottom: 6 },
  input: { backgroundColor: "#f9fafb", borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, fontSize: 16, color: "#1B2B34", borderWidth: 1, borderColor: "#E5E7EB" },
  defaultRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 },
  defaultLabel: { fontSize: 15, color: "#1B2B34" },
  errText: { fontSize: 14, color: "#B91C1C", marginBottom: 12 },
  saveBtn: { backgroundColor: theme.primary, paddingVertical: 14, borderRadius: 12, alignItems: "center" },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontSize: 16, fontWeight: "600", color: "#FFF" },
});
