import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Modal,
  Image,
  Platform,
  StatusBar,
  ActivityIndicator,
  KeyboardAvoidingView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/src/context/AuthContext";
import { useCart } from "@/src/context/CartContext";
import { api } from "@/src/api/client";
import BackButton from "@/src/components/BackButton";
import AppLogo from "@/src/components/AppLogo";
import DropletOverlay from "@/src/components/modern/DropletOverlay";
import { ModernInput } from "@/src/components/modern";
import { theme } from "@/src/theme";

const ACCOUNT_MENU = [
  { id: "personal", label: "Personal information", desc: "Name, email & phone", icon: "person-outline", action: "personal" },
  { id: "addresses", label: "Saved addresses", desc: "Manage delivery locations", icon: "location-outline", route: "/saved-addresses" },
  { id: "payment", label: "Payment methods", desc: "Cards, UPI & wallet", icon: "card-outline", action: "payment" },
  { id: "password", label: "Change password", desc: "Update account security", icon: "lock-closed-outline", action: "password" },
  { id: "orders", label: "Order history", desc: "View past deliveries", icon: "receipt-outline", route: "/order-history" },
];

const SUPPORT_MENU = [
  { id: "help", label: "Help & support", desc: "Raise a ticket or complaint", icon: "help-circle-outline", route: "/customer-support" },
  { id: "privacy", label: "Privacy policy", desc: "How we protect your data", icon: "shield-checkmark-outline", route: "/privacy-policy" },
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

function MenuRow({ item, onPress, showEdit }) {
  return (
    <TouchableOpacity style={styles.menuRow} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.menuIconWrap}>
        <Ionicons name={item.icon} size={20} color={theme.accent} />
      </View>
      <View style={styles.menuTextWrap}>
        <Text style={styles.menuLabel}>{item.label}</Text>
        {item.desc ? <Text style={styles.menuDesc}>{item.desc}</Text> : null}
      </View>
      {showEdit ? <Text style={styles.menuEdit}>Edit</Text> : null}
      <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
    </TouchableOpacity>
  );
}

