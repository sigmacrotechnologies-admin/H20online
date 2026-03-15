import { useState, useEffect } from "react";
import { api } from "../api/client";

const card = { background: "#f0f7fcd7", borderRadius: 16, padding: 24, marginBottom: 16 };
const table = { width: "100%", borderCollapse: "collapse" };
const th = { textAlign: "left", padding: "10px 12px", borderBottom: "2px solid #E5E7EB", fontWeight: 600 };
const td = { padding: "10px 12px", borderBottom: "1px solid #E5E7EB" };
const btn = { padding: "8px 16px", borderRadius: 8, border: "none", fontWeight: 600, cursor: "pointer" };
const btnPrimary = { ...btn, background: "#1EA7FD", color: "#fff" };

export default function DeliveryPartners() {
  const [list, setList] = useState([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    const params = { page, limit: 20 };
    if (status) params.status = status;
    api.deliveryPartners(params).then((r) => { setList(r.deliveryPartners || []); setTotal(r.total || 0); }).catch(() => setList([])).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [page, status]);

  const handleVerify = (dp) => setModal(dp);
  const handleApprove = async () => {
    if (!modal?.id) return;
    setSaving(true);
    try {
      await api.verifyDeliveryPartner(modal.id, { approve: true });
      setModal(null);
      load();
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Delivery partner onboarding</h1>
      <p style={{ color: "#6B7C85", marginBottom: 24 }}>Verify and approve delivery partners. They appear for suppliers when assigning riders.</p>
      <div style={{ marginBottom: 16, display: "flex", gap: 12 }}>
        <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ padding: "8px 12px", borderRadius: 8 }}>
          <option value="">All status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
        </select>
      </div>
      {loading ? <p>Loading...</p> : (
        <div style={{ overflowX: "auto", background: "#fff", borderRadius: 16 }}>
          <table style={table}>
            <thead>
              <tr>
                <th style={th}>Name</th>
                <th style={th}>Email</th>
                <th style={th}>Phone</th>
                <th style={th}>Vehicle</th>
                <th style={th}>Status</th>
                <th style={th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map((d) => (
                <tr key={d.id}>
                  <td style={td}>{d.name}</td>
                  <td style={td}>{d.email}</td>
                  <td style={td}>{d.phone}</td>
                  <td style={td}>{d.vehicleType}</td>
                  <td style={td}>{d.onboardingStatus}</td>
                  <td style={td}>
                    {d.onboardingStatus === "pending" && (
                      <button style={btnPrimary} onClick={() => handleVerify(d)}>Verify / Approve</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div style={{ marginTop: 16 }}>Total: {total}</div>
      {modal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10 }} onClick={() => setModal(null)}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 24, maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
            <h3>{modal.name}</h3>
            <p>Email: {modal.email} | Phone: {modal.phone}</p>
            <p>Vehicle: {modal.vehicleType}</p>
            <p>License: {modal.licenseDocument ? "Uploaded" : "—"} | Identity: {modal.identityDocument ? "Uploaded" : "—"}</p>
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button style={btnPrimary} onClick={handleApprove} disabled={saving}>{saving ? "Saving..." : "Approve"}</button>
              <button style={{ ...btn, background: "#E0F2FE" }} onClick={() => setModal(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
