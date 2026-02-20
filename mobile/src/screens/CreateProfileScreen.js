import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Switch,
  Modal,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

let ImagePicker;
try {
  ImagePicker = require("expo-image-picker");
} catch (e) {
  console.log("expo-image-picker not installed");
}

const plans = [
  { id: 1, name: "Basic Plan", price: "$29.99/month" },
  { id: 2, name: "Family Pack", price: "$49.99/month" },
  { id: 3, name: "Active Plan", price: "$39.99/month" },
  { id: 4, name: "Premium Plan", price: "$69.99/month" },
];

const CreateProfileScreen = () => {
  const router = useRouter();
  const [fullName, setFullName] = useState("Alex Morgan");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState(["", "", "", ""]);
  const [age, setAge] = useState("28");
  const [gender, setGender] = useState("male");
  const [activityLevel, setActivityLevel] = useState("moderate");
  const [familyMembers, setFamilyMembers] = useState(3);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showPlanDropdown, setShowPlanDropdown] = useState(false);
  const [connectDevice, setConnectDevice] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [avatarUri, setAvatarUri] = useState(null);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  const otpRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];

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
    } catch (error) {}
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
    } catch (error) {}
  };

  const handleBack = () => router.back();
  const handlePhoneChange = (text) => {
    setPhone(text);
    if (text.length > 0) setShowOtp(true);
    else {
      setShowOtp(false);
      setOtp(["", "", "", ""]);
    }
  };

  const handleOtpChange = (index, value) => {
    if (value.length > 1) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 3) otpRefs[index + 1].current?.focus();
  };

  const handleOtpKeyPress = (index, key) => {
    if (key === "Backspace" && !otp[index] && index > 0) otpRefs[index - 1].current?.focus();
  };

  const handleContinue = () => {
    if (otp.join("").length === 4 && selectedPlan) router.push("/dashboard");
  };

  const decreaseFamilyMembers = () => {
    if (familyMembers > 0) setFamilyMembers(familyMembers - 1);
  };
  const increaseFamilyMembers = () => setFamilyMembers(familyMembers + 1);

  const isContinueEnabled = otp.join("").length === 4 && selectedPlan !== null;

  const activityLevels = [
    { level: "low", icon: "bed-outline", label: "Low" },
    { level: "moderate", icon: "walk-outline", label: "Moderate" },
    { level: "high", icon: "fitness-outline", label: "High" },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Avatar Section with Gradient */}
        <View style={styles.avatarSection}>
          <LinearGradient
            colors={["#7DD3FC", "#38BDF8", "#0EA5E9", "#06B6D4"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientBackground}
          >
            <View style={styles.headerOverlay}>
              <TouchableOpacity onPress={handleBack} style={styles.backButton} activeOpacity={0.7}>
                <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.avatarContainer}>
              <TouchableOpacity style={styles.avatarButton} onPress={() => setShowAvatarPicker(true)} activeOpacity={0.8}>
                {avatarUri ? (
                  <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Ionicons name="person" size={50} color="#06B6D4" />
                    <View style={styles.cameraIcon}>
                      <Ionicons name="camera" size={16} color="#FFFFFF" />
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>

        {/* Content panel with curved top (same as dashboard) */}
        <View style={styles.contentPanel}>
        <Text style={styles.title}>Create Profile</Text>
        <Text style={styles.subtitle}>Tell us a bit about yourself for personalized hydration goals.</Text>

        <View style={styles.inputSection}>
          <Text style={styles.label}>Full Name</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="person-outline" size={20} color="#6B7C85" style={styles.inputIcon} />
            <TextInput style={styles.input} value={fullName} onChangeText={setFullName} placeholderTextColor="#9CA3AF" />
          </View>
        </View>

        <View style={styles.inputSection}>
          <Text style={styles.label}>Email ID</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color="#6B7C85" style={styles.inputIcon} />
            <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="Enter your email" placeholderTextColor="#9CA3AF" keyboardType="email-address" autoCapitalize="none" />
          </View>
        </View>

        <View style={styles.inputSection}>
          <Text style={styles.label}>Phone Number</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="call-outline" size={20} color="#6B7C85" style={styles.inputIcon} />
            <TextInput style={styles.input} value={phone} onChangeText={handlePhoneChange} placeholder="Enter your phone number" placeholderTextColor="#9CA3AF" keyboardType="phone-pad" />
          </View>
        </View>

        {showOtp && (
          <View style={styles.inputSection}>
            <Text style={styles.label}>OTP</Text>
            <View style={styles.otpContainer}>
              {[0, 1, 2, 3].map((index) => (
                <TextInput
                  key={index}
                  ref={otpRefs[index]}
                  style={styles.otpBox}
                  value={otp[index]}
                  onChangeText={(v) => handleOtpChange(index, v)}
                  onKeyPress={({ nativeEvent }) => handleOtpKeyPress(index, nativeEvent.key)}
                  keyboardType="number-pad"
                  maxLength={1}
                  selectTextOnFocus
                />
              ))}
            </View>
          </View>
        )}

        <View style={styles.row}>
          <View style={styles.halfWidth}>
            <Text style={styles.label}>Age</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="calendar-outline" size={20} color="#6B7C85" style={styles.inputIcon} />
              <TextInput style={styles.input} value={age} onChangeText={setAge} keyboardType="numeric" placeholderTextColor="#9CA3AF" />
            </View>
          </View>
          <View style={styles.halfWidth}>
            <Text style={styles.label}>Gender</Text>
            <View style={styles.genderContainer}>
              <TouchableOpacity style={styles.genderButton} onPress={() => setGender("male")} activeOpacity={0.8}>
                {gender === "male" ? (
                  <LinearGradient colors={["#2DD4BF", "#14B8A6"]} style={styles.genderButtonGradient}>
                    <Ionicons name="man" size={22} color="#FFFFFF" />
                  </LinearGradient>
                ) : (
                  <View style={styles.genderButtonUnselected}><Ionicons name="man-outline" size={22} color="#9CA3AF" /></View>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={styles.genderButton} onPress={() => setGender("female")} activeOpacity={0.8}>
                {gender === "female" ? (
                  <LinearGradient colors={["#2DD4BF", "#14B8A6"]} style={styles.genderButtonGradient}>
                    <Ionicons name="woman" size={22} color="#FFFFFF" />
                  </LinearGradient>
                ) : (
                  <View style={styles.genderButtonUnselected}><Ionicons name="woman-outline" size={22} color="#9CA3AF" /></View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.inputSection}>
          <Text style={styles.label}>Activity Level</Text>
          <View style={styles.activityContainer}>
            {activityLevels.map((item) => (
              <TouchableOpacity key={item.level} style={styles.activityButton} onPress={() => setActivityLevel(item.level)} activeOpacity={0.8}>
                {activityLevel === item.level ? (
                  <LinearGradient colors={["#2DD4BF", "#14B8A6"]} style={styles.activityButtonGradient}>
                    <Ionicons name={item.icon} size={24} color="#FFFFFF" />
                    <Text style={styles.activityButtonTextSelected}>{item.label}</Text>
                  </LinearGradient>
                ) : (
                  <View style={styles.activityButtonUnselected}>
                    <Ionicons name={item.icon} size={24} color="#6B7C85" />
                    <Text style={styles.activityButtonText}>{item.label}</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.inputSection}>
          <Text style={styles.label}>Select Plan</Text>
          <TouchableOpacity style={styles.dropdownButton} onPress={() => setShowPlanDropdown(true)} activeOpacity={0.8}>
            <View style={styles.dropdownButtonContent}>
              <Ionicons name="card-outline" size={20} color="#6B7C85" style={styles.inputIcon} />
              <Text style={[styles.dropdownButtonText, !selectedPlan && styles.dropdownButtonTextPlaceholder]}>
                {selectedPlan ? selectedPlan.name : "Select a plan"}
              </Text>
            </View>
            <Ionicons name="chevron-down" size={20} color="#6B7C85" />
          </TouchableOpacity>
        </View>

        <View style={styles.inputSection}>
          <Text style={styles.label}>Family Members</Text>
          <Text style={styles.hintText}>Used for household estimates</Text>
          <View style={styles.stepperContainer}>
            <TouchableOpacity style={styles.stepperButton} onPress={decreaseFamilyMembers} activeOpacity={0.7}>
              <Text style={styles.stepperButtonText}>-</Text>
            </TouchableOpacity>
            <Text style={styles.stepperValue}>{familyMembers}</Text>
            <TouchableOpacity style={styles.stepperButton} onPress={increaseFamilyMembers} activeOpacity={0.7}>
              <Text style={styles.stepperButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.deviceCard}>
          <Ionicons name="watch-outline" size={28} color="#9333EA" />
          <View style={styles.deviceTextContainer}>
            <Text style={styles.deviceTitle}>Connect Device</Text>
            <Text style={styles.deviceSubtitle}>Smart Watch or Bottle</Text>
          </View>
          <Switch value={connectDevice} onValueChange={setConnectDevice} trackColor={{ false: "#D1D5DB", true: "#9333EA" }} thumbColor="#FFFFFF" />
        </View>

        <TouchableOpacity style={[styles.continueButton, !isContinueEnabled && styles.continueButtonDisabled]} onPress={handleContinue} activeOpacity={isContinueEnabled ? 0.9 : 1} disabled={!isContinueEnabled}>
          <View style={styles.buttonContent}>
            <Text style={isContinueEnabled ? styles.buttonText : styles.buttonTextDisabled}>Continue to Dashboard</Text>
            <Text style={isContinueEnabled ? styles.buttonArrow : styles.buttonArrowDisabled}>→</Text>
          </View>
        </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal visible={showAvatarPicker} transparent animationType="slide" onRequestClose={() => setShowAvatarPicker(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowAvatarPicker(false)}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Avatar</Text>
              <TouchableOpacity onPress={() => setShowAvatarPicker(false)}><Ionicons name="close" size={24} color="#1B2B34" /></TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.avatarOption} onPress={pickImage}>
              <Ionicons name="image-outline" size={24} color="#1EA7FD" />
              <Text style={styles.avatarOptionText}>Choose from Gallery</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.avatarOption} onPress={takePhoto}>
              <Ionicons name="camera-outline" size={24} color="#1EA7FD" />
              <Text style={styles.avatarOptionText}>Take Photo</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={showPlanDropdown} transparent animationType="slide" onRequestClose={() => setShowPlanDropdown(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowPlanDropdown(false)}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Plan</Text>
              <TouchableOpacity onPress={() => setShowPlanDropdown(false)}><Ionicons name="close" size={24} color="#1B2B34" /></TouchableOpacity>
            </View>
            {plans.map((plan) => (
              <TouchableOpacity
                key={plan.id}
                style={[styles.planOption, selectedPlan?.id === plan.id && styles.planOptionSelected]}
                onPress={() => { setSelectedPlan(plan); setShowPlanDropdown(false); }}
              >
                <View>
                  <Text style={styles.planName}>{plan.name}</Text>
                  <Text style={styles.planPrice}>{plan.price}</Text>
                </View>
                {selectedPlan?.id === plan.id && <Ionicons name="checkmark-circle" size={24} color="#1EA7FD" />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

export default CreateProfileScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#c6e2fa", paddingHorizontal: 20 },
  scrollContent: { paddingBottom: 30 },
  avatarSection: { marginTop: -10, marginLeft: -20, marginRight: -20, height: 220, overflow: "hidden", position: "relative" },
  gradientBackground: { flex: 1, position: "relative", paddingTop: 50, paddingBottom: 24 },
  headerOverlay: { position: "absolute", top: 14, left: 28, right: 28, flexDirection: "row", alignItems: "center", zIndex: 10 },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255, 255, 255, 0.2)", justifyContent: "center", alignItems: "center" },
  avatarContainer: { alignItems: "center", justifyContent: "center", marginTop: 20 },
  contentPanel: { marginTop: -20, marginLeft: 2, marginRight: 2, backgroundColor: "#c6e2fa", borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 28, paddingHorizontal: 20, overflow: "hidden" },
  avatarButton: { width: 120, height: 120 },
  avatarImage: { width: "100%", height: "100%", borderRadius: 20, backgroundColor: "rgba(255, 255, 255, 0.9)", borderWidth: 3, borderColor: "rgba(255, 255, 255, 0.9)", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 5 },
  avatarPlaceholder: { width: "90%", height: "90%", borderRadius: 100, backgroundColor: "rgba(255, 255, 255, 0.9)", 
    justifyContent: "center", alignItems: "center", borderWidth: 3, borderColor: "rgba(255, 255, 255, 0.9)", 
    position: "relative", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.15, shadowRadius: 12, elevation: 5 },
  cameraIcon: { position: "absolute", bottom: 8, right: 8, width: 32, height: 32, borderRadius: 16, backgroundColor: "#06B6D4", justifyContent: "center", alignItems: "center", borderWidth: 2, borderColor: "#FFFFFF", elevation: 4 },
  title: { fontSize: 26, fontWeight: "700", textAlign: "center", color: "#1B2B34", marginTop: 0, marginBottom: 8 },
  subtitle: { textAlign: "center", color: "#6B7C85", marginTop: 6, marginBottom: 25, fontSize: 14 },
  inputSection: { marginBottom: 20 },
  label: { fontSize: 15, fontWeight: "600", color: "#1B2B34", marginBottom: 10 },
  hintText: { fontSize: 12, color: "#7A8A93", marginBottom: 10 },
  inputContainer: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255, 255, 255, 0.7)", borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, borderWidth: 1, borderColor: "rgba(255, 255, 255, 0.8)", elevation: 3 },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16, color: "#1B2B34", padding: 0 },
  otpContainer: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  otpBox: { flex: 1, backgroundColor: "rgba(255, 255, 255, 0.7)", borderRadius: 16, paddingVertical: 14, fontSize: 20, fontWeight: "600", textAlign: "center", color: "#1B2B34", borderWidth: 1, borderColor: "rgba(255, 255, 255, 0.8)", elevation: 3 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20, gap: 12 },
  halfWidth: { flex: 1 },
  genderContainer: { flexDirection: "row", gap: 10 },
  genderButton: { width: 54, height: 54, borderRadius: 12, overflow: "hidden" },
  genderButtonUnselected: { width: "100%", height: "100%", backgroundColor: "rgba(255, 255, 255, 0.7)", justifyContent: "center", alignItems: "center", borderRadius: 12, borderWidth: 1, borderColor: "rgba(255, 255, 255, 0.8)", elevation: 3 },
  genderButtonGradient: { width: "100%", height: "100%", justifyContent: "center", alignItems: "center" },
  activityContainer: { flexDirection: "row", gap: 12 },
  activityButton: { flex: 1, aspectRatio: 1, borderRadius: 16, overflow: "hidden", borderWidth: 1.5, borderColor: "rgba(255, 255, 255, 0.8)", elevation: 3 },
  activityButtonGradient: { width: "100%", height: "100%", justifyContent: "center", alignItems: "center", padding: 12, gap: 6 },
  activityButtonUnselected: { width: "100%", height: "100%", backgroundColor: "rgba(255, 255, 255, 0.7)", justifyContent: "center", alignItems: "center", padding: 12, gap: 6 },
  activityButtonText: { fontSize: 12, fontWeight: "600", color: "#6B7C85", textAlign: "center" },
  activityButtonTextSelected: { fontSize: 12, fontWeight: "600", color: "#FFFFFF", textAlign: "center" },
  dropdownButton: { backgroundColor: "rgba(255, 255, 255, 0.7)", borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 1, borderColor: "rgba(255, 255, 255, 0.8)", elevation: 3 },
  dropdownButtonContent: { flexDirection: "row", alignItems: "center", flex: 1 },
  dropdownButtonText: { fontSize: 16, color: "#1B2B34" },
  dropdownButtonTextPlaceholder: { color: "#9CA3AF" },
  stepperContainer: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255, 255, 255, 0.7)", borderRadius: 16, paddingVertical: 10, paddingHorizontal: 16, borderWidth: 1, borderColor: "rgba(255, 255, 255, 0.8)", elevation: 3 },
  stepperButton: { width: 32, height: 32, justifyContent: "center", alignItems: "center" },
  stepperButtonText: { fontSize: 22, color: "#6B7C85", fontWeight: "600" },
  stepperValue: { flex: 1, textAlign: "center", fontSize: 18, fontWeight: "700", color: "#1B2B34" },
  deviceCard: { backgroundColor: "rgba(255, 255, 255, 0.7)", borderRadius: 20, padding: 20, marginBottom: 24, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "rgba(255, 255, 255, 0.8)", elevation: 3 },
  deviceTextContainer: { flex: 1, marginLeft: 16 },
  deviceTitle: { fontSize: 17, fontWeight: "700", color: "#1B2B34", marginBottom: 4 },
  deviceSubtitle: { fontSize: 13, color: "#6B7C85" },
  continueButton: { marginTop: 20, backgroundColor: "#1EA7FD", paddingVertical: 16, borderRadius: 30, alignItems: "center", elevation: 3 },
  continueButtonDisabled: { backgroundColor: "#EEF3F7", elevation: 1 },
  buttonContent: { flexDirection: "row", alignItems: "center", gap: 8 },
  buttonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
  buttonTextDisabled: { color: "#8A9AA3", fontSize: 16, fontWeight: "600" },
  buttonArrow: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
  buttonArrowDisabled: { color: "#8A9AA3", fontSize: 16, fontWeight: "600" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.5)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#FFFFFF", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: "70%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: "700", color: "#1B2B34" },
  planOption: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderRadius: 12, backgroundColor: "#f0f7fcd7", marginBottom: 12 },
  planOptionSelected: { backgroundColor: "#E0F2FE", borderWidth: 2, borderColor: "#8ED1FC" },
  planName: { fontSize: 16, fontWeight: "600", color: "#1B2B34", marginBottom: 4 },
  planPrice: { fontSize: 14, color: "#6B7C85" },
  avatarOption: { flexDirection: "row", alignItems: "center", padding: 16, borderRadius: 12, backgroundColor: "#f0f7fcd7", marginBottom: 12, gap: 12 },
  avatarOptionText: { fontSize: 16, fontWeight: "600", color: "#1B2B34" },
});
