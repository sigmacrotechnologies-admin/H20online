import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  Modal,
  Image,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/src/context/AuthContext";
import { resolveHomeRoute } from "@/src/utils/authRouting";
import {
  ModernScreenShell,
  ModernInput,
  ModernPrimaryButton,
  modern,
} from "@/src/components/modern";
import { theme } from "@/src/theme";

let ImagePicker;
try {
  ImagePicker = require("expo-image-picker");
} catch (_) {
  // expo-image-picker not installed
}

const plans = [
  { id: 1, name: "Basic Plan" },
  { id: 2, name: "Family Pack" },
  { id: 3, name: "Active Plan" },
  { id: 4, name: "Premium Plan" },
];

const activityLevels = [
  { level: "low", icon: "bed-outline", label: "Low" },
  { level: "moderate", icon: "walk-outline", label: "Moderate" },
  { level: "high", icon: "fitness-outline", label: "High" },
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

function PasswordField({ label, value, onChangeText, placeholder, show, onToggleShow, onSubmitEditing }) {
  return (
    <View style={modern.inputSection}>
      <Text style={modern.label}>{label}</Text>
      <View style={styles.passwordRow}>
        <Ionicons name="lock-closed-outline" size={20} color="#6B7C85" style={modern.inputIcon} />
        <TextInput
          style={styles.passwordInput}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          secureTextEntry={!show}
          autoCapitalize="none"
          returnKeyType="done"
          blurOnSubmit
          onSubmitEditing={onSubmitEditing}
        />
        <TouchableOpacity style={styles.eyeBtn} onPress={onToggleShow} activeOpacity={0.7}>
          <Ionicons name={show ? "eye-off-outline" : "eye-outline"} size={20} color={theme.textMuted} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const CreateProfileScreen = () => {
  const router = useRouter();
  const { register } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("male");
  const [activityLevel, setActivityLevel] = useState("moderate");
  const [familyMembers, setFamilyMembers] = useState(1);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [registerWithPlan, setRegisterWithPlan] = useState(false);
  const [showPlanDropdown, setShowPlanDropdown] = useState(false);
  const [connectDevice, setConnectDevice] = useState(false);
  const [avatarUri, setAvatarUri] = useState(null);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const pickImage = async () => {
    if (!ImagePicker) return;
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") return;
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });
      if (!result.canceled) {
        setAvatarUri(result.assets[0].uri);
        setShowAvatarPicker(false);
      }
    } catch (_) {}
  };

  const takePhoto = async () => {
    if (!ImagePicker) return;
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") return;
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });
      if (!result.canceled) {
        setAvatarUri(result.assets[0].uri);
        setShowAvatarPicker(false);
      }
    } catch (_) {}
  };

  const handleContinue = async () => {
    setError("");
    const name = fullName.trim();
    const emailTrim = email.trim();
    const phoneTrim = phone.trim();
    const pwd = password.trim();
    if (!name) {
      setError("Please enter your full name");
      return;
    }
    if (!emailTrim) {
      setError("Please enter your email");
      return;
    }
    if (!phoneTrim) {
      setError("Please enter your phone number");
      return;
    }
    if (!pwd) {
      setError("Please enter a password");
      return;
    }
    if (pwd.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (pwd !== confirmPassword.trim()) {
      setError("Passwords do not match");
      return;
    }
    const planOk = !registerWithPlan || selectedPlan !== null;
    if (!planOk) {
      setError("Please select a plan");
      return;
    }
    setLoading(true);
    try {
      const safeAvatar =
        avatarUri && /^https?:\/\//i.test(String(avatarUri)) ? avatarUri : undefined;
      const registeredUser = await register({
        name,
        email: emailTrim,
        phone: phoneTrim,
        password: pwd,
        age: age.trim() ? parseInt(age, 10) : undefined,
        gender: gender || undefined,
        activityLevel: activityLevel || undefined,
        familyMembers: familyMembers ?? undefined,
        avatarUrl: safeAvatar,
      });
      router.replace(await resolveHomeRoute(registeredUser));
    } catch (err) {
      setError(err.message || "Sign up failed. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const missingSignupFields = [];
  if (!fullName.trim()) missingSignupFields.push("full name");
  if (!email.trim()) missingSignupFields.push("email");
  if (!phone.trim()) missingSignupFields.push("phone");
  if (password.trim().length < 6) missingSignupFields.push("password (6+ characters)");
  if (password.trim() && password.trim() !== confirmPassword.trim()) missingSignupFields.push("matching passwords");
  if (registerWithPlan && !selectedPlan) missingSignupFields.push("subscription plan");

  return (
    <ModernScreenShell
      title="Create your profile"
      subtitle="Join H2Online for personalized hydration"
      icon="person-add-outline"
      headerHeight={200}
    >
      <View style={styles.avatarCard}>
        <TouchableOpacity style={styles.avatarButton} onPress={() => setShowAvatarPicker(true)} activeOpacity={0.88}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
          ) : (
            <LinearGradient colors={[theme.medium, theme.accent]} style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={42} color="#FFFFFF" />
            </LinearGradient>
          )}
          <View style={styles.cameraBadge}>
            <Ionicons name="camera" size={14} color="#FFFFFF" />
          </View>
        </TouchableOpacity>
        <Text style={styles.avatarHint}>Add a profile photo</Text>
        <Text style={styles.avatarSubhint}>Optional — helps personalize your experience</Text>
      </View>

      <SectionCard icon="id-card-outline" title="Account details" subtitle="Your login credentials">
        <ModernInput label="Full name" icon="person-outline" value={fullName} onChangeText={setFullName} placeholder="Your full name" />
        <ModernInput
          label="Email address"
          icon="mail-outline"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <ModernInput
          label="Phone number"
          icon="call-outline"
          value={phone}
          onChangeText={setPhone}
          placeholder="Your mobile number"
          keyboardType="phone-pad"
        />
        <PasswordField
          label="Password (min 6 characters)"
          value={password}
          onChangeText={setPassword}
          placeholder="Create a password"
          show={showPassword}
          onToggleShow={() => setShowPassword((v) => !v)}
        />
        <PasswordField
          label="Confirm password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Re-enter password"
          show={showConfirmPassword}
          onToggleShow={() => setShowConfirmPassword((v) => !v)}
          onSubmitEditing={handleContinue}
        />
      </SectionCard>

      <SectionCard icon="fitness-outline" title="About you" subtitle="For hydration goal estimates">
        <View style={styles.row}>
          <View style={[styles.halfWidth, styles.halfWidthLeft]}>
            <ModernInput label="Age" icon="calendar-outline" value={age} onChangeText={setAge} keyboardType="numeric" placeholder="Years" />
          </View>
          <View style={styles.halfWidth}>
            <Text style={modern.label}>Gender</Text>
            <View style={styles.genderRow}>
              {[
                { key: "male", icon: "man", outline: "man-outline" },
                { key: "female", icon: "woman", outline: "woman-outline" },
              ].map((item) => (
                <TouchableOpacity key={item.key} style={styles.genderBtn} onPress={() => setGender(item.key)} activeOpacity={0.85}>
                  {gender === item.key ? (
                    <LinearGradient colors={[theme.medium, theme.accent]} style={styles.genderBtnInner}>
                      <Ionicons name={item.icon} size={22} color="#FFFFFF" />
                    </LinearGradient>
                  ) : (
                    <View style={styles.genderBtnUnselected}>
                      <Ionicons name={item.outline} size={22} color={theme.textMuted} />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <Text style={[modern.label, { marginTop: 4 }]}>Activity level</Text>
        <View style={styles.activityRow}>
          {activityLevels.map((item) => {
            const selected = activityLevel === item.level;
            return (
              <TouchableOpacity key={item.level} style={styles.activityBtn} onPress={() => setActivityLevel(item.level)} activeOpacity={0.85}>
                {selected ? (
                  <LinearGradient colors={[theme.medium, theme.accent]} style={styles.activityBtnInner}>
                    <Ionicons name={item.icon} size={22} color="#FFFFFF" />
                    <Text style={styles.activityTextSelected}>{item.label}</Text>
                  </LinearGradient>
                ) : (
                  <View style={styles.activityBtnUnselected}>
                    <Ionicons name={item.icon} size={22} color={theme.textMuted} />
                    <Text style={styles.activityText}>{item.label}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </SectionCard>

      <SectionCard icon="card-outline" title="Subscription" subtitle="Optional at signup">
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Register with a plan</Text>
          <Switch value={registerWithPlan} onValueChange={setRegisterWithPlan} trackColor={{ false: "#D1D5DB", true: theme.primary }} thumbColor="#FFFFFF" />
        </View>
        {registerWithPlan ? (
          <TouchableOpacity style={styles.dropdownBtn} onPress={() => setShowPlanDropdown(true)} activeOpacity={0.85}>
            <Ionicons name="layers-outline" size={20} color={theme.textMuted} />
            <Text style={[styles.dropdownText, !selectedPlan && styles.dropdownPlaceholder]}>
              {selectedPlan ? selectedPlan.name : "Select a plan"}
            </Text>
            <Ionicons name="chevron-down" size={18} color={theme.textMuted} />
          </TouchableOpacity>
        ) : (
          <Text style={styles.planLater}>You can choose a plan later from your dashboard.</Text>
        )}
      </SectionCard>

      <SectionCard icon="people-outline" title="Household" subtitle="Used for delivery estimates">
        <View style={styles.stepper}>
          <TouchableOpacity style={styles.stepperBtn} onPress={() => familyMembers > 0 && setFamilyMembers(familyMembers - 1)} activeOpacity={0.7}>
            <Ionicons name="remove" size={20} color={theme.accent} />
          </TouchableOpacity>
          <View style={styles.stepperValueWrap}>
            <Text style={styles.stepperValue}>{familyMembers}</Text>
            <Text style={styles.stepperLabel}>family members</Text>
          </View>
          <TouchableOpacity style={styles.stepperBtn} onPress={() => setFamilyMembers(familyMembers + 1)} activeOpacity={0.7}>
            <Ionicons name="add" size={20} color={theme.accent} />
          </TouchableOpacity>
        </View>
      </SectionCard>

      <View style={styles.deviceCard}>
        <LinearGradient colors={["#A855F7", "#7C3AED"]} style={styles.deviceIcon}>
          <Ionicons name="watch-outline" size={22} color="#FFFFFF" />
        </LinearGradient>
        <View style={styles.deviceText}>
          <Text style={styles.deviceTitle}>Connect device</Text>
          <Text style={styles.deviceSubtitle}>Smart watch or smart bottle</Text>
        </View>
        <Switch value={connectDevice} onValueChange={setConnectDevice} trackColor={{ false: "#D1D5DB", true: "#9333EA" }} thumbColor="#FFFFFF" />
      </View>

      {error ? (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle-outline" size={18} color="#DC2626" />
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      ) : null}

      {missingSignupFields.length > 0 && !loading ? (
        <View style={styles.hintBanner}>
          <Ionicons name="information-circle-outline" size={18} color={theme.accent} />
          <Text style={styles.hintBannerText}>
            Complete: {missingSignupFields.join(", ")}
          </Text>
        </View>
      ) : null}

      <ModernPrimaryButton
        label="Create account & continue"
        onPress={handleContinue}
        disabled={loading}
        loading={loading}
        icon="arrow-forward"
      />

      <TouchableOpacity style={styles.loginFooter} onPress={() => router.replace({ pathname: "/login", params: { role: "Customer" } })} activeOpacity={0.85}>
        <Text style={styles.loginFooterText}>Already have an account?</Text>
        <Text style={styles.loginFooterAction}>Sign in as customer →</Text>
      </TouchableOpacity>

      <Modal visible={showAvatarPicker} transparent animationType="slide" onRequestClose={() => setShowAvatarPicker(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowAvatarPicker(false)}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Profile photo</Text>
              <TouchableOpacity onPress={() => setShowAvatarPicker(false)}>
                <Ionicons name="close" size={24} color={theme.textPrimary} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.modalOption} onPress={pickImage}>
              <Ionicons name="image-outline" size={22} color={theme.accent} />
              <Text style={styles.modalOptionText}>Choose from gallery</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalOption} onPress={takePhoto}>
              <Ionicons name="camera-outline" size={22} color={theme.accent} />
              <Text style={styles.modalOptionText}>Take a photo</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={showPlanDropdown} transparent animationType="slide" onRequestClose={() => setShowPlanDropdown(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowPlanDropdown(false)}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select plan</Text>
              <TouchableOpacity onPress={() => setShowPlanDropdown(false)}>
                <Ionicons name="close" size={24} color={theme.textPrimary} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {plans.map((plan) => (
                <TouchableOpacity
                  key={plan.id}
                  style={[styles.planOption, selectedPlan?.id === plan.id && styles.planOptionSelected]}
                  onPress={() => {
                    setSelectedPlan(plan);
                    setShowPlanDropdown(false);
                  }}
                >
                  <Text style={styles.planName}>{plan.name}</Text>
                  {selectedPlan?.id === plan.id ? <Ionicons name="checkmark-circle" size={22} color={theme.accent} /> : null}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </ModernScreenShell>
  );
};

export default CreateProfileScreen;

const styles = StyleSheet.create({
  avatarCard: { alignItems: "center", marginBottom: 18 },
  avatarButton: { width: 108, height: 108, position: "relative" },
  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 28,
    borderWidth: 3,
    borderColor: "#FFFFFF",
    ...Platform.select({
      ios: { shadowColor: "#0B3A4A", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.12, shadowRadius: 10 },
      android: { elevation: 0 },
    }),
  },
  avatarPlaceholder: {
    width: "100%",
    height: "100%",
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },
  cameraBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: theme.accent,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  avatarHint: { fontSize: 16, fontWeight: "700", color: theme.textPrimary, marginTop: 12 },
  avatarSubhint: { fontSize: 13, color: theme.textMuted, marginTop: 4 },
  sectionCard: {
    ...modern.card,
    marginBottom: 14,
  },
  sectionHeader: { flexDirection: "row", alignItems: "center", marginBottom: 16, gap: 12 },
  sectionIcon: { width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  sectionHeaderText: { flex: 1 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: theme.textPrimary },
  sectionSubtitle: { fontSize: 12, color: theme.textMuted, marginTop: 2 },
  passwordRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "rgba(214,234,242,0.95)",
    ...Platform.select({
      ios: { shadowColor: "#0B3A4A", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 0 },
    }),
  },
  passwordInput: {
    flex: 1,
    fontSize: 16,
    color: theme.textPrimary,
    padding: 0,
    ...(Platform.OS === "android" ? { includeFontPadding: false } : {}),
  },
  eyeBtn: { padding: 4, marginLeft: 8 },
  row: { flexDirection: "row", marginBottom: 4 },
  halfWidth: { flex: 1, minWidth: 0 },
  halfWidthLeft: { marginRight: 10 },
  genderRow: { flexDirection: "row", gap: 10 },
  genderBtn: { width: 54, height: 54, borderRadius: 14, overflow: "hidden" },
  genderBtnInner: { flex: 1, alignItems: "center", justifyContent: "center" },
  genderBtnUnselected: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(214,234,242,0.95)",
    borderRadius: 14,
  },
  activityRow: { flexDirection: "row", gap: 8, marginBottom: 4 },
  activityBtn: { flex: 1, minHeight: 88, borderRadius: 16, overflow: "hidden" },
  activityBtnInner: { flex: 1, alignItems: "center", justifyContent: "center", padding: 10, gap: 6 },
  activityBtnUnselected: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
    gap: 6,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(214,234,242,0.95)",
    borderRadius: 16,
  },
  activityText: { fontSize: 12, fontWeight: "600", color: theme.textMuted },
  activityTextSelected: { fontSize: 12, fontWeight: "600", color: "#FFFFFF" },
  toggleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  toggleLabel: { fontSize: 15, fontWeight: "600", color: theme.textPrimary },
  dropdownBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "rgba(214,234,242,0.95)",
  },
  dropdownText: { flex: 1, fontSize: 15, color: theme.textPrimary, fontWeight: "500" },
  dropdownPlaceholder: { color: "#9CA3AF" },
  planLater: { fontSize: 13, color: theme.textMuted, lineHeight: 18 },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 10,
    borderWidth: 1,
    borderColor: "rgba(214,234,242,0.95)",
  },
  stepperBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(51,175,193,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  stepperValueWrap: { flex: 1, alignItems: "center" },
  stepperValue: { fontSize: 24, fontWeight: "800", color: theme.textPrimary },
  stepperLabel: { fontSize: 12, color: theme.textMuted, marginTop: 2 },
  deviceCard: {
    ...modern.card,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  deviceIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  deviceText: { flex: 1 },
  deviceTitle: { fontSize: 15, fontWeight: "700", color: theme.textPrimary },
  deviceSubtitle: { fontSize: 12, color: theme.textMuted, marginTop: 2 },
  errorBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "rgba(220,38,38,0.08)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    gap: 8,
  },
  errorBannerText: { flex: 1, fontSize: 13, color: "#DC2626", fontWeight: "500", lineHeight: 18 },
  hintBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "rgba(51,175,193,0.08)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(51,175,193,0.18)",
  },
  hintBannerText: { flex: 1, fontSize: 13, color: theme.textMuted, lineHeight: 18 },
  loginFooter: { alignItems: "center", paddingVertical: 18, marginTop: 4 },
  loginFooterText: { fontSize: 13, color: theme.textMuted },
  loginFooterAction: { fontSize: 15, fontWeight: "700", color: theme.link, marginTop: 4 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  modalSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "70%",
  },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: "700", color: theme.textPrimary },
  modalOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 14,
    backgroundColor: "rgba(51,175,193,0.08)",
    marginBottom: 10,
  },
  modalOptionText: { fontSize: 15, fontWeight: "600", color: theme.textPrimary },
  planOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderRadius: 14,
    backgroundColor: "rgba(51,175,193,0.06)",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "transparent",
  },
  planOptionSelected: { borderColor: theme.primaryLight, backgroundColor: theme.selectedTint },
  planName: { fontSize: 15, fontWeight: "600", color: theme.textPrimary, flex: 1 },
});
