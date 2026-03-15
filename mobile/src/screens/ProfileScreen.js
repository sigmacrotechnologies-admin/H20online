import React, { useState } from "react";
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
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/src/context/AuthContext";
import { useCart } from "@/src/context/CartContext";
import { api } from "@/src/api/client";
import BackButton from "@/src/components/BackButton";

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

  // Sync edit fields when user loads or when opening modal
  React.useEffect(() => {
    if (user) {
      setEditName(user.name || "");
      setEditEmail(user.email || "");
      setEditPhone(user.phone || "");
    }
  }, [user]);

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
        {/* Header */}
        <View style={styles.header}>
          <BackButton onPress={() => router.back()} iconColor="#1B2B34" style={styles.headerBackButton} />
          <Text style={styles.headerTitle}>Profile</Text>
          <TouchableOpacity style={styles.settingsButton} activeOpacity={0.7}>
            <Ionicons name="settings-outline" size={24} color="#1B2B34" />
          </TouchableOpacity>
        </View>

        {/* User info card */}
        <View style={styles.card}>
          <View style={styles.userCardRow}>
            <View style={styles.avatarWrap}>
              <View style={styles.avatarCircle}>
                <Ionicons name="person" size={40} color="#0EA5E9" />
              </View>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{user?.name || "Guest"}</Text>
              <Text style={styles.userEmail}>{user?.email || "Login to sync"}</Text>
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
              <Ionicons name="pencil" size={20} color="#0EA5E9" />
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
            <Text style={styles.statValue}>₹45</Text>
            <Text style={styles.statLabel}>Saved</Text>
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
          <TouchableOpacity style={styles.menuRow} activeOpacity={0.7}>
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
  container: { flex: 1, backgroundColor: "#c6e2fa" },
  scrollContent: { paddingBottom: 40, paddingHorizontal: 20, marginLeft: 11, marginRight: 11 },
  header: { flexDirection: "row", alignItems: "center", marginTop: 14, marginBottom: 20, paddingHorizontal: 8 },
  headerBackButton: { backgroundColor: "#f0f7fcd7", marginRight: 12, elevation: 2 },
  headerTitle: { flex: 1, fontSize: 26, fontWeight: "700", color: "#1B2B34", marginLeft: 0 },
  settingsButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#f0f7fcd7", justifyContent: "center", alignItems: "center", elevation: 2 },

  card: { backgroundColor: "#f0f7fcd7", borderRadius: 20, padding: 20, marginBottom: 16, elevation: 2 },
  userCardRow: { flexDirection: "row", alignItems: "center" },
  avatarWrap: { marginRight: 16 },
  avatarCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: "#E0F2FE", justifyContent: "center", alignItems: "center" },
  userInfo: { flex: 1 },
  userName: { fontSize: 18, fontWeight: "700", color: "#1B2B34", marginBottom: 4 },
  userEmail: { fontSize: 14, color: "#6B7C85", marginBottom: 8 },
  premiumBadge: { alignSelf: "flex-start", backgroundColor: "#14B8A6", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  premiumBadgeText: { fontSize: 12, fontWeight: "600", color: "#FFFFFF" },
  editIconWrap: { padding: 8 },

  statsRow: { flexDirection: "row", gap: 12, marginBottom: 24 },
  statCard: { flex: 1, backgroundColor: "#f0f7fcd7", borderRadius: 20, padding: 16, elevation: 2 },
  statValue: { fontSize: 22, fontWeight: "700", color: "#0EA5E9", marginBottom: 4 },
  statLabel: { fontSize: 13, color: "#6B7C85" },

  sectionTitle: { fontSize: 15, fontWeight: "600", color: "#6B7C85", marginBottom: 10 },
  menuRow: { flexDirection: "row", alignItems: "center", paddingVertical: 14 },
  menuIconCircleBlue: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#0EA5E9", justifyContent: "center", alignItems: "center", marginRight: 14 },
  menuIconCirclePurple: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#8B5CF6", justifyContent: "center", alignItems: "center", marginRight: 14 },
  menuLabel: { flex: 1, fontSize: 16, fontWeight: "600", color: "#1B2B34" },
  menuEdit: { fontSize: 14, color: "#0EA5E9", marginRight: 8 },
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
  modalSaveButton: { backgroundColor: "#1EA7FD", paddingVertical: 16, borderRadius: 20, alignItems: "center", marginTop: 8 },
  modalSaveButtonDisabled: { opacity: 0.7 },
  modalSaveText: { fontSize: 16, fontWeight: "600", color: "#FFFFFF" },
  saveErrorText: { fontSize: 14, color: "#DC2626", marginTop: 8, marginBottom: 4 },
});
