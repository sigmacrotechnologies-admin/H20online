import { useState, useEffect, useCallback } from "react";
import PageHeader from "../components/PageHeader";
import LoadingState from "../components/LoadingState";
import { api } from "../api/client";

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

      <div className="card">
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <input
            type="search"
            placeholder="Search product, supplier, ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input"
          />
          <select value={audience} onChange={(e) => setAudience(e.target.value)} className="input">
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
        <div className="card">No products found.</div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Supplier</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Audience</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{p.productName}</div>
                    <div style={{ fontSize: 12, color: "#6B7280" }}>
                      {p.productType?.toUpperCase()} · {p.capacityL}L · ID {p.id}
                    </div>
                  </td>
                  <td>
                    <div>{p.supplierName || "—"}</div>
                    <div style={{ fontSize: 12, color: "#6B7280" }}>{p.supplierId}</div>
                  </td>
                  <td>
                    ₹{Number(p.price || 0).toLocaleString()}
                    <div style={{ fontSize: 12, color: "#6B7280" }}>{p.priceUnit}</div>
                  </td>
                  <td>
                    <span className={p.inStock ? "badge badge-success" : "badge badge-danger"}>{p.inStock ? "In stock" : "Out"}</span>
                    <div style={{ fontSize: 12, color: "#6B7280", marginTop: 4 }}>Qty: {p.stockQty}</div>
                  </td>
                  <td>
                    {p.audience === "society" ? "Society" : "Customer"}
                    {p.audience === "society" && p.waterQuality ? (
                      <div style={{ fontSize: 12, color: "#6B7280" }}>{p.waterQuality}</div>
                    ) : null}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
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
            className="btn btn-secondary btn-sm"
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
            className="btn btn-secondary btn-sm"
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
