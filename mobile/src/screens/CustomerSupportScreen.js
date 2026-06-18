import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  FlatList,
  RefreshControl,
  Platform,
  StatusBar,
  ActivityIndicator,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import BackButton from "@/src/components/BackButton";
import AppLogo from "@/src/components/AppLogo";
import DropletOverlay from "@/src/components/modern/DropletOverlay";
import { useAuth } from "@/src/context/AuthContext";
import { api } from "@/src/api/client";
import { theme } from "@/src/theme";

const CATEGORIES = [
  { id: "order", label: "Order issue", icon: "receipt-outline" },
  { id: "delivery", label: "Delivery problem", icon: "bicycle-outline" },
  { id: "payment", label: "Payment / billing", icon: "card-outline" },
  { id: "account", label: "Account & login", icon: "person-outline" },
  { id: "product", label: "Product quality", icon: "water-outline" },
  { id: "other", label: "Other", icon: "ellipsis-horizontal-outline" },
];

function statusMeta(status) {
  if (status === "in_progress") {
    return { color: theme.accent, bg: "rgba(30,143,177,0.12)", label: "In progress", icon: "time-outline" };
  }
  if (status === "resolved") {
    return { color: "#059669", bg: "rgba(5,150,105,0.12)", label: "Resolved", icon: "checkmark-circle-outline" };
  }
  if (status === "closed") {
    return { color: "#6B7280", bg: "rgba(107,114,128,0.12)", label: "Closed", icon: "lock-closed-outline" };
  }
  return { color: "#D97706", bg: "rgba(217,119,6,0.12)", label: "Open", icon: "alert-circle-outline" };
}

function categoryLabel(id) {
  return CATEGORIES.find((c) => c.id === id)?.label || "Other";
}

