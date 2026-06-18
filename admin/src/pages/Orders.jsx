import { useState, useEffect } from "react";
import { api } from "../api/client";
import PageHeader from "../components/PageHeader";
import LoadingState from "../components/LoadingState";

function statusBadge(status) {
  if (status === "delivered") return "badge badge-success";
  if (status === "cancelled") return "badge badge-danger";
  return "badge badge-progress";
}

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const limit = 20;

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.orders({ status, page, limit });
      setOrders(res.orders || []);
      setTotal(res.total || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [page, status]);

  const openDetail = async (id) => {
    try {
      const o = await api.order(id);
      setDetail(o);
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <div className="admin-page">
      <PageHeader title="Orders" subtitle="View all orders — ongoing, delivered and cancelled." />
      <div className="filters-bar">
        <select className="select" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All status</option>
          <option value="in_progress">In progress</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>
      {loading ? (
        <LoadingState />
      ) : (
        <>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Date</th>
                  <th>User ID</th>
                  <th>User</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td>{o.orderId || o.id}</td>
                    <td>{o.createdAt ? new Date(o.createdAt).toLocaleString() : "—"}</td>
                    <td>{o.userCode || o.userId || "—"}</td>
                    <td>{o.userName || o.userEmail || "—"}</td>
                    <td>₹{Number(o.total).toLocaleString()}</td>
                    <td><span className={statusBadge(o.status)}>{o.status}</span></td>
                    <td>
                      <button className="btn btn-secondary btn-sm" onClick={() => openDetail(o.id)}>View</button>
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
      {detail && (
        <div className="modal-overlay" onClick={() => setDetail(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Order {detail.orderId || detail.id}</h2>
            <p><strong>User ID:</strong> {detail.userCode || detail.userId || "—"}</p>
            <p><strong>User:</strong> {detail.userName} ({detail.userEmail})</p>
            <p><strong>Total:</strong> ₹{Number(detail.total).toLocaleString()}</p>
            <p><strong>Status:</strong> <span className={statusBadge(detail.status)}>{detail.status}</span></p>
            {detail.supplierResponses?.length > 0 && (
              <p><strong>Delivery:</strong> {detail.supplierResponses.map((r) => {
                const stage = r.deliveryStage || (r.status === "accepted" ? "accepted" : "");
                if (r.status !== "accepted") return null;
                return `${r.deliveryPartnerName || "—"} (${stage === "delivered" ? "Delivered" : stage === "picked_up" ? "Picked up" : "Accepted"})`;
              }).filter(Boolean).join("; ") || "—"}</p>
            )}
            <p><strong>Address:</strong> {detail.address || "—"}</p>
            <p><strong>Items:</strong></p>
            <ul style={{ paddingLeft: 20 }}>
              {detail.items?.map((i, idx) => (
                <li key={idx}>{i.productName || "Item"} × {i.qty} @ ₹{i.price}</li>
              ))}
            </ul>
            <div className="modal-actions">
              <button className="btn btn-primary" onClick={() => setDetail(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
