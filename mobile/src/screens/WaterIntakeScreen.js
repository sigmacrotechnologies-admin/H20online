import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import BackButton from "@/src/components/BackButton";
import WaterDroplet from "@/src/components/WaterDroplet";
import { api } from "@/src/api/client";
import { useAuth } from "@/src/context/AuthContext";

const SUGGESTED_INTAKE_LITERS = 5;

function dateStr(d) {
  return d.toISOString().slice(0, 10);
}

function getLast7Days() {
  const out = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    out.push({
      key: dateStr(d),
      weekday: d.toLocaleDateString("en-US", { weekday: "short" }).replace(".", ""),
      dateNum: d.getDate(),
      isToday: i === 0,
    });
  }
  return out;
}

const GLASS_SIZES = [
  { id: "small", label: "Small", ml: 150 },
  { id: "medium", label: "Medium", ml: 250 },
  { id: "large", label: "Large", ml: 400 },
];

const JAR_SIZES = [
  { id: "small", label: "Small", ml: 1000 },
  { id: "medium", label: "Medium", ml: 2000 },
  { id: "big", label: "Big", ml: 3000 },
];

const BOTTLE_SIZES = [
  { id: "xs", label: "Extra Small", ml: 250 },
  { id: "small", label: "Small", ml: 500 },
  { id: "medium", label: "Medium", ml: 1000 },
  { id: "large", label: "Large", ml: 2000 },
];

const INTAKE_TYPES = [
  { id: "glass", label: "Glass", icon: "wine-outline", sizes: GLASS_SIZES },
  { id: "jar", label: "Jar", icon: "flask-outline", sizes: JAR_SIZES },
  { id: "bottle", label: "Bottle", icon: "water-outline", sizes: BOTTLE_SIZES },
  { id: "total", label: "Total", icon: "add-circle-outline", sizes: null },
];