const CustomerSupportScreen = () => {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [view, setView] = useState("list");
  const [tickets, setTickets] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [category, setCategory] = useState("other");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const androidTopInset = Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;

  const loadTickets = useCallback(async () => {
    if (!isAuthenticated) {
      setTickets([]);
      setLoading(false);
      return;
    }
    try {
      const data = await api.customerSupport.listTickets();
      setTickets(Array.isArray(data) ? data : []);
    } catch {
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const loadTicketDetail = useCallback(async (id) => {
    try {
      const data = await api.customerSupport.getTicket(id);
      setSelected(data);
      return data;
    } catch (e) {
      Alert.alert("Error", e.message || "Could not load ticket");
      return null;
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadTickets();
    }, [loadTickets])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadTickets();
    if (selected?.id) await loadTicketDetail(selected.id);
    setRefreshing(false);
  }, [loadTickets, loadTicketDetail, selected?.id]);

  const openCreate = () => {
    setCategory("other");
    setSubject("");
    setDescription("");
    setView("create");
  };

  const openDetail = async (ticket) => {
    setSelected(ticket);
    setView("detail");
    await loadTicketDetail(ticket.id);
  };

  const goToList = () => {
    setView("list");
    setSelected(null);
    setReplyText("");
    loadTickets();
  };

  const submitTicket = async () => {
    if (!subject.trim()) {
      Alert.alert("Missing subject", "Please enter a short subject for your complaint.");
      return;
    }
    if (!description.trim()) {
      Alert.alert("Missing details", "Please describe your issue so we can help.");
      return;
    }
    setSubmitting(true);
    try {
      const ticket = await api.customerSupport.createTicket({
        category,
        subject: subject.trim(),
        description: description.trim(),
      });
      setSelected(ticket);
      setView("detail");
      setSubject("");
      setDescription("");
      loadTickets();
      Alert.alert("Ticket created", `Your ticket ${ticket.ticketId} has been submitted. Our team will respond soon.`);
    } catch (e) {
      Alert.alert("Could not submit", e.message || "Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const sendReply = async () => {
    if (!selected?.id || !replyText.trim() || submitting) return;
    setSubmitting(true);
    try {
      await api.customerSupport.replyToTicket(selected.id, replyText.trim());
      setReplyText("");
      await loadTicketDetail(selected.id);
      loadTickets();
    } catch (e) {
      Alert.alert("Could not send", e.message || "Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const renderTicketCard = ({ item }) => {
    const meta = statusMeta(item.status);
    const date = new Date(item.updatedAt || item.createdAt || 0);
    return (
      <TouchableOpacity style={styles.ticketCard} onPress={() => openDetail(item)} activeOpacity={0.88}>
        <View style={styles.ticketCardTop}>
          <LinearGradient colors={[theme.medium, theme.accent]} style={styles.ticketIcon}>
            <Ionicons name="chatbubble-ellipses-outline" size={20} color="#FFFFFF" />
          </LinearGradient>
          <View style={styles.ticketMain}>
            <Text style={styles.ticketId}>{item.ticketId}</Text>
            <Text style={styles.ticketSubject} numberOfLines={1}>
              {item.subject}
            </Text>
            <Text style={styles.ticketMeta}>
              {categoryLabel(item.category)} · {date.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
            </Text>
          </View>
          <View style={[styles.statusChip, { backgroundColor: meta.bg }]}>
            <Ionicons name={meta.icon} size={12} color={meta.color} />
            <Text style={[styles.statusChipText, { color: meta.color }]}>{meta.label}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const headerTitle =
    view === "create" ? "New complaint" : view === "detail" ? "Ticket details" : "Help & support";
  const headerSubtitle =
    view === "create"
      ? "Tell us what went wrong"
      : view === "detail"
        ? selected?.ticketId || "Your ticket"
        : "Raise a ticket and track responses";

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
            <View style={styles.headerTopRow}>
              <BackButton fallback={view === "list" ? "/profile" : undefined} onPress={view === "list" ? undefined : goToList} />
              <AppLogo size="header" />
              <TouchableOpacity style={styles.headerMenuBtn} activeOpacity={0.85} onPress={() => router.push("/profile")}>
                <Ionicons name="menu" size={22} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <Text style={styles.headerTitle}>{headerTitle}</Text>
            <Text style={styles.headerSubtitle}>
              {isAuthenticated ? headerSubtitle : "Log in to raise a support ticket"}
            </Text>
          </LinearGradient>
        </View>

        <View style={styles.contentSection}>
          {!isAuthenticated ? (
            <View style={styles.emptyWrap}>
              <Ionicons name="log-in-outline" size={48} color={theme.textMuted} />
              <Text style={styles.emptyTitle}>Login required</Text>
              <Text style={styles.emptyText}>Sign in to submit complaints and view your tickets.</Text>
              <TouchableOpacity style={styles.primaryBtnWrap} onPress={() => router.push("/login")} activeOpacity={0.9}>
                <LinearGradient colors={[theme.medium, theme.accent]} style={styles.primaryBtn}>
                  <Text style={styles.primaryBtnText}>Log in</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : view === "create" ? (
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
              <ScrollView contentContainerStyle={styles.formContent} showsVerticalScrollIndicator={false}>
                <Text style={styles.formLabel}>Category</Text>
                <View style={styles.categoryGrid}>
                  {CATEGORIES.map((cat) => {
                    const active = category === cat.id;
                    return (
                      <TouchableOpacity
                        key={cat.id}
                        style={[styles.categoryChip, active && styles.categoryChipActive]}
                        onPress={() => setCategory(cat.id)}
                        activeOpacity={0.85}
                      >
                        <Ionicons name={cat.icon} size={16} color={active ? "#FFFFFF" : theme.accent} />
                        <Text style={[styles.categoryChipText, active && styles.categoryChipTextActive]}>{cat.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={styles.formLabel}>Subject</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Brief summary of your issue"
                  placeholderTextColor={theme.textMuted}
                  value={subject}
                  onChangeText={setSubject}
                  maxLength={200}
                />

                <Text style={styles.formLabel}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Describe your complaint in detail..."
                  placeholderTextColor={theme.textMuted}
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  textAlignVertical="top"
                  maxLength={2000}
                />

                <TouchableOpacity
                  style={styles.primaryBtnWrap}
                  onPress={submitTicket}
                  disabled={submitting}
                  activeOpacity={0.9}
                >
                  <LinearGradient colors={[theme.medium, theme.accent]} style={styles.primaryBtn}>
                    {submitting ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name="paper-plane-outline" size={18} color="#FFFFFF" />
                        <Text style={styles.primaryBtnText}>Submit ticket</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </ScrollView>
            </KeyboardAvoidingView>
          ) : view === "detail" && selected ? (
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
              <ScrollView
                contentContainerStyle={styles.detailContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                  <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} colors={[theme.accent]} />
                }
              >
                <View style={styles.detailHeader}>
                  <View style={[styles.statusChipLarge, { backgroundColor: statusMeta(selected.status).bg }]}>
                    <Ionicons name={statusMeta(selected.status).icon} size={14} color={statusMeta(selected.status).color} />
                    <Text style={[styles.statusChipText, { color: statusMeta(selected.status).color }]}>
                      {statusMeta(selected.status).label}
                    </Text>
                  </View>
                  <Text style={styles.detailSubject}>{selected.subject}</Text>
                  <Text style={styles.detailMeta}>
                    {categoryLabel(selected.category)} · {selected.ticketId}
                  </Text>
                </View>

                <Text style={styles.threadTitle}>Conversation</Text>
                {(selected.messages || []).map((m, i) => (
                  <View
                    key={i}
                    style={[styles.messageBubble, m.from === "customer" ? styles.messageCustomer : styles.messageAdmin]}
                  >
                    <Text style={styles.messageFrom}>{m.from === "customer" ? "You" : "Support team"}</Text>
                    <Text style={styles.messageText}>{m.text}</Text>
                    {m.createdAt ? (
                      <Text style={styles.messageTime}>
                        {new Date(m.createdAt).toLocaleString("en-IN", {
                          day: "numeric",
                          month: "short",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </Text>
                    ) : null}
                  </View>
                ))}

                {selected.status !== "closed" ? (
                  <View style={styles.replyBox}>
                    <TextInput
                      style={[styles.input, styles.replyInput]}
                      placeholder="Add a follow-up message..."
                      placeholderTextColor={theme.textMuted}
                      value={replyText}
                      onChangeText={setReplyText}
                      multiline
                      maxLength={2000}
                    />
                    <TouchableOpacity
                      style={styles.replyBtn}
                      onPress={sendReply}
                      disabled={submitting || !replyText.trim()}
                      activeOpacity={0.85}
                    >
                      {submitting ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <Ionicons name="send" size={18} color="#FFFFFF" />
                      )}
                    </TouchableOpacity>
                  </View>
                ) : (
                  <Text style={styles.closedNote}>This ticket is closed. Open a new ticket if you need more help.</Text>
                )}
              </ScrollView>
            </KeyboardAvoidingView>
          ) : (
            <>
              <FlatList
                data={tickets}
                keyExtractor={(item) => item.id}
                renderItem={renderTicketCard}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                  <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} colors={[theme.accent]} />
                }
                ListHeaderComponent={
                  <TouchableOpacity style={styles.newTicketBanner} onPress={openCreate} activeOpacity={0.9}>
                    <LinearGradient colors={[theme.medium, theme.accent]} style={styles.newTicketBannerInner}>
                      <View style={styles.newTicketLeft}>
                        <Ionicons name="add-circle-outline" size={28} color="#FFFFFF" />
                        <View>
                          <Text style={styles.newTicketTitle}>Raise a complaint</Text>
                          <Text style={styles.newTicketDesc}>Create a new support ticket</Text>
                        </View>
                      </View>
                      <Ionicons name="chevron-forward" size={22} color="rgba(255,255,255,0.9)" />
                    </LinearGradient>
                  </TouchableOpacity>
                }
                ListEmptyComponent={
                  loading ? (
                    <ActivityIndicator color={theme.accent} style={{ marginTop: 40 }} />
                  ) : (
                    <View style={styles.emptyWrap}>
                      <Ionicons name="chatbubbles-outline" size={48} color={theme.textMuted} />
                      <Text style={styles.emptyTitle}>No tickets yet</Text>
                      <Text style={styles.emptyText}>
                        {user?.name ? `Hi ${user.name.split(" ")[0]}, ` : ""}
                        tap above to report an issue with orders, delivery, or payments.
                      </Text>
                    </View>
                  )
                }
              />
            </>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

export default CustomerSupportScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  pageBody: { flex: 1 },
  headerSection: { zIndex: 2 },
  gradientBackground: {
    paddingHorizontal: 20,
    paddingBottom: 28,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: "hidden",
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  headerMenuBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 26, fontWeight: "700", color: "#FFFFFF", marginBottom: 4 },
  headerSubtitle: { fontSize: 14, color: "rgba(255,255,255,0.88)" },
  contentSection: {
    flex: 1,
    marginTop: -18,
    backgroundColor: theme.contentPanelBackground || "#F8FAFC",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
  },
  listContent: { paddingHorizontal: 20, paddingBottom: 32 },
  newTicketBanner: { marginBottom: 16, borderRadius: 16, overflow: "hidden" },
  newTicketBannerInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 18,
  },
  newTicketLeft: { flexDirection: "row", alignItems: "center", gap: 14, flex: 1 },
  newTicketTitle: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
  newTicketDesc: { fontSize: 13, color: "rgba(255,255,255,0.88)", marginTop: 2 },
  ticketCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(214,234,242,0.95)",
    overflow: "hidden",
    ...Platform.select({
      ios: { shadowColor: "#0F172A", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 0 },
    }),
  },
  ticketCardTop: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  ticketIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  ticketMain: { flex: 1 },
  ticketId: { fontSize: 12, fontWeight: "600", color: theme.textMuted, marginBottom: 2 },
  ticketSubject: { fontSize: 16, fontWeight: "600", color: theme.text },
  ticketMeta: { fontSize: 13, color: theme.textMuted, marginTop: 4 },
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusChipLarge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: "flex-start",
    marginBottom: 10,
  },
  statusChipText: { fontSize: 11, fontWeight: "600" },
  emptyWrap: { alignItems: "center", paddingTop: 48, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: theme.text, marginTop: 16 },
  emptyText: { fontSize: 14, color: theme.textMuted, textAlign: "center", marginTop: 8, lineHeight: 20 },
  formContent: { paddingHorizontal: 20, paddingBottom: 40 },
  formLabel: { fontSize: 14, fontWeight: "600", color: theme.text, marginBottom: 8, marginTop: 16 },
  categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(30,143,177,0.25)",
  },
  categoryChipActive: { backgroundColor: theme.accent, borderColor: theme.accent },
  categoryChipText: { fontSize: 12, fontWeight: "600", color: theme.accent },
  categoryChipTextActive: { color: "#FFFFFF" },
  input: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: theme.text,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.08)",
  },
  textArea: { minHeight: 120, textAlignVertical: "top" },
  primaryBtnWrap: { marginTop: 24, borderRadius: 14, overflow: "hidden" },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
  },
  primaryBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  detailContent: { paddingHorizontal: 20, paddingBottom: 40 },
  detailHeader: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  detailSubject: { fontSize: 18, fontWeight: "700", color: theme.text },
  detailMeta: { fontSize: 13, color: theme.textMuted, marginTop: 6 },
  threadTitle: { fontSize: 15, fontWeight: "700", color: theme.text, marginBottom: 12 },
  messageBubble: { borderRadius: 14, padding: 14, marginBottom: 10 },
  messageCustomer: { backgroundColor: "#FFFFFF", alignSelf: "flex-end", maxWidth: "92%" },
  messageAdmin: { backgroundColor: "rgba(30,143,177,0.12)", alignSelf: "flex-start", maxWidth: "92%" },
  messageFrom: { fontSize: 11, fontWeight: "600", color: theme.textMuted, marginBottom: 4 },
  messageText: { fontSize: 15, color: theme.text, lineHeight: 21 },
  messageTime: { fontSize: 11, color: theme.textMuted, marginTop: 6 },
  replyBox: { flexDirection: "row", alignItems: "flex-end", gap: 8, marginTop: 8 },
  replyInput: { flex: 1, maxHeight: 100 },
  replyBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: theme.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  closedNote: { fontSize: 13, color: theme.textMuted, textAlign: "center", marginTop: 12, fontStyle: "italic" },
});
