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
import { theme } from "@/src/theme";

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
  const [showMenuModal, setShowMenuModal] = useState(false);

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
        <View style={styles.headerSection}>
          <LinearGradient
            colors={theme.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientBackground}
          >
            <View style={styles.headerTopRow}>
              <BackButton onPress={() => router.back()} />
              <TouchableOpacity
                style={styles.headerMenuBtn}
                activeOpacity={0.7}
                onPress={() => setShowMenuModal(true)}
              >
                <Ionicons name="menu" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <View style={styles.headerCenter}>
              <View style={styles.headerIconCircle}>
                <Ionicons name="water" size={36} color="#FFFFFF" />
              </View>
              <Text style={styles.headerTitle}>Water Intake</Text>
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
          <View style={styles.totalSectionPanel}>
            <Text style={styles.totalLabel}>Total for {selectedDate === todayKey ? "today" : selectedDate} (in liters)</Text>
            <View style={styles.dropletWrap}>
              <WaterDroplet
                percentage={dropletPct}
                volumeText={`${totalLitersDisplay} L`}
                goalText=""
              />
            </View>
          </View>

          {/* Three tiles: Suggested intake, Weekly total, Subscription */}
          <View style={styles.threeTilesRow}>
            <View style={styles.infoTile}>
              <Ionicons name="water" size={24} color={theme.primary} />
              <Text style={styles.infoTileTitle}>Suggested</Text>
              <Text style={styles.infoTileValue}>{SUGGESTED_INTAKE_LITERS} L</Text>
              <Text style={styles.infoTileSub}>Standard intake</Text>
            </View>
            <View style={styles.infoTile}>
              <Ionicons name="calendar" size={24} color={theme.primary} />
              <Text style={styles.infoTileTitle}>Weekly</Text>
              <Text style={styles.infoTileValue}>{weeklyTotalLiters.toFixed(1)} L</Text>
              <Text style={styles.infoTileSub}>Total intake</Text>
            </View>
            <View style={styles.infoTile}>
              <Ionicons name="document-text-outline" size={24} color={theme.primary} />
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
                  <Ionicons name={t.icon} size={28} color={theme.primary} />
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
            <ActivityIndicator style={styles.loader} size="small" color={theme.primary} />
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

      <Modal visible={showMenuModal} transparent animationType="fade">
        <TouchableOpacity
          style={styles.menuModalOverlay}
          activeOpacity={1}
          onPress={() => setShowMenuModal(false)}
        >
          <View style={styles.menuModalContent} onStartShouldSetResponder={() => true}>
            <TouchableOpacity
              style={styles.menuModalItem}
              onPress={() => { setShowMenuModal(false); router.push("/profile"); }}
              activeOpacity={0.8}
            >
              <Ionicons name="person-outline" size={22} color="#1B2B34" />
              <Text style={styles.menuModalItemText}>Profile</Text>
              <Ionicons name="chevron-forward" size={18} color="#6B7C85" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuModalItem}
              onPress={() => { setShowMenuModal(false); router.push("/order-history"); }}
              activeOpacity={0.8}
            >
              <Ionicons name="receipt-outline" size={22} color="#1B2B34" />
              <Text style={styles.menuModalItemText}>Order History</Text>
              <Ionicons name="chevron-forward" size={18} color="#6B7C85" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuModalItem}
              onPress={() => { setShowMenuModal(false); router.push("/water-intake"); }}
              activeOpacity={0.8}
            >
              <Ionicons name="water-outline" size={22} color="#1B2B34" />
              <Text style={styles.menuModalItemText}>Water Intake</Text>
              <Ionicons name="chevron-forward" size={18} color="#6B7C85" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuModalItem}
              onPress={() => { setShowMenuModal(false); router.push("/dashboard"); }}
              activeOpacity={0.8}
            >
              <Ionicons name="home-outline" size={22} color="#1B2B34" />
              <Text style={styles.menuModalItemText}>Dashboard</Text>
              <Ionicons name="chevron-forward" size={18} color="#6B7C85" />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

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
  container: { flex: 1, backgroundColor: theme.screenBackground, paddingHorizontal: 20 },
  scrollContent: { paddingBottom: 40 },
  headerSection: { marginTop: -10, marginLeft: -20, marginRight: -20, height: 200, overflow: "hidden" },
  gradientBackground: { flex: 1, paddingTop: 24, paddingHorizontal: 36, paddingBottom: 36 },
  headerTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 0 },
  headerMenuBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center" },
  headerCenter: { alignItems: "center", justifyContent: "center", marginTop: -14, width: "100%" },
  headerIconCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: "rgba(255,255,255,0.25)", justifyContent: "center", alignItems: "center", marginBottom: 6 },
  headerTitle: { fontSize: 20, fontWeight: "700", color: "#FFFFFF", textAlign: "center", paddingBottom: 32 },

  contentSection: {
    marginTop: -16,
    marginLeft: 2,
    marginRight: 2,
    backgroundColor: theme.screenBackground,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 24,
    paddingHorizontal: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
  },
  sectionLabel: { fontSize: 15, fontWeight: "600", color: "#1B2B34", marginBottom: 10 },
  calendarRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20 },
  calendarCol: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#f0f7fcd7",
    marginHorizontal: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  calendarColSelected: { backgroundColor: theme.primary },
  calendarWeekday: { fontSize: 12, fontWeight: "600", color: "#6B7C85", marginBottom: 4 },
  calendarDateNum: { fontSize: 16, fontWeight: "700", color: "#1B2B34" },
  calendarTextSelected: { color: "#FFFFFF" },
  todayDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#FFFFFF", marginTop: 4, opacity: 0.9 },

  totalSectionPanel: {
    backgroundColor: "#f0f7fcd7",
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 16,
    paddingBottom: 28,
    marginBottom: 24,
    alignItems: "center",
    overflow: "visible",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  totalLabel: { fontSize: 14, color: "#6B7C85", marginBottom: 12, textAlign: "center" },
  dropletWrap: { alignItems: "center", justifyContent: "center", paddingBottom: 16, overflow: "visible" },

  threeTilesRow: { flexDirection: "row", gap: 10, marginBottom: 24 },
  infoTile: {
    flex: 1,
    backgroundColor: "#f0f7fcd7",
    borderRadius: 16,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  infoTileTitle: { fontSize: 12, fontWeight: "600", color: "#6B7C85", marginTop: 8 },
  infoTileValue: { fontSize: 18, fontWeight: "800", color: theme.primary, marginTop: 2 },
  infoTileSub: { fontSize: 11, color: "#6B7C85", marginTop: 2 },

  typesRow: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 24 },
  typeTile: {
    width: "47%",
    backgroundColor: "#f0f7fcd7",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  typeIconWrap: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#E0F2FE", justifyContent: "center", alignItems: "center", marginBottom: 8 },
  typeLabel: { fontSize: 15, fontWeight: "700", color: "#1B2B34", marginBottom: 8 },
  quickRow: { flexDirection: "row", gap: 8 },
  quickBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.primary, justifyContent: "center", alignItems: "center" },
  quickBtnText: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },
  typeHint: { fontSize: 12, color: "#6B7C85" },

  mlSection: { marginBottom: 24 },
  mlRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  mlInput: {
    flex: 1,
    backgroundColor: "#f0f7fcd7",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#1B2B34",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  addBtn: { backgroundColor: theme.primary, paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12 },
  addBtnDisabled: { opacity: 0.7 },
  addBtnText: { fontSize: 16, fontWeight: "600", color: "#FFFFFF" },

  loader: { marginVertical: 20 },
  emptyText: { fontSize: 14, color: "#6B7C85", fontStyle: "italic", marginVertical: 12 },
  entriesList: {
    backgroundColor: "#f0f7fcd7",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  entryRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#E5E7EB", gap: 10 },
  entryTime: { fontSize: 14, fontWeight: "600", color: "#1B2B34", minWidth: 70 },
  entryDetail: { flex: 1, fontSize: 14, color: "#6B7C85", textTransform: "capitalize" },
  entryVol: { fontSize: 14, fontWeight: "600", color: theme.primary },

  menuModalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-start", paddingTop: 60, paddingRight: 20, alignItems: "flex-end" },
  menuModalContent: { backgroundColor: "#FFFFFF", borderRadius: 16, paddingVertical: 8, minWidth: 220, elevation: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8 },
  menuModalItem: { flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: 18 },
  menuModalItemText: { flex: 1, fontSize: 16, fontWeight: "600", color: "#1B2B34", marginLeft: 12 },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#FFFFFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#1B2B34", marginBottom: 16 },
  sizeOption: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 16, paddingHorizontal: 16, backgroundColor: "#f0f7fcd7", borderRadius: 12, marginBottom: 10 },
  sizeOptionLabel: { fontSize: 16, fontWeight: "600", color: "#1B2B34" },
  sizeOptionMl: { fontSize: 14, color: theme.primary, fontWeight: "600" },
  modalCancel: { marginTop: 12, alignItems: "center" },
  modalCancelText: { fontSize: 16, fontWeight: "600", color: "#6B7C85" },
});
