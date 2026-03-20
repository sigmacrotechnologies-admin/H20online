import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Modal,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import BackButton from "@/src/components/BackButton";
import { theme } from "@/src/theme";

const DEPT_TABS = ["Sales", "Tech", "HR", "Ops", "Mktg"];
const BULK_SCHEDULE_TYPES = [
  { id: "daily", name: "Daily Office Supply", desc: "Mon–Fri • 08:30 AM" },
  { id: "board", name: "Board Meeting", desc: "On demand" },
  { id: "cafeteria", name: "Cafeteria Refill", desc: "Weekly • Monday" },
  { id: "party", name: "Party & Celebrations", desc: "Event-based" },
  { id: "pantry", name: "Pantry Refill", desc: "Twice weekly" },
  { id: "event", name: "Event Supply", desc: "Custom schedule" },
];

const SUBSCRIPTION_TIERS = [
  { id: "1000", liters: 1000, minL: 100, options: [{ id: "bottles", label: "Bottles (1L)" }, { id: "jars20", label: "20L Jars" }, { id: "jars5", label: "5L Jars" }, { id: "tanker500", label: "500L Tanker" }] },
  { id: "500", liters: 500, minL: 100, options: [{ id: "bottles", label: "Bottles (1L)" }, { id: "jars20", label: "20L Jars" }, { id: "jars5", label: "5L Jars" }] },
];

