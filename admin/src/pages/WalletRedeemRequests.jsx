import { useState, useEffect } from "react";
import { api } from "../api/client";
import PageHeader from "../components/PageHeader";
import LoadingState from "../components/LoadingState";

const STATUS_BADGE = {
  pending: "badge-open",
  approved: "badge-success",
  rejected: "badge-danger",
};

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

export default function WalletRedeemRequests() {
  const [tab, setTab] = useState("pending");
  const [list, setList] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionModal, setActionModal] = useState(null);
  const [adminNote, setAdminNote] = useState("");
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    const params = { page: 1, limit: 50 };
    if (tab !== "all") params.status = tab;
    if (search.trim()) params.search = search.trim();
    api
      .walletRedeemRequests(params)
      .then((res) => {
        setList(res.requests || []);
        setTotal(res.total || 0);
      })
      .catch(() => {
        setList([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [tab]);

  useEffect(() => {
    const t = setTimeout(() => load(), 300);
    return () => clearTimeout(t);
  }, [search]);

  const handleAction = async () => {
    if (!actionModal?.id || !actionModal?.type) return;
    setSaving(true);
    try {
      if (actionModal.type === "approve") {
        await api.approveWalletRedeem(actionModal.id, { adminNote: adminNote.trim() });
      } else {
        await api.rejectWalletRedeem(actionModal.id, { adminNote: adminNote.trim() });
      }
      setActionModal(null);
      setAdminNote("");
      load();
    } catch (e) {
      alert(e.message || "Action failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-page">
      <PageHeader
        title="Supplier wallet redeem"
        subtitle="Review supplier requests to transfer wallet balance to bank or UPI. Approve after you initiate the bank transfer — wallet is debited on approval."
      />

      <div className="filters-bar">
        <button type="button" className={"tab-btn" + (tab === "pending" ? " active" : "")} onClick={() => setTab("pending")}>
          Pending
        </button>
        <button type="button" className={"tab-btn" + (tab === "approved" ? " active" : "")} onClick={() => setTab("approved")}>
          Approved
        </button>
        <button type="button" className={"tab-btn" + (tab === "rejected" ? " active" : "")} onClick={() => setTab("rejected")}>
          Rejected
        </button>
        <button type="button" className={"tab-btn" + (tab === "all" ? " active" : "")} onClick={() => setTab("all")}>
          All
        </button>
        <input
          type="text"
          className="input input-wide"
          placeholder="Search supplier, email, UPI, account…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <LoadingState />
      ) : (
        <>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Supplier</th>
                  <th>Amount</th>
                  <th>Account holder</th>
                  <th>Bank / IFSC</th>
                  <th>UPI</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map((r) => (
                  <tr key={r.id}>
                    <td>{formatDate(r.createdAt)}</td>
                    <td>
                      <div>{r.supplierName || r.userName || "—"}</div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{r.userEmail}</div>
                    </td>
                    <td>₹{Number(r.amount || 0).toLocaleString()}</td>
                    <td>{r.accountHolderName}</td>
                    <td>
                      {r.bankAccountNumber ? (
                        <>
                          {r.bankAccountNumber}
                          <br />
                          <span style={{ fontSize: 12 }}>{r.ifscCode}</span>
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>{r.upiId || "—"}</td>
                    <td>
                      <span className={`badge ${STATUS_BADGE[r.status] || "badge-muted"}`}>{r.status}</span>
                      {r.adminNote ? (
                        <div style={{ fontSize: 11, marginTop: 4, color: "var(--text-muted)" }}>{r.adminNote}</div>
                      ) : null}
                    </td>
                    <td>
                      {r.status === "pending" ? (
                        <>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => {
                              setActionModal({ id: r.id, type: "approve", supplier: r.supplierName, amount: r.amount });
                              setAdminNote("");
                            }}
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            style={{ marginLeft: 6 }}
                            onClick={() => {
                              setActionModal({ id: r.id, type: "reject", supplier: r.supplierName, amount: r.amount });
                              setAdminNote("");
                            }}
                          >
                            Reject
                          </button>
                        </>
                      ) : (
                        formatDate(r.reviewedAt)
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {list.length === 0 && <div className="empty-state">No redeem requests found.</div>}
          <div className="pagination-bar">
            <span className="pagination-meta">Total: {total}</span>
          </div>
        </>
      )}

      {actionModal && (
        <div className="modal-overlay" onClick={() => setActionModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="card-title">
              {actionModal.type === "approve" ? "Approve redeem" : "Reject redeem"} — {actionModal.supplier}
            </h3>
            <p className="card-subtitle">
              Amount: ₹{Number(actionModal.amount || 0).toLocaleString()}
              {actionModal.type === "approve"
                ? ". Confirm only after you have initiated NEFT/UPI to the supplier. Wallet will be debited."
                : ". Supplier wallet balance is unchanged."}
            </p>
            <label className="form-label">Note to supplier (optional)</label>
            <textarea
              className="input"
              rows={3}
              style={{ width: "100%", marginBottom: 16 }}
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              placeholder="e.g. UTR reference, reason for rejection"
            />
            <div className="pagination-controls">
              <button type="button" className="btn btn-primary" disabled={saving} onClick={handleAction}>
                {saving ? "Saving…" : actionModal.type === "approve" ? "Approve & debit wallet" : "Reject request"}
              </button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setActionModal(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
