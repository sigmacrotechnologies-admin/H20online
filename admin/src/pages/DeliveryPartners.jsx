import { useState, useEffect } from "react";
import { api } from "../api/client";

const tableWrap = { overflowX: "auto", background: "#fff", borderRadius: 16, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" };
const table = { width: "100%", borderCollapse: "collapse", fontSize: 14 };
const th = { textAlign: "left", padding: "10px 12px", borderBottom: "2px solid #E5E7EB", fontWeight: 600, color: "#1B2B34" };
const td = { padding: "10px 12px", borderBottom: "1px solid #E5E7EB", color: "#1B2B34" };
const input = { padding: "8px 12px", borderRadius: 8, border: "1px solid #E5E7EB", marginRight: 8 };
const btnSmall = { padding: "6px 12px", borderRadius: 8, border: "none", background: "#E0F2FE", color: "#1B2B34", cursor: "pointer", fontSize: 13 };
const btnPrimary = { padding: "10px 20px", borderRadius: 8, border: "none", background: "#1EA7FD", color: "#fff", fontWeight: 600, cursor: "pointer" };
const tabStyle = (active) => ({
  padding: "10px 20px",
  borderRadius: 8,
  border: "none",
  background: active ? "#1EA7FD" : "#E0F2FE",
  color: active ? "#fff" : "#1B2B34",
  fontWeight: 600,
  cursor: "pointer",
});

const VERIFICATION_FIELDS = [
  { key: "documentLicenseVerified", label: "ID proof" },
  { key: "documentIdentityVerified", label: "Address proof" },
  { key: "documentVehicleIdentificationVerified", label: "Other documentation" },
];

export default function DeliveryPartners() {
  const [tab, setTab] = useState("all");
  const [list, setList] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [verifyModal, setVerifyModal] = useState(null);
  const [verifyForm, setVerifyForm] = useState({});
  const [verifySaving, setVerifySaving] = useState(false);
  const limit = 20;

  const load = async () => {
    setLoading(true);
    try {
      const params = { search, page, limit };
      if (tab === "verification") params.status = "pending";
      else if (status) params.status = status;
      const res = await api.deliveryPartners(params);
      setList(res.deliveryPartners || []);
      setTotal(res.total || 0);
    } catch (e) {
      console.error(e);
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [page, status, tab]);
  useEffect(() => {
    const t = setTimeout(() => { if (search !== undefined) load(); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const openVerify = (d) => {
    setVerifyModal(d);
    setVerifyForm({
      documentLicenseVerified: !!d.documentLicenseVerified,
      documentIdentityVerified: !!d.documentIdentityVerified,
      documentVehicleIdentificationVerified: !!d.documentVehicleIdentificationVerified,
      tentativeVerificationTime: d.tentativeVerificationTime || "24-48 hours",
    });
  };

  const handleVerifySave = async (approve = false) => {
    if (!verifyModal?.id) return;
    setVerifySaving(true);
    try {
      await api.verifyDeliveryPartner(verifyModal.id, { ...verifyForm, approve });
      setVerifyModal(null);
      load();
    } catch (e) {
      alert(e.message);
    } finally {
      setVerifySaving(false);
    }
  };

  return (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Delivery partner onboarding</h1>
      <p style={{ color: "#6B7C85", marginBottom: 24 }}>
        Verify and approve delivery partners. New sign-ups appear in <strong>Delivery partner verification</strong> until all checks are validated.
      </p>
      <div style={{ marginBottom: 16, display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
        <button style={tabStyle(tab === "all")} onClick={() => setTab("all")}>All delivery partners</button>
        <button style={tabStyle(tab === "verification")} onClick={() => setTab("verification")}>Delivery partner verification</button>
        <input type="text" placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)} style={{ ...input, minWidth: 180 }} />
        {tab === "all" && (
          <select value={status} onChange={(e) => setStatus(e.target.value)} style={input}>
            <option value="">All status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
          </select>
        )}
        <button style={btnPrimary} onClick={() => alert("Delivery partners register through the mobile app.")}>+ Add delivery partner</button>
      </div>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          <div style={tableWrap}>
            <table style={table}>
              <thead>
                <tr>
                  <th style={th}>Name</th>
                  <th style={th}>Email</th>
                  <th style={th}>Phone</th>
                  <th style={th}>Vehicle type</th>
                  <th style={th}>Vehicle number</th>
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
                    <td style={td}>{d.vehicleType || "—"}</td>
                    <td style={td}>{d.vehicleNumber || "—"}</td>
                    <td style={td}>{d.onboardingStatus}</td>
                    <td style={td}>
                      {d.onboardingStatus === "pending" && (
                        <button style={btnPrimary} onClick={() => openVerify(d)}>Verify</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "#6B7C85" }}>Total: {total}</span>
            <div style={{ display: "flex", gap: 8 }}>
              <button style={btnSmall} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
              <span>Page {page}</span>
              <button style={btnSmall} disabled={page * limit >= total} onClick={() => setPage((p) => p + 1)}>Next</button>
            </div>
          </div>
        </>
      )}
      {verifyModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10 }} onClick={() => setVerifyModal(null)}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 24, maxWidth: 560, width: "95%", maxHeight: "90vh", overflow: "auto" }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Verify delivery partner: {verifyModal.name}</h3>
            <div style={{ marginBottom: 16, fontSize: 14, color: "#1B2B34" }}>
              <p><strong>Contact:</strong> {verifyModal.email} | {verifyModal.phone}</p>
              <p><strong>Vehicle:</strong> {verifyModal.vehicleType || "—"} | {verifyModal.vehicleNumber || "—"}</p>
              <p><strong>ID proof:</strong> {verifyModal.licenseDocument ? "Uploaded" : "—"} | <strong>Address proof:</strong> {verifyModal.identityDocument ? "Uploaded" : "—"} | <strong>Other documentation (vehicle identification):</strong> {verifyModal.vehicleIdentificationDocument ? "Uploaded" : "—"}</p>
            </div>
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontWeight: 600, marginBottom: 8 }}>Validate (tick when verified):</p>
              {VERIFICATION_FIELDS.map((f) => (
                <label key={f.key} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <input
                    type="checkbox"
                    checked={!!verifyForm[f.key]}
                    onChange={(e) => setVerifyForm((prev) => ({ ...prev, [f.key]: e.target.checked }))}
                  />
                  {f.label}
                </label>
              ))}
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>Tentative verification time (shown to delivery partner)</label>
              <input
                type="text"
                value={verifyForm.tentativeVerificationTime || ""}
                onChange={(e) => setVerifyForm((prev) => ({ ...prev, tentativeVerificationTime: e.target.value }))}
                placeholder="e.g. 24-48 hours"
                style={{ ...input, width: "100%", margin: 0 }}
              />
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button style={btnPrimary} onClick={() => handleVerifySave(false)} disabled={verifySaving}>Save</button>
              <button style={{ ...btnPrimary, background: "#059669" }} onClick={() => handleVerifySave(true)} disabled={verifySaving}>
                Approve (mark all valid & allow login)
              </button>
              <button style={btnSmall} onClick={() => setVerifyModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
