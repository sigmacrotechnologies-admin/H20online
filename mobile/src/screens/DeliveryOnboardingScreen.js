import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/src/api/client";
import {
  ModernScreenShell,
  ModernInput,
  ModernPrimaryButton,
  modern,
} from "@/src/components/modern";
import { theme } from "@/src/theme";

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
    <ModernScreenShell
      title="Delivery partner"
      subtitle="Register to deliver water orders in your area"
      icon="bicycle-outline"
      headerHeight={210}
    >
      <Text style={modern.sectionTitle}>Vehicle type</Text>
      <Text style={[modern.sectionSubtitle, { marginBottom: 12 }]}>Select how you will deliver</Text>
      <View style={styles.vehicleRow}>
        {VEHICLE_OPTIONS.map((v) => {
          const selected = vehicleType === v.key;
          return (
            <TouchableOpacity key={v.key} style={styles.vehicleChipWrap} onPress={() => setVehicleType(v.key)} activeOpacity={0.85}>
              {selected ? (
                <LinearGradient colors={[theme.medium, theme.accent]} style={styles.vehicleChip}>
                  <Ionicons name={v.icon} size={18} color="#FFFFFF" />
                  <Text style={styles.vehicleChipTextSelected}>{v.label}</Text>
                </LinearGradient>
              ) : (
                <View style={styles.vehicleChip}>
                  <Ionicons name={v.icon} size={18} color={theme.accent} />
                  <Text style={styles.vehicleChipText}>{v.label}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <ModernInput label="Name *" icon="person-outline" value={name} onChangeText={setName} placeholder="Full name" />
      <ModernInput label="Email *" icon="mail-outline" value={email} onChangeText={setEmail} placeholder="Email" keyboardType="email-address" autoCapitalize="none" />
      <ModernInput label="Phone *" icon="call-outline" value={phone} onChangeText={setPhone} placeholder="Phone" keyboardType="phone-pad" />
      <ModernInput label="Password *" icon="lock-closed-outline" value={password} onChangeText={setPassword} placeholder="Password" secureTextEntry />
      <ModernInput label="License document" icon="document-outline" value={licenseDocument} onChangeText={setLicenseDocument} placeholder="Optional URL or reference" />
      <ModernInput label="Identity document" icon="card-outline" value={identityDocument} onChangeText={setIdentityDocument} placeholder="Optional URL or reference" />

      {error ? <Text style={modern.errorText}>{error}</Text> : null}
      <ModernPrimaryButton label="Submit for verification" onPress={handleSubmit} loading={loading} icon="checkmark-circle-outline" />
    </ModernScreenShell>
  );
}

const styles = StyleSheet.create({
  vehicleRow: { flexDirection: "row", flexWrap: "wrap", marginBottom: 8, gap: 8 },
  vehicleChipWrap: { width: "31%", minWidth: 100 },
  vehicleChip: {
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(214,234,242,0.95)",
    minHeight: 72,
  },
  vehicleChipText: { fontSize: 12, fontWeight: "600", color: theme.textPrimary, textAlign: "center" },
  vehicleChipTextSelected: { fontSize: 12, fontWeight: "700", color: "#FFFFFF", textAlign: "center" },
});
