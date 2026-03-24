import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Modal,
  TextInput,
  Image,
  Platform,
  StatusBar,
  Animated,
  Easing,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Path } from "react-native-svg";
import { useAuth } from "@/src/context/AuthContext";
import { useCart } from "@/src/context/CartContext";
import { api } from "@/src/api/client";
import BackButton from "@/src/components/BackButton";
import { theme } from "@/src/theme";

const HEADER_DROPLETS = [
  { left: -12, top: 20, width: 18, height: 24, phase: "a" },
  { left: 14, top: 62, width: 16, height: 22, phase: "b" },
  { left: 52, top: 28, width: 20, height: 28, phase: "c" },
  { left: 88, top: 94, width: 14, height: 20, phase: "a" },
  { right: 110, top: 8, width: 16, height: 22, phase: "a" },
  { right: 76, top: 66, width: 18, height: 24, phase: "b" },
  { right: 42, top: 30, width: 22, height: 30, phase: "c" },
  { right: 8, top: 98, width: 16, height: 22, phase: "a" },
];

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
  const dropletAnimA = useRef(new Animated.Value(0)).current;
  const dropletAnimB = useRef(new Animated.Value(0)).current;
  const dropletAnimC = useRef(new Animated.Value(0)).current;
  const androidTopInset = Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;

  // Sync edit fields when user loads or when opening modal
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

  React.useEffect(() => {
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

  const fetchWalletBalance = React.useCallback(async () => {
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
    React.useCallback(() => {
      fetchWalletBalance();
      const interval = setInterval(fetchWalletBalance, 60 * 1000);
      return () => clearInterval(interval);
    }, [fetchWalletBalance])
  );

  const handleLogout = () => {
    logout();
    router.replace("/(tabs)");
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.headerSection}>
          <LinearGradient colors={theme.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.gradientBackground, { paddingTop: 20 + androidTopInset }]}>
            <View style={styles.headerOverlay}>
              {HEADER_DROPLETS.map((drop, idx) => {
                const dropAnim = getDropletAnim(drop.phase);
                return (
                  <Animated.View
                    key={`profile-drop-${idx}`}
                    style={[styles.dropletWrap, {
                      left: drop.left, right: drop.right, top: drop.top, width: drop.width, height: drop.height,
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
              <View style={styles.headerTopSpacer} />
            </View>
            <View style={styles.headerCenter}>
              <View style={styles.headerInfoRow}>
                <View style={styles.headerIconCircle}>
                  <Ionicons name="person-outline" size={24} color="#FFFFFF" />
                </View>
                <View style={styles.headerTextWrap}>
                  <Text style={styles.headerTitle}>Account Settings</Text>
                  <Text style={styles.headerSubtitle}>{(user?.name || "User")}, you can manage your personal information here</Text>
                </View>
              </View>
            </View>
          </LinearGradient>
        </View>

        <View style={styles.contentSection}>
        {/* User info card */}
        <View style={styles.card}>
          <View style={styles.userCardRow}>
            <View style={styles.avatarWrap}>
              <View style={styles.avatarCircle}>
                <Ionicons name="person" size={40} color={theme.primary} />
              </View>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{user?.name || "Guest"}</Text>
              <Text style={styles.userEmail}>{user?.email || "Login to sync"}</Text>
              {user?.userCode ? (
                <Text style={styles.userIdText}>ID: {user.userCode}</Text>
              ) : null}
              <View style={styles.premiumBadge}>
                <Text style={styles.premiumBadgeText}>Premium Member</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.editIconWrap}
              onPress={() => {
                setEditName(user?.name || "");
                setEditEmail(user?.email || "");
                setEditPhone(user?.phone || "");
                setSaveError("");
                setShowPersonalModal(true);
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="pencil" size={20} color={theme.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats row - Orders from backend */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{orders.length}</Text>
            <Text style={styles.statLabel}>Orders</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>1,250</Text>
            <Text style={styles.statLabel}>Points</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>₹{Number(walletBalance || 0).toLocaleString()}</Text>
            <Text style={styles.statLabel}>Wallet</Text>
          </View>
        </View>

        {/* Account & Info */}
        <Text style={styles.sectionTitle}>Account & Info</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => {
              setEditName(user?.name || "");
              setEditEmail(user?.email || "");
              setEditPhone(user?.phone || "");
              setSaveError("");
              setShowPersonalModal(true);
            }}
            activeOpacity={0.7}
          >
            <View style={styles.menuIconCircleBlue}>
              <Ionicons name="person-outline" size={22} color="#FFFFFF" />
            </View>
            <Text style={styles.menuLabel}>Personal Information</Text>
            <Text style={styles.menuEdit}>Edit</Text>
            <Ionicons name="chevron-forward" size={20} color="#6B7C85" />
          </TouchableOpacity>
          <View style={styles.menuDivider} />
          <TouchableOpacity style={styles.menuRow} onPress={() => router.push("/saved-addresses")} activeOpacity={0.7}>
            <View style={styles.menuIconCircleBlue}>
              <Ionicons name="location-outline" size={22} color="#FFFFFF" />
            </View>
            <Text style={styles.menuLabel}>Saved Addresses</Text>
            <Text style={styles.menuEdit}>Edit</Text>
            <Ionicons name="chevron-forward" size={20} color="#6B7C85" />
          </TouchableOpacity>
          <View style={styles.menuDivider} />
          <TouchableOpacity style={styles.menuRow} activeOpacity={0.7}>
            <View style={styles.menuIconCircleBlue}>
              <Ionicons name="card-outline" size={22} color="#FFFFFF" />
            </View>
            <Text style={styles.menuLabel}>Payment Methods</Text>
            <Text style={styles.menuEdit}>Edit</Text>
            <Ionicons name="chevron-forward" size={20} color="#6B7C85" />
          </TouchableOpacity>
          <View style={styles.menuDivider} />
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => setShowChangePasswordModal(true)}
            activeOpacity={0.7}
          >
            <View style={styles.menuIconCircleBlue}>
              <Ionicons name="lock-closed-outline" size={22} color="#FFFFFF" />
            </View>
            <Text style={styles.menuLabel}>Change Password</Text>
            <Text style={styles.menuEdit}>Edit</Text>
            <Ionicons name="chevron-forward" size={20} color="#6B7C85" />
          </TouchableOpacity>
          <View style={styles.menuDivider} />
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => router.push("/order-history")}
            activeOpacity={0.7}
          >
            <View style={styles.menuIconCircleBlue}>
              <Ionicons name="receipt-outline" size={22} color="#FFFFFF" />
            </View>
            <Text style={styles.menuLabel}>Order History</Text>
            <Ionicons name="chevron-forward" size={20} color="#6B7C85" />
          </TouchableOpacity>
        </View>

        {/* Support & Info */}
        <Text style={styles.sectionTitle}>Support & Info</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.menuRow} activeOpacity={0.7}>
            <View style={styles.menuIconCirclePurple}>
              <Ionicons name="help-circle-outline" size={22} color="#FFFFFF" />
            </View>
            <Text style={styles.menuLabel}>Help Center</Text>
            <Ionicons name="chevron-forward" size={20} color="#6B7C85" />
          </TouchableOpacity>
          <View style={styles.menuDivider} />
          <TouchableOpacity style={styles.menuRow} activeOpacity={0.7}>
            <View style={styles.menuIconCirclePurple}>
              <Ionicons name="shield-checkmark-outline" size={22} color="#FFFFFF" />
            </View>
            <Text style={styles.menuLabel}>Privacy Policy</Text>
            <Ionicons name="chevron-forward" size={20} color="#6B7C85" />
          </TouchableOpacity>
        </View>

        {isAuthenticated ? (
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.logoutButton} onPress={() => router.push("/login")} activeOpacity={0.8}>
            <Text style={styles.logoutText}>Login</Text>
          </TouchableOpacity>
        )}
        </View>
      </ScrollView>

      {/* Personal Information popup */}
      <Modal visible={showPersonalModal} transparent animationType="slide">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowPersonalModal(false)}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Personal Information</Text>
              <TouchableOpacity onPress={() => setShowPersonalModal(false)}>
                <Ionicons name="close" size={24} color="#1B2B34" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalField}>
              <Text style={styles.modalFieldLabel}>Full Name</Text>
              <TextInput
                style={styles.modalInput}
                value={editName}
                onChangeText={setEditName}
                placeholderTextColor="#9CA3AF"
              />
            </View>
            <View style={styles.modalField}>
              <Text style={styles.modalFieldLabel}>Email</Text>
              <TextInput
                style={styles.modalInput}
                value={editEmail}
                onChangeText={setEditEmail}
                placeholderTextColor="#9CA3AF"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            <View style={styles.modalField}>
              <Text style={styles.modalFieldLabel}>Phone</Text>
              <TextInput
                style={styles.modalInput}
                value={editPhone}
                onChangeText={setEditPhone}
                placeholderTextColor="#9CA3AF"
                keyboardType="phone-pad"
              />
            </View>
            <View style={styles.modalField}>
              <Text style={styles.modalFieldLabel}>Address</Text>
              <TextInput
                style={styles.modalInput}
                value={editAddress}
                onChangeText={setEditAddress}
                placeholderTextColor="#9CA3AF"
              />
            </View>
            {saveError ? <Text style={styles.saveErrorText}>{saveError}</Text> : null}
            <TouchableOpacity style={[styles.modalSaveButton, saving && styles.modalSaveButtonDisabled]} onPress={handleSavePersonal} activeOpacity={0.8} disabled={saving}>
              <Text style={styles.modalSaveText}>{saving ? "Saving…" : "Save"}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Change Password popup */}
      <Modal visible={showChangePasswordModal} transparent animationType="slide">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowChangePasswordModal(false)}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Password</Text>
              <TouchableOpacity onPress={() => setShowChangePasswordModal(false)}>
                <Ionicons name="close" size={24} color="#1B2B34" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalField}>
              <Text style={styles.modalFieldLabel}>Current Password</Text>
              <TextInput
                style={styles.modalInput}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Enter current password"
                placeholderTextColor="#9CA3AF"
                secureTextEntry
              />
            </View>
            <View style={styles.modalField}>
              <Text style={styles.modalFieldLabel}>New Password</Text>
              <TextInput
                style={styles.modalInput}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Enter new password"
                placeholderTextColor="#9CA3AF"
                secureTextEntry
              />
            </View>
            <View style={styles.modalField}>
              <Text style={styles.modalFieldLabel}>Confirm New Password</Text>
              <TextInput
                style={styles.modalInput}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm new password"
                placeholderTextColor="#9CA3AF"
                secureTextEntry
              />
            </View>
            <TouchableOpacity style={styles.modalSaveButton} onPress={handleSavePassword} activeOpacity={0.8}>
              <Text style={styles.modalSaveText}>Update Password</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

export default ProfileScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.screenBackground },
  scrollContent: { paddingBottom: 40 },
  headerSection: { minHeight: 236, overflow: "hidden", marginBottom: -6 },
  gradientBackground: { flex: 1, paddingHorizontal: 20, paddingBottom: 34 },
  headerOverlay: { ...StyleSheet.absoluteFillObject },
  dropletWrap: { position: "absolute", alignItems: "center", justifyContent: "center" },
  headerTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 30 },
  headerLogoLight: { width: 124, height: 34, marginLeft: 0 },
  headerTopSpacer: { width: 40, height: 40 },
  headerCenter: { alignItems: "flex-start", justifyContent: "center", marginTop: 2, width: "100%" },
  headerInfoRow: { flexDirection: "row", alignItems: "center" },
  headerTextWrap: { flex: 1, marginLeft: 12 },
  headerIconCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: "rgba(255,255,255,0.25)", justifyContent: "center", alignItems: "center", marginBottom: 2 },
  headerTitle: { fontSize: 17, fontWeight: "700", color: "#FFFFFF" },
  headerSubtitle: { fontSize: 13, color: "rgba(255,255,255,0.95)", marginTop: 2, maxWidth: "95%" },
  contentSection: { marginTop: -22, backgroundColor: theme.screenBackground, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 24, paddingHorizontal: 20 },

  card: { backgroundColor: "rgba(255,255,255,0.78)", borderRadius: 20, padding: 20, marginBottom: 16, elevation: 0, borderWidth: 1, borderColor: "rgba(255,255,255,0.85)" },
  userCardRow: { flexDirection: "row", alignItems: "center" },
  avatarWrap: { marginRight: 16 },
  avatarCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: "#E0F2FE", justifyContent: "center", alignItems: "center" },
  userInfo: { flex: 1 },
  userName: { fontSize: 18, fontWeight: "700", color: "#1B2B34", marginBottom: 4 },
  userEmail: { fontSize: 14, color: "#6B7C85", marginBottom: 4 },
  userIdText: { fontSize: 13, color: "#6B7C85", marginBottom: 8 },
  premiumBadge: { alignSelf: "flex-start", backgroundColor: "#14B8A6", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  premiumBadgeText: { fontSize: 12, fontWeight: "600", color: "#FFFFFF" },
  editIconWrap: { padding: 8 },

  statsRow: { flexDirection: "row", gap: 12, marginBottom: 24 },
  statCard: { flex: 1, backgroundColor: "rgba(255,255,255,0.78)", borderRadius: 20, padding: 16, elevation: 0, borderWidth: 1, borderColor: "rgba(255,255,255,0.85)" },
  statValue: { fontSize: 22, fontWeight: "700", color: theme.primary, marginBottom: 4 },
  statLabel: { fontSize: 13, color: "#6B7C85" },

  sectionTitle: { fontSize: 15, fontWeight: "600", color: "#6B7C85", marginBottom: 10 },
  menuRow: { flexDirection: "row", alignItems: "center", paddingVertical: 14 },
  menuIconCircleBlue: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.primary, justifyContent: "center", alignItems: "center", marginRight: 14 },
  menuIconCirclePurple: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#8B5CF6", justifyContent: "center", alignItems: "center", marginRight: 14 },
  menuLabel: { flex: 1, fontSize: 16, fontWeight: "600", color: "#1B2B34" },
  menuEdit: { fontSize: 14, color: theme.primary, marginRight: 8 },
  menuDivider: { height: 1, backgroundColor: "#E5E7EB", marginLeft: 54 },

  logoutButton: { backgroundColor: "#F87171", paddingVertical: 16, borderRadius: 20, alignItems: "center", marginTop: 8, elevation: 2 },
  logoutText: { fontSize: 16, fontWeight: "600", color: "#FFFFFF" },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#FFFFFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: "85%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: "700", color: "#1B2B34" },
  modalField: { marginBottom: 16 },
  modalFieldLabel: { fontSize: 14, fontWeight: "600", color: "#1B2B34", marginBottom: 8 },
  modalInput: { backgroundColor: "#f0f7fcd7", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: "#1B2B34", borderWidth: 1, borderColor: "rgba(255,255,255,0.8)" },
  modalSaveButton: { backgroundColor: theme.primary, paddingVertical: 16, borderRadius: 20, alignItems: "center", marginTop: 8 },
  modalSaveButtonDisabled: { opacity: 0.7 },
  modalSaveText: { fontSize: 16, fontWeight: "600", color: "#FFFFFF" },
  saveErrorText: { fontSize: 14, color: "#DC2626", marginTop: 8, marginBottom: 4 },
});
