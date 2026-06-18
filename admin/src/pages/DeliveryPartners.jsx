import { useState, useEffect } from "react";
import PageHeader from "../components/PageHeader";
import LoadingState from "../components/LoadingState";
import { api } from "../api/client";

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
    <div className="admin-page">
      <PageHeader
        title="Delivery partner onboarding"
        subtitle={
          <>
            Verify and approve delivery partners. New sign-ups appear in <strong>Delivery partner verification</strong> until all checks are validated.
          </>
        }
      />
      <div className="filters-bar">
        <button className={"tab-btn" + (tab === "all" ? " active" : "")} onClick={() => setTab("all")}>All delivery partners</button>
        <button className={"tab-btn" + (tab === "verification" ? " active" : "")} onClick={() => setTab("verification")}>Delivery partner verification</button>
        <input type="text" placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)} className="input input-wide" />
        {tab === "all" && (
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="input">
            <option value="">All status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
          </select>
        )}
        <button className="btn btn-primary" onClick={() => alert("Delivery partners register through the mobile app.")}>+ Add delivery partner</button>
      </div>
      {loading ? (
        <LoadingState />
      ) : (
        <>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Vehicle type</th>
                  <th>Vehicle number</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map((d) => (
                  <tr key={d.id}>
                    <td>{d.name}</td>
                    <td>{d.email}</td>
                    <td>{d.phone}</td>
                    <td>{d.vehicleType || "—"}</td>
                    <td>{d.vehicleNumber || "—"}</td>
                    <td>{d.onboardingStatus}</td>
                    <td>
                      {d.onboardingStatus === "pending" && (
                        <button className="btn btn-primary" onClick={() => openVerify(d)}>Verify</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="pagination-bar">
            <span className="pagination-meta">Total: {total}</span>
            <div className="pagination-controls">
              <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
              <span>Page {page}</span>
              <button className="btn btn-secondary btn-sm" disabled={page * limit >= total} onClick={() => setPage((p) => p + 1)}>Next</button>
            </div>
          </div>
        </>
      )}
      {verifyModal && (
        <div className="modal-overlay" onClick={() => setVerifyModal(null)}>
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
                className="input"
              />
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button className="btn btn-primary" onClick={() => handleVerifySave(false)} disabled={verifySaving}>Save</button>
              <button className="btn btn-primary" style={{ background: "#059669" }} onClick={() => handleVerifySave(true)} disabled={verifySaving}>
                Approve (mark all valid & allow login)
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => setVerifyModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