const WaterIntakeScreen = () => {
  const router = useRouter();
  const { user } = useAuth();
  const canSave = !!user;
  const days = getLast7Days();
  const todayKey = dateStr(new Date());

  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [customMl, setCustomMl] = useState("");
  const [weeklySummary, setWeeklySummary] = useState(null);
  const [sizeModal, setSizeModal] = useState(null);

  const loadEntries = useCallback(async () => {
    if (!canSave) {
      setEntries([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await api.waterIntake.get(selectedDate);
      setEntries(data.entries || []);
    } catch (e) {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [selectedDate, canSave]);

  const loadWeeklySummary = useCallback(async () => {
    if (!canSave) return;
    try {
      const data = await api.waterIntake.summary();
      setWeeklySummary(data);
    } catch (_) {
      setWeeklySummary(null);
    }
  }, [canSave]);

  useFocusEffect(
    useCallback(() => {
      loadEntries();
      loadWeeklySummary();
    }, [loadEntries, loadWeeklySummary])
  );

  const addIntake = async (type, quantity, volumeMl) => {
    if (!canSave) {
      Alert.alert("Login required", "Please log in to save water intake.");
      return;
    }
    setSaving(true);
    try {
      await api.waterIntake.add({ date: selectedDate, type, quantity, volumeMl });
      await loadEntries();
      await loadWeeklySummary();
    } catch (e) {
      Alert.alert("Error", e.message || "Failed to add intake");
    } finally {
      setSaving(false);
    }
  };

  const openSizeModal = (typeId, quantity) => {
    const t = INTAKE_TYPES.find((x) => x.id === typeId);
    if (!t?.sizes) return;
    setSizeModal({ typeId, quantity, sizes: t.sizes, label: t.label });
  };

  const handleSaveSize = (volumeMl) => {
    if (!sizeModal) return;
    const totalMl = sizeModal.quantity * volumeMl;
    addIntake(sizeModal.typeId, sizeModal.quantity, totalMl);
    setSizeModal(null);
  };

  const handleAddCustomMl = () => {
    const ml = parseInt(customMl, 10);
    if (!Number.isFinite(ml) || ml <= 0) {
      Alert.alert("Invalid amount", "Enter a positive number (ml).");
      return;
    }
    setCustomMl("");
    addIntake("total", 1, ml);
  };

  const totalMl = entries.reduce((s, e) => s + (e.volumeMl || 0), 0);
  const totalLiters = totalMl / 1000;
  const totalLitersDisplay = totalLiters.toFixed(1);
  const dropletPct = Math.min(100, (totalLiters / 5) * 100);
  const weeklyTotalLiters = weeklySummary?.summary?.reduce((s, d) => s + (d.totalLiters || 0), 0) ?? 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header panel - same style as dashboard */}
        <View style={styles.headerPanel}>
          <LinearGradient
            colors={["#1E40AF", "#3B82F6", "#60A5FA"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerGradient}
          >
            <View style={styles.decorCircle1} />
            <View style={styles.decorCircle2} />
            <View style={styles.headerNav}>
              <BackButton onPress={() => router.back()} />
              <Text style={styles.headerTitle}>Water Intake</Text>
              <View style={styles.headerButtonPlaceholder} />
            </View>
            <View style={styles.profileRow}>
              <View style={styles.avatarSmall}>
                <Ionicons name="person" size={32} color="#60A5FA" />
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{user?.name || "Guest"}</Text>
                <Text style={styles.profileAge}>{user?.age ? `${user.age} years` : "—"}</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        <View style={styles.contentSection}>
          {/* Select date - last 7 days: weekdays above, dates below */}
          <Text style={styles.sectionLabel}>Select date (last 7 days)</Text>
          <View style={styles.calendarRow}>
            {days.map((d) => (
              <TouchableOpacity
                key={d.key}
                style={[styles.calendarCol, selectedDate === d.key && styles.calendarColSelected]}
                onPress={() => setSelectedDate(d.key)}
                activeOpacity={0.8}
              >
                <Text style={[styles.calendarWeekday, selectedDate === d.key && styles.calendarTextSelected]}>
                  {d.weekday}
                </Text>
                <Text style={[styles.calendarDateNum, selectedDate === d.key && styles.calendarTextSelected]}>
                  {d.dateNum}
                </Text>
                {d.isToday && <View style={styles.todayDot} />}
              </TouchableOpacity>
            ))}
          </View>

          {/* Total for selected date - in water droplet */}
          <Text style={styles.totalLabel}>Total for {selectedDate === todayKey ? "today" : selectedDate} (in liters)</Text>
          <View style={styles.dropletWrap}>
            <WaterDroplet
              percentage={dropletPct}
              volumeText={`${totalLitersDisplay} L`}
              goalText=""
            />
          </View>

          {/* Three tiles: Suggested intake, Weekly total, Subscription */}
          <View style={styles.threeTilesRow}>
            <View style={styles.infoTile}>
              <Ionicons name="water" size={24} color="#0EA5E9" />
              <Text style={styles.infoTileTitle}>Suggested</Text>
              <Text style={styles.infoTileValue}>{SUGGESTED_INTAKE_LITERS} L</Text>
              <Text style={styles.infoTileSub}>Standard intake</Text>
            </View>
            <View style={styles.infoTile}>
              <Ionicons name="calendar" size={24} color="#0EA5E9" />
              <Text style={styles.infoTileTitle}>Weekly</Text>
              <Text style={styles.infoTileValue}>{weeklyTotalLiters.toFixed(1)} L</Text>
              <Text style={styles.infoTileSub}>Total intake</Text>
            </View>
            <View style={styles.infoTile}>
              <Ionicons name="document-text-outline" size={24} color="#0EA5E9" />
              <Text style={styles.infoTileTitle}>Subscription</Text>
              <Text style={styles.infoTileSub}>Coming soon</Text>
            </View>
          </View>

          {/* Add intake - Glass, Jar, Bottle (with size popup), Total (ml) */}
          <Text style={styles.sectionLabel}>Add intake</Text>
          <View style={styles.typesRow}>
            {INTAKE_TYPES.map((t) => (
              <View key={t.id} style={styles.typeTile}>
                <View style={styles.typeIconWrap}>
                  <Ionicons name={t.icon} size={28} color="#0EA5E9" />
                </View>
                <Text style={styles.typeLabel}>{t.label}</Text>
                {t.sizes ? (
                  <View style={styles.quickRow}>
                    {[1, 2, 3].map((n) => (
                      <TouchableOpacity
                        key={n}
                        style={styles.quickBtn}
                        onPress={() => openSizeModal(t.id, n)}
                        disabled={saving}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.quickBtnText}>{n}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.typeHint}>Use ml below</Text>
                )}
              </View>
            ))}
          </View>

          {/* Total - add in ml */}
          <View style={styles.mlSection}>
            <Text style={styles.sectionLabel}>Add in ml (Total)</Text>
            <View style={styles.mlRow}>
              <TextInput
                style={styles.mlInput}
                placeholder="e.g. 250 or 1500"
                placeholderTextColor="#9CA3AF"
                keyboardType="number-pad"
                value={customMl}
                onChangeText={setCustomMl}
              />
              <TouchableOpacity
                style={[styles.addBtn, saving && styles.addBtnDisabled]}
                onPress={handleAddCustomMl}
                disabled={saving}
                activeOpacity={0.8}
              >
                {saving ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.addBtnText}>Add</Text>}
              </TouchableOpacity>
            </View>
          </View>

          {/* Intake log */}
          <Text style={styles.sectionLabel}>Intake log for selected date</Text>
          {loading ? (
            <ActivityIndicator style={styles.loader} size="small" color="#0EA5E9" />
          ) : entries.length === 0 ? (
            <Text style={styles.emptyText}>No entries yet. Add using the options above.</Text>
          ) : (
            <View style={styles.entriesList}>
              {entries
                .slice()
                .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
                .map((e, idx) => {
                  const time = e.createdAt ? new Date(e.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "—";
                  const vol = e.volumeMl ? (e.volumeMl >= 1000 ? (e.volumeMl / 1000).toFixed(1) + " L" : e.volumeMl + " ml") : "";
                  const qty = e.quantity > 1 ? ` (${e.quantity})` : "";
                  return (
                    <View key={idx} style={styles.entryRow}>
                      <Ionicons name="time-outline" size={18} color="#6B7C85" />
                      <Text style={styles.entryTime}>{time}</Text>
                      <Text style={styles.entryDetail}>{e.type}{qty}</Text>
                      <Text style={styles.entryVol}>{vol}</Text>
                    </View>
                  );
                })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Size selection modal */}
      <Modal visible={!!sizeModal} transparent animationType="slide">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSizeModal(null)}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>
              {sizeModal?.quantity} {sizeModal?.label}(s) – Select size
            </Text>
            {(sizeModal?.sizes || []).map((sz) => (
              <TouchableOpacity
                key={sz.id}
                style={styles.sizeOption}
                onPress={() => handleSaveSize(sz.ml)}
                activeOpacity={0.8}
              >
                <Text style={styles.sizeOptionLabel}>{sz.label}</Text>
                <Text style={styles.sizeOptionMl}>{sz.ml >= 1000 ? (sz.ml / 1000) + " L" : sz.ml + " ml"}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.modalCancel} onPress={() => setSizeModal(null)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

export default WaterIntakeScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#c6e2fa" },
  scrollContent: { paddingBottom: 40, paddingHorizontal: 20 },
  headerPanel: { marginHorizontal: -20, overflow: "hidden" },
  headerGradient: { paddingTop: 14, paddingBottom: 20, paddingHorizontal: 28, position: "relative" },
  decorCircle1: { position: "absolute", top: -30, right: -30, width: 100, height: 100, borderRadius: 50, backgroundColor: "rgba(255, 255, 255, 0.1)" },
  decorCircle2: { position: "absolute", bottom: -20, left: -40, width: 80, height: 80, borderRadius: 40, backgroundColor: "rgba(255, 255, 255, 0.08)" },
  headerNav: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#FFFFFF" },
  headerButtonPlaceholder: { width: 40 },
  profileRow: { flexDirection: "row", alignItems: "center" },
  avatarSmall: { width: 56, height: 56, borderRadius: 28, backgroundColor: "rgba(255, 255, 255, 0.9)", justifyContent: "center", alignItems: "center", marginRight: 14 },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 18, fontWeight: "700", color: "#FFFFFF", marginBottom: 2 },
  profileAge: { fontSize: 14, color: "rgba(255, 255, 255, 0.9)" },

  contentSection: { marginTop: -12, backgroundColor: "#c6e2fa", borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 24, overflow: "hidden" },
  sectionLabel: { fontSize: 15, fontWeight: "600", color: "#1B2B34", marginBottom: 10 },
  calendarRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20 },
  calendarCol: { flex: 1, alignItems: "center", paddingVertical: 12, borderRadius: 12, backgroundColor: "#f0f7fcd7", marginHorizontal: 2 },
  calendarColSelected: { backgroundColor: "#0EA5E9" },
  calendarWeekday: { fontSize: 12, fontWeight: "600", color: "#6B7C85", marginBottom: 4 },
  calendarDateNum: { fontSize: 16, fontWeight: "700", color: "#1B2B34" },
  calendarTextSelected: { color: "#FFFFFF" },
  todayDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#FFFFFF", marginTop: 4, opacity: 0.9 },

  totalLabel: { fontSize: 14, color: "#6B7C85", marginBottom: 8, textAlign: "center" },
  dropletWrap: { alignItems: "center", marginBottom: 24 },

  threeTilesRow: { flexDirection: "row", gap: 10, marginBottom: 24 },
  infoTile: { flex: 1, backgroundColor: "#f0f7fcd7", borderRadius: 16, padding: 14, elevation: 2 },
  infoTileTitle: { fontSize: 12, fontWeight: "600", color: "#6B7C85", marginTop: 8 },
  infoTileValue: { fontSize: 18, fontWeight: "800", color: "#0EA5E9", marginTop: 2 },
  infoTileSub: { fontSize: 11, color: "#6B7C85", marginTop: 2 },

  typesRow: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 24 },
  typeTile: { width: "47%", backgroundColor: "#f0f7fcd7", borderRadius: 16, padding: 16, elevation: 2 },
  typeIconWrap: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#E0F2FE", justifyContent: "center", alignItems: "center", marginBottom: 8 },
  typeLabel: { fontSize: 15, fontWeight: "700", color: "#1B2B34", marginBottom: 8 },
  quickRow: { flexDirection: "row", gap: 8 },
  quickBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#0EA5E9", justifyContent: "center", alignItems: "center" },
  quickBtnText: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },
  typeHint: { fontSize: 12, color: "#6B7C85" },

  mlSection: { marginBottom: 24 },
  mlRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  mlInput: { flex: 1, backgroundColor: "#f0f7fcd7", borderRadius: 12, paddingVertical: 14, paddingHorizontal: 16, fontSize: 16, color: "#1B2B34" },
  addBtn: { backgroundColor: "#0EA5E9", paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12 },
  addBtnDisabled: { opacity: 0.7 },
  addBtnText: { fontSize: 16, fontWeight: "600", color: "#FFFFFF" },

  loader: { marginVertical: 20 },
  emptyText: { fontSize: 14, color: "#6B7C85", fontStyle: "italic", marginVertical: 12 },
  entriesList: { backgroundColor: "#f0f7fcd7", borderRadius: 16, padding: 16 },
  entryRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#E5E7EB", gap: 10 },
  entryTime: { fontSize: 14, fontWeight: "600", color: "#1B2B34", minWidth: 70 },
  entryDetail: { flex: 1, fontSize: 14, color: "#6B7C85", textTransform: "capitalize" },
  entryVol: { fontSize: 14, fontWeight: "600", color: "#0EA5E9" },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#FFFFFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#1B2B34", marginBottom: 16 },
  sizeOption: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 16, paddingHorizontal: 16, backgroundColor: "#f0f7fcd7", borderRadius: 12, marginBottom: 10 },
  sizeOptionLabel: { fontSize: 16, fontWeight: "600", color: "#1B2B34" },
  sizeOptionMl: { fontSize: 14, color: "#0EA5E9", fontWeight: "600" },
  modalCancel: { marginTop: 12, alignItems: "center" },
  modalCancelText: { fontSize: 16, fontWeight: "600", color: "#6B7C85" },
});
