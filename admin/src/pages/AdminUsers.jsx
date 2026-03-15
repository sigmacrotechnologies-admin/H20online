import { useState } from "react";
import { api } from "../api/client";

const card = { background: "#f0f7fcd7", borderRadius: 16, padding: 24, maxWidth: 400, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" };
const input = { padding: "10px 12px", borderRadius: 8, border: "1px solid #E5E7EB", width: "100%", marginBottom: 12 };
const btn = { padding: "10px 20px", borderRadius: 8, border: "none", fontWeight: 600, cursor: "pointer" };
const btnPrimary = { ...btn, background: "#1EA7FD", color: "#fff" };

export default function AdminUsers() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("sub-admin");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleCreate = async (e) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);
    try {
      await api.createAdmin({ name, email, password, role });
      setMessage("Admin user created. They can log in with email and password.");
      setName("");
      setEmail("");
      setPassword("");
    } catch (err) {
      setMessage(err.message || "Failed to create");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Admin users</h1>
      <p style={{ color: "#6B7C85", marginBottom: 24 }}>
        Create admin or sub-admin users. Sub-admin cannot see financials, delete users, or remove suppliers.
      </p>
      <div style={card}>
        <h3 style={{ marginTop: 0 }}>Create admin / sub-admin</h3>
        <form onSubmit={handleCreate}>
          <input required placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} style={input} />
          <input required type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} style={input} />
          <input required type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} style={input} />
          <select value={role} onChange={(e) => setRole(e.target.value)} style={{ ...input, marginBottom: 16 }}>
            <option value="admin">Admin (full access except master-only)</option>
            <option value="sub-admin">Sub-admin (users, orders, add suppliers; no financials, no delete user, no remove supplier)</option>
          </select>
          {message && <p style={{ fontSize: 14, color: message.includes("created") ? "#059669" : "#DC2626", marginBottom: 12 }}>{message}</p>}
          <button type="submit" style={btnPrimary} disabled={loading}>{loading ? "Creating..." : "Create"}</button>
        </form>
      </div>
    </div>
  );
}
