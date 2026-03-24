import React, { useState, useCallback, useEffect, useRef } from "react";
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
  Image,
  Platform,
  StatusBar,
  Animated,
  Easing,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Path } from "react-native-svg";
import BackButton from "@/src/components/BackButton";
import WaterDroplet from "@/src/components/WaterDroplet";
import { api } from "@/src/api/client";
import { useAuth } from "@/src/context/AuthContext";
import { theme } from "@/src/theme";

const HEADER_DROPLETS = [
  { left: -8, top: 18, width: 16, height: 22, phase: "a" },
  { left: 22, top: 58, width: 14, height: 20, phase: "b" },
  { left: 56, top: 20, width: 18, height: 24, phase: "c" },
  { left: 92, top: 86, width: 14, height: 20, phase: "a" },
  { left: 132, top: 38, width: 16, height: 22, phase: "b" },
  { left: 172, top: 102, width: 14, height: 20, phase: "c" },
  { left: 212, top: 60, width: 16, height: 22, phase: "a" },
  { left: 24, top: 156, width: 14, height: 20, phase: "c" },
  { left: 84, top: 188, width: 14, height: 20, phase: "a" },
  { left: 152, top: 174, width: 16, height: 22, phase: "b" },
  { right: 154, top: 20, width: 16, height: 22, phase: "c" },
  { right: 118, top: 68, width: 14, height: 20, phase: "a" },
  { right: 82, top: 30, width: 16, height: 22, phase: "b" },
  { right: 46, top: 94, width: 14, height: 20, phase: "c" },
  { right: 10, top: 54, width: 16, height: 22, phase: "a" },
  { right: -6, top: 124, width: 14, height: 20, phase: "b" },
  { right: 92, top: 160, width: 14, height: 20, phase: "c" },
  { right: 28, top: 188, width: 14, height: 20, phase: "a" },
];

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
  const [deletingEntryId, setDeletingEntryId] = useState("");
  const [customMl, setCustomMl] = useState("");
  const [weeklySummary, setWeeklySummary] = useState(null);
  const [sizeModal, setSizeModal] = useState(null);
  const androidTopInset = Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;
  const dropletAnimA = useRef(new Animated.Value(0)).current;
  const dropletAnimB = useRef(new Animated.Value(0)).current;
  const dropletAnimC = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = (value, duration) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(value, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(value, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])
      );
    const a = loop(dropletAnimA, 3400), b = loop(dropletAnimB, 4200), c = loop(dropletAnimC, 3800);
    a.start(); b.start(); c.start();
    return () => { a.stop(); b.stop(); c.stop(); };
  }, [dropletAnimA, dropletAnimB, dropletAnimC]);
  const getDropletAnim = (phase) => phase === "b" ? dropletAnimB : phase === "c" ? dropletAnimC : dropletAnimA;

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

  const handleDeleteEntry = (entryId) => {
    if (!entryId) return;
    Alert.alert("Delete intake", "Are you sure you want to delete this entry?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            setDeletingEntryId(entryId);
            await api.waterIntake.remove(entryId, selectedDate);
            await loadEntries();
            await loadWeeklySummary();
          } catch (e) {
            Alert.alert("Error", e.message || "Failed to delete intake entry");
          } finally {
            setDeletingEntryId("");
          }
        },
      },
    ]);
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
            style={[styles.gradientBackground, { paddingTop: 20 + androidTopInset }]}
          >
            <View style={styles.headerOverlay}>
              {HEADER_DROPLETS.map((drop, i) => {
                const dropAnim = getDropletAnim(drop.phase);
                return (
                  <Animated.View
                    key={`wi-drop-${i}`}
                    style={[styles.dropletWrap, {
                      left: drop.left,
                      right: drop.right,
                      top: drop.top,
                      width: drop.width,
                      height: drop.height,
                      opacity: dropAnim.interpolate({ inputRange: [0, 1], outputRange: [0.16, 0.32] }),
                      transform: [
                        { translateY: dropAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -10] }) },
                        { scale: dropAnim.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1.05] }) },
                      ],
                    }]}
                  >
                    <Svg width="100%" height="100%" viewBox="0 0 60 80">
                      <Path d="M30 6 C47 24 57 41 57 54 C57 69 45 78 30 78 C15 78 3 69 3 54 C3 41 13 24 30 6 Z" fill="rgba(255,255,255,0.3)" />
                    </Svg>
                  </Animated.View>
                );
              })}
            </View>
            <View style={styles.headerTopRow}>
              <BackButton onPress={() => router.back()} />
              <Image source={require("../../assets/images/h20-logo-light-full.png")} style={styles.headerLogoLight} resizeMode="contain" />
              <TouchableOpacity
                style={styles.headerMenuBtn}
                activeOpacity={0.7}
                onPress={() => router.push("/profile")}
              >
                <Ionicons name="menu" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <View style={styles.headerCenter}>
              <View style={styles.headerInfoRow}>
                <View style={styles.headerIconCircle}>
                  <Ionicons name="water" size={28} color="#FFFFFF" />
                </View>
                <View style={styles.headerTextWrap}>
                  <Text style={styles.headerTitle}>Water Intake</Text>
                  <Text style={styles.headerSubtitle}>Track your hydration and add intake by day</Text>
                </View>
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
          <View style={styles.totalSectionPanel}>
            <Text style={styles.totalLabel}>Total for {selectedDate === todayKey ? "today" : selectedDate} (in liters)</Text>
            <View style={styles.totalDropletWrap}>
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
                  const isDeleting = deletingEntryId && String(deletingEntryId) === String(e._id);
                  return (
                    <View key={e._id || idx} style={styles.entryRow}>
                      <Ionicons name="time-outline" size={18} color="#6B7C85" />
                      <Text style={styles.entryTime}>{time}</Text>
                      <Text style={styles.entryDetail}>{e.type}{qty}</Text>
                      <Text style={styles.entryVol}>{vol}</Text>
                      <TouchableOpacity
                        style={styles.entryDeleteBtn}
                        onPress={() => handleDeleteEntry(e._id)}
                        disabled={!e._id || !!isDeleting}
                        activeOpacity={0.7}
                      >
                        {isDeleting ? (
                          <ActivityIndicator size="small" color="#EF4444" />
                        ) : (
                          <Ionicons name="close" size={18} color="#EF4444" />
                        )}
                      </TouchableOpacity>
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
  container: { flex: 1, backgroundColor: theme.screenBackground, paddingHorizontal: 0 },
  scrollContent: { paddingBottom: 40 },
  headerSection: { minHeight: 236, overflow: "hidden" },
  gradientBackground: { flex: 1, paddingHorizontal: 20, paddingBottom: 34 },
  headerOverlay: { ...StyleSheet.absoluteFillObject },
  dropletWrap: { position: "absolute", alignItems: "center", justifyContent: "center" },
  headerTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 30 },
  headerLogoLight: { width: 124, height: 34, marginLeft: 0 },
  headerMenuBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center" },
  headerCenter: { alignItems: "flex-start", justifyContent: "center", marginTop: -8, width: "100%" },
  headerInfoRow: { flexDirection: "row", alignItems: "center" },
  headerTextWrap: { marginLeft: 12, flex: 1 },
  headerIconCircle: { width: 52, height: 52, borderRadius: 26, backgroundColor: "rgba(255,255,255,0.25)", justifyContent: "center", alignItems: "center", marginBottom: 0 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#FFFFFF" },
  headerSubtitle: { fontSize: 13, color: "rgba(255,255,255,0.95)", marginTop: 2, maxWidth: "95%" },

  contentSection: {
    marginTop: -16,
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
    elevation: 0,
  },
  sectionLabel: { fontSize: 15, fontWeight: "600", color: "#1B2B34", marginBottom: 10 },
  calendarRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20 },
  calendarCol: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.78)",
    marginHorizontal: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 0,
  },
  calendarColSelected: { backgroundColor: theme.primary },
  calendarWeekday: { fontSize: 11, fontWeight: "600", color: "#6B7C85", marginBottom: 3 },
  calendarDateNum: { fontSize: 16, fontWeight: "700", color: "#1B2B34" },
  calendarTextSelected: { color: "#FFFFFF" },
  todayDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#FFFFFF", marginTop: 4, opacity: 0.9 },

  totalSectionPanel: {
    backgroundColor: "rgba(255,255,255,0.78)",
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
    elevation: 0,
  },
  totalLabel: { fontSize: 14, color: "#6B7C85", marginBottom: 12, textAlign: "center" },
  totalDropletWrap: { alignItems: "center", justifyContent: "center", paddingBottom: 16, overflow: "visible" },

  threeTilesRow: { flexDirection: "row", gap: 10, marginBottom: 24 },
  infoTile: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.78)",
    borderRadius: 16,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 0,
  },
  infoTileTitle: { fontSize: 12, fontWeight: "600", color: "#6B7C85", marginTop: 8 },
  infoTileValue: { fontSize: 18, fontWeight: "800", color: theme.primary, marginTop: 2 },
  infoTileSub: { fontSize: 11, color: "#6B7C85", marginTop: 2 },

  typesRow: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 24 },
  typeTile: {
    width: "47%",
    backgroundColor: "rgba(255,255,255,0.78)",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 0,
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
    backgroundColor: "rgba(255,255,255,0.78)",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#1B2B34",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 0,
  },
  addBtn: { backgroundColor: theme.primary, paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12 },
  addBtnDisabled: { opacity: 0.7 },
  addBtnText: { fontSize: 16, fontWeight: "600", color: "#FFFFFF" },

  loader: { marginVertical: 20 },
  emptyText: { fontSize: 14, color: "#6B7C85", fontStyle: "italic", marginVertical: 12 },
  entriesList: {
    backgroundColor: "rgba(255,255,255,0.78)",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 0,
  },
  entryRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#E5E7EB", gap: 10 },
  entryTime: { fontSize: 14, fontWeight: "600", color: "#1B2B34", minWidth: 70 },
  entryDetail: { flex: 1, fontSize: 14, color: "#6B7C85", textTransform: "capitalize" },
  entryVol: { fontSize: 14, fontWeight: "600", color: theme.primary },
  entryDeleteBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(239,68,68,0.08)",
  },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#FFFFFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#1B2B34", marginBottom: 16 },
  sizeOption: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 16, paddingHorizontal: 16, backgroundColor: "rgba(255,255,255,0.78)", borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.85)" },
  sizeOptionLabel: { fontSize: 16, fontWeight: "600", color: "#1B2B34" },
  sizeOptionMl: { fontSize: 14, color: theme.primary, fontWeight: "600" },
  modalCancel: { marginTop: 12, alignItems: "center" },
  modalCancelText: { fontSize: 16, fontWeight: "600", color: "#6B7C85" },
});
