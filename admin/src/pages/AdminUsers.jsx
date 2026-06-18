import { useState } from "react";
import { api } from "../api/client";
import PageHeader from "../components/PageHeader";

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
    <div className="admin-page">
      <PageHeader
        title="Admin users"
        subtitle="Create admin or sub-admin users. Sub-admin cannot see financials, delete users, or remove suppliers."
      />
      <div className="card" style={{ maxWidth: 480 }}>
        <h3 className="card-title">Create admin / sub-admin</h3>
        <form onSubmit={handleCreate}>
          <div className="form-group">
            <input required className="input" style={{ width: "100%" }} placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="form-group">
            <input required type="email" className="input" style={{ width: "100%" }} placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="form-group">
            <input required type="password" className="input" style={{ width: "100%" }} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div className="form-group">
            <select className="select" style={{ width: "100%" }} value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="admin">Admin (full access except master-only)</option>
              <option value="sub-admin">Sub-admin (limited access)</option>
            </select>
          </div>
          {message && (
            <p className={message.includes("created") ? "text-success" : "text-danger"} style={{ fontSize: "0.875rem", marginBottom: 12 }}>
              {message}
            </p>
          )}
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Creating..." : "Create"}
          </button>
        </form>
      </div>
    </div>
  );
}
