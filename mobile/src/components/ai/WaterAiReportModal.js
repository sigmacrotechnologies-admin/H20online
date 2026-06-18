import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/src/theme";

const SECTION_ICONS = {
  "Today's Status": "sunny-outline",
  "Weekly Pattern": "calendar-outline",
  "Hydration Insights": "water-outline",
  "Orders & Plans": "cube-outline",
  "Orders & Subscriptions": "cube-outline",
};

function sectionIcon(title) {
  return SECTION_ICONS[title] || "chatbubble-ellipses-outline";
}

function AiSectionCard({ title, content, index }) {
  const icon = sectionIcon(title);
  return (
    <View style={styles.aiSection}>
      <View style={styles.aiSectionHeader}>
        <LinearGradient colors={[theme.medium, theme.accent]} style={styles.aiSectionIcon}>
          <Ionicons name={icon} size={16} color="#FFFFFF" />
        </LinearGradient>
        <Text style={styles.aiSectionTitle}>{title}</Text>
        <View style={styles.aiBadge}>
          <Ionicons name="sparkles" size={10} color="#FBBF24" />
          <Text style={styles.aiBadgeText}>AI</Text>
        </View>
      </View>
      <Text style={styles.aiSectionContent}>{content}</Text>
      {index === 0 ? <View style={styles.aiSectionAccent} /> : null}
    </View>
  );
}

