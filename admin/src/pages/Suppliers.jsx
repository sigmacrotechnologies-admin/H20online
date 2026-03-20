import { useState, useEffect } from "react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";

const tableWrap = { overflowX: "auto", background: "#fff", borderRadius: 16, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" };
const table = { width: "100%", borderCollapse: "collapse", fontSize: 14 };
const th = { textAlign: "left", padding: "10px 12px", borderBottom: "2px solid #E5E7EB", fontWeight: 600, color: "#1B2B34" };
const td = { padding: "10px 12px", borderBottom: "1px solid #E5E7EB", color: "#1B2B34" };
const input = { padding: "8px 12px", borderRadius: 8, border: "1px solid #E5E7EB", marginRight: 8 };
const btnSmall = { padding: "6px 12px", borderRadius: 8, border: "none", background: "#E0F2FE", color: "#1B2B34", cursor: "pointer", fontSize: 13 };
const btnDanger = { ...btnSmall, background: "#FEE2E2", color: "#B91C1C" };
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

const businessTypes = ["waterSupplier", "distributor", "manufacturer", "other", "deliveryAgent"];

const VERIFICATION_FIELDS = [
  { key: "documentIdProofVerified", label: "ID proof" },
  { key: "documentAddressProofVerified", label: "Address proof" },
  { key: "documentBusinessLicenseVerified", label: "Business license" },
];

export default function Suppliers() {
  const [tab, setTab] = useState("all");
  const [list, setList] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({
    businessName: "", contactPerson: "", email: "", phone: "", password: "",
    address: "", city: "", businessType: "waterSupplier", gstNumber: "", bankAccount: "", ifscCode: "",
  });
  const [addLoading, setAddLoading] = useState(false);
  const [verifyModal, setVerifyModal] = useState(null);
  const [verifyForm, setVerifyForm] = useState({});
  const [verifySaving, setVerifySaving] = useState(false);
  const [commissionModal, setCommissionModal] = useState(null);
  const [commissionPct, setCommissionPct] = useState("");
  const [commissionSaving, setCommissionSaving] = useState(false);
  const { canRemoveSupplier } = useAuth();
  const limit = 20;

  const load = async () => {
    setLoading(true);
    try {
      const params = { search, page, limit };
      if (tab === "verification") params.status = "pending";
      else if (status) params.status = status;
      const res = await api.suppliers(params);
      setList(res.suppliers || []);
      setTotal(res.total || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [page, status, tab]);
  useEffect(() => {
    const t = setTimeout(() => { if (search !== undefined) load(); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const openVerify = async (s) => {
    try {
      const full = s.id ? await api.supplier(s.id) : s;
      setVerifyModal(full);
      setVerifyForm({
        documentIdProofVerified: full.documentIdProofVerified || false,
        documentAddressProofVerified: full.documentAddressProofVerified || false,
        documentBusinessLicenseVerified: full.documentBusinessLicenseVerified || false,
        tentativeVerificationTime: full.tentativeVerificationTime || "24-48 hours",
      });
    } catch (e) {
      alert(e.message);
    }
  };

  const handleVerifySave = async (approve = false) => {
    if (!verifyModal?.id) return;
    setVerifySaving(true);
    try {
      await api.verifySupplier(verifyModal.id, { ...verifyForm, approve });
      setVerifyModal(null);
      load();
    } catch (e) {
      alert(e.message);
    } finally {
      setVerifySaving(false);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    setAddLoading(true);
    try {
      await api.createSupplier(addForm);
      setShowAdd(false);
      setAddForm({ businessName: "", contactPerson: "", email: "", phone: "", password: "", address: "", city: "", businessType: "waterSupplier", gstNumber: "", bankAccount: "", ifscCode: "" });
      load();
    } catch (err) {
      alert(err.message);
    } finally {
      setAddLoading(false);
    }
  };

  const handleRemove = async (id) => {
    if (!canRemoveSupplier) { alert("You do not have permission to remove suppliers."); return; }
    if (!confirm("Remove this supplier? This will also delete their user account.")) return;
    try {
      await api.deleteSupplier(id);
      load();
    } catch (e) {
      alert(e.message);
    }
  };

  const openCommission = (s) => {
    setCommissionModal(s);
    setCommissionPct(String(s.commissionPercentage ?? 20));
  };

  const handleCommissionSave = async () => {
    if (!commissionModal?.id) return;
    const pct = Number(commissionPct);
    if (isNaN(pct) || pct < 0 || pct > 100) {
      alert("Enter a number between 0 and 100.");
      return;
    }
    setCommissionSaving(true);
    try {
      await api.updateSupplier(commissionModal.id, { commissionPercentage: pct });
      setCommissionModal(null);
      load();
    } catch (e) {
      alert(e.message);
    } finally {
      setCommissionSaving(false);
    }
  };

  const allColumns = [
    { key: "supplierId", label: "Supplier ID" },
    { key: "name", label: "Business" },
    { key: "contactPerson", label: "Contact" },
    { key: "email", label: "Email" },
    { key: "phone", label: "Phone" },
    { key: "address", label: "Address" },
    { key: "location", label: "Location" },
    { key: "city", label: "City" },
    { key: "businessType", label: "Type" },
    { key: "gstNumber", label: "GST" },
    { key: "bankAccount", label: "Bank" },
    { key: "ifscCode", label: "IFSC" },
    { key: "documentIdProof", label: "ID proof doc" },
    { key: "documentAddressProof", label: "Address doc" },
    { key: "documentBusinessLicense", label: "License doc" },
    { key: "onboardingStatus", label: "Status" },
    { key: "commissionPercentage", label: "Commission %" },
    { key: "tentativeVerificationTime", label: "Est. time" },
  ];

  return (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Supplier onboarding</h1>
      <p style={{ color: "#6B7C85", marginBottom: 24 }}>
        Add or remove suppliers. New sign-ups appear in <strong>Supplier verification</strong> until all checks are validated.
      </p>
      <div style={{ marginBottom: 16, display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
        <button style={tabStyle(tab === "all")} onClick={() => setTab("all")}>All suppliers</button>
        <button style={tabStyle(tab === "verification")} onClick={() => setTab("verification")}>Supplier verification</button>
        <input type="text" placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)} style={{ ...input, minWidth: 180 }} />
        {tab === "all" && (
          <select value={status} onChange={(e) => setStatus(e.target.value)} style={input}>
            <option value="">All status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
          </select>
        )}
        <button style={btnPrimary} onClick={() => setShowAdd(true)}>+ Add supplier</button>
      </div>
      {showAdd && (
        <div style={{ background: "#f0f7fc", borderRadius: 16, padding: 24, marginBottom: 24 }}>
          <h3 style={{ marginTop: 0 }}>Add supplier</h3>
          <form onSubmit={handleAdd} style={{ display: "grid", gap: 12, maxWidth: 400 }}>
            <input required placeholder="Business name" value={addForm.businessName} onChange={(e) => setAddForm((f) => ({ ...f, businessName: e.target.value }))} style={input} />
            <input required placeholder="Contact person" value={addForm.contactPerson} onChange={(e) => setAddForm((f) => ({ ...f, contactPerson: e.target.value }))} style={input} />
            <input required type="email" placeholder="Email" value={addForm.email} onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))} style={input} />
            <input required placeholder="Phone" value={addForm.phone} onChange={(e) => setAddForm((f) => ({ ...f, phone: e.target.value }))} style={input} />
            <input required type="password" placeholder="Password" value={addForm.password} onChange={(e) => setAddForm((f) => ({ ...f, password: e.target.value }))} style={input} />
            <input required placeholder="Address" value={addForm.address} onChange={(e) => setAddForm((f) => ({ ...f, address: e.target.value }))} style={input} />
            <input required placeholder="City" value={addForm.city} onChange={(e) => setAddForm((f) => ({ ...f, city: e.target.value }))} style={input} />
            <select value={addForm.businessType} onChange={(e) => setAddForm((f) => ({ ...f, businessType: e.target.value }))} style={input}>
              {businessTypes.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <input placeholder="GST (optional)" value={addForm.gstNumber} onChange={(e) => setAddForm((f) => ({ ...f, gstNumber: e.target.value }))} style={input} />
            <div style={{ display: "flex", gap: 8 }}>
              <button type="submit" style={btnPrimary} disabled={addLoading}>{addLoading ? "Adding..." : "Add"}</button>
              <button type="button" style={btnSmall} onClick={() => setShowAdd(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}
      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          <div style={tableWrap}>
            <table style={table}>
              <thead>
                <tr>
                  {allColumns.map((c) => (
                    <th key={c.key} style={th}>{c.label}</th>
                  ))}
                  <th style={th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map((s) => (
                  <tr key={s.id}>
                    {allColumns.map((col) => {
                      const val = col.key === "supplierId" ? (s.supplierId || s.id) : s[col.key];
                      const display = val === undefined || val === null || val === "" ? "—" : typeof val === "string" && (val.startsWith("http") || val.length > 40) ? (val.startsWith("http") ? "Uploaded" : val.slice(0, 20) + "…") : String(val);
                      return <td key={col.key} style={td} title={val}>{display}</td>;
                    })}
                    <td style={td}>
                      <button style={btnSmall} onClick={() => openCommission(s)} title="Platform fee %">Edit commission</button>
                      {s.onboardingStatus === "pending" && (
                        <button style={{ ...btnPrimary, marginLeft: 8 }} onClick={() => openVerify(s)}>Verify</button>
                      )}
                      {canRemoveSupplier && <button style={{ ...btnDanger, marginLeft: 8 }} onClick={() => handleRemove(s.id)}>Remove</button>}
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
      {commissionModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10 }} onClick={() => setCommissionModal(null)}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 24, maxWidth: 360, width: "95%" }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Platform commission: {commissionModal.name}</h3>
            <p style={{ fontSize: 14, color: "#6B7C85", marginBottom: 12 }}>Percentage of order value kept as platform fee. Supplier receives (100 − commission)%.</p>
            <input
              type="number"
              min={0}
              max={100}
              step={1}
              value={commissionPct}
              onChange={(e) => setCommissionPct(e.target.value)}
              placeholder="e.g. 20"
              style={{ ...input, width: "100%", marginBottom: 16 }}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <button style={btnPrimary} onClick={handleCommissionSave} disabled={commissionSaving}>{commissionSaving ? "Saving..." : "Save"}</button>
              <button style={btnSmall} onClick={() => setCommissionModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      {verifyModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10 }} onClick={() => setVerifyModal(null)}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 24, maxWidth: 560, width: "95%", maxHeight: "90vh", overflow: "auto" }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Verify supplier: {verifyModal.name}</h3>
            <div style={{ marginBottom: 16, fontSize: 14, color: "#1B2B34" }}>
              <p><strong>Supplier ID:</strong> {verifyModal.supplierId || verifyModal.id || "—"}</p>
              <p><strong>Contact:</strong> {verifyModal.contactPerson} | {verifyModal.email} | {verifyModal.phone}</p>
              <p><strong>Address:</strong> {verifyModal.address}, {verifyModal.city} {verifyModal.location ? `(${verifyModal.location})` : ""}</p>
              <p><strong>Business type:</strong> {verifyModal.businessType} | GST: {verifyModal.gstNumber || "—"} | Bank: {verifyModal.bankAccount || "—"} {verifyModal.ifscCode ? `(${verifyModal.ifscCode})` : ""}</p>
              <p><strong>ID proof:</strong> {verifyModal.documentIdProof ? "Uploaded" : "—"} | <strong>Address proof:</strong> {verifyModal.documentAddressProof ? "Uploaded" : "—"} | <strong>Business license:</strong> {verifyModal.documentBusinessLicense ? "Uploaded" : "—"}</p>
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
              <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>Tentative verification time (shown to supplier)</label>
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
