import { useState, useEffect } from "react";
import PageHeader from "../components/PageHeader";
import LoadingState from "../components/LoadingState";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";

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
    <div className="admin-page">
      <PageHeader
        title="Supplier onboarding"
        subtitle={
          <>
            Add or remove suppliers. New sign-ups appear in <strong>Supplier verification</strong> until all checks are validated.
          </>
        }
      />
      <div className="filters-bar">
        <button className={"tab-btn" + (tab === "all" ? " active" : "")} onClick={() => setTab("all")}>All suppliers</button>
        <button className={"tab-btn" + (tab === "verification" ? " active" : "")} onClick={() => setTab("verification")}>Supplier verification</button>
        <input type="text" placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)} className="input input-wide" />
        {tab === "all" && (
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="input">
            <option value="">All status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
          </select>
        )}
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Add supplier</button>
      </div>
      {showAdd && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h3 className="card-title">Add supplier</h3>
          <form onSubmit={handleAdd} style={{ display: "grid", gap: 12, maxWidth: 400 }}>
            <input required placeholder="Business name" value={addForm.businessName} onChange={(e) => setAddForm((f) => ({ ...f, businessName: e.target.value }))} className="input" />
            <input required placeholder="Contact person" value={addForm.contactPerson} onChange={(e) => setAddForm((f) => ({ ...f, contactPerson: e.target.value }))} className="input" />
            <input required type="email" placeholder="Email" value={addForm.email} onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))} className="input" />
            <input required placeholder="Phone" value={addForm.phone} onChange={(e) => setAddForm((f) => ({ ...f, phone: e.target.value }))} className="input" />
            <input required type="password" placeholder="Password" value={addForm.password} onChange={(e) => setAddForm((f) => ({ ...f, password: e.target.value }))} className="input" />
            <input required placeholder="Address" value={addForm.address} onChange={(e) => setAddForm((f) => ({ ...f, address: e.target.value }))} className="input" />
            <input required placeholder="City" value={addForm.city} onChange={(e) => setAddForm((f) => ({ ...f, city: e.target.value }))} className="input" />
            <select value={addForm.businessType} onChange={(e) => setAddForm((f) => ({ ...f, businessType: e.target.value }))} className="input">
              {businessTypes.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <input placeholder="GST (optional)" value={addForm.gstNumber} onChange={(e) => setAddForm((f) => ({ ...f, gstNumber: e.target.value }))} className="input" />
            <div className="pagination-controls">
              <button type="submit" className="btn btn-primary" disabled={addLoading}>{addLoading ? "Adding..." : "Add"}</button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowAdd(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}
      {loading ? (
        <LoadingState />
      ) : (
        <>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  {allColumns.map((c) => (
                    <th key={c.key}>{c.label}</th>
                  ))}
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map((s) => (
                  <tr key={s.id}>
                    {allColumns.map((col) => {
                      const val = col.key === "supplierId" ? (s.supplierId || s.id) : s[col.key];
                      const display = val === undefined || val === null || val === "" ? "—" : typeof val === "string" && (val.startsWith("http") || val.length > 40) ? (val.startsWith("http") ? "Uploaded" : val.slice(0, 20) + "…") : String(val);
                      return <td key={col.key} title={val}>{display}</td>;
                    })}
                    <td>
                      <button className="btn btn-secondary btn-sm" onClick={() => openCommission(s)} title="Platform fee %">Edit commission</button>
                      {s.onboardingStatus === "pending" && (
                        <button className="btn btn-primary btn-sm" onClick={() => openVerify(s)}>Verify</button>
                      )}
                      {canRemoveSupplier && <button className="btn btn-danger btn-sm" onClick={() => handleRemove(s.id)}>Remove</button>}
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
      {commissionModal && (
        <div className="modal-overlay" onClick={() => setCommissionModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="card-title">Platform commission: {commissionModal.name}</h3>
            <p className="card-subtitle">
              Platform fee % on this supplier&apos;s item subtotal. Supplier receives (100 − commission)% on each delivered order.
              Set a global default under Tax &amp; payment settings.
            </p>
            <input
              type="number"
              min={0}
              max={100}
              step={1}
              className="input"
              style={{ width: "100%", marginBottom: 16 }}
              value={commissionPct}
              onChange={(e) => setCommissionPct(e.target.value)}
              placeholder="e.g. 20"
            />
            <div className="pagination-controls">
              <button className="btn btn-primary" onClick={handleCommissionSave} disabled={commissionSaving}>{commissionSaving ? "Saving..." : "Save"}</button>
              <button className="btn btn-secondary btn-sm" onClick={() => setCommissionModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      {verifyModal && (
        <div className="modal-overlay" onClick={() => setVerifyModal(null)}>
          <div className="modal" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
            <h3 className="card-title">Verify supplier: {verifyModal.name}</h3>
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