function ProfileSheet({ visible, title, subtitle, icon, onClose, children, footer }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.sheetOverlay} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <TouchableOpacity style={styles.sheetBackdrop} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheetPanel}>
          <LinearGradient colors={theme.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.sheetHero}>
            <View style={styles.sheetHandleLight} />
            <View style={styles.sheetHeroRow}>
              <View style={styles.sheetHeroLeft}>
                <View style={styles.sheetHeroIcon}>
                  <Ionicons name={icon} size={22} color="#FFFFFF" />
                </View>
                <View>
                  <Text style={styles.sheetHeroTitle}>{title}</Text>
                  {subtitle ? <Text style={styles.sheetHeroSubtitle}>{subtitle}</Text> : null}
                </View>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.sheetHeroClose} activeOpacity={0.85}>
                <Ionicons name="close" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </LinearGradient>
          <ScrollView contentContainerStyle={styles.sheetScrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
          {footer}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const ProfileScreen = () => {
  const router = useRouter();
  const { user, isAuthenticated, logout, setUser } = useAuth();
  const { orders } = useCart();
  const [showPersonalModal, setShowPersonalModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [editName, setEditName] = useState(user?.name || "");
  const [editEmail, setEditEmail] = useState(user?.email || "");
  const [editPhone, setEditPhone] = useState(user?.phone || "");
  const [editAddress, setEditAddress] = useState("123 Hydration St, City");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [walletBalance, setWalletBalance] = useState(0);
  const lastWalletBalanceRef = useRef(0);
  const mountedRef = useRef(true);
  const androidTopInset = Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;

  React.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  React.useEffect(() => {
    if (user) {
      setEditName(user.name || "");
      setEditEmail(user.email || "");
      setEditPhone(user.phone || "");
    }
  }, [user]);

  const fetchWalletBalance = useCallback(async () => {
    if (!isAuthenticated) {
      setWalletBalance(0);
      lastWalletBalanceRef.current = 0;
      return;
    }
    try {
      const data = await api.wallet.get();
      const first = Number(data?.balance ?? 0);
      if (first === 0 && lastWalletBalanceRef.current > 0) {
        await new Promise((resolve) => setTimeout(resolve, 1200));
        const retry = await api.wallet.get();
        const retryBal = Number(retry?.balance ?? 0);
        if (mountedRef.current) {
          setWalletBalance(retryBal);
          lastWalletBalanceRef.current = retryBal;
        }
        return;
      }
      if (mountedRef.current) {
        setWalletBalance(first);
        lastWalletBalanceRef.current = first;
      }
    } catch (_) {
      if (mountedRef.current) {
        setWalletBalance(lastWalletBalanceRef.current || 0);
      }
    }
  }, [isAuthenticated]);

  useFocusEffect(
    useCallback(() => {
      fetchWalletBalance();
      const interval = setInterval(fetchWalletBalance, 60 * 1000);
      return () => clearInterval(interval);
    }, [fetchWalletBalance])
  );

  const openPersonalModal = () => {
    setEditName(user?.name || "");
    setEditEmail(user?.email || "");
    setEditPhone(user?.phone || "");
    setSaveError("");
    setShowPersonalModal(true);
  };

  const handleLogout = () => {
    logout();
    router.replace("/");
  };

  const handleSavePersonal = async () => {
    setSaveError("");
    if (!isAuthenticated) {
      setShowPersonalModal(false);
      return;
    }
    const nameVal = editName.trim();
    const emailVal = editEmail.trim();
    if (!nameVal) {
      setSaveError("Name is required");
      return;
    }
    if (!emailVal) {
      setSaveError("Email is required");
      return;
    }
    setSaving(true);
    try {
      const updated = await api.users.update({
        name: nameVal,
        email: emailVal,
        phone: editPhone.trim(),
      });
      setUser(updated);
      setShowPersonalModal(false);
    } catch (err) {
      setSaveError(err.message || "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  const handleSavePassword = () => {
    setShowChangePasswordModal(false);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const handleAccountMenu = (item) => {
    if (item.route) {
      router.push(item.route);
      return;
    }
    if (item.action === "personal") openPersonalModal();
    if (item.action === "password") setShowChangePasswordModal(true);
  };

  const handleSupportMenu = (item) => {
    if (item.route) router.push(item.route);
  };

  const displayName = user?.name || "Guest";
  const initials = displayName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

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
              <BackButton />
              <AppLogo size="header" />
              <View style={styles.headerSpacer} />
            </View>
            <Text style={styles.headerTitle}>My profile</Text>
            <Text style={styles.headerSubtitle}>Manage account, addresses and preferences</Text>
          </LinearGradient>
        </View>

        <View style={styles.contentSection}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={styles.profileHeroWrap}>
              <LinearGradient colors={[theme.medium, theme.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.profileHero}>
                <View style={styles.profileHeroTop}>
                  <LinearGradient colors={["rgba(255,255,255,0.35)", "rgba(255,255,255,0.18)"]} style={styles.avatarCircle}>
                    <Text style={styles.avatarInitials}>{initials || "GU"}</Text>
                  </LinearGradient>
                  <View style={styles.profileHeroInfo}>
                    <Text style={styles.userName}>{displayName}</Text>
                    <Text style={styles.userEmail}>{user?.email || "Login to sync your account"}</Text>
                    {user?.userCode ? <Text style={styles.userIdText}>Member ID · {user.userCode}</Text> : null}
                  </View>
                  <TouchableOpacity style={styles.profileEditBtn} onPress={openPersonalModal} activeOpacity={0.85}>
                    <Ionicons name="create-outline" size={18} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
                <View style={styles.memberBadge}>
                  <Ionicons name="diamond-outline" size={14} color="#FFFFFF" />
                  <Text style={styles.memberBadgeText}>Premium member</Text>
                </View>
              </LinearGradient>
            </View>

            <View style={styles.statsRow}>
              <TouchableOpacity style={styles.statCardWrap} onPress={() => router.push("/order-history")} activeOpacity={0.88}>
                <View style={styles.statCard}>
                  <View style={styles.statIcon}>
                    <Ionicons name="bag-check-outline" size={18} color={theme.accent} />
                  </View>
                  <Text style={styles.statValue}>{orders.length}</Text>
                  <Text style={styles.statLabel}>Orders</Text>
                </View>
              </TouchableOpacity>
              <View style={styles.statCardWrap}>
                <View style={styles.statCard}>
                  <View style={styles.statIcon}>
                    <Ionicons name="trophy-outline" size={18} color={theme.accent} />
                  </View>
                  <Text style={styles.statValue}>1,250</Text>
                  <Text style={styles.statLabel}>Points</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.statCardWrap} onPress={() => router.push("/dashboard")} activeOpacity={0.88}>
                <View style={[styles.statCard, styles.statCardWallet]}>
                  <View style={[styles.statIcon, styles.statIconWallet]}>
                    <Ionicons name="wallet-outline" size={18} color="#059669" />
                  </View>
                  <Text style={[styles.statValue, styles.statValueWallet]}>₹{Number(walletBalance || 0).toLocaleString()}</Text>
                  <Text style={styles.statLabel}>Wallet</Text>
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.quickActionsRow}>
              <TouchableOpacity style={styles.quickAction} onPress={() => router.push("/plan-subscription")} activeOpacity={0.88}>
                <LinearGradient colors={[theme.medium, theme.accent]} style={styles.quickActionIcon}>
                  <Ionicons name="document-text-outline" size={18} color="#FFFFFF" />
                </LinearGradient>
                <Text style={styles.quickActionText}>My plan</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickAction} onPress={() => router.push("/saved-addresses")} activeOpacity={0.88}>
                <LinearGradient colors={[theme.medium, theme.accent]} style={styles.quickActionIcon}>
                  <Ionicons name="location-outline" size={18} color="#FFFFFF" />
                </LinearGradient>
                <Text style={styles.quickActionText}>Addresses</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickAction} onPress={() => router.push("/order-history")} activeOpacity={0.88}>
                <LinearGradient colors={[theme.medium, theme.accent]} style={styles.quickActionIcon}>
                  <Ionicons name="time-outline" size={18} color="#FFFFFF" />
                </LinearGradient>
                <Text style={styles.quickActionText}>History</Text>
              </TouchableOpacity>
            </View>

            <SectionCard icon="settings-outline" title="Account & info" subtitle="Profile, security and orders">
              {ACCOUNT_MENU.map((item, idx) => (
                <View key={item.id}>
                  <MenuRow
                    item={item}
                    onPress={() => handleAccountMenu(item)}
                    showEdit={item.action === "personal" || item.action === "password" || item.id === "addresses"}
                  />
                  {idx < ACCOUNT_MENU.length - 1 ? <View style={styles.menuDivider} /> : null}
                </View>
              ))}
            </SectionCard>

            <SectionCard icon="information-circle-outline" title="Support & info" subtitle="Tickets, help and legal">
              {SUPPORT_MENU.map((item, idx) => (
                <View key={item.id}>
                  <MenuRow item={item} onPress={() => handleSupportMenu(item)} />
                  {idx < SUPPORT_MENU.length - 1 ? <View style={styles.menuDivider} /> : null}
                </View>
              ))}
            </SectionCard>

            {isAuthenticated ? (
              <TouchableOpacity style={styles.logoutBtnWrap} onPress={handleLogout} activeOpacity={0.9}>
                <View style={styles.logoutBtn}>
                  <Ionicons name="log-out-outline" size={18} color="#DC2626" />
                  <Text style={styles.logoutText}>Log out</Text>
                </View>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.loginBtnWrap} onPress={() => router.push("/login")} activeOpacity={0.9}>
                <LinearGradient colors={[theme.medium, theme.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.loginBtn}>
                  <Ionicons name="log-in-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.loginText}>Login to your account</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </View>

      <ProfileSheet
        visible={showPersonalModal}
        title="Personal information"
        subtitle="Update your profile details"
        icon="person-outline"
        onClose={() => setShowPersonalModal(false)}
        footer={
          <View style={styles.sheetActionBar}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowPersonalModal(false)} activeOpacity={0.85} disabled={saving}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.saveBtnWrap, saving && styles.saveBtnDisabled]} onPress={handleSavePersonal} disabled={saving} activeOpacity={0.9}>
              <LinearGradient colors={saving ? ["#EEF3F7", "#E8EEF2"] : [theme.medium, theme.accent]} style={styles.saveBtn}>
                {saving ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.saveBtnText}>Save changes</Text>}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        }
      >
        <ModernInput label="Full name" icon="person-outline" value={editName} onChangeText={setEditName} placeholder="Your name" />
        <ModernInput label="Email" icon="mail-outline" value={editEmail} onChangeText={setEditEmail} placeholder="you@email.com" keyboardType="email-address" autoCapitalize="none" />
        <ModernInput label="Phone" icon="call-outline" value={editPhone} onChangeText={setEditPhone} placeholder="Phone number" keyboardType="phone-pad" />
        <ModernInput label="Address note" icon="home-outline" value={editAddress} onChangeText={setEditAddress} placeholder="Optional address note" />
        {saveError ? (
          <View style={styles.errBanner}>
            <Ionicons name="alert-circle-outline" size={18} color="#DC2626" />
            <Text style={styles.errText}>{saveError}</Text>
          </View>
        ) : null}
      </ProfileSheet>

      <ProfileSheet
        visible={showChangePasswordModal}
        title="Change password"
        subtitle="Keep your account secure"
        icon="lock-closed-outline"
        onClose={() => setShowChangePasswordModal(false)}
        footer={
          <View style={styles.sheetActionBar}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowChangePasswordModal(false)} activeOpacity={0.85}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtnWrap} onPress={handleSavePassword} activeOpacity={0.9}>
              <LinearGradient colors={[theme.medium, theme.accent]} style={styles.saveBtn}>
                <Text style={styles.saveBtnText}>Update password</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        }
      >
        <ModernInput label="Current password" icon="lock-closed-outline" value={currentPassword} onChangeText={setCurrentPassword} placeholder="Enter current password" secureTextEntry />
        <ModernInput label="New password" icon="key-outline" value={newPassword} onChangeText={setNewPassword} placeholder="Enter new password" secureTextEntry />
        <ModernInput label="Confirm new password" icon="checkmark-circle-outline" value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Confirm new password" secureTextEntry />
        <View style={styles.formSecureNote}>
          <Ionicons name="shield-checkmark-outline" size={18} color={theme.accent} />
          <Text style={styles.formSecureText}>Use at least 8 characters with letters and numbers for a strong password.</Text>
        </View>
      </ProfileSheet>
    </SafeAreaView>
  );
};

