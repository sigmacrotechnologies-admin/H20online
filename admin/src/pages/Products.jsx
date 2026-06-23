import { useState, useEffect, useCallback } from "react";
import PageHeader from "../components/PageHeader";
import LoadingState from "../components/LoadingState";
import { api } from "../api/client";

const card = { background: "#f0f7fcd7", borderRadius: 16, padding: 24, marginBottom: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" };
const tableWrap = { overflowX: "auto", background: "#fff", borderRadius: 16, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" };
const table = { width: "100%", borderCollapse: "collapse" };
const th = { textAlign: "left", padding: "10px 12px", borderBottom: "2px solid #E5E7EB", fontWeight: 600, color: "#1B2B34" };
const td = { padding: "10px 12px", borderBottom: "1px solid #E5E7EB", color: "#1B2B34", verticalAlign: "top" };
const input = { padding: "8px 12px", borderRadius: 8, border: "1px solid #E5E7EB", minWidth: 180 };
const btn = { padding: "6px 12px", borderRadius: 8, border: "none", fontWeight: 600, cursor: "pointer", background: "#DC2626", color: "#fff", fontSize: 13 };
const btnGhost = { ...btn, background: "#E0F2FE", color: "#1B2B34" };
const badge = (inStock) => ({
  display: "inline-block",
  padding: "2px 8px",
  borderRadius: 6,
  fontSize: 12,
  fontWeight: 600,
  background: inStock ? "#D1FAE5" : "#FEE2E2",
  color: inStock ? "#059669" : "#DC2626",
});

export default function Products() {
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [audience, setAudience] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const limit = 25;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { search: search.trim(), page, limit };
      if (audience) params.audience = audience;
      const res = await api.products(params);
      setProducts(res.products || []);
      setTotal(res.total || 0);
    } catch (e) {
      console.error(e);
      setProducts([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [search, audience, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (page === 1) load();
      else setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search, audience]);

  const handleDelete = async (p) => {
    if (!confirm(`Delete "${p.productName}" from ${p.supplierName || "supplier"}? This cannot be undone.`)) return;
    setDeletingId(p.id);
    try {
      await api.deleteProduct(p.id);
      await load();
    } catch (e) {
      alert(e.message || "Could not delete product");
    } finally {
      setDeletingId(null);
    }
  };

  const pageCount = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="admin-page">
      <PageHeader
        title="Supplier products"
        subtitle="View and delete catalog products from any supplier (master, admin & sub-admin)"
      />

      <div style={card}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <input
            type="search"
            placeholder="Search product, supplier, ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={input}
          />
          <select value={audience} onChange={(e) => setAudience(e.target.value)} style={input}>
            <option value="">All audiences</option>
            <option value="customer">Customer</option>
            <option value="society">Society</option>
          </select>
          <span style={{ color: "#6B7280", fontSize: 14 }}>{total} product{total === 1 ? "" : "s"}</span>
        </div>
      </div>

      {loading ? (
        <LoadingState label="Loading products..." />
      ) : products.length === 0 ? (
        <div style={card}>No products found.</div>
      ) : (
        <div style={tableWrap}>
          <table style={table}>
            <thead>
              <tr>
                <th style={th}>Product</th>
                <th style={th}>Supplier</th>
                <th style={th}>Price</th>
                <th style={th}>Stock</th>
                <th style={th}>Audience</th>
                <th style={th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td style={td}>
                    <div style={{ fontWeight: 600 }}>{p.productName}</div>
                    <div style={{ fontSize: 12, color: "#6B7280" }}>
                      {p.productType?.toUpperCase()} · {p.capacityL}L · ID {p.id}
                    </div>
                  </td>
                  <td style={td}>
                    <div>{p.supplierName || "—"}</div>
                    <div style={{ fontSize: 12, color: "#6B7280" }}>{p.supplierId}</div>
                  </td>
                  <td style={td}>
                    ₹{Number(p.price || 0).toLocaleString()}
                    <div style={{ fontSize: 12, color: "#6B7280" }}>{p.priceUnit}</div>
                  </td>
                  <td style={td}>
                    <span style={badge(p.inStock)}>{p.inStock ? "In stock" : "Out"}</span>
                    <div style={{ fontSize: 12, color: "#6B7280", marginTop: 4 }}>Qty: {p.stockQty}</div>
                  </td>
                  <td style={td}>
                    {p.audience === "society" ? "Society" : "Customer"}
                    {p.audience === "society" && p.waterQuality ? (
                      <div style={{ fontSize: 12, color: "#6B7280" }}>{p.waterQuality}</div>
                    ) : null}
                  </td>
                  <td style={td}>
                    <button
                      type="button"
                      style={btn}
                      disabled={deletingId === p.id}
                      onClick={() => handleDelete(p)}
                    >
                      {deletingId === p.id ? "Deleting…" : "Delete"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pageCount > 1 ? (
        <div style={{ display: "flex", gap: 8, marginTop: 16, alignItems: "center" }}>
          <button
            type="button"
            style={btnGhost}
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </button>
          <span style={{ fontSize: 14, color: "#6B7280" }}>
            Page {page} of {pageCount}
          </span>
          <button
            type="button"
            style={btnGhost}
            disabled={page >= pageCount}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      ) : null}
    </div>
  );
}
