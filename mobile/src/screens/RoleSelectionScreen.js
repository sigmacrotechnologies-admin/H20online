import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Image, ScrollView, Alert } from "react-native";
import { useRouter } from "expo-router";
import { theme } from "@/src/theme";

const roles = [
  { id: 1, title: "Customer", subtitle: "Home delivery & tracking", icon: "👤" },
  { id: 2, title: "Partner", subtitle: "Manage orders & logistics", icon: "🚚" },
  { id: 4, title: "Corporate", subtitle: "Office supply analytics", icon: "🏢", comingSoon: true },
  { id: 5, title: "Restaurant", subtitle: "Hospitality solutions", icon: "🍽️", comingSoon: true },
  { id: 6, title: "Event Org", subtitle: "Large volume planning", icon: "📅", comingSoon: true },
  { id: 7, title: "Institute", subtitle: "Campus monitoring", icon: "🎓", comingSoon: true },
];

const COMING_SOON_MESSAGES = {
  Corporate: "Corporate feature is coming soon.",
  Restaurant: "Restaurant feature is coming soon.",
  "Event Org": "Event org feature is coming soon.",
  Institute: "Institute feature is coming soon.",
};

const RoleSelectionScreen = ({ onReplayLoading }) => {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState(roles[0]);

  const handleContinue = () => {
    if (selectedRole.comingSoon) {
      Alert.alert("Coming soon", COMING_SOON_MESSAGES[selectedRole.title] || "This feature is coming soon.");
      return;
    }
    if (selectedRole.title === "Customer") {
      router.push("/create-profile");
    } else if (selectedRole.title === "Partner") {
      router.push("/supplier-onboarding");
    }
  };

  const getSignupButtonText = () => {
    if (selectedRole.comingSoon) return `Continue as ${selectedRole.title}`;
    if (selectedRole.title === "Customer") return "Sign up as customer";
    if (selectedRole.title === "Partner") return "Sign up as partner or supplier";
    return `Continue as ${selectedRole.title}`;
  };

  const getLoginButtonText = () => {
    if (selectedRole.title === "Customer") return "Login as customer";
    if (selectedRole.title === "Partner") return "Login as supplier";
    return `Login as ${selectedRole.title}`;
  };

  const handleLogin = (roleParam) => {
    const roleConfig = roles.find((r) => r.title === roleParam);
    if (roleConfig?.comingSoon) {
      Alert.alert("Coming soon", COMING_SOON_MESSAGES[roleParam] || "This feature is coming soon.");
      return;
    }
    router.push({ pathname: "/login", params: { role: roleParam } });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Top Icon - tap to replay loading screen */}
        <TouchableOpacity
          style={styles.iconContainer}
          onPress={onReplayLoading}
          activeOpacity={0.9}
        >
          <Image source={require("../../assets/images/H2-Logo.png")} style={styles.logo} resizeMode="contain" />
        </TouchableOpacity>

        {/* Header */}
        <Text style={styles.title}>Welcome to H2Online</Text>
        <Text style={styles.subtitle}>
          Select your role to access the ecosystem
        </Text>

        {/* Role Grid (tiles) */}
        <View style={styles.grid}>
          {roles.map((role) => {
            const isSelected = selectedRole.title === role.title;
            return (
              <TouchableOpacity
                key={role.id}
                style={[styles.card, isSelected && styles.selectedCard]}
                onPress={() => setSelectedRole(role)}
                activeOpacity={0.8}
              >
                <View style={styles.cardIconCircle}>
                  <Text style={styles.cardIcon}>{role.icon}</Text>
                </View>
                <Text style={styles.cardTitle}>{role.title}</Text>
                <Text style={styles.cardSubtitle}>{role.subtitle}</Text>
                {isSelected && <View style={styles.tick} />}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Partner tile: three options; others: login + signup */}
        {selectedRole.title === "Partner" ? (
          <>
            <TouchableOpacity
              style={[styles.actionButton, styles.loginButton]}
              onPress={() => handleLogin("Supplier")}
              activeOpacity={0.8}
            >
              <Text style={styles.loginButtonText}>Login as supplier</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.loginButton]}
              onPress={() => handleLogin("Delivery partner")}
              activeOpacity={0.8}
            >
              <Text style={styles.loginButtonText}>Login as partner</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.signupButton]}
              activeOpacity={0.9}
              onPress={handleContinue}
            >
              <Text style={styles.signupButtonText}>Sign up as partner or supplier →</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity
              style={[styles.actionButton, styles.loginButton]}
              onPress={() => handleLogin(selectedRole.title)}
              activeOpacity={0.8}
            >
              <Text style={styles.loginButtonText}>{getLoginButtonText()}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.signupButton]}
              activeOpacity={0.9}
              onPress={handleContinue}
            >
              <Text style={styles.signupButtonText}>{getSignupButtonText()} →</Text>
            </TouchableOpacity>
          </>
        )}

        {/* Footer */}
        <Text style={styles.footer}>
          By continuing, you agree to our{" "}
          <Text style={styles.link}>Terms</Text> &{" "}
          <Text style={styles.link}>Privacy Policy</Text>
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

export default RoleSelectionScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  iconContainer: {
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 10,
    backgroundColor: "rgba(255,255,255,0.9)",
    padding: 1,
    borderRadius: 50,
    elevation: 2,
  },

  logo: {
    width: 80,
    height: 80,
  },

  icon: {
    fontSize: 28,
  },

  title: {
    fontSize: 26,
    fontWeight: "700",
    textAlign: "center",
    color: theme.textPrimary,
    marginTop: 10,
  },

  subtitle: {
    textAlign: "center",
    color: theme.textSecondary,
    marginTop: 6,
    marginBottom: 25,
    fontSize: 14,
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  card: {
    // Keep 2 columns even on smaller phones by sizing relative to available width
    // (ScrollView already applies `paddingHorizontal: 20`, so two ~48% cards fit).
    width: "48%",
    backgroundColor: "rgba(255,255,255,0.75)",
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 18,
    marginBottom: 16,
    alignItems: "center",
    elevation: 2,
  },

  selectedCard: {
    borderWidth: 2,
    borderColor: theme.medium,
    backgroundColor: "#FFFFFF",
  },

  cardIconCircle: {
    backgroundColor: "rgba(51,175,193,0.2)",
    padding: 12,
    borderRadius: 14,
    marginBottom: 10,
  },

  cardIcon: {
    fontSize: 20,
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.textPrimary,
  },

  cardSubtitle: {
    fontSize: 12,
    color: theme.textMuted,
    textAlign: "center",
    marginTop: 4,
  },

  tick: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: theme.medium,
  },

  actionButton: {
    marginTop: 12,
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
    marginLeft: 11,
    marginRight: 11,
    minHeight: 52,
  },

  loginButton: {
    backgroundColor: theme.medium,
  },

  loginButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },

  signupButton: {
    backgroundColor: theme.accent,
  },

  signupButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },

  footer: {
    textAlign: "center",
    fontSize: 12,
    color: theme.textMuted,
    marginTop: 15,
  },

  link: {
    color: theme.link,
    fontWeight: "500",
  },
});
