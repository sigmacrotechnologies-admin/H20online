import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Modal,
  Image,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/src/context/AuthContext";
import { api } from "@/src/api/client";
import BackButton from "@/src/components/BackButton";
import { theme } from "@/src/theme";

let ImagePicker;
try {
  ImagePicker = require("expo-image-picker");
} catch (_) {}

const BUSINESS_TYPES = [
  { id: "waterSupplier", name: "Water Supplier", icon: "water-outline" },
  { id: "deliveryAgent", name: "Delivery Agent", icon: "bicycle-outline" },
  { id: "other", name: "Other", icon: "ellipsis-horizontal-outline" },
];

const DOC_TYPES_BUSINESS = [
  { id: "idProof", label: "ID Proof", icon: "card-outline" },
  { id: "businessLicense", label: "Business License", icon: "document-text-outline" },
  { id: "addressProof", label: "Address Proof", icon: "location-outline" },
];

const DOC_TYPES_DELIVERY = [
  { id: "idProof", label: "ID Proof", icon: "card-outline" },
  { id: "addressProof", label: "Address Proof", icon: "location-outline" },
  { id: "vehicleIdentification", label: "Vehicle identification", icon: "car-outline" },
];

const VEHICLE_TYPE_OPTIONS = [
  { id: "bike", name: "Bike", icon: "bicycle-outline" },
  { id: "van", name: "Van", icon: "car-outline" },
  { id: "bicycle", name: "Bicycle", icon: "bicycle-outline" },
  { id: "tanker", name: "Tanker", icon: "water" },
  { id: "miniTruck", name: "Mini truck", icon: "bus-outline" },
];

