import { useState, useEffect } from "react";
import { api } from "../api/client";
import PageHeader from "../components/PageHeader";
import LoadingState from "../components/LoadingState";

function statusBadge(status) {
  if (status === "delivered") return "badge badge-success";
  if (status === "cancelled") return "badge badge-danger";
  return "badge badge-progress";
}

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

function paymentMethodLabel(detail) {
  const p = detail?.payment;
  if (p?.methodLabel) return p.methodLabel;
  if (detail?.paymentMethod === "razorpay") return "Razorpay";
  if (detail?.paymentMethod === "wallet") return "H2O Wallet";
  if (detail?.paymentMethod === "cod") return "Cash on Delivery";
  return detail?.paymentMethod || "—";
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

  useEffect(() => {
    load();
  }, [page, status]);

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
                  <th>Payment</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td style={{ fontFamily: "monospace", fontWeight: 600 }}>{o.orderId || o.id}</td>
                    <td>{o.createdAt ? new Date(o.createdAt).toLocaleString() : "—"}</td>
                    <td>{o.userCode || o.userId || "—"}</td>
                    <td>{o.userName || o.userEmail || "—"}</td>
                    <td>{paymentMethodLabel(o)}</td>
                    <td>₹{Number(o.total).toLocaleString()}</td>
                    <td>
                      <span className={statusBadge(o.status)}>{o.status}</span>
                    </td>
                    <td>
                      <button className="btn btn-secondary btn-sm" onClick={() => openDetail(o.id)}>
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="pagination-bar">
            <span className="pagination-meta">Total: {total}</span>
            <div className="pagination-controls">
              <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </button>
              <span>Page {page}</span>
              <button className="btn btn-secondary btn-sm" disabled={page * limit >= total} onClick={() => setPage((p) => p + 1)}>
                Next
              </button>
            </div>
          </div>
        </>
      )}
      {detail && (
        <div className="modal-overlay" onClick={() => setDetail(null)}>
          <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
            <h2>Order {detail.orderId || detail.id}</h2>
            <div className="detail-grid">
              <div>
                <p>
                  <strong>User ID:</strong> {detail.userCode || detail.userId || "—"}
                </p>
                <p>
                  <strong>User:</strong> {detail.userName} ({detail.userEmail})
                </p>
                <p>
                  <strong>Placed:</strong> {formatDate(detail.createdAt)}
                </p>
                <p>
                  <strong>Source:</strong> {detail.payment?.orderSource || "—"}
                </p>
                <p>
                  <strong>Total:</strong> ₹{Number(detail.total).toLocaleString()}
                </p>
                <p>
                  <strong>Status:</strong> <span className={statusBadge(detail.status)}>{detail.status}</span>
                </p>
              </div>
              <div>
                <h3 className="card-subtitle" style={{ marginTop: 0 }}>
                  Payment
                </h3>
                <p>
                  <strong>Method:</strong> {paymentMethodLabel(detail)}
                </p>
                <p>
                  <strong>Status:</strong> {detail.paymentStatus || detail.payment?.status || "—"}
                </p>
                <p>
                  <strong>Paid at:</strong> {formatDate(detail.paidAt || detail.payment?.paidAt)}
                </p>
                {detail.payment?.razorpay ? (
                  <>
                    <p>
                      <strong>Razorpay order:</strong>{" "}
                      <span style={{ fontFamily: "monospace" }}>{detail.payment.razorpay.orderId || detail.razorpayOrderId || "—"}</span>
                    </p>
                    <p>
                      <strong>Razorpay payment:</strong>{" "}
                      <span style={{ fontFamily: "monospace" }}>{detail.payment.razorpay.paymentId || detail.razorpayPaymentId || "—"}</span>
                    </p>
                    <p>
                      <strong>Gateway mode:</strong> {detail.payment.razorpay.methodLabel || "—"}
                      {detail.payment.razorpay.methodDetail ? ` · ${detail.payment.razorpay.methodDetail}` : ""}
                    </p>
                    {detail.payment.razorpay.vpa ? (
                      <p>
                        <strong>UPI:</strong> {detail.payment.razorpay.vpa}
                      </p>
                    ) : null}
                    {detail.payment.razorpay.bank ? (
                      <p>
                        <strong>Bank:</strong> {detail.payment.razorpay.bank}
                      </p>
                    ) : null}
                    <p>
                      <strong>Razorpay status:</strong> {detail.payment.razorpay.status || "—"}
                      {detail.payment.razorpay.testMode ? (
                        <span className="badge badge-open" style={{ marginLeft: 8 }}>
                          Test
                        </span>
                      ) : (
                        <span className="badge badge-success" style={{ marginLeft: 8 }}>
                          Live
                        </span>
                      )}
                    </p>
                  </>
                ) : null}
              </div>
            </div>
            {detail.supplierResponses?.length > 0 && (
              <p>
                <strong>Delivery:</strong>{" "}
                {detail.supplierResponses
                  .map((r) => {
                    const stage = r.deliveryStage || (r.status === "accepted" ? "accepted" : "");
                    if (r.status !== "accepted") return null;
                    return `${r.deliveryPartnerName || "—"} (${stage === "delivered" ? "Delivered" : stage === "picked_up" ? "Picked up" : "Accepted"})`;
                  })
                  .filter(Boolean)
                  .join("; ") || "—"}
              </p>
            )}
            <p>
              <strong>Address:</strong> {detail.address || "—"}
            </p>
            <p>
              <strong>Items:</strong>
            </p>
            <ul style={{ paddingLeft: 20 }}>
              {detail.items?.map((i, idx) => (
                <li key={idx}>
                  {i.productName || "Item"} × {i.qty} @ ₹{i.price}
                </li>
              ))}
            </ul>
            <div className="modal-actions">
              <button className="btn btn-primary" onClick={() => setDetail(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
