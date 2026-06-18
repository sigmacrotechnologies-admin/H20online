import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  Image,
  Platform,
  StatusBar,
  KeyboardAvoidingView,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import AppLogo from "@/src/components/AppLogo";
import BackButton from "@/src/components/BackButton";
import DropletOverlay from "@/src/components/modern/DropletOverlay";
import { ModernInput } from "@/src/components/modern";
import WaterDroplet from "@/src/components/WaterDroplet";
import WaterAiSenseBanner from "@/src/components/ai/WaterAiSenseBanner";
import WaterAiReportModal from "@/src/components/ai/WaterAiReportModal";
import WaterAiAskModal from "@/src/components/ai/WaterAiAskModal";
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
  { id: "glass", label: "Glass", icon: "wine-outline", sizes: GLASS_SIZES, accent: "#0E7490" },
  { id: "jar", label: "Jar", icon: "flask-outline", sizes: JAR_SIZES, accent: "#7C3AED" },
  { id: "bottle", label: "Bottle", icon: "water-outline", sizes: BOTTLE_SIZES, accent: theme.accent },
  { id: "total", label: "Custom", icon: "add-circle-outline", sizes: null, accent: "#059669" },
];

function SectionCard({ icon, title, subtitle, children }) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <LinearGradient colors={[theme.medium, theme.accent]} style={styles.sectionIcon}>
          <Ionicons name={icon} size={18} color="#FFFFFF" />
        </LinearGradient>
        <View style={styles.sectionHeaderText}>
          <Text style={styles.sectionTitle}>{title}</Text>
          {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
        </View>
      </View>
      {children}
    </View>
  );
}