function ReportBody({ data }) {
  const sections = data.sections?.length
    ? data.sections
    : data.overview
      ? [{ title: "Overview", content: data.overview }]
      : [];

  return (
    <View style={styles.reportBody}>
      <LinearGradient colors={[theme.medium, theme.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroCard}>
        <View style={styles.heroBadge}>
          <Ionicons name="sparkles" size={12} color="#FBBF24" />
          <Text style={styles.heroBadgeText}>Water Sense AI</Text>
        </View>
        <Text style={styles.heroTitle}>{data.headline || "Your Water Activity Report"}</Text>
        {data.overview ? <Text style={styles.heroOverview}>{data.overview}</Text> : null}
        {data.userName ? (
          <Text style={styles.heroMeta}>
            Prepared for {data.userName}
            {data.generatedAt ? ` · ${new Date(data.generatedAt).toLocaleDateString()}` : ""}
          </Text>
        ) : null}
      </LinearGradient>

      {data.highlights?.length ? (
        <View style={styles.highlightsWrap}>
          <Text style={styles.highlightsLabel}>Key highlights</Text>
          <View style={styles.highlightsRow}>
            {data.highlights.map((item, idx) => (
              <View key={`hl-${idx}`} style={styles.highlightChip}>
                <Ionicons name="checkmark-circle" size={14} color={theme.accent} />
                <Text style={styles.highlightText}>{item}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {sections.map((section, idx) => (
        <AiSectionCard key={`${section.title}-${idx}`} title={section.title} content={section.content} index={idx} />
      ))}

      {data.recommendations?.length ? (
        <View style={styles.recCard}>
          <View style={styles.recHeader}>
            <LinearGradient colors={["#0F4C5C", "#1E8FB1"]} style={styles.recIcon}>
              <Ionicons name="bulb-outline" size={18} color="#FBBF24" />
            </LinearGradient>
            <View>
              <Text style={styles.recTitle}>AI Recommendations</Text>
              <Text style={styles.recSubtitle}>Personalized actions for you</Text>
            </View>
          </View>
          {data.recommendations.map((tip, idx) => (
            <View key={`tip-${idx}`} style={styles.tipRow}>
              <View style={styles.tipBullet}>
                <Text style={styles.tipBulletText}>{idx + 1}</Text>
              </View>
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.footerNote}>
        <Ionicons name="information-circle-outline" size={14} color={theme.textMuted} />
        <Text style={styles.footerNoteText}>This report is AI-generated from your hydration and app activity. Not medical advice.</Text>
      </View>
    </View>
  );
}

export default function WaterAiReportModal({ visible, onClose, onGenerate }) {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGenerate = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await onGenerate();
      setReportData(data || null);
    } catch (e) {
      setError(e.message || "Failed to generate report");
      setReportData(null);
    } finally {
      setLoading(false);
    }
  }, [onGenerate]);

  React.useEffect(() => {
    if (visible) {
      setReportData(null);
      setError("");
      handleGenerate();
    } else {
      setReportData(null);
      setError("");
      setLoading(false);
    }
  }, [visible, handleGenerate]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <LinearGradient colors={[theme.medium, theme.accent]} style={styles.headerIcon}>
                <Ionicons name="sparkles" size={20} color="#FFFFFF" />
              </LinearGradient>
              <View>
                <Text style={styles.title}>AI Water Report</Text>
                <Text style={styles.subtitle}>Personalized insights from Water Sense</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={24} color={theme.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {loading ? (
              <View style={styles.center}>
                <ActivityIndicator size="large" color={theme.accent} />
                <Text style={styles.loadingText}>Water Sense is analyzing your activity...</Text>
                <Text style={styles.loadingSubtext}>Generating your personalized AI report</Text>
              </View>
            ) : error ? (
              <View style={styles.center}>
                <Ionicons name="alert-circle-outline" size={40} color="#DC2626" />
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity style={styles.retryBtn} onPress={handleGenerate} activeOpacity={0.85}>
                  <Text style={styles.retryText}>Try again</Text>
                </TouchableOpacity>
              </View>
            ) : reportData ? (
              <ReportBody data={reportData} />
            ) : null}
          </ScrollView>

          {!loading && reportData ? (
            <TouchableOpacity style={styles.regenBtn} onPress={handleGenerate} activeOpacity={0.85}>
              <Ionicons name="refresh-outline" size={16} color={theme.link} />
              <Text style={styles.regenText}>Regenerate AI report</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: theme.contentPanelBackground,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "92%",
    paddingBottom: Platform.OS === "ios" ? 28 : 20,
    ...Platform.select({
      ios: { shadowColor: "#0B3A4A", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.12, shadowRadius: 16 },
      android: { elevation: 0 },
    }),
  },
  sheetHandle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(107,124,133,0.35)",
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 6,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(214,234,242,0.95)",
    backgroundColor: "#FFFFFF",
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  headerIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 17, fontWeight: "800", color: theme.textPrimary },
  subtitle: { fontSize: 12, color: theme.textMuted, marginTop: 2 },
  scroll: { maxHeight: 560 },
  scrollContent: { paddingBottom: 12 },
  center: { alignItems: "center", paddingVertical: 48, gap: 8, paddingHorizontal: 24 },
  loadingText: { fontSize: 15, fontWeight: "700", color: theme.textPrimary, marginTop: 12, textAlign: "center" },
  loadingSubtext: { fontSize: 13, color: theme.textMuted, textAlign: "center" },
  errorText: { fontSize: 14, color: "#DC2626", textAlign: "center", lineHeight: 20 },
  retryBtn: {
    marginTop: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "rgba(51,175,193,0.12)",
  },
  retryText: { fontSize: 14, fontWeight: "700", color: theme.link },
  regenBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginHorizontal: 20,
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(214,234,242,0.95)",
  },
  regenText: { fontSize: 14, fontWeight: "700", color: theme.link },
  reportBody: { paddingHorizontal: 16, paddingTop: 16, gap: 14 },
  heroCard: { borderRadius: 22, padding: 18, overflow: "hidden" },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 10,
  },
  heroBadgeText: { fontSize: 11, fontWeight: "700", color: "#FFFFFF" },
  heroTitle: { fontSize: 22, fontWeight: "800", color: "#FFFFFF", lineHeight: 28 },
  heroOverview: { fontSize: 14, color: "rgba(255,255,255,0.94)", lineHeight: 22, marginTop: 10 },
  heroMeta: { fontSize: 11, color: "rgba(255,255,255,0.78)", marginTop: 12, fontWeight: "600" },
  highlightsWrap: { gap: 8 },
  highlightsLabel: { fontSize: 12, fontWeight: "700", color: theme.textMuted, textTransform: "uppercase", letterSpacing: 0.4 },
  highlightsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  highlightChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(214,234,242,0.95)",
    maxWidth: "100%",
  },
  highlightText: { fontSize: 12, fontWeight: "600", color: theme.textPrimary, flexShrink: 1 },
  aiSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(214,234,242,0.95)",
    overflow: "hidden",
  },
  aiSectionHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  aiSectionIcon: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  aiSectionTitle: { flex: 1, fontSize: 15, fontWeight: "800", color: theme.textPrimary },
  aiBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(251,191,36,0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  aiBadgeText: { fontSize: 10, fontWeight: "800", color: "#B45309" },
  aiSectionContent: { fontSize: 14, color: theme.textPrimary, lineHeight: 22 },
  aiSectionAccent: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: theme.accent,
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
  },
  recCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(214,234,242,0.95)",
  },
  recHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 },
  recIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  recTitle: { fontSize: 15, fontWeight: "800", color: theme.textPrimary },
  recSubtitle: { fontSize: 12, color: theme.textMuted, marginTop: 2 },
  tipRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 10 },
  tipBullet: {
    width: 22,
    height: 22,
    borderRadius: 8,
    backgroundColor: "rgba(51,175,193,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  tipBulletText: { fontSize: 11, fontWeight: "800", color: theme.link },
  tipText: { flex: 1, fontSize: 13, color: theme.textPrimary, lineHeight: 20 },
  footerNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingHorizontal: 4,
    paddingBottom: 4,
  },
  footerNoteText: { flex: 1, fontSize: 11, color: theme.textMuted, lineHeight: 16 },
});
