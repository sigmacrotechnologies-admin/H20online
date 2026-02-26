import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/src/context/AuthContext";

const LoginScreen = () => {
  const router = useRouter();
  const { login, register } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setError("");
    if (!email.trim() || !password.trim()) {
      setError("Email and password required");
      return;
    }
    if (isRegister && !name.trim()) {
      setError("Name required");
      return;
    }
    setLoading(true);
    try {
      if (isRegister) await register({ name: name.trim(), email: email.trim(), password });
      else await login(email.trim(), password);
      router.replace("/dashboard");
    } catch (err) {
      setError(err.message || "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#1B2B34" />
        </TouchableOpacity>
        <Text style={styles.title}>{isRegister ? "Register" : "Login"}</Text>
      </View>
      <View style={styles.form}>
        {isRegister && (
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Full name" placeholderTextColor="#9CA3AF" autoCapitalize="words" />
        )}
        <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="Email" placeholderTextColor="#9CA3AF" keyboardType="email-address" autoCapitalize="none" />
        <TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="Password" placeholderTextColor="#9CA3AF" secureTextEntry />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <TouchableOpacity style={styles.btn} onPress={handleSubmit} disabled={loading}>
          <Text style={styles.btnText}>{loading ? "..." : isRegister ? "Register" : "Login"}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.toggle} onPress={() => { setIsRegister(!isRegister); setError(""); }}>
          <Text style={styles.toggleText}>{isRegister ? "Already have an account? Login" : "No account? Register"}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#c6e2fa" },
  header: { flexDirection: "row", alignItems: "center", padding: 20 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#f0f7fcd7", justifyContent: "center", alignItems: "center", marginRight: 12 },
  title: { fontSize: 22, fontWeight: "700", color: "#1B2B34" },
  form: { padding: 20 },
  input: { backgroundColor: "#f0f7fcd7", borderRadius: 14, padding: 16, fontSize: 16, marginBottom: 12, color: "#1B2B34" },
  error: { color: "#EF4444", marginBottom: 12 },
  btn: { backgroundColor: "#0EA5E9", paddingVertical: 16, borderRadius: 20, alignItems: "center" },
  btnText: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
  toggle: { marginTop: 20, alignItems: "center" },
  toggleText: { fontSize: 14, color: "#0EA5E9", fontWeight: "600" },
});
