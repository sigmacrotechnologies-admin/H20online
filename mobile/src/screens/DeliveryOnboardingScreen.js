import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, TextInput, ActivityIndicator } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import BackButton from "@/src/components/BackButton";
import { api } from "@/src/api/client";

const VEHICLE_OPTIONS = [
  { key: "bicycle", label: "Bicycle", icon: "bicycle-outline" },
  { key: "cycle", label: "Cycle", icon: "bicycle-outline" },
  { key: "bike", label: "Bike", icon: "bicycle-outline" },
  { key: "minivan", label: "Minivan", icon: "car-outline" },
  { key: "truck", label: "Truck", icon: "car-outline" },
  { key: "camper", label: "Camper", icon: "car-outline" },
];

export default function DeliveryOnboardingScreen() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [vehicleType, setVehicleType] = useState("");
  const [licenseDocument, setLicenseDocument] = useState("");
  const [identityDocument, setIdentityDocument] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setError("");
    if (!name.trim() || !email.trim() || !phone.trim() || !password.trim() || !vehicleType) {
      setError("Please fill name, email, phone, password and select vehicle type.");
      return;
    }
    setLoading(true);
    try {
      await api.auth.registerDelivery({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
        vehicleType,
        licenseDocument: licenseDocument.trim(),
        identityDocument: identityDocument.trim(),
      });
      router.replace("/delivery-verification-pending");
    } catch (e) {
      setError(e.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerPanel}>
        <LinearGradient colors={["#1E40AF", "#3B82F6", "#60A5FA"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradientBackground}>
          <View style={styles.headerRow}>
            <BackButton onPress={() => router.back()} />
            <View style={styles.headerCenter}><Text style={styles.headerTitle}>Delivery partner</Text></View>
            <View style={{ width: 40 }} />
          </View>
        </LinearGradient>
      </View>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Text style={styles.sectionTitle}>Vehicle type</Text>
          <View style={styles.vehicleRow}>
            {VEHICLE_OPTIONS.map((v) => (
              <TouchableOpacity
                key={v.key}
                style={[styles.vehicleChip, vehicleType === v.key && styles.vehicleChipSelected]}
                onPress={() => setVehicleType(v.key)}
              >
                <Text style={[styles.vehicleChipText, vehicleType === v.key && styles.vehicleChipTextSelected]}>{v.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.label}>Name *</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Full name" placeholderTextColor="#9CA3AF" />
          <Text style={styles.label}>Email *</Text>
          <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="Email" keyboardType="email-address" placeholderTextColor="#9CA3AF" />
          <Text style={styles.label}>Phone *</Text>
          <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="Phone" keyboardType="phone-pad" placeholderTextColor="#9CA3AF" />
          <Text style={styles.label}>Password *</Text>
          <TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="Password" secureTextEntry placeholderTextColor="#9CA3AF" />
          <Text style={styles.label}>License document (URL or ref)</Text>
          <TextInput style={styles.input} value={licenseDocument} onChangeText={setLicenseDocument} placeholder="Optional" placeholderTextColor="#9CA3AF" />
          <Text style={styles.label}>Identity document (URL or ref)</Text>
          <TextInput style={styles.input} value={identityDocument} onChangeText={setIdentityDocument} placeholder="Optional" placeholderTextColor="#9CA3AF" />
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <TouchableOpacity style={[styles.submitBtn, loading && styles.submitBtnDisabled]} onPress={handleSubmit} disabled={loading}>
            {loading ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.submitBtnText}>Submit for verification</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#c6e2fa", paddingHorizontal: 20 },
  headerPanel: { marginTop: -10, marginLeft: -20, marginRight: -20, height: 140, overflow: "hidden" },
  gradientBackground: { flex: 1, paddingTop: 50, paddingHorizontal: 20 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerCenter: { flex: 1, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#FFFFFF" },
  scroll: { paddingBottom: 40 },
  content: { marginTop: -20, marginLeft: 11, marginRight: 11, backgroundColor: "#c6e2fa", borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 28, paddingHorizontal: 20 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#1B2B34", marginBottom: 12 },
  vehicleRow: { flexDirection: "row", flexWrap: "wrap", marginBottom: 20 },
  vehicleChip: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.8)", marginRight: 10, marginBottom: 10 },
  vehicleChipSelected: { backgroundColor: "#1EA7FD" },
  vehicleChipText: { fontSize: 14, color: "#1B2B34" },
  vehicleChipTextSelected: { color: "#FFF" },
  label: { fontSize: 15, fontWeight: "600", color: "#1B2B34", marginBottom: 8 },
  input: { backgroundColor: "rgba(255,255,255,0.9)", borderRadius: 14, padding: 14, fontSize: 16, marginBottom: 16 },
  errorText: { fontSize: 14, color: "#DC2626", marginBottom: 12 },
  submitBtn: { backgroundColor: "#1EA7FD", paddingVertical: 16, borderRadius: 30, alignItems: "center", marginTop: 8 },
  submitBtnDisabled: { opacity: 0.7 },
  submitBtnText: { color: "#FFF", fontSize: 16, fontWeight: "600" },
});
