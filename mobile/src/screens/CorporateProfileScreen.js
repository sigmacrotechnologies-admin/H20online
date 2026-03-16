import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Image,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import BackButton, { backButtonContainerStyle } from "@/src/components/BackButton";
import { theme } from "@/src/theme";

let Slider;
try {
  Slider = require("@react-native-community/slider").default;
} catch (_) {}

const TOTAL_STEPS = 2;
const EMPLOYEE_SLIDER_MAX = 50000;

const CorporateProfileScreen = () => {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [companyName, setCompanyName] = useState("");
  const [corporateEmail, setCorporateEmail] = useState("");
  const [gstTaxId, setGstTaxId] = useState("");
  const [numberOfOffices, setNumberOfOffices] = useState(1);
  const [numberOfEmployees, setNumberOfEmployees] = useState(0);
  const [incorporationDocUri, setIncorporationDocUri] = useState(null);
  const [address, setAddress] = useState("");
  const [gstDocUri, setGstDocUri] = useState(null);
  const [levelPhotoUri, setLevelPhotoUri] = useState(null);
  const [officePhotoUri, setOfficePhotoUri] = useState(null);
  const [addressProofUri, setAddressProofUri] = useState(null);
  const [referenceContact, setReferenceContact] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleBack = () => {
    if (step === 1) router.back();
    else setStep(step - 1);
  };

  const pickDocument = (setter) => {
    let ImagePicker;
    try {
      ImagePicker = require("expo-image-picker");
    } catch (_) {
      return;
    }
    (async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") return;
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });
      if (!result.canceled) setter(result.assets[0].uri);
    })();
  };

  const validateStep1 = () => {
    if (!companyName.trim()) {
      setError("Please enter company name");
      return false;
    }
    if (!corporateEmail.trim()) {
      setError("Please enter corporate email");
      return false;
    }
    setError("");
    return true;
  };

  const onContinue = () => {
    if (step === 1) {
      if (!validateStep1()) return;
      setStep(2);
    } else {
      setLoading(true);
      setTimeout(() => {
        setLoading(false);
        router.replace("/corporate-dashboard");
      }, 400);
    }
  };

  const progress = step / TOTAL_STEPS;
  const isStep1Valid =
    companyName.trim().length > 0 &&
    corporateEmail.trim().length > 0;
  const canContinue = step === 1 ? isStep1Valid : true;

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
            <View style={[styles.headerOverlay, backButtonContainerStyle]}>
              <BackButton onPress={handleBack} />
              <Text style={styles.stepLabel}>Step {step} of {TOTAL_STEPS}: {step === 1 ? "Company Details" : "Locations & Verification"}</Text>
            </View>
            <View style={styles.progressBarContainer}>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
              </View>
            </View>
          </LinearGradient>
        </View>

        <View style={styles.contentPanel}>
          <Text style={styles.title}>Corporate Profile</Text>
          <Text style={styles.subtitle}>
            {step === 1
              ? "Set up your corporate account for bulk water management."
              : "Add address and documents if you have them. All fields are optional."}
          </Text>

          {step === 1 && (
            <>
              <View style={styles.inputSection}>
                <Text style={styles.label}>Company Name</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="business-outline" size={20} color="#6B7C85" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={companyName}
                    onChangeText={setCompanyName}
                    placeholder="e.g. H2O Systems Pvt Ltd"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>
              <View style={styles.inputSection}>
                <Text style={styles.label}>Corporate Email</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="mail-outline" size={20} color="#6B7C85" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={corporateEmail}
                    onChangeText={setCorporateEmail}
                    placeholder="admin@company.com"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              </View>
              <View style={styles.inputSection}>
                <Text style={styles.label}>GST / Tax ID</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="receipt-outline" size={20} color="#6B7C85" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={gstTaxId}
                    onChangeText={setGstTaxId}
                    placeholder="Enter registration number"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>
              <View style={styles.inputSection}>
                <Text style={styles.label}>Number of Offices</Text>
                <View style={styles.stepperContainer}>
                  <TouchableOpacity
                    style={styles.stepperButton}
                    onPress={() => setNumberOfOffices((n) => Math.max(1, n - 1))}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.stepperButtonText}>-</Text>
                  </TouchableOpacity>
                  <Text style={styles.stepperValue}>{numberOfOffices}</Text>
                  <TouchableOpacity
                    style={styles.stepperButton}
                    onPress={() => setNumberOfOffices((n) => n + 1)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.stepperButtonText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.inputSection}>
                <Text style={styles.label}>Number of Employees</Text>
                <Text style={styles.sliderValue}>{numberOfEmployees.toLocaleString()}</Text>
                {Slider ? (
                  <View style={styles.sliderWrap}>
                    <Slider
                      minimumValue={0}
                      maximumValue={EMPLOYEE_SLIDER_MAX}
                      step={100}
                      value={numberOfEmployees}
                      onValueChange={(v) => setNumberOfEmployees(Math.round(v))}
                      minimumTrackTintColor={theme.primary}
                      maximumTrackTintColor="#E5E7EB"
                      thumbTintColor={theme.primary}
                    />
                  </View>
                ) : (
                  <View style={styles.sliderFallback}>
                    <TextInput
                      style={styles.sliderInput}
                      value={String(numberOfEmployees)}
                      onChangeText={(t) => {
                        const n = parseInt(t.replace(/\D/g, ""), 10);
                        if (!isNaN(n)) setNumberOfEmployees(Math.min(EMPLOYEE_SLIDER_MAX, Math.max(0, n)));
                      }}
                      keyboardType="number-pad"
                      placeholder="0"
                      placeholderTextColor="#9CA3AF"
                    />
                    <Text style={styles.sliderMaxHint}>Max {EMPLOYEE_SLIDER_MAX.toLocaleString()}</Text>
                  </View>
                )}
              </View>
              <View style={styles.inputSection}>
                <Text style={styles.label}>Company Incorporation Doc (optional)</Text>
                <TouchableOpacity
                  style={styles.uploadBox}
                  onPress={() => pickDocument(setIncorporationDocUri)}
                  activeOpacity={0.8}
                >
                  {incorporationDocUri ? (
                    <Image source={{ uri: incorporationDocUri }} style={styles.uploadPreview} />
                  ) : (
                    <>
                      <Ionicons name="cloud-upload-outline" size={40} color={theme.primary} />
                      <Text style={styles.uploadText}>Tap to upload PDF or JPG</Text>
                      <Text style={styles.uploadHint}>Max file size 5MB</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}

          {step === 2 && (
            <>
              <View style={styles.inputSection}>
                <Text style={styles.label}>Address (optional)</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="location-outline" size={20} color="#6B7C85" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={address}
                    onChangeText={setAddress}
                    placeholder="Street, building, city, pincode"
                    placeholderTextColor="#9CA3AF"
                    multiline
                    numberOfLines={2}
                  />
                </View>
              </View>
              <View style={styles.inputSection}>
                <Text style={styles.label}>Reference Contact Number (optional)</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="call-outline" size={20} color="#6B7C85" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={referenceContact}
                    onChangeText={setReferenceContact}
                    placeholder="Enter reference contact number"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="phone-pad"
                  />
                </View>
              </View>
              <Text style={styles.docSectionTitle}>Documents (all optional)</Text>
              <View style={styles.uploadRow}>
                <View style={styles.uploadItem}>
                  <Text style={styles.uploadItemLabel}>GST Document</Text>
                  <TouchableOpacity style={styles.uploadSmall} onPress={() => pickDocument(setGstDocUri)} activeOpacity={0.8}>
                    {gstDocUri ? (
                      <Image source={{ uri: gstDocUri }} style={styles.uploadSmallPreview} />
                    ) : (
                      <>
                        <Ionicons name="document-outline" size={28} color={theme.primary} />
                        <Text style={styles.uploadSmallText}>Upload</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  {gstDocUri ? <TouchableOpacity onPress={() => pickDocument(setGstDocUri)}><Text style={styles.changePhotoText}>Change photo</Text></TouchableOpacity> : null}
                </View>
                <View style={styles.uploadItem}>
                  <Text style={styles.uploadItemLabel}>Floor / Level photo</Text>
                  <TouchableOpacity style={styles.uploadSmall} onPress={() => pickDocument(setLevelPhotoUri)} activeOpacity={0.8}>
                    {levelPhotoUri ? (
                      <Image source={{ uri: levelPhotoUri }} style={styles.uploadSmallPreview} />
                    ) : (
                      <>
                        <Ionicons name="layers-outline" size={28} color={theme.primary} />
                        <Text style={styles.uploadSmallText}>Upload</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  {levelPhotoUri ? <TouchableOpacity onPress={() => pickDocument(setLevelPhotoUri)}><Text style={styles.changePhotoText}>Change photo</Text></TouchableOpacity> : null}
                </View>
              </View>
              <View style={styles.uploadRow}>
                <View style={styles.uploadItem}>
                  <Text style={styles.uploadItemLabel}>Office photo</Text>
                  <TouchableOpacity style={styles.uploadSmall} onPress={() => pickDocument(setOfficePhotoUri)} activeOpacity={0.8}>
                    {officePhotoUri ? (
                      <Image source={{ uri: officePhotoUri }} style={styles.uploadSmallPreview} />
                    ) : (
                      <>
                        <Ionicons name="business-outline" size={28} color={theme.primary} />
                        <Text style={styles.uploadSmallText}>Upload</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  {officePhotoUri ? <TouchableOpacity onPress={() => pickDocument(setOfficePhotoUri)}><Text style={styles.changePhotoText}>Change photo</Text></TouchableOpacity> : null}
                </View>
                <View style={styles.uploadItem}>
                  <Text style={styles.uploadItemLabel}>Address proof</Text>
                  <TouchableOpacity style={styles.uploadSmall} onPress={() => pickDocument(setAddressProofUri)} activeOpacity={0.8}>
                    {addressProofUri ? (
                      <Image source={{ uri: addressProofUri }} style={styles.uploadSmallPreview} />
                    ) : (
                      <>
                        <Ionicons name="location-outline" size={28} color={theme.primary} />
                        <Text style={styles.uploadSmallText}>Upload</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  {addressProofUri ? <TouchableOpacity onPress={() => pickDocument(setAddressProofUri)}><Text style={styles.changePhotoText}>Change photo</Text></TouchableOpacity> : null}
                </View>
              </View>
            </>
          )}

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.continueButton, (!canContinue || loading) && styles.continueButtonDisabled]}
            onPress={onContinue}
            activeOpacity={canContinue && !loading ? 0.9 : 1}
            disabled={!canContinue || loading}
          >
            <View style={styles.buttonContent}>
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Text style={canContinue && !loading ? styles.buttonText : styles.buttonTextDisabled}>
                    {step === 1 ? "Continue to Locations →" : "Continue to Profile Creation"}
                  </Text>
                </>
              )}
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default CorporateProfileScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.screenBackground, paddingHorizontal: 20 },
  scrollContent: { paddingBottom: 30 },
  headerSection: { marginTop: -10, marginLeft: -20, marginRight: -20, height: 140, overflow: "hidden" },
  gradientBackground: { flex: 1, paddingTop: 50, paddingHorizontal: 20, paddingBottom: 12 },
  headerOverlay: { flexDirection: "row", alignItems: "center", right: 20 },
  stepLabel: { flex: 1, fontSize: 13, color: "#FFFFFF", fontWeight: "600", marginLeft: 12 },
  progressBarContainer: { marginTop: 4 },
  progressBarBg: { height: 6, backgroundColor: "rgba(255,255,255,0.4)", borderRadius: 3, overflow: "hidden" },
  progressBarFill: { height: "100%", backgroundColor: "#FFFFFF", borderRadius: 3 },
  contentPanel: { marginTop: -20, marginLeft: 2, marginRight: 2, backgroundColor: theme.screenBackground, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 28, paddingHorizontal: 20, overflow: "hidden" },
  title: { fontSize: 26, fontWeight: "700", textAlign: "center", color: "#1B2B34", marginBottom: 8 },
  subtitle: { textAlign: "center", color: "#6B7C85", marginBottom: 25, fontSize: 14 },
  inputSection: { marginBottom: 20 },
  label: { fontSize: 15, fontWeight: "600", color: "#1B2B34", marginBottom: 10 },
  inputContainer: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.7)", borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.8)", elevation: 3 },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16, color: "#1B2B34", padding: 0 },
  stepperContainer: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.7)", borderRadius: 16, paddingVertical: 10, paddingHorizontal: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.8)", elevation: 3 },
  stepperButton: { width: 36, height: 36, justifyContent: "center", alignItems: "center" },
  stepperButtonText: { fontSize: 22, color: "#6B7C85", fontWeight: "600" },
  stepperValue: { flex: 1, textAlign: "center", fontSize: 18, fontWeight: "700", color: "#1B2B34" },
  uploadBox: { backgroundColor: "rgba(255,255,255,0.7)", borderRadius: 16, borderWidth: 2, borderStyle: "dashed", borderColor: "#8ED1FC", padding: 24, alignItems: "center", justifyContent: "center", minHeight: 120, elevation: 2 },
  uploadText: { fontSize: 15, color: "#1B2B34", fontWeight: "600", marginTop: 8 },
  uploadHint: { fontSize: 12, color: "#6B7C85", marginTop: 4 },
  uploadPreview: { width: "100%", height: 120, borderRadius: 12, backgroundColor: "#f0f0f0" },
  sliderValue: { fontSize: 22, fontWeight: "700", color: "#1B2B34", textAlign: "center", marginBottom: 8 },
  sliderWrap: { paddingHorizontal: 8 },
  sliderFallback: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12 },
  sliderInput: { width: 120, backgroundColor: "rgba(255,255,255,0.7)", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 18, fontWeight: "600", color: "#1B2B34", textAlign: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.8)" },
  sliderMaxHint: { fontSize: 13, color: "#6B7C85" },
  docSectionTitle: { fontSize: 16, fontWeight: "700", color: "#1B2B34", marginBottom: 12, marginTop: 8 },
  uploadRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  uploadItem: { flex: 1, alignItems: "center" },
  uploadItemLabel: { fontSize: 13, fontWeight: "600", color: "#1B2B34", marginBottom: 8 },
  uploadSmall: { width: "100%", minHeight: 100, backgroundColor: "rgba(255,255,255,0.7)", borderRadius: 12, borderWidth: 2, borderStyle: "dashed", borderColor: "#8ED1FC", alignItems: "center", justifyContent: "center", padding: 12 },
  uploadSmallPreview: { width: "100%", height: 80, borderRadius: 8, backgroundColor: "#f0f0f0" },
  uploadSmallText: { fontSize: 12, color: theme.primary, fontWeight: "600", marginTop: 6 },
  changePhotoText: { fontSize: 12, color: theme.primary, fontWeight: "600", marginTop: 6 },
  errorText: { fontSize: 14, color: "#DC2626", marginBottom: 12, fontWeight: "500" },
  continueButton: { marginTop: 20, marginBottom: 24, backgroundColor: theme.primary, paddingVertical: 16, borderRadius: 30, alignItems: "center", elevation: 3 },
  continueButtonDisabled: { backgroundColor: "#EEF3F7", elevation: 1 },
  buttonContent: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  buttonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
  buttonTextDisabled: { color: "#8A9AA3", fontSize: 16, fontWeight: "600" },
});