function formatVolume(ml) {
  if (!ml) return "";
  return ml >= 1000 ? `${(ml / 1000).toFixed(1)} L` : `${ml} ml`;
}

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
  const [aiSense, setAiSense] = useState("");
  const [aiSenseLoading, setAiSenseLoading] = useState(false);
  const [aiSenseRefreshing, setAiSenseRefreshing] = useState(false);
  const [aiSenseError, setAiSenseError] = useState("");
  const [aiExpanded, setAiExpanded] = useState(false);
  const [showAiReport, setShowAiReport] = useState(false);
  const [showAiAsk, setShowAiAsk] = useState(false);
  const aiFetchInFlight = useRef(false);
  const aiSenseRef = useRef("");
  const aiSenseDateRef = useRef("");
  const androidTopInset = Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;

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
    } catch (_) {
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

  const fetchAiSense = useCallback(async (force = false) => {
    if (!canSave) return;
    if (aiFetchInFlight.current) return;
    if (!force && aiSenseRef.current && aiSenseDateRef.current === selectedDate) return;

    aiFetchInFlight.current = true;
    const hasExisting = !!aiSenseRef.current && aiSenseDateRef.current === selectedDate;
    if (hasExisting) setAiSenseRefreshing(true);
    else setAiSenseLoading(true);
    if (!hasExisting) setAiSenseError("");

    try {
      const data = await api.ai.intakeSense(selectedDate);
      const text = data.sense || "";
      aiSenseRef.current = text;
      aiSenseDateRef.current = selectedDate;
      setAiSense(text);
    } catch (e) {
      if (!hasExisting) {
        aiSenseRef.current = "";
        setAiSense("");
        setAiSenseError(e.message || "AI sense unavailable. Please try again.");
      }
    } finally {
      setAiSenseLoading(false);
      setAiSenseRefreshing(false);
      aiFetchInFlight.current = false;
    }
  }, [canSave, selectedDate]);

  const handleAiBannerToggle = useCallback(() => {
    if (!canSave) return;
    setAiExpanded((prev) => {
      const next = !prev;
      if (next) fetchAiSense(true);
      return next;
    });
  }, [canSave, fetchAiSense]);

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
      if (aiExpanded) fetchAiSense(true);
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
            if (aiExpanded) fetchAiSense(true);
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
  const dropletPct = Math.min(100, (totalLiters / SUGGESTED_INTAKE_LITERS) * 100);
  const weeklyTotalLiters = weeklySummary?.summary?.reduce((s, d) => s + (d.totalLiters || 0), 0) ?? 0;
  const goalRemaining = Math.max(0, SUGGESTED_INTAKE_LITERS - totalLiters);
  const selectedDayLabel = selectedDate === todayKey ? "Today" : selectedDate;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.pageBody}>
        <View style={styles.headerSection}>
          <LinearGradient
            colors={theme.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.gradientBackground, { paddingTop: 12 + androidTopInset }]}
          >
            <DropletOverlay />
            <View style={styles.headerLogoRow}>
              <AppLogo size="header" />
            </View>
            <View style={styles.headerTopRow}>
              <BackButton />
              <TouchableOpacity style={styles.headerMenuBtn} activeOpacity={0.85} onPress={() => router.push("/profile")}>
                <Ionicons name="menu" size={22} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <Text style={styles.headerTitle}>Water intake</Text>
            <Text style={styles.headerSubtitle}>Track hydration and log drinks by day</Text>
          </LinearGradient>
        </View>

        <View style={styles.contentSection}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={styles.summaryBanner}>
              <LinearGradient colors={[theme.medium, theme.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.summaryBannerGradient}>
                <View style={styles.summaryBannerIcon}>
                  <Ionicons name="water" size={22} color="#FFFFFF" />
                </View>
                <View style={styles.summaryBannerText}>
                  <Text style={styles.summaryBannerLabel}>{selectedDayLabel} hydration</Text>
                  <Text style={styles.summaryBannerValue}>{totalLitersDisplay} L logged</Text>
                </View>
                <View style={styles.summaryGoalChip}>
                  <Text style={styles.summaryGoalText}>{dropletPct.toFixed(0)}%</Text>
                </View>
              </LinearGradient>
            </View>

            {canSave ? (
              <WaterAiSenseBanner
                expanded={aiExpanded}
                insight={aiSense}
                loading={aiSenseLoading}
                refreshing={aiSenseRefreshing}
                error={aiSenseError}
                onToggle={handleAiBannerToggle}
                onRefresh={() => fetchAiSense(true)}
                onViewReport={() => setShowAiReport(true)}
                onAsk={() => setShowAiAsk(true)}
              />
            ) : null}

            <SectionCard icon="calendar-outline" title="Select date" subtitle="Last 7 days">
              <View style={styles.calendarRow}>
                {days.map((d) => {
                  const isSelected = selectedDate === d.key;
                  return (
                    <TouchableOpacity key={d.key} style={styles.calendarColWrap} onPress={() => setSelectedDate(d.key)} activeOpacity={0.88}>
                      {isSelected ? (
                        <LinearGradient colors={[theme.medium, theme.accent]} style={styles.calendarCol}>
                          <Text style={styles.calendarTextSelected}>{d.weekday}</Text>
                          <Text style={styles.calendarDateSelected}>{d.dateNum}</Text>
                          {d.isToday ? <View style={styles.todayDotSelected} /> : null}
                        </LinearGradient>
                      ) : (
                        <View style={styles.calendarCol}>
                          <Text style={styles.calendarWeekday}>{d.weekday}</Text>
                          <Text style={styles.calendarDateNum}>{d.dateNum}</Text>
                          {d.isToday ? <View style={styles.todayDot} /> : null}
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </SectionCard>

            <View style={styles.dropletCard}>
              <Text style={styles.dropletLabel}>
                Daily progress · goal {SUGGESTED_INTAKE_LITERS} L
              </Text>
              <View style={styles.totalDropletWrap}>
                <WaterDroplet percentage={dropletPct} volumeText={`${totalLitersDisplay} L`} goalText="" />
              </View>
              <View style={styles.progressTrack}>
                <LinearGradient
                  colors={[theme.medium, theme.accent]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.progressFill, { width: `${Math.max(4, dropletPct)}%` }]}
                />
              </View>
              <Text style={styles.progressHint}>
                {goalRemaining > 0 ? `${goalRemaining.toFixed(1)} L remaining to reach your goal` : "Daily goal reached — great job!"}
              </Text>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <View style={styles.statIcon}>
                  <Ionicons name="water-outline" size={18} color={theme.accent} />
                </View>
                <Text style={styles.statValue}>{SUGGESTED_INTAKE_LITERS} L</Text>
                <Text style={styles.statLabel}>Suggested</Text>
              </View>
              <View style={styles.statCard}>
                <View style={styles.statIcon}>
                  <Ionicons name="calendar-outline" size={18} color={theme.accent} />
                </View>
                <Text style={styles.statValue}>{weeklyTotalLiters.toFixed(1)} L</Text>
                <Text style={styles.statLabel}>This week</Text>
              </View>
              <View style={[styles.statCard, styles.statCardMuted]}>
                <View style={[styles.statIcon, styles.statIconMuted]}>
                  <Ionicons name="sparkles-outline" size={18} color="#7C3AED" />
                </View>
                <Text style={styles.statValueMuted}>AI</Text>
                <Text style={styles.statLabel}>Water Sense</Text>
              </View>
            </View>

            <SectionCard icon="add-circle-outline" title="Add intake" subtitle="Tap quantity, then choose size">
              <View style={styles.typesGrid}>
                {INTAKE_TYPES.map((t) => (
                  <View key={t.id} style={styles.typeTile}>
                    <View style={[styles.typeIconWrap, { backgroundColor: `${t.accent}14` }]}>
                      <Ionicons name={t.icon} size={24} color={t.accent} />
                    </View>
                    <Text style={styles.typeLabel}>{t.label}</Text>
                    {t.sizes ? (
                      <View style={styles.quickRow}>
                        {[1, 2, 3].map((n) => (
                          <TouchableOpacity key={n} onPress={() => openSizeModal(t.id, n)} disabled={saving} activeOpacity={0.88}>
                            <LinearGradient colors={[theme.medium, theme.accent]} style={styles.quickBtn}>
                              <Text style={styles.quickBtnText}>{n}</Text>
                            </LinearGradient>
                          </TouchableOpacity>
                        ))}
                      </View>
                    ) : (
                      <Text style={styles.typeHint}>Use ml field below</Text>
                    )}
                  </View>
                ))}
              </View>
            </SectionCard>

            <SectionCard icon="beaker-outline" title="Add custom amount" subtitle="Enter volume in milliliters">
              <View style={styles.mlRow}>
                <View style={styles.mlInputWrap}>
                  <ModernInput
                    label="Amount (ml)"
                    icon="water-outline"
                    value={customMl}
                    onChangeText={setCustomMl}
                    placeholder="e.g. 250 or 1500"
                    keyboardType="number-pad"
                    style={styles.mlInputSection}
                  />
                </View>
                <TouchableOpacity style={styles.addBtnWrap} onPress={handleAddCustomMl} disabled={saving} activeOpacity={0.9}>
                  <LinearGradient colors={saving ? ["#EEF3F7", "#E8EEF2"] : [theme.medium, theme.accent]} style={styles.addBtn}>
                    {saving ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.addBtnText}>Add</Text>}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </SectionCard>

            <SectionCard icon="list-outline" title="Intake log" subtitle={`Entries for ${selectedDayLabel.toLowerCase()}`}>
              {loading ? (
                <ActivityIndicator style={styles.loader} size="small" color={theme.accent} />
              ) : entries.length === 0 ? (
                <View style={styles.emptyWrap}>
                  <Ionicons name="water-outline" size={32} color={theme.accent} />
                  <Text style={styles.emptyTitle}>No entries yet</Text>
                  <Text style={styles.emptyText}>Add water using glass, jar, bottle or custom ml above.</Text>
                </View>
              ) : (
                <View style={styles.entriesList}>
                  {entries
                    .slice()
                    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
                    .map((e, idx) => {
                      const time = e.createdAt ? new Date(e.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "—";
                      const vol = formatVolume(e.volumeMl);
                      const qty = e.quantity > 1 ? ` × ${e.quantity}` : "";
                      const isDeleting = deletingEntryId && String(deletingEntryId) === String(e._id);
                      return (
                        <View key={e._id || idx} style={styles.entryRow}>
                          <LinearGradient colors={[theme.medium, theme.accent]} style={styles.entryIcon}>
                            <Ionicons name="time-outline" size={14} color="#FFFFFF" />
                          </LinearGradient>
                          <View style={styles.entryBody}>
                            <Text style={styles.entryTime}>{time}</Text>
                            <Text style={styles.entryDetail}>
                              {e.type}
                              {qty}
                            </Text>
                          </View>
                          <Text style={styles.entryVol}>{vol}</Text>
                          <TouchableOpacity
                            style={styles.entryDeleteBtn}
                            onPress={() => handleDeleteEntry(e._id)}
                            disabled={!e._id || !!isDeleting}
                            activeOpacity={0.85}
                          >
                            {isDeleting ? (
                              <ActivityIndicator size="small" color="#DC2626" />
                            ) : (
                              <Ionicons name="trash-outline" size={16} color="#DC2626" />
                            )}
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                </View>
              )}
            </SectionCard>

            {!canSave ? (
              <TouchableOpacity style={styles.loginPromptWrap} onPress={() => router.push("/login")} activeOpacity={0.9}>
                <LinearGradient colors={[theme.medium, theme.accent]} style={styles.loginPrompt}>
                  <Ionicons name="log-in-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.loginPromptText}>Login to save your water intake</Text>
                </LinearGradient>
              </TouchableOpacity>
            ) : null}
          </ScrollView>
        </View>
      </View>

      <Modal visible={!!sizeModal} transparent animationType="slide" onRequestClose={() => setSizeModal(null)}>
        <KeyboardAvoidingView style={styles.sheetOverlay} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <TouchableOpacity style={styles.sheetBackdrop} activeOpacity={1} onPress={() => setSizeModal(null)} />
          <View style={styles.sheetPanel}>
            <LinearGradient colors={theme.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.sheetHero}>
              <View style={styles.sheetHandleLight} />
              <View style={styles.sheetHeroRow}>
                <View style={styles.sheetHeroLeft}>
                  <View style={styles.sheetHeroIcon}>
                    <Ionicons name="resize-outline" size={20} color="#FFFFFF" />
                  </View>
                  <View>
                    <Text style={styles.sheetHeroTitle}>Select size</Text>
                    <Text style={styles.sheetHeroSubtitle}>
                      {sizeModal?.quantity} {sizeModal?.label}
                      {sizeModal?.quantity > 1 ? "s" : ""}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => setSizeModal(null)} style={styles.sheetHeroClose} activeOpacity={0.85}>
                  <Ionicons name="close" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </LinearGradient>
            <View style={styles.sheetContent}>
              {(sizeModal?.sizes || []).map((sz) => (
                <TouchableOpacity key={sz.id} style={styles.sizeOption} onPress={() => handleSaveSize(sz.ml)} activeOpacity={0.88}>
                  <View style={styles.sizeOptionLeft}>
                    <Ionicons name="water-outline" size={18} color={theme.accent} />
                    <Text style={styles.sizeOptionLabel}>{sz.label}</Text>
                  </View>
                  <View style={styles.sizeOptionRight}>
                    <Text style={styles.sizeOptionMl}>{formatVolume(sz.ml)}</Text>
                    <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <WaterAiReportModal
        visible={showAiReport}
        onClose={() => setShowAiReport(false)}
        onGenerate={() => api.ai.waterReport()}
      />
      <WaterAiAskModal
        visible={showAiAsk}
        onClose={() => setShowAiAsk(false)}
        onAsk={async (question) => {
          const data = await api.ai.ask(question);
          return data.answer;
        }}
      />
    </SafeAreaView>
  );
};

export default WaterIntakeScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.screenBackground },
  pageBody: { flex: 1 },
  headerSection: { flexShrink: 0, overflow: "hidden" },
  gradientBackground: { paddingHorizontal: 20, paddingBottom: 32 },
  headerLogoRow: { alignItems: "center", marginBottom: 12, zIndex: 12 },
  headerTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  logoGlass: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.34)",
  },
  headerLogoLight: { width: 108, height: 30 },
  headerMenuBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.34)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { fontSize: 24, fontWeight: "800", color: "#FFFFFF", letterSpacing: -0.4 },
  headerSubtitle: { fontSize: 13, color: "rgba(255,255,255,0.92)", marginTop: 6, lineHeight: 18 },

  contentSection: {
    flex: 1,
    marginTop: -24,
    backgroundColor: theme.contentPanelBackground,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.9)",
    overflow: "hidden",
  },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 32 },

  summaryBanner: { borderRadius: 18, overflow: "hidden", marginBottom: 14 },
  summaryBannerGradient: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16 },
  summaryBannerIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  summaryBannerText: { flex: 1 },
  summaryBannerLabel: { fontSize: 11, fontWeight: "600", color: "rgba(255,255,255,0.85)", textTransform: "uppercase", letterSpacing: 0.4 },
  summaryBannerValue: { fontSize: 18, fontWeight: "800", color: "#FFFFFF", marginTop: 2 },
  summaryGoalChip: {
    backgroundColor: "rgba(255,255,255,0.22)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  summaryGoalText: { fontSize: 13, fontWeight: "800", color: "#FFFFFF" },

  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(214,234,242,0.95)",
    ...Platform.select({
      ios: { shadowColor: "#0B3A4A", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 6 },
      android: { elevation: 0 },
    }),
  },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 },
  sectionIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  sectionHeaderText: { flex: 1 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: theme.textPrimary },
  sectionSubtitle: { fontSize: 12, color: theme.textMuted, marginTop: 2 },

  calendarRow: { flexDirection: "row", gap: 6 },
  calendarColWrap: { flex: 1 },
  calendarCol: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "#F8FCFD",
    borderWidth: 1,
    borderColor: "rgba(214,234,242,0.95)",
    minHeight: 64,
  },
  calendarWeekday: { fontSize: 10, fontWeight: "700", color: theme.textMuted, marginBottom: 3, textTransform: "uppercase" },
  calendarDateNum: { fontSize: 16, fontWeight: "800", color: theme.textPrimary },
  calendarTextSelected: { fontSize: 10, fontWeight: "700", color: "rgba(255,255,255,0.9)", marginBottom: 3, textTransform: "uppercase" },
  calendarDateSelected: { fontSize: 16, fontWeight: "800", color: "#FFFFFF" },
  todayDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: theme.accent, marginTop: 4 },
  todayDotSelected: { width: 5, height: 5, borderRadius: 3, backgroundColor: "#FFFFFF", marginTop: 4 },

  dropletCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(214,234,242,0.95)",
  },
  dropletLabel: { fontSize: 13, fontWeight: "600", color: theme.textMuted, marginBottom: 8, textAlign: "center" },
  totalDropletWrap: { alignItems: "center", justifyContent: "center", paddingVertical: 8, overflow: "visible" },
  progressTrack: {
    width: "100%",
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(51,175,193,0.12)",
    marginTop: 12,
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 4 },
  progressHint: { fontSize: 12, color: theme.textMuted, marginTop: 10, textAlign: "center", lineHeight: 17 },

  statsRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(214,234,242,0.95)",
  },
  statCardMuted: { backgroundColor: "#F8FCFD" },
  statIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "rgba(51,175,193,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  statIconMuted: { backgroundColor: "rgba(107,124,133,0.1)" },
  statValue: { fontSize: 16, fontWeight: "800", color: theme.accent },
  statValueMuted: { fontSize: 14, fontWeight: "800", color: theme.textMuted },
  statLabel: { fontSize: 10, fontWeight: "600", color: theme.textMuted, marginTop: 2, textTransform: "uppercase", letterSpacing: 0.3 },

  typesGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  typeTile: {
    width: "48%",
    backgroundColor: "#F8FCFD",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(214,234,242,0.95)",
  },
  typeIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  typeLabel: { fontSize: 14, fontWeight: "700", color: theme.textPrimary, marginBottom: 10 },
  quickRow: { flexDirection: "row", gap: 8 },
  quickBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  quickBtnText: { fontSize: 14, fontWeight: "800", color: "#FFFFFF" },
  typeHint: { fontSize: 12, color: theme.textMuted },

  mlRow: { flexDirection: "row", alignItems: "flex-end", gap: 10 },
  mlInputWrap: { flex: 1 },
  mlInputSection: { marginBottom: 0 },
  addBtnWrap: { borderRadius: 14, overflow: "hidden", marginBottom: 20 },
  addBtn: { paddingVertical: 16, paddingHorizontal: 22, alignItems: "center", justifyContent: "center", minWidth: 72 },
  addBtnText: { fontSize: 15, fontWeight: "700", color: "#FFFFFF" },

  loader: { marginVertical: 20 },
  emptyWrap: { alignItems: "center", paddingVertical: 24, paddingHorizontal: 12 },
  emptyTitle: { fontSize: 15, fontWeight: "700", color: theme.textPrimary, marginTop: 10 },
  emptyText: { fontSize: 13, color: theme.textMuted, marginTop: 6, textAlign: "center", lineHeight: 18 },

  entriesList: { gap: 8 },
  entryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#F8FCFD",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(214,234,242,0.95)",
  },
  entryIcon: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  entryBody: { flex: 1, minWidth: 0 },
  entryTime: { fontSize: 13, fontWeight: "700", color: theme.textPrimary },
  entryDetail: { fontSize: 12, color: theme.textMuted, marginTop: 2, textTransform: "capitalize" },
  entryVol: { fontSize: 14, fontWeight: "800", color: theme.accent },
  entryDeleteBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(220,38,38,0.06)",
  },

  loginPromptWrap: { borderRadius: 16, overflow: "hidden", marginTop: 4 },
  loginPrompt: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
  },
  loginPromptText: { fontSize: 15, fontWeight: "700", color: "#FFFFFF" },

  sheetOverlay: { flex: 1, justifyContent: "flex-end" },
  sheetBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.5)" },
  sheetPanel: {
    backgroundColor: theme.contentPanelBackground,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.9)",
  },
  sheetHero: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 18 },
  sheetHandleLight: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.45)",
    alignSelf: "center",
    marginBottom: 14,
  },
  sheetHeroRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sheetHeroLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  sheetHeroIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  sheetHeroTitle: { fontSize: 18, fontWeight: "800", color: "#FFFFFF" },
  sheetHeroSubtitle: { fontSize: 12, color: "rgba(255,255,255,0.88)", marginTop: 3 },
  sheetHeroClose: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  sheetContent: { paddingHorizontal: 20, paddingBottom: Platform.OS === "ios" ? 28 : 20 },
  sizeOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(214,234,242,0.95)",
  },
  sizeOptionLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  sizeOptionLabel: { fontSize: 15, fontWeight: "700", color: theme.textPrimary },
  sizeOptionRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  sizeOptionMl: { fontSize: 14, fontWeight: "700", color: theme.accent },
});