const SupplierOnboardingScreen = () => {
  const router = useRouter();
  const { loginWithToken } = useAuth();
  const [businessName, setBusinessName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [address, setAddress] = useState("");
  const [location, setLocation] = useState("");
  const [city, setCity] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [businessType, setBusinessType] = useState(null);
  const [documents, setDocuments] = useState({
    idProof: null,
    businessLicense: null,
    addressProof: null,
    vehicleIdentification: null,
  });
  const [deliveryVehicleType, setDeliveryVehicleType] = useState(null);
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [activeDocType, setActiveDocType] = useState(null);
  const [showDocPicker, setShowDocPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isDeliveryAgent = businessType?.id === "deliveryAgent";
  const docTypes = isDeliveryAgent ? DOC_TYPES_DELIVERY : DOC_TYPES_BUSINESS;

  const pickDocument = async (source) => {
    if (!ImagePicker || !activeDocType) return;
    try {
      const perm = source === "camera"
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== "granted") return;
      const result = source === "camera"
        ? await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
          });
      if (!result.canceled) {
        setDocuments((prev) => ({ ...prev, [activeDocType]: result.assets[0].uri }));
        setShowDocPicker(false);
        setActiveDocType(null);
      }
    } catch (_) {}
  };

  const openDocPicker = (docId) => {
    setActiveDocType(docId);
    setShowDocPicker(true);
  };

  const handleBack = () => router.back();

  const handleSubmit = async () => {
    setError("");
    const nameTrim = businessName.trim();
    const contactTrim = contactPerson.trim();
    const emailTrim = email.trim();
    const phoneTrim = phone.trim();
    const addressTrim = address.trim();
    const cityTrim = city.trim();
    const pwd = password.trim();

    if (!isDeliveryAgent && !nameTrim) {
      setError("Please enter business / vendor name");
      return;
    }
    if (isDeliveryAgent && !deliveryVehicleType) {
      setError("Please select type of vehicle");
      return;
    }
    if (isDeliveryAgent && !(vehicleNumber || "").trim()) {
      setError("Please enter vehicle number");
      return;
    }
    if (!contactTrim) {
      setError("Please enter contact person name");
      return;
    }
    if (!emailTrim) {
      setError("Please enter email");
      return;
    }
    if (!phoneTrim) {
      setError("Please enter phone number");
      return;
    }
    if (!pwd || pwd.length < 6) {
      setError("Please enter a password (min 6 characters)");
      return;
    }
    if (!addressTrim) {
      setError("Please enter address");
      return;
    }
    if (!cityTrim) {
      setError("Please enter city");
      return;
    }
    if (!businessType) {
      setError("Please select business type");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        businessName: isDeliveryAgent ? contactTrim : nameTrim,
        contactPerson: contactTrim,
        email: emailTrim,
        phone: phoneTrim,
        password: pwd,
        address: addressTrim,
        location: location.trim() || cityTrim,
        city: cityTrim,
        businessType: businessType.id,
        gstNumber: isDeliveryAgent ? "" : gstNumber.trim(),
        bankAccount: isDeliveryAgent ? "" : bankAccount.trim(),
        ifscCode: isDeliveryAgent ? "" : ifscCode.trim(),
      };
      if (isDeliveryAgent) {
        payload.vehicleType = deliveryVehicleType?.id || "bike";
        payload.vehicleNumber = (vehicleNumber || "").trim();
        payload.documentVehicleIdentification = documents.vehicleIdentification || "";
      }
      const data = await api.auth.registerSupplier(payload);
      if (data.token && data.user) {
        loginWithToken(data.token, data.user);
      }
      router.replace({
        pathname: "/supplier-onboarding-status",
        params: { code: data.verificationCode || "000000", status: data.onboardingStatus || "pending" },
      });
    } catch (err) {
      setError(err.message || "Onboarding failed");
    } finally {
      setLoading(false);
    }
  };

  const isSubmitEnabled =
    businessType !== null &&
    contactPerson.trim().length > 0 &&
    email.trim().length > 0 &&
    phone.trim().length > 0 &&
    password.trim().length >= 6 &&
    address.trim().length > 0 &&
    city.trim().length > 0 &&
    (isDeliveryAgent ? (deliveryVehicleType !== null && (vehicleNumber || "").trim().length > 0) : businessName.trim().length > 0);

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
            <View style={styles.headerTopRow}>
              <BackButton onPress={handleBack} />
            </View>
            <View style={styles.headerCenter}>
              <View style={styles.headerIconCircle}>
                <Ionicons name="business-outline" size={36} color="#FFFFFF" />
              </View>
              <Text style={styles.headerTitle}>Partner onboarding</Text>
            </View>
          </LinearGradient>
        </View>

        <View style={styles.contentPanel}>
          <Text style={styles.subtitle}>Register as a vendor. Fill details and upload verification documents.</Text>

          <Text style={styles.sectionTitle}>Partner type</Text>
          <Text style={styles.hintText}>Select one option</Text>
          <View style={styles.tileRow}>
            {BUSINESS_TYPES.map((type) => {
              const selected = businessType?.id === type.id;
              return (
                <TouchableOpacity
                  key={type.id}
                  style={[styles.businessTile, selected && styles.businessTileSelected]}
                  onPress={() => setBusinessType(type)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={type.icon}
                    size={28}
                    color={selected ? theme.primary : theme.textMuted}
                  />
                  <Text style={[styles.businessTileText, selected && styles.businessTileTextSelected]}>
                    {type.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {!isDeliveryAgent && (
            <View style={styles.inputSection}>
              <Text style={styles.label}>Business / Vendor Name</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="business-outline" size={20} color={theme.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={businessName}
                  onChangeText={setBusinessName}
                  placeholder="Enter business name"
                  placeholderTextColor={theme.textMuted}
                />
              </View>
            </View>
          )}

          <View style={styles.inputSection}>
            <Text style={styles.label}>Contact Person Name</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color={theme.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={contactPerson}
                onChangeText={setContactPerson}
                placeholder="Enter contact person name"
                placeholderTextColor={theme.textMuted}
              />
            </View>
          </View>

          <View style={styles.inputSection}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color={theme.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="Enter email"
                placeholderTextColor={theme.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={styles.inputSection}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color={theme.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Min 6 characters"
                placeholderTextColor={theme.textMuted}
                secureTextEntry
              />
            </View>
          </View>

          <View style={styles.inputSection}>
            <Text style={styles.label}>Phone Number</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="call-outline" size={20} color={theme.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="Enter phone number"
                placeholderTextColor={theme.textMuted}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          <View style={styles.inputSection}>
            <Text style={styles.label}>Address</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="location-outline" size={20} color={theme.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={address}
                onChangeText={setAddress}
                placeholder="Street, building, area"
                placeholderTextColor={theme.textMuted}
                multiline
                numberOfLines={2}
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.halfWidth}>
              <Text style={styles.label}>Location</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="navigate-outline" size={20} color={theme.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={location}
                  onChangeText={setLocation}
                  placeholder="Area"
                  placeholderTextColor={theme.textMuted}
                />
              </View>
            </View>
            <View style={styles.halfWidth}>
              <Text style={styles.label}>City</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="business-outline" size={20} color={theme.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={city}
                  onChangeText={setCity}
                  placeholder="City"
                  placeholderTextColor={theme.textMuted}
                />
          </View>
          </View>
          </View>

          {isDeliveryAgent && (
            <>
              <Text style={styles.sectionTitle}>Type of vehicle</Text>
              <Text style={styles.hintText}>Select one option</Text>
              <View style={styles.tileRow}>
                {VEHICLE_TYPE_OPTIONS.map((opt) => {
                  const selected = deliveryVehicleType?.id === opt.id;
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      style={[styles.businessTile, selected && styles.businessTileSelected]}
                      onPress={() => setDeliveryVehicleType(opt)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name={opt.icon} size={28} color={selected ? theme.primary : theme.textMuted} />
                      <Text style={[styles.businessTileText, selected && styles.businessTileTextSelected]}>{opt.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View style={styles.inputSection}>
                <Text style={styles.label}>Vehicle number</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="car-outline" size={20} color={theme.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={vehicleNumber}
                    onChangeText={setVehicleNumber}
                    placeholder="e.g. MH 12 AB 1234"
                    placeholderTextColor={theme.textMuted}
                    autoCapitalize="characters"
                  />
                </View>
              </View>
            </>
          )}

          {!isDeliveryAgent && (
            <>
              <View style={styles.row}>
                <View style={styles.halfWidth}>
                  <Text style={styles.label}>GST Number</Text>
                  <View style={styles.inputContainer}>
                <Ionicons name="receipt-outline" size={20} color={theme.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={gstNumber}
                  onChangeText={setGstNumber}
                  placeholder="GSTIN"
                  placeholderTextColor={theme.textMuted}
                      autoCapitalize="characters"
                    />
                  </View>
                </View>
                <View style={styles.halfWidth}>
                  <Text style={styles.label}>Bank A/c</Text>
                  <View style={styles.inputContainer}>
                <Ionicons name="wallet-outline" size={20} color={theme.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={bankAccount}
                  onChangeText={setBankAccount}
                  placeholder="Account number"
                  placeholderTextColor={theme.textMuted}
                      keyboardType="numeric"
                    />
                  </View>
                </View>
              </View>
              <View style={styles.inputSection}>
                <Text style={styles.label}>IFSC Code</Text>
                <View style={styles.inputContainer}>
                <Ionicons name="card-outline" size={20} color={theme.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={ifscCode}
                  onChangeText={setIfscCode}
                  placeholder="e.g. SBIN0001234"
                  placeholderTextColor={theme.textMuted}
                    autoCapitalize="characters"
                  />
                </View>
              </View>
            </>
          )}
          {isDeliveryAgent && (
            <Text style={styles.hintText}>GST, bank account and IFSC are not required for delivery agents.</Text>
          )}

          <Text style={styles.sectionTitle}>Verification Documents (optional)</Text>
          <Text style={styles.hintText}>
            {isDeliveryAgent
              ? "ID proof, address proof and vehicle identification can be uploaded later. Vehicle number is required above."
              : "You can upload ID proof, address proof and business license later. Completing onboarding does not require documents."}
          </Text>
          {docTypes.map((doc) => (
            <View key={doc.id} style={styles.docCard}>
              <View style={styles.docCardLeft}>
                <View style={styles.docIconWrap}>
                  <Ionicons name={doc.icon} size={24} color={theme.primary} />
                </View>
                <View>
                  <Text style={styles.docLabel}>{doc.label}</Text>
                  {documents[doc.id] ? (
                    <Text style={styles.docStatus}>Uploaded</Text>
                  ) : (
                    <Text style={styles.docStatusEmpty}>Not uploaded</Text>
                  )}
                </View>
              </View>
              <TouchableOpacity
                style={documents[doc.id] ? styles.docUpdateBtn : styles.docAddBtn}
                onPress={() => openDocPicker(doc.id)}
                activeOpacity={0.8}
              >
                {documents[doc.id] ? (
                  <Image source={{ uri: documents[doc.id] }} style={styles.docThumb} />
                ) : (
                  <Ionicons name="add-circle-outline" size={28} color={theme.primary} />
                )}
              </TouchableOpacity>
            </View>
          ))}

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.continueButton, (!isSubmitEnabled || loading) && styles.continueButtonDisabled]}
            onPress={handleSubmit}
            activeOpacity={isSubmitEnabled && !loading ? 0.9 : 1}
            disabled={!isSubmitEnabled || loading}
          >
            <View style={styles.buttonContent}>
              {loading ? (
                <ActivityIndicator color={theme.white} size="small" />
              ) : (
                <>
                  <Text style={isSubmitEnabled && !loading ? styles.buttonText : styles.buttonTextDisabled}>
                    Complete Onboarding
                  </Text>
                  <Text style={isSubmitEnabled && !loading ? styles.buttonArrow : styles.buttonArrowDisabled}>→</Text>
                </>
              )}
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        visible={showDocPicker}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowDocPicker(false);
          setActiveDocType(null);
        }}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => {
            setShowDocPicker(false);
            setActiveDocType(null);
          }}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {activeDocType ? docTypes.find((d) => d.id === activeDocType)?.label : "Upload Document"}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowDocPicker(false);
                  setActiveDocType(null);
                }}
              >
                <Ionicons name="close" size={24} color={theme.textPrimary} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.avatarOption} onPress={() => pickDocument("gallery")}>
              <Ionicons name="image-outline" size={24} color={theme.primary} />
              <Text style={styles.avatarOptionText}>Choose from Gallery</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.avatarOption} onPress={() => pickDocument("camera")}>
              <Ionicons name="camera-outline" size={24} color={theme.primary} />
              <Text style={styles.avatarOptionText}>Take Photo</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

export default SupplierOnboardingScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.screenBackground, paddingHorizontal: 20 },
  scrollContent: { paddingBottom: 30 },
  headerSection: { marginTop: -10, marginLeft: -20, marginRight: -20, height: 200, overflow: "hidden" },
  gradientBackground: { flex: 1, paddingTop: 24, paddingHorizontal: 36, paddingBottom: 36 },
  headerTopRow: { flexDirection: "row", alignItems: "center", marginBottom: 0 },
  headerCenter: { alignItems: "center", justifyContent: "center", marginTop: -14, width: "100%" },
  headerIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(255,255,255,0.25)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  headerTitle: { fontSize: 20, fontWeight: "700", color: "#FFFFFF", textAlign: "center", paddingBottom: 32 },
  contentPanel: {
    marginTop: -16,
    marginLeft: 2,
    marginRight: 2,
    backgroundColor: theme.screenBackground,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 28,
    paddingHorizontal: 20,
    overflow: "hidden",
  },
  subtitle: { textAlign: "center", color: theme.textMuted, marginTop: 0, marginBottom: 25, fontSize: 14 },
  sectionTitle: { fontSize: 17, fontWeight: "700", color: theme.textPrimary, marginBottom: 6, marginTop: 8 },
  inputSection: { marginBottom: 20 },
  label: { fontSize: 15, fontWeight: "600", color: theme.textPrimary, marginBottom: 10 },
  hintText: { fontSize: 12, color: theme.textMuted, marginBottom: 10 },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.cardBackground,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.8)",
    elevation: 3,
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16, color: theme.textPrimary, padding: 0 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20, gap: 12 },
  halfWidth: { flex: 1 },
  tileRow: { flexDirection: "row", flexWrap: "wrap", marginBottom: 20, gap: 10 },
  businessTile: {
    width: "48%",
    minWidth: 140,
    backgroundColor: theme.cardBackground,
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.8)",
    elevation: 2,
  },
  businessTileSelected: {
    borderColor: theme.primaryLight,
    backgroundColor: theme.selectedTint,
  },
  businessTileText: { fontSize: 14, fontWeight: "600", color: theme.textPrimary, marginTop: 8 },
  businessTileTextSelected: { color: theme.primary },
  docCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: theme.cardBackground,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.8)",
    elevation: 3,
  },
  docCardLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  docIconWrap: { width: 44, height: 44, borderRadius: 12, backgroundColor: "rgba(51,175,193,0.2)", justifyContent: "center", alignItems: "center", marginRight: 12 },
  docLabel: { fontSize: 16, fontWeight: "600", color: theme.textPrimary },
  docStatus: { fontSize: 12, color: theme.primary, marginTop: 2 },
  docStatusEmpty: { fontSize: 12, color: theme.textMuted, marginTop: 2 },
  docAddBtn: { padding: 8 },
  docUpdateBtn: { padding: 4 },
  docThumb: { width: 48, height: 48, borderRadius: 10, backgroundColor: theme.selectedTint },
  errorText: { fontSize: 14, color: "#DC2626", marginBottom: 12, fontWeight: "500" },
  continueButton: { marginTop: 20, marginBottom: 24, backgroundColor: theme.primary, paddingVertical: 16, borderRadius: 30, alignItems: "center", elevation: 3 },
  continueButtonDisabled: { backgroundColor: "#EEF3F7", elevation: 1 },
  buttonContent: { flexDirection: "row", alignItems: "center", gap: 8 },
  buttonText: { color: theme.white, fontSize: 16, fontWeight: "600" },
  buttonTextDisabled: { color: theme.textMuted, fontSize: 16, fontWeight: "600" },
  buttonArrow: { color: theme.white, fontSize: 16, fontWeight: "600" },
  buttonArrowDisabled: { color: theme.textMuted, fontSize: 16, fontWeight: "600" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(27,43,52,0.45)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: theme.cardBackgroundSolid, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: "70%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: "700", color: theme.textPrimary },
  avatarOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    backgroundColor: theme.selectedTint,
    marginBottom: 12,
    gap: 12,
  },
  avatarOptionText: { fontSize: 16, fontWeight: "600", color: theme.textPrimary },
});
