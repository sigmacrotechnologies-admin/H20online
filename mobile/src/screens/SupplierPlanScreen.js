import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import SupplierScreenShell from "@/src/components/supplier/SupplierScreenShell";
import { SectionCard, SupplierPageHeader, ui } from "@/src/components/supplier/supplierUi";
import { theme } from "@/src/theme";

const PLAN_TYPES = [
  {
    key: "individual",
    title: "Individual plan",
    subtitle: "Same as customer plans — jars, bottles & home delivery scheduling",
    icon: "water-outline",
    accent: theme.accent,
  },
  {
    key: "bulk",
    title: "Bulk plan",
    subtitle: "Tankers, commercial jars & bulk supply scheduling",
    icon: "bus-outline",
    accent: "#7C3AED",
  },
];

export default function SupplierPlanScreen() {
  const router = useRouter();

  return (
    <SupplierScreenShell
      showMenu
      tallHeader
      headerExtra={
        <SupplierPageHeader
          icon="document-text-outline"
          title="Supplier plans"
          subtitle="Choose individual or bulk supply subscription"
          stats={[
            { icon: "water-outline", label: "Individual", value: "Jars & bottles" },
            { icon: "bus-outline", label: "Bulk", value: "Tankers & commercial" },
          ]}
        />
      }
    >
      <ScrollView contentContainerStyle={ui.scrollContent} showsVerticalScrollIndicator={false}>
        <SectionCard icon="information-circle-outline" title="Plan types" subtitle="Select how you supply water">
          <Text style={styles.hint}>
            Individual plans match the customer subscription flow. Bulk plans cover tankers and commercial products with a separate catalog.
          </Text>
        </SectionCard>

        {PLAN_TYPES.map((plan) => (
          <TouchableOpacity
            key={plan.key}
            style={styles.card}
            activeOpacity={0.9}
            onPress={() => router.push({ pathname: "/supplier-plan-subscription", params: { category: plan.key } })}
          >
            <LinearGradient colors={[theme.medium, theme.accent]} style={styles.cardIcon}>
              <Ionicons name={plan.icon} size={26} color="#FFFFFF" />
            </LinearGradient>
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>{plan.title}</Text>
              <Text style={styles.cardSubtitle}>{plan.subtitle}</Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color={theme.textMuted} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SupplierScreenShell>
  );
}

const styles = StyleSheet.create({
  hint: { fontSize: 14, color: theme.textMuted, lineHeight: 20 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E8EDF2",
    gap: 12,
  },
  cardIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 17, fontWeight: "700", color: theme.textPrimary },
  cardSubtitle: { fontSize: 13, color: theme.textMuted, marginTop: 4, lineHeight: 18 },
});
