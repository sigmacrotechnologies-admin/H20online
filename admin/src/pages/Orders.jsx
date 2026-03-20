import { useState, useEffect } from "react";
import { api } from "../api/client";

const tableWrap = { overflowX: "auto", background: "#fff", borderRadius: 16, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" };
const table = { width: "100%", borderCollapse: "collapse" };
const th = { textAlign: "left", padding: "12px 16px", borderBottom: "2px solid #E5E7EB", fontWeight: 600, color: "#1B2B34" };
const td = { padding: "12px 16px", borderBottom: "1px solid #E5E7EB", color: "#1B2B34" };
const select = { padding: "8px 12px", borderRadius: 8, border: "1px solid #E5E7EB", marginRight: 8 };
const btnSmall = { padding: "6px 12px", borderRadius: 8, border: "none", background: "#E0F2FE", color: "#1B2B34", cursor: "pointer", fontSize: 13 };

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
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Orders</h1>
      <p style={{ color: "#6B7C85", marginBottom: 24 }}>View all orders (ongoing and delivered).</p>
      <div style={{ marginBottom: 16, display: "flex", flexWrap: "wrap", gap: 12 }}>
        <select value={status} onChange={(e) => setStatus(e.target.value)} style={select}>
          <option value="">All status</option>
          <option value="in_progress">In progress</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          <div style={tableWrap}>
            <table style={table}>
              <thead>
                <tr>
                  <th style={th}>Order ID</th>
                  <th style={th}>Date</th>
                  <th style={th}>User ID</th>
                  <th style={th}>User</th>
                  <th style={th}>Total</th>
                  <th style={th}>Status</th>
                  <th style={th}></th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td style={td}>{o.orderId || o.id}</td>
                    <td style={td}>{o.createdAt ? new Date(o.createdAt).toLocaleString() : "—"}</td>
                    <td style={td}>{o.userCode || o.userId || "—"}</td>
                    <td style={td}>{o.userName || o.userEmail || "—"}</td>
                    <td style={td}>₹{Number(o.total).toLocaleString()}</td>
                    <td style={td}>{o.status}</td>
                    <td style={td}>
                      <button style={btnSmall} onClick={() => openDetail(o.id)}>View</button>
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
      {detail && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10 }} onClick={() => setDetail(null)}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 24, maxWidth: 500, width: "90%", maxHeight: "80vh", overflow: "auto" }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Order {detail.orderId || detail.id}</h3>
            <p><strong>Order ID:</strong> {detail.orderId || detail.id}</p>
            <p><strong>User ID:</strong> {detail.userCode || detail.userId || "—"}</p>
            <p><strong>User:</strong> {detail.userName} ({detail.userEmail})</p>
            <p><strong>Total:</strong> ₹{Number(detail.total).toLocaleString()}</p>
            <p><strong>Status:</strong> {detail.status}</p>
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
            <button style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#1EA7FD", color: "#fff" }} onClick={() => setDetail(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