export default ProfileScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.screenBackground },
  pageBody: { flex: 1 },
  headerSection: { flexShrink: 0, overflow: "hidden" },
  gradientBackground: { paddingHorizontal: 20, paddingBottom: 32 },
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
  headerSpacer: { width: 40, height: 40 },
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

  profileHeroWrap: { borderRadius: 20, overflow: "hidden", marginBottom: 16 },
  profileHero: { padding: 18 },
  profileHeroTop: { flexDirection: "row", alignItems: "center", gap: 14 },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
  },
  avatarInitials: { fontSize: 22, fontWeight: "800", color: "#FFFFFF" },
  profileHeroInfo: { flex: 1, minWidth: 0 },
  userName: { fontSize: 20, fontWeight: "800", color: "#FFFFFF", letterSpacing: -0.3 },
  userEmail: { fontSize: 13, color: "rgba(255,255,255,0.9)", marginTop: 4 },
  userIdText: { fontSize: 12, color: "rgba(255,255,255,0.78)", marginTop: 4 },
  profileEditBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  memberBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    marginTop: 14,
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
  },
  memberBadgeText: { fontSize: 12, fontWeight: "700", color: "#FFFFFF" },

  statsRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  statCardWrap: { flex: 1 },
  statCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(214,234,242,0.95)",
    overflow: "hidden",
    ...Platform.select({
      ios: { shadowColor: "#0B3A4A", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 4 },
      android: { elevation: 0 },
    }),
  },
  statCardWallet: { backgroundColor: "rgba(5,150,105,0.06)", borderColor: "rgba(5,150,105,0.15)" },
  statIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "rgba(51,175,193,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  statIconWallet: { backgroundColor: "rgba(5,150,105,0.12)" },
  statValue: { fontSize: 18, fontWeight: "800", color: theme.accent },
  statValueWallet: { color: "#059669" },
  statLabel: { fontSize: 11, fontWeight: "600", color: theme.textMuted, marginTop: 2, textTransform: "uppercase", letterSpacing: 0.3 },

  quickActionsRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  quickAction: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(214,234,242,0.95)",
  },
  quickActionIcon: { width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  quickActionText: { fontSize: 12, fontWeight: "700", color: theme.textPrimary },

  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(214,234,242,0.95)",
    overflow: "hidden",
    ...Platform.select({
      ios: { shadowColor: "#0B3A4A", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 6 },
      android: { elevation: 0 },
    }),
  },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8 },
  sectionIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  sectionHeaderText: { flex: 1 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: theme.textPrimary },
  sectionSubtitle: { fontSize: 12, color: theme.textMuted, marginTop: 2 },

  menuRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, gap: 12 },
  menuIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(51,175,193,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  menuTextWrap: { flex: 1, minWidth: 0 },
  menuLabel: { fontSize: 15, fontWeight: "700", color: theme.textPrimary },
  menuDesc: { fontSize: 12, color: theme.textMuted, marginTop: 2 },
  menuEdit: { fontSize: 12, fontWeight: "600", color: theme.link, marginRight: 4 },
  menuDivider: { height: 1, backgroundColor: "rgba(214,234,242,0.95)", marginLeft: 52 },

  logoutBtnWrap: { marginTop: 4, marginBottom: 8 },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: "rgba(220,38,38,0.06)",
    borderWidth: 1.5,
    borderColor: "rgba(220,38,38,0.15)",
  },
  logoutText: { fontSize: 16, fontWeight: "700", color: "#DC2626" },
  loginBtnWrap: { marginTop: 4, marginBottom: 8, borderRadius: 16, overflow: "hidden" },
  loginBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    minHeight: 54,
  },
  loginText: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },

  sheetOverlay: { flex: 1, justifyContent: "flex-end" },
  sheetBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.5)" },
  sheetPanel: {
    backgroundColor: theme.contentPanelBackground,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "88%",
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
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  sheetHeroTitle: { fontSize: 20, fontWeight: "800", color: "#FFFFFF" },
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
  sheetScrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16 },

  sheetActionBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 28 : 18,
    backgroundColor: theme.contentPanelBackground,
    borderTopWidth: 1,
    borderTopColor: "rgba(214,234,242,0.95)",
  },
  cancelBtn: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "rgba(214,234,242,0.95)",
  },
  cancelBtnText: { fontSize: 15, fontWeight: "700", color: theme.textMuted },
  saveBtnWrap: { flex: 1, borderRadius: 14, overflow: "hidden" },
  saveBtnDisabled: { opacity: 0.95 },
  saveBtn: { alignItems: "center", justifyContent: "center", paddingVertical: 14, minHeight: 50 },
  saveBtnText: { fontSize: 15, fontWeight: "700", color: "#FFFFFF" },

  errBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(220,38,38,0.08)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(220,38,38,0.15)",
  },
  errText: { flex: 1, fontSize: 13, color: "#DC2626", fontWeight: "600" },
  formSecureNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "rgba(51,175,193,0.08)",
    borderRadius: 14,
    padding: 12,
    marginTop: 4,
    borderWidth: 1,
    borderColor: "rgba(51,175,193,0.12)",
  },
  formSecureText: { flex: 1, fontSize: 12, color: theme.textMuted, lineHeight: 17 },
});
