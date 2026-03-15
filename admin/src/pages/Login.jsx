import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const styles = {
  container: {
    minHeight: "100vh",
    background: "linear-gradient(180deg, #1E40AF 0%, #3B82F6 40%, #60A5FA 100%)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    background: "#fff",
    borderRadius: 24,
    padding: 32,
    maxWidth: 400,
    width: "100%",
    boxShadow: "0 10px 40px rgba(0,0,0,0.15)",
  },
  title: { fontSize: 24, fontWeight: 700, color: "#1B2B34", marginBottom: 8, textAlign: "center" },
  subtitle: { fontSize: 14, color: "#6B7C85", marginBottom: 24, textAlign: "center" },
  label: { fontSize: 14, fontWeight: 600, color: "#1B2B34", marginBottom: 8 },
  input: {
    width: "100%",
    padding: "12px 16px",
    borderRadius: 12,
    border: "1px solid #E5E7EB",
    fontSize: 16,
    marginBottom: 16,
  },
  btn: {
    width: "100%",
    padding: 16,
    borderRadius: 30,
    border: "none",
    background: "#1EA7FD",
    color: "#fff",
    fontSize: 16,
    fontWeight: 600,
    marginTop: 8,
  },
  error: { fontSize: 14, color: "#DC2626", marginBottom: 12 },
  hint: { fontSize: 12, color: "#6B7C85", marginTop: 16, textAlign: "center" },
};

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email.trim(), password);
      navigate(location.state?.from?.pathname || "/", { replace: true });
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>H2O Admin Portal</h1>
        <p style={styles.subtitle}>Sign in to manage users, orders, and plans</p>
        <form onSubmit={handleSubmit}>
          <label style={styles.label}>Email / Username</label>
          <input
            type="text"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="e.g. H2O admin"
            style={styles.input}
            required
            autoComplete="username"
          />
          <label style={styles.label}>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            style={styles.input}
            required
            autoComplete="current-password"
          />
          {error && <p style={styles.error}>{error}</p>}
          <button type="submit" style={styles.btn} disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
        <p style={styles.hint}>Master: H2O admin / admin@H2O</p>
      </div>
    </div>
  );
}
