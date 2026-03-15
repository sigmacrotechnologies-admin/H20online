import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Image, ScrollView } from "react-native";
import { useRouter } from "expo-router";

const roles = [
  { id: 1, title: "Customer", subtitle: "Home delivery & tracking", icon: "👤" },
  { id: 2, title: "Supplier", subtitle: "Manage orders & logistics", icon: "🚚" },
  { id: 4, title: "Corporate", subtitle: "Office supply analytics", icon: "🏢" },
  { id: 5, title: "Restaurant", subtitle: "Hospitality solutions", icon: "🍽️" },
  { id: 6, title: "Event Org", subtitle: "Large volume planning", icon: "📅" },
  { id: 7, title: "Institute", subtitle: "Campus monitoring", icon: "🎓" },
];

const RoleSelectionScreen = () => {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState(roles[0]);

  const handleContinue = () => {
    if (selectedRole.title === "Customer") {
      router.push("/create-profile");
    } else if (selectedRole.title === "Supplier") {
      router.push("/supplier-onboarding");
    } else if (selectedRole.title === "Corporate") {
      router.push("/corporate-profile");
    } else {
      router.push({ pathname: "/login", params: { role: selectedRole.title } });
    }
  };

  const handleEmailLogin = () => {
    router.push({ pathname: "/login", params: { role: selectedRole.title } });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Top Icon */}
        <View style={styles.iconContainer}>
          <Image source={require("../../assets/images/H2-Logo.png")} style={styles.logo} resizeMode="contain" />
        </View>

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

        {/* Auth Options - Email & OTP login */}
        <View style={styles.authRow}>
          <TouchableOpacity
            style={styles.authButton}
            onPress={handleEmailLogin}
            activeOpacity={0.8}
          >
            <Text style={styles.authText}>✉️ Email</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.authButton}
            onPress={() => router.push({ pathname: "/login-otp", params: { role: selectedRole.title } })}
            activeOpacity={0.8}
          >
            <Text style={styles.authText}>📱 OTP</Text>
          </TouchableOpacity>
        </View>

        {/* Continue Button */}
        <TouchableOpacity
          style={styles.button}
          activeOpacity={0.9}
          onPress={handleContinue}
        >
          <Text style={styles.buttonText}>
            Continue as {selectedRole.title} →
          </Text>
        </TouchableOpacity>

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
    backgroundColor: "#c6e2fa",
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
  backgroundColor: "#f0f7fcd7",
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
    color: "#1B2B34",
    marginTop: 10,
  },

  subtitle: {
    textAlign: "center",
    color: "#6B7C85",
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
    width: "44%",
    backgroundColor: "#f0f7fcd7",
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 18,
    marginBottom: 16,
    marginLeft: 11,
    marginRight: 11,
    alignItems: "center",
    elevation: 2,
  },

  selectedCard: {
    borderWidth: 2,
    borderColor: "#8ED1FC",
    backgroundColor: "#FFFFFF",
  },

  cardIconCircle: {
    backgroundColor: "#CFF1EF",
    padding: 12,
    borderRadius: 14,
    marginBottom: 10,
  },

  cardIcon: {
    fontSize: 20, // slightly increased for better visual like UI
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#24333B",
  },

  cardSubtitle: {
    fontSize: 12,
    color: "#7A8A93",
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
    backgroundColor: "#8ED1FC",
  },

  authRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },

  authButton: {
    width: "44%",
    backgroundColor: "#EEF3F7",
    paddingVertical: 14,
    borderRadius: 11,
    marginLeft: 11,
    marginRight: 11,
    alignItems: "center",
  },

  authText: {
    fontSize: 14,
    color: "#4A5B63",
    fontWeight: "500",
  },

  button: {
    marginTop: 20,
    backgroundColor: "#1EA7FD",
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: "center",
    elevation: 3,
    marginLeft: 11,
    marginRight: 11,
  },

  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },

  footer: {
    textAlign: "center",
    fontSize: 12,
    color: "#8A9AA3",
    marginTop: 15,
  },

  link: {
    color: "#1EA7FD",
    fontWeight: "500",
  },
});
