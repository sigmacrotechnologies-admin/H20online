import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import BackButton, { backButtonContainerStyle } from "@/src/components/BackButton";
import { theme } from "@/src/theme";

const SAMPLE_INVOICES = [
  { id: "1", name: "June Invoice.pdf", date: "Jun 30, 2025", amount: "₹24,500" },
  { id: "2", name: "May Invoice.pdf", date: "May 31, 2025", amount: "₹22,100" },
  { id: "3", name: "April Invoice.pdf", date: "Apr 30, 2025", amount: "₹23,800" },
  { id: "4", name: "March Invoice.pdf", date: "Mar 31, 2025", amount: "₹21,400" },
  { id: "5", name: "February Invoice.pdf", date: "Feb 28, 2025", amount: "₹19,600" },
  { id: "6", name: "January Invoice.pdf", date: "Jan 31, 2025", amount: "₹20,200" },
];

const CorporateInvoicesScreen = () => {
  const router = useRouter();

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
              <BackButton />
              <Text style={styles.headerTitle}>All Invoices</Text>
            </View>
          </LinearGradient>
        </View>

        <View style={styles.contentPanel}>
          <Text style={styles.subtitle}>Past billing cycles. Tap to download.</Text>
          {SAMPLE_INVOICES.map((inv) => (
            <TouchableOpacity key={inv.id} style={styles.invoiceCard} activeOpacity={0.8}>
              <View style={styles.invoiceLeft}>
                <Ionicons name="document-text" size={28} color={theme.primary} />
                <View style={styles.invoiceInfo}>
                  <Text style={styles.invoiceName}>{inv.name}</Text>
                  <Text style={styles.invoiceDate}>{inv.date}</Text>
                </View>
              </View>
              <View style={styles.invoiceRight}>
                <Text style={styles.invoiceAmount}>{inv.amount}</Text>
                <Ionicons name="download-outline" size={22} color="#6B7C85" />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default CorporateInvoicesScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.screenBackground, paddingHorizontal: 20 },
  scrollContent: { paddingBottom: 40 },
  headerSection: { marginTop: -10, marginLeft: -20, marginRight: -20, height: 100, overflow: "hidden" },
  gradientBackground: { flex: 1, paddingTop: 14, paddingHorizontal: 20 },
  headerOverlay: { flexDirection: "row", alignItems: "center", right: 20 },
  headerTitle: { fontSize: 20, fontWeight: "700", color: "#FFFFFF", marginLeft: 12 },
  contentPanel: { marginTop: -20, marginLeft: 2, marginRight: 2, backgroundColor: "#F8FCFD", borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingTop: 24, paddingHorizontal: 20 },
  subtitle: { fontSize: 14, color: "#6B7C85", marginBottom: 20 },
  invoiceCard: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "rgba(255,255,255,0.85)", borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.9)", elevation: 2 },
  invoiceLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  invoiceInfo: { marginLeft: 14 },
  invoiceName: { fontSize: 16, fontWeight: "600", color: "#1B2B34" },
  invoiceDate: { fontSize: 13, color: "#6B7C85", marginTop: 4 },
  invoiceRight: { flexDirection: "row", alignItems: "center", gap: 12 },
  invoiceAmount: { fontSize: 16, fontWeight: "700", color: "#1B2B34" },
});
