import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from "react-native";

const roles = [
  { id: 1, title: "Customer", subtitle: "Home delivery & tracking" },
  { id: 2, title: "Supplier", subtitle: "Manage orders & logistics" },
  { id: 3, title: "Corporate", subtitle: "Office water management" },
  { id: 4, title: "Restaurant", subtitle: "Hospitality solutions" },
  { id: 5, title: "Event Organizer", subtitle: "Bulk event planning" },
  { id: 6, title: "Institute", subtitle: "Campus monitoring" },
];

const RoleSelectionScreen = () => {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Welcome to H2Online</Text>
      <Text style={styles.subtitle}>
        Select your role to access the ecosystem
      </Text>

      <View style={styles.grid}>
        {roles.map((role) => (
          <TouchableOpacity key={role.id} style={styles.card}>
            <Text style={styles.cardTitle}>{role.title}</Text>
            <Text style={styles.cardSubtitle}>{role.subtitle}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>Continue</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

export default RoleSelectionScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#EAF6FF",
    padding: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    textAlign: "center",
    marginTop: 20,
  },
  subtitle: {
    textAlign: "center",
    marginVertical: 10,
    color: "#555",
  },
  grid: {
    marginTop: 30,
  },
  card: {
    backgroundColor: "#FFFFFF",
    padding: 18,
    borderRadius: 16,
    marginBottom: 15,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  cardSubtitle: {
    fontSize: 13,
    color: "#777",
    marginTop: 4,
  },
  button: {
    marginTop: "auto",
    backgroundColor: "#4DA6FF",
    padding: 16,
    borderRadius: 30,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
