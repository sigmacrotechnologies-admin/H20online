import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform, Modal, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/src/theme";

export function SectionCard({ icon, title, subtitle, children, style }) {
  return (
    <View style={[ui.sectionCard, style]}>
      <View style={ui.sectionHeader}>
        <LinearGradient colors={[theme.medium, theme.accent]} style={ui.sectionIcon}>
          <Ionicons name={icon} size={18} color="#FFFFFF" />
        </LinearGradient>
        <View style={ui.sectionHeaderText}>
          <Text style={ui.sectionTitle}>{title}</Text>
          {subtitle ? <Text style={ui.sectionSubtitle}>{subtitle}</Text> : null}
        </View>
      </View>
      {children}
    </View>
  );
}

export function SummaryBanner({ icon, label, value, chipValue, chipLabel }) {
  return (
    <View style={ui.summaryBanner}>
      <LinearGradient colors={[theme.medium, theme.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={ui.summaryBannerGradient}>
        <View style={ui.summaryBannerIcon}>
          <Ionicons name={icon} size={22} color="#FFFFFF" />
        </View>
        <View style={ui.summaryBannerText}>
          <Text style={ui.summaryBannerLabel}>{label}</Text>
          <Text style={ui.summaryBannerValue}>{value}</Text>
        </View>
        {chipValue != null ? (
          <View style={ui.summaryStatChip}>
            <Text style={ui.summaryStatValue}>{chipValue}</Text>
            {chipLabel ? <Text style={ui.summaryStatLabel}>{chipLabel}</Text> : null}
          </View>
        ) : null}
      </LinearGradient>
    </View>
  );
}

export function FilterChip({ label, selected, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.88}>
      {selected ? (
        <LinearGradient colors={[theme.medium, theme.accent]} style={ui.filterChip}>
          <Text style={ui.filterChipTextSelected}>{label}</Text>
        </LinearGradient>
      ) : (
        <View style={ui.filterChipMuted}>
          <Text style={ui.filterChipText}>{label}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export function GradientButton({ label, onPress, disabled, loading, icon, variant = "primary", style }) {
  const isOutline = variant === "outline";
  const isDanger = variant === "danger";
  if (isOutline || isDanger) {
    return (
      <TouchableOpacity onPress={onPress} disabled={disabled || loading} activeOpacity={0.9} style={[ui.outlineBtnWrap, style]}>
        <View style={[ui.outlineBtn, isDanger && ui.outlineBtnDanger]}>
          {icon ? <Ionicons name={icon} size={16} color={isDanger ? "#DC2626" : theme.accent} /> : null}
          <Text style={[ui.outlineBtnText, isDanger && ui.outlineBtnTextDanger]}>{label}</Text>
        </View>
      </TouchableOpacity>
    );
  }
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled || loading} activeOpacity={0.9} style={[ui.gradientBtnWrap, style]}>
      <LinearGradient colors={disabled || loading ? ["#EEF3F7", "#E8EEF2"] : [theme.medium, theme.accent]} style={ui.gradientBtn}>
        {icon ? <Ionicons name={icon} size={16} color="#FFFFFF" /> : null}
        <Text style={ui.gradientBtnText}>{label}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

export function EmptyState({ icon, title, subtitle, actionLabel, onAction }) {
  return (
    <View style={ui.emptyWrap}>
      <View style={ui.emptyIcon}>
        <Ionicons name={icon} size={32} color={theme.accent} />
      </View>
      <Text style={ui.emptyTitle}>{title}</Text>
      {subtitle ? <Text style={ui.emptyText}>{subtitle}</Text> : null}
      {actionLabel && onAction ? <GradientButton label={actionLabel} onPress={onAction} style={{ marginTop: 16 }} /> : null}
    </View>
  );
}

export function StatCard({ icon, label, value, accent }) {
  return (
    <View style={ui.statCard}>
      <Ionicons name={icon} size={18} color={accent || theme.accent} />
      <Text style={ui.statValue}>{value}</Text>
      <Text style={ui.statLabel}>{label}</Text>
    </View>
  );
}

/** Tall gradient header block for supplier sub-pages (matches dashboard hero). */
export function SupplierPageHeader({ icon, title, subtitle, stats = [] }) {
  return (
    <View style={ui.pageHeader}>
      <View style={ui.pageHeaderMain}>
        <LinearGradient colors={[theme.medium, theme.accent]} style={ui.pageHeaderIcon}>
          <Ionicons name={icon} size={24} color="#FFFFFF" />
        </LinearGradient>
        <View style={ui.pageHeaderText}>
          <Text style={ui.pageHeaderTitle}>{title}</Text>
          {subtitle ? <Text style={ui.pageHeaderSubtitle}>{subtitle}</Text> : null}
        </View>
      </View>
      {stats.length > 0 ? (
        <View style={ui.pageHeaderStatsRow}>
          {stats.map((stat, idx) => (
            <View
              key={`${stat.label}-${idx}`}
              style={[ui.pageHeaderStat, stat.alert && ui.pageHeaderStatAlert]}
            >
              <View style={[ui.pageHeaderStatIcon, stat.alert && ui.pageHeaderStatIconAlert]}>
                <Ionicons name={stat.icon} size={15} color="#FFFFFF" />
              </View>
              <Text style={ui.pageHeaderStatLabel}>{stat.label}</Text>
              <Text style={ui.pageHeaderStatValue}>{stat.value}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

export function ModernSheet({ visible, title, subtitle, icon, onClose, children, footer, scrollable = true }) {
  const body = scrollable ? (
    <ScrollView contentContainerStyle={ui.sheetScrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      {children}
    </ScrollView>
  ) : (
    <View style={ui.sheetBody}>{children}</View>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={ui.sheetOverlay}>
        <TouchableOpacity style={ui.sheetBackdrop} activeOpacity={1} onPress={onClose} />
        <View style={ui.sheetPanel}>
          <LinearGradient colors={theme.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={ui.sheetHero}>
            <View style={ui.sheetHandle} />
            <View style={ui.sheetHeroRow}>
              <View style={ui.sheetHeroLeft}>
                <View style={ui.sheetHeroIcon}>
                  <Ionicons name={icon} size={22} color="#FFFFFF" />
                </View>
                <View>
                  <Text style={ui.sheetHeroTitle}>{title}</Text>
                  {subtitle ? <Text style={ui.sheetHeroSubtitle}>{subtitle}</Text> : null}
                </View>
              </View>
              <TouchableOpacity onPress={onClose} style={ui.sheetHeroClose} activeOpacity={0.85}>
                <Ionicons name="close" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </LinearGradient>
          {body}
          {footer ? <View style={ui.sheetFooter}>{footer}</View> : null}
        </View>
      </View>
    </Modal>
  );
}

export const ui = StyleSheet.create({
  scrollContent: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 32 },
  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(214,234,242,0.95)",
  },
  sectionHeader: { flexDirection: "row", alignItems: "center", marginBottom: 14, gap: 12 },
  sectionIcon: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  sectionHeaderText: { flex: 1 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: theme.textPrimary },
  sectionSubtitle: { fontSize: 12, color: theme.textMuted, marginTop: 2 },
  summaryBanner: { borderRadius: 18, overflow: "hidden", marginBottom: 16 },
  summaryBannerGradient: { flexDirection: "row", alignItems: "center", padding: 16, gap: 12 },
  summaryBannerIcon: {
    width: 44, height: 44, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center", justifyContent: "center",
  },
  summaryBannerText: { flex: 1 },
  summaryBannerLabel: { fontSize: 12, fontWeight: "600", color: "rgba(255,255,255,0.88)" },
  summaryBannerValue: { fontSize: 20, fontWeight: "800", color: "#FFFFFF", marginTop: 2 },
  summaryStatChip: {
    alignItems: "center", backgroundColor: "rgba(255,255,255,0.18)", borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: "rgba(255,255,255,0.24)",
  },
  summaryStatValue: { fontSize: 18, fontWeight: "800", color: "#FFFFFF" },
  summaryStatLabel: { fontSize: 10, fontWeight: "600", color: "rgba(255,255,255,0.88)", marginTop: 2 },
  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999 },
  filterChipMuted: {
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999,
    backgroundColor: theme.contentPanelBackground, borderWidth: 1, borderColor: "rgba(214,234,242,0.95)",
  },
  filterChipTextSelected: { fontSize: 13, fontWeight: "700", color: "#FFFFFF" },
  filterChipText: { fontSize: 13, fontWeight: "600", color: theme.textSecondary },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  statCard: {
    flex: 1, backgroundColor: "#FFFFFF", borderRadius: 16, paddingVertical: 14, paddingHorizontal: 10,
    alignItems: "center", borderWidth: 1, borderColor: "rgba(214,234,242,0.95)",
  },
  statValue: { fontSize: 18, fontWeight: "800", color: theme.textPrimary, marginTop: 6 },
  statLabel: { fontSize: 11, fontWeight: "600", color: theme.textMuted, marginTop: 2 },
  gradientBtnWrap: { borderRadius: 14, overflow: "hidden" },
  gradientBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 13 },
  gradientBtnText: { fontSize: 15, fontWeight: "700", color: "#FFFFFF" },
  outlineBtnWrap: { borderRadius: 14, overflow: "hidden" },
  outlineBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12,
    borderRadius: 14, borderWidth: 1.5, borderColor: theme.accent, backgroundColor: "#FFFFFF",
  },
  outlineBtnDanger: { borderColor: "rgba(220,38,38,0.3)", backgroundColor: "#FEF2F2" },
  outlineBtnText: { fontSize: 14, fontWeight: "700", color: theme.accent },
  outlineBtnTextDanger: { color: "#DC2626" },
  emptyWrap: { alignItems: "center", paddingVertical: 32 },
  emptyIcon: {
    width: 64, height: 64, borderRadius: 20, backgroundColor: "rgba(30,143,177,0.1)",
    alignItems: "center", justifyContent: "center", marginBottom: 12,
  },
  emptyTitle: { fontSize: 17, fontWeight: "700", color: theme.textPrimary },
  emptyText: { fontSize: 14, color: theme.textMuted, textAlign: "center", marginTop: 6, lineHeight: 20 },
  sheetOverlay: { flex: 1, justifyContent: "flex-end" },
  sheetBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(15,23,42,0.45)" },
  sheetPanel: {
    maxHeight: "90%", backgroundColor: theme.contentPanelBackground,
    borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: "hidden",
  },
  sheetHero: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 18 },
  sheetHandle: { alignSelf: "center", width: 42, height: 4, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.45)", marginBottom: 14 },
  sheetHeroRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sheetHeroLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  sheetHeroIcon: {
    width: 44, height: 44, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.28)",
  },
  sheetHeroTitle: { fontSize: 20, fontWeight: "800", color: "#FFFFFF" },
  sheetHeroSubtitle: { fontSize: 13, color: "rgba(255,255,255,0.88)", marginTop: 2 },
  sheetHeroClose: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center", justifyContent: "center",
  },
  sheetBody: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  sheetScrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  sheetFooter: {
    paddingHorizontal: 20, paddingTop: 10, paddingBottom: Platform.OS === "ios" ? 28 : 18,
    borderTopWidth: 1, borderTopColor: "rgba(214,234,242,0.95)", backgroundColor: theme.contentPanelBackground,
  },
  inputLabel: { fontSize: 13, fontWeight: "700", color: theme.textPrimary, marginBottom: 8, marginTop: 4 },
  input: {
    backgroundColor: theme.contentPanelBackground, borderRadius: 14, borderWidth: 1,
    borderColor: "rgba(214,234,242,0.95)", paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: theme.textPrimary, marginBottom: 12,
  },
  glassSearch: {
    flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.28)", paddingHorizontal: 12, paddingVertical: 10, marginTop: 16,
  },
  glassSearchInput: { flex: 1, marginLeft: 8, fontSize: 14, color: "#FFFFFF" },
  headerStatRow: { flexDirection: "row", gap: 8, marginTop: 16 },
  headerStatCard: {
    flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.24)", padding: 10, gap: 8,
  },
  headerStatLabel: { fontSize: 11, color: "rgba(255,255,255,0.82)", fontWeight: "600" },
  headerStatValue: { fontSize: 15, fontWeight: "800", color: "#FFFFFF", marginTop: 2 },
  pageHeader: { marginTop: 4 },
  pageHeaderMain: { flexDirection: "row", alignItems: "center", gap: 14 },
  pageHeaderIcon: {
    width: 56, height: 56, borderRadius: 18, alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.28)",
  },
  pageHeaderText: { flex: 1, minWidth: 0 },
  pageHeaderTitle: { fontSize: 24, fontWeight: "800", color: "#FFFFFF", letterSpacing: -0.5 },
  pageHeaderSubtitle: { fontSize: 13, color: "rgba(255,255,255,0.88)", marginTop: 5, lineHeight: 18 },
  pageHeaderStatsRow: { flexDirection: "row", gap: 8, marginTop: 18 },
  pageHeaderStat: {
    flex: 1, backgroundColor: "rgba(255,255,255,0.14)", borderRadius: 16, borderWidth: 1,
    borderColor: "rgba(255,255,255,0.24)", paddingHorizontal: 10, paddingVertical: 12,
  },
  pageHeaderStatAlert: { backgroundColor: "rgba(239,68,68,0.22)", borderColor: "rgba(255,255,255,0.34)" },
  pageHeaderStatIcon: {
    width: 28, height: 28, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center", justifyContent: "center", marginBottom: 8,
  },
  pageHeaderStatIconAlert: { backgroundColor: "rgba(255,255,255,0.24)" },
  pageHeaderStatLabel: { fontSize: 10, fontWeight: "600", color: "rgba(255,255,255,0.82)" },
  pageHeaderStatValue: { fontSize: 15, fontWeight: "800", color: "#FFFFFF", marginTop: 3 },
});