const CorporateDashboardScreen = () => {
  const router = useRouter();
  const [deptTab, setDeptTab] = useState("Sales");
  const [graphRange, setGraphRange] = useState("daily");
  const [schedules, setSchedules] = useState([
    { id: "1", typeId: "daily", name: "Daily Office Supply", when: "Mon–Fri • 08:30 AM", status: "Active" },
    { id: "2", typeId: "board", name: "Board Meeting", when: "Tomorrow • 10:00 AM", status: "Fill" },
    { id: "3", typeId: "cafeteria", name: "Cafeteria Refill", when: "Weekly • Monday", status: "Active" },
  ]);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [selectedTier, setSelectedTier] = useState(null);
  const [subscriptionLiters, setSubscriptionLiters] = useState(100);
  const [subscriptionMode, setSubscriptionMode] = useState(null);

  const companyName = "Acme Corp HQ";
  const locations = 4;
  const employees = 250;
  const monthlyConsumption = "4,200 L";
  const activeSubscriptions = 12;
  const currentCycleDue = "Jul 1";
  const currentCycleAmount = "₹24,500";
  const gstPct = "18%";
  const creditAvailable = "₹5,000";
  const latestInvoices = [
    { id: "1", name: "June Invoice.pdf", date: "Jun 30" },
    { id: "2", name: "May Invoice.pdf", date: "May 31" },
  ];
  const jarDeliveryRate = "₹4.2/L";
  const jarTrend = "+2%";
  const waterFilterRate = "₹1.8/L";
  const filterTrend = "-15%";

  const graphData = useMemo(() => {
    if (graphRange === "daily") return [65, 72, 58, 80, 75, 70, 68];
    if (graphRange === "weekly") return [420, 480, 390, 510, 450];
    return [4200, 3800, 4100];
  }, [graphRange]);
  const graphLabels = graphRange === "daily" ? ["M", "T", "W", "T", "F", "S", "S"] : graphRange === "weekly" ? ["W1", "W2", "W3", "W4", "W5"] : ["Jan", "Feb", "Mar"];
  const maxGraph = Math.max(...graphData);

  const addSchedule = (type) => {
    const t = BULK_SCHEDULE_TYPES.find((x) => x.id === type.id);
    if (!t) return;
    setSchedules((prev) => [
      ...prev,
      { id: String(Date.now()), typeId: t.id, name: t.name, when: t.desc, status: "Active" },
    ]);
    setShowBulkModal(false);
  };

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
            <View style={styles.headerRow}>
              <BackButton onPress={() => router.back()} />
              <TouchableOpacity style={styles.bellButton} activeOpacity={0.7}>
                <Ionicons name="notifications-outline" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <Text style={styles.appTitle}>H2O Water Application</Text>
          </LinearGradient>
        </View>

        <View style={styles.contentPanel}>
          <Text style={styles.hubTitle}>Corporate Hub</Text>
          <Text style={styles.hubSubtitle}>Manage office water ecosystem.</Text>

          {/* Company Overview Card */}
          <View style={styles.card}>
            <View style={styles.companyRow}>
              <Ionicons name="business" size={22} color={theme.primary} style={styles.companyIcon} />
              <Text style={styles.companyName}>{companyName}</Text>
            </View>
            <Text style={styles.metaText}>{locations} Locations • {employees} Employees</Text>
            <View style={styles.metricsRow}>
              <Text style={styles.metricText}>Monthly Consumption {monthlyConsumption}</Text>
              <Text style={styles.metricText}>Active Subscriptions {activeSubscriptions} Plans</Text>
            </View>
          </View>

          {/* Quick tiles: Order History, Update Subscription, Ad hoc */}
          <View style={styles.tilesRow}>
            <TouchableOpacity style={styles.tile} onPress={() => router.push("/corporate-order-history")} activeOpacity={0.8}>
              <Ionicons name="list" size={24} color={theme.primary} />
              <Text style={styles.tileText}>Order History</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.tile} onPress={() => setShowSubscriptionModal(true)} activeOpacity={0.8}>
              <Ionicons name="repeat" size={24} color={theme.primary} />
              <Text style={styles.tileText}>Update Plans</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.tile} onPress={() => router.push("/order")} activeOpacity={0.8}>
              <Ionicons name="cart-outline" size={24} color={theme.primary} />
              <Text style={styles.tileText}>Ad hoc Orders</Text>
            </TouchableOpacity>
          </View>

          {/* Consumption graph */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Consumption</Text>
            <View style={styles.graphToggleRow}>
              {["daily", "weekly", "monthly"].map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[styles.graphToggle, graphRange === r && styles.graphToggleActive]}
                  onPress={() => setGraphRange(r)}
                >
                  <Text style={[styles.graphToggleText, graphRange === r && styles.graphToggleTextActive]}>{r.charAt(0).toUpperCase() + r.slice(1)}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.barRow}>
              {graphData.map((v, i) => (
                <View key={i} style={styles.barCol}>
                  <View style={[styles.barBg, { height: 60 }]}>
                    <View style={[styles.barFill, { height: `${(v / maxGraph) * 100}%` }]} />
                  </View>
                  <Text style={styles.barLabel}>{graphLabels[i]}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Bulk Scheduler */}
          <View style={styles.card}>
            <View style={styles.schedulerHeader}>
              <View>
                <Text style={styles.sectionTitle}>Bulk Scheduler</Text>
                <Text style={styles.sectionSubtitle}>Automated deliveries.</Text>
              </View>
              <TouchableOpacity style={styles.plusButton} onPress={() => setShowBulkModal(true)} activeOpacity={0.8}>
                <Ionicons name="add" size={28} color={theme.primary} />
              </TouchableOpacity>
            </View>
            {schedules.map((s) => (
              <View key={s.id} style={styles.scheduleRow}>
                <View style={styles.scheduleInfo}>
                  <Text style={styles.scheduleName}>{s.name}</Text>
                  <Text style={styles.scheduleWhen}>{s.when}</Text>
                </View>
                <View style={[styles.badge, s.status === "Active" ? styles.badgeActive : styles.badgeFill]}>
                  <Text style={styles.badgeText}>{s.status}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Subscriptions (plans) */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Subscriptions</Text>
            <Text style={styles.sectionSubtitle}>Select tier and delivery mode.</Text>
            {SUBSCRIPTION_TIERS.map((tier) => (
              <TouchableOpacity
                key={tier.id}
                style={styles.tierRow}
                onPress={() => {
                  setSelectedTier(tier);
                  setSubscriptionMode(null);
                  setSubscriptionLiters(tier.minL);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.tierName}>{tier.liters} L plan (min {tier.minL} L)</Text>
                <Ionicons name="chevron-forward" size={20} color="#6B7C85" />
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.manageSubBtn} onPress={() => setShowSubscriptionModal(true)} activeOpacity={0.8}>
              <Text style={styles.manageSubBtnText}>Manage / Add subscription</Text>
            </TouchableOpacity>
          </View>

          {/* Billing & Finance */}
          <View style={styles.card}>
            <View style={styles.billingHeader}>
              <Text style={styles.sectionTitle}>Billing & Finance</Text>
              <View style={styles.paidBadge}>
                <Text style={styles.paidBadgeText}>Paid</Text>
              </View>
            </View>
            <View style={styles.cycleCard}>
              <Text style={styles.cycleLabel}>Current Cycle (Due {currentCycleDue})</Text>
              <Text style={styles.cycleAmount}>{currentCycleAmount}</Text>
              <Text style={styles.cycleGst}>Includes GST ({gstPct})</Text>
              <Text style={styles.creditText}>Credit Available: {creditAvailable}</Text>
            </View>
            <Text style={styles.latestLabel}>Latest Invoices</Text>
            {latestInvoices.map((inv) => (
              <View key={inv.id} style={styles.invoiceRow}>
                <Text style={styles.invoiceName}>{inv.name}</Text>
                <Text style={styles.invoiceDate}>{inv.date}</Text>
                <Ionicons name="download-outline" size={20} color="#6B7C85" />
              </View>
            ))}
            <TouchableOpacity style={styles.viewAllInvoices} onPress={() => router.push("/corporate-invoices")} activeOpacity={0.8}>
              <Text style={styles.viewAllInvoicesText}>View all invoices →</Text>
            </TouchableOpacity>
          </View>

          {/* Consumption Analytics */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Consumption Analytics</Text>
            <Text style={styles.sectionSubtitle}>Department wise usage.</Text>
            <View style={styles.deptTabs}>
              {DEPT_TABS.map((d) => (
                <TouchableOpacity
                  key={d}
                  style={[styles.deptTab, deptTab === d && styles.deptTabActive]}
                  onPress={() => setDeptTab(d)}
                >
                  <Text style={[styles.deptTabText, deptTab === d && styles.deptTabTextActive]}>{d}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Cost Optimization */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Cost Optimization</Text>
            <View style={styles.costRow}>
              <View style={styles.costItem}>
                <Text style={styles.costLabel}>Jar Delivery</Text>
                <View style={styles.costValueRow}>
                  <Text style={styles.costValue}>{jarDeliveryRate}</Text>
                  <Ionicons name="trending-up" size={16} color="#DC2626" />
                  <Text style={styles.costTrendUp}>{jarTrend}</Text>
                </View>
              </View>
              <View style={styles.costItem}>
                <Text style={styles.costLabel}>Water Filter</Text>
                <View style={styles.costValueRow}>
                  <Text style={styles.costValue}>{waterFilterRate}</Text>
                  <Ionicons name="trending-down" size={16} color="#14B8A6" />
                  <Text style={styles.costTrendDown}>{filterTrend}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bulk Scheduler Add Modal */}
      <Modal visible={showBulkModal} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowBulkModal(false)}>
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Schedule</Text>
              <TouchableOpacity onPress={() => setShowBulkModal(false)}>
                <Ionicons name="close" size={24} color="#1B2B34" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalHint}>Select delivery type</Text>
            {BULK_SCHEDULE_TYPES.map((t) => (
              <TouchableOpacity key={t.id} style={styles.modalOption} onPress={() => addSchedule(t)}>
                <View>
                  <Text style={styles.modalOptionName}>{t.name}</Text>
                  <Text style={styles.modalOptionDesc}>{t.desc}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#6B7C85" />
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Subscription selection modal */}
      <Modal visible={showSubscriptionModal} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowSubscriptionModal(false)}>
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Subscription plans</Text>
              <TouchableOpacity onPress={() => setShowSubscriptionModal(false)}>
                <Ionicons name="close" size={24} color="#1B2B34" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalHint}>Choose liters, then bottles/jars/tanker. Min 100L per tier.</Text>
            {SUBSCRIPTION_TIERS.map((tier) => (
              <View key={tier.id} style={styles.tierBlock}>
                <Text style={styles.tierBlockTitle}>{tier.liters} L (min {tier.minL} L)</Text>
                {tier.options.map((opt) => (
                  <TouchableOpacity
                    key={opt.id}
                    style={[styles.modalOption, selectedTier?.id === tier.id && subscriptionMode === opt.id && styles.modalOptionSelected]}
                    onPress={() => {
                      setSelectedTier(tier);
                      setSubscriptionMode(opt.id);
                    }}
                  >
                    <Text style={styles.modalOptionName}>{opt.label}</Text>
                    {selectedTier?.id === tier.id && subscriptionMode === opt.id && (
                      <Ionicons name="checkmark-circle" size={22} color={theme.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            ))}
            <TouchableOpacity style={styles.continueButton} onPress={() => setShowSubscriptionModal(false)}>
              <Text style={styles.buttonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

export default CorporateDashboardScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.screenBackground, paddingHorizontal: 20 },
  scrollContent: { paddingBottom: 40 },
  headerSection: { marginTop: -10, marginLeft: -20, marginRight: -20, height: 120, overflow: "hidden" },
  gradientBackground: { flex: 1, paddingTop: 14, paddingHorizontal: 20, paddingBottom: 16 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  bellButton: { padding: 8, marginLeft: 8 },
  appTitle: { fontSize: 18, fontWeight: "700", color: "#FFFFFF", textAlign: "center", marginTop: 8 },
  contentPanel: { marginTop: -20, marginLeft: 2, marginRight: 2, backgroundColor: theme.screenBackground, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 24, paddingHorizontal: 20 },
  hubTitle: { fontSize: 24, fontWeight: "700", color: "#1B2B34", marginBottom: 4 },
  hubSubtitle: { fontSize: 14, color: "#6B7C85", marginBottom: 20 },
  card: { backgroundColor: "rgba(255,255,255,0.85)", borderRadius: 20, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.9)", elevation: 3 },
  companyRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  companyIcon: { marginRight: 10 },
  companyName: { fontSize: 18, fontWeight: "700", color: "#1B2B34" },
  metaText: { fontSize: 14, color: "#6B7C85", marginBottom: 10 },
  metricsRow: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  metricText: { fontSize: 13, color: "#1B2B34", fontWeight: "500" },
  tilesRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  tile: { flex: 1, backgroundColor: "rgba(255,255,255,0.85)", borderRadius: 16, padding: 16, alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.9)", elevation: 2 },
  tileText: { fontSize: 12, fontWeight: "600", color: "#1B2B34", marginTop: 8 },
  sectionTitle: { fontSize: 17, fontWeight: "700", color: "#1B2B34", marginBottom: 4 },
  sectionSubtitle: { fontSize: 13, color: "#6B7C85", marginBottom: 12 },
  graphToggleRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  graphToggle: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: "#E5E7EB" },
  graphToggleActive: { backgroundColor: theme.primary },
  graphToggleText: { fontSize: 13, fontWeight: "600", color: "#6B7C85" },
  graphToggleTextActive: { color: "#FFFFFF" },
  barRow: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", height: 80 },
  barCol: { flex: 1, alignItems: "center" },
  barBg: { width: 20, backgroundColor: theme.selectedTint, borderRadius: 4, overflow: "hidden", justifyContent: "flex-end" },
  barFill: { width: "100%", backgroundColor: theme.primary, borderRadius: 4, minHeight: 4 },
  barLabel: { fontSize: 11, color: "#6B7C85", marginTop: 6 },
  schedulerHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  plusButton: { padding: 4 },
  scheduleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  scheduleInfo: {},
  scheduleName: { fontSize: 15, fontWeight: "600", color: "#1B2B34" },
  scheduleWhen: { fontSize: 13, color: "#6B7C85", marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeActive: { backgroundColor: "#D1FAE5" },
  badgeFill: { backgroundColor: "#DBEAFE" },
  badgeText: { fontSize: 12, fontWeight: "600", color: "#1B2B34" },
  tierRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  tierName: { fontSize: 15, fontWeight: "600", color: "#1B2B34" },
  manageSubBtn: { marginTop: 12 },
  manageSubBtnText: { fontSize: 14, fontWeight: "600", color: theme.primary },
  billingHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  paidBadge: { backgroundColor: "#D1FAE5", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  paidBadgeText: { fontSize: 12, fontWeight: "600", color: "#059669" },
  cycleCard: { backgroundColor: theme.selectedTint, borderRadius: 16, padding: 16, marginBottom: 16 },
  cycleLabel: { fontSize: 13, color: "#6B7C85", marginBottom: 4 },
  cycleAmount: { fontSize: 22, fontWeight: "700", color: "#1B2B34" },
  cycleGst: { fontSize: 12, color: "#6B7C85", marginTop: 4 },
  creditText: { fontSize: 13, color: "#14B8A6", marginTop: 6 },
  latestLabel: { fontSize: 14, fontWeight: "600", color: "#1B2B34", marginBottom: 8 },
  invoiceRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  invoiceName: { flex: 1, fontSize: 14, color: "#1B2B34" },
  invoiceDate: { fontSize: 13, color: "#6B7C85", marginRight: 8 },
  viewAllInvoices: { marginTop: 12 },
  viewAllInvoicesText: { fontSize: 14, fontWeight: "600", color: theme.primary },
  deptTabs: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  deptTab: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: "#E5E7EB" },
  deptTabActive: { backgroundColor: theme.primary },
  deptTabText: { fontSize: 13, fontWeight: "600", color: "#6B7C85" },
  deptTabTextActive: { color: "#FFFFFF" },
  costRow: { flexDirection: "row", gap: 16 },
  costItem: { flex: 1, backgroundColor: "#F0F9FF", borderRadius: 12, padding: 14 },
  costLabel: { fontSize: 13, color: "#6B7C85", marginBottom: 6 },
  costValueRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  costValue: { fontSize: 16, fontWeight: "700", color: "#1B2B34" },
  costTrendUp: { fontSize: 12, color: "#DC2626", fontWeight: "600" },
  costTrendDown: { fontSize: 12, color: "#14B8A6", fontWeight: "600" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#FFFFFF", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: "80%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: "700", color: "#1B2B34" },
  modalHint: { fontSize: 14, color: "#6B7C85", marginBottom: 16 },
  modalOption: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderRadius: 12, backgroundColor: "#f0f7fcd7", marginBottom: 10 },
  modalOptionSelected: { backgroundColor: theme.selectedTint, borderWidth: 2, borderColor: theme.primaryLight },
  modalOptionName: { fontSize: 16, fontWeight: "600", color: "#1B2B34" },
  modalOptionDesc: { fontSize: 13, color: "#6B7C85", marginTop: 2 },
  tierBlock: { marginBottom: 16 },
  tierBlockTitle: { fontSize: 15, fontWeight: "700", color: "#1B2B34", marginBottom: 8 },
  continueButton: { marginTop: 20, backgroundColor: theme.primary, paddingVertical: 14, borderRadius: 24, alignItems: "center" },
  buttonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
});
