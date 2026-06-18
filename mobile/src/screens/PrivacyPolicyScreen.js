import React from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Platform,
  StatusBar,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import BackButton from "@/src/components/BackButton";
import AppLogo from "@/src/components/AppLogo";
import DropletOverlay from "@/src/components/modern/DropletOverlay";
import { theme } from "@/src/theme";

const SECTIONS = [
  {
    title: "Introduction",
    body:
      "H2O Online (“we”, “our”, “us”) respects your privacy. This policy explains what information we collect when you use our mobile app, how we use it, and the choices you have. By using the app, you agree to this policy.",
  },
  {
    title: "Information we collect",
    body:
      "• Account details: name, email, phone number, and profile photo you provide.\n• Delivery information: saved addresses, order history, and subscription preferences.\n• Payment & wallet: transaction records and wallet balance (we do not store full card numbers on our servers).\n• Usage data: water intake logs, app interactions, and device type to improve the service.\n• Support tickets: messages you send when raising a complaint or contacting support.",
  },
  {
    title: "How we use your information",
    body:
      "We use your data to create and manage your account, process orders and subscriptions, arrange delivery, show order and billing history, operate the in-app wallet, provide customer support, send service-related notifications, and improve app performance and safety.",
  },
  {
    title: "Sharing with others",
    body:
      "We share only what is needed to fulfil your orders: suppliers and delivery partners receive your name, phone, and delivery address for active orders. We do not sell your personal information to third parties for marketing. We may share data if required by law or to protect the rights and safety of users.",
  },
  {
    title: "Data security",
    body:
      "We use industry-standard measures to protect your information, including secure connections (HTTPS) and access controls on our servers. No method of transmission over the internet is 100% secure; please use a strong password and keep your login details private.",
  },
  {
    title: "Data retention",
    body:
      "We keep your account information while your account is active and for a reasonable period afterward for legal, tax, and support purposes. You may request account deletion by contacting support through the app.",
  },
  {
    title: "Your rights",
    body:
      "You can update your profile and addresses in the app. You may request access to, correction of, or deletion of your personal data by raising a support ticket under Help & support in your profile. Where applicable under local law, you may also object to certain processing or request data portability.",
  },
  {
    title: "Children",
    body:
      "Our service is not directed at children under 13. We do not knowingly collect personal information from children. If you believe a child has provided us data, please contact us so we can remove it.",
  },
  {
    title: "Changes to this policy",
    body:
      "We may update this privacy policy from time to time. We will post the revised version in the app with an updated effective date. Continued use of the app after changes means you accept the updated policy.",
  },
  {
    title: "Contact us",
    body:
      "For privacy questions or requests, open Help & support in your profile and create a ticket, or email our support team at support@h2oonline.app.",
  },
];

const PrivacyPolicyScreen = () => {
  const androidTopInset = Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.pageBody}>
        <View style={styles.headerSection}>
          <LinearGradient
            colors={theme.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.gradientBackground, { paddingTop: 12 + androidTopInset }]}
          >
            <DropletOverlay />
            <View style={styles.headerTopRow}>
              <BackButton fallback="/profile" />
              <AppLogo size="header" />
              <View style={styles.headerSpacer} />
            </View>
            <Text style={styles.headerTitle}>Privacy policy</Text>
            <Text style={styles.headerSubtitle}>How we collect, use and protect your data</Text>
          </LinearGradient>
        </View>

        <View style={styles.contentSection}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.effective}>Effective date: 19 May 2026</Text>
            {SECTIONS.map((section) => (
              <View key={section.title} style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                <Text style={styles.sectionBody}>{section.body}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default PrivacyPolicyScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  pageBody: { flex: 1 },
  headerSection: { zIndex: 2 },
  gradientBackground: {
    paddingHorizontal: 20,
    paddingBottom: 28,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: "hidden",
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  headerSpacer: { width: 40 },
  headerTitle: { fontSize: 26, fontWeight: "700", color: "#FFFFFF", marginBottom: 4 },
  headerSubtitle: { fontSize: 14, color: "rgba(255,255,255,0.88)" },
  contentSection: {
    flex: 1,
    marginTop: -18,
    backgroundColor: theme.contentPanelBackground,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
  },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  effective: {
    fontSize: 13,
    color: theme.textMuted,
    marginBottom: 16,
    fontStyle: "italic",
  },
  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(214,234,242,0.95)",
    overflow: "hidden",
    ...Platform.select({
      ios: { shadowColor: "#0F172A", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 0 },
    }),
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.textPrimary,
    marginBottom: 8,
  },
  sectionBody: {
    fontSize: 14,
    lineHeight: 22,
    color: theme.textSecondary,
  },
});
