import React from "react";
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Linking, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import BackButton from "@/src/components/BackButton";

export default function DeliveryHelpScreen() {
  const router = useRouter();
  const supportEmail = "support@h2online.com";
  const supportPhone = "+91 1800-XXX-XXXX";

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <BackButton onPress={() => router.back()} />
        <Text style={styles.headerTitle}>Help</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How it works</Text>
          <Text style={styles.para}>Suppliers assign orders to you from their dashboard. You will see assigned orders under Incoming orders.</Text>
          <Text style={styles.para}>Complete deliveries and mark orders as delivered. Your earnings and summary are available under Financials and Order summary.</Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact support</Text>
          <TouchableOpacity style={styles.contactRow} onPress={() => Linking.openURL("mailto:" + supportEmail)}>
            <Ionicons name="mail-outline" size={24} color="#1EA7FD" />
            <Text style={styles.contactText}>{supportEmail}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.contactRow} onPress={() => Linking.openURL("tel:" + supportPhone)}>
            <Ionicons name="call-outline" size={24} color="#1EA7FD" />
            <Text style={styles.contactText}>{supportPhone}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#c6e2fa", paddingHorizontal: 20 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#1B2B34" },
  scrollContent: { paddingBottom: 40 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#1B2B34", marginBottom: 10 },
  para: { fontSize: 14, color: "#6B7C85", marginBottom: 8, lineHeight: 22 },
  contactRow: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.9)", padding: 16, borderRadius: 14, marginBottom: 10 },
  contactText: { fontSize: 15, color: "#1EA7FD", fontWeight: "600", marginLeft: 12 },
});
