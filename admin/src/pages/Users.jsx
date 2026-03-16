import { useState, useEffect } from "react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";

const tableWrap = { overflowX: "auto", background: "#fff", borderRadius: 16, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" };
const table = { width: "100%", borderCollapse: "collapse" };
const th = { textAlign: "left", padding: "12px 16px", borderBottom: "2px solid #E5E7EB", fontWeight: 600, color: "#1B2B34" };
const td = { padding: "12px 16px", borderBottom: "1px solid #E5E7EB", color: "#1B2B34" };
const input = { padding: "8px 12px", borderRadius: 8, border: "1px solid #E5E7EB", marginRight: 8 };
const btn = { padding: "8px 16px", borderRadius: 8, border: "none", fontWeight: 600, cursor: "pointer" };
const btnPrimary = { ...btn, background: "#1EA7FD", color: "#fff" };
const btnDanger = { ...btn, background: "#EF4444", color: "#fff" };
const btnSmall = { ...btn, background: "#E0F2FE", color: "#1B2B34", padding: "6px 12px", fontSize: 13 };

export default function Users() {
  const [list, setList] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [sort, setSort] = useState("createdAt");
  const [order, setOrder] = useState("desc");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const { canDeleteUser } = useAuth();
  const limit = 20;

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.users({ search, role, sort, order, page, limit });
      setList(res.users || []);
      setTotal(res.total || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [page, sort, order, role]);
  useEffect(() => {
    const t = setTimeout(() => { if (search !== undefined) load(); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const handleSaveEdit = async () => {
    if (!editing) return;
    setSaveLoading(true);
    try {
      await api.updateUser(editing.id, {
        name: editing.name,
        email: editing.email,
        phone: editing.phone,
        age: editing.age,
        gender: editing.gender,
        activityLevel: editing.activityLevel,
        familyMembers: editing.familyMembers,
      });
      setEditing(null);
      load();
    } catch (e) {
      alert(e.message);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!canDeleteUser) return;
    if (!confirm("Delete this user?")) return;
    try {
      await api.deleteUser(id);
      load();
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Users</h1>
      <p style={{ color: "#6B7C85", marginBottom: 24 }}>Search, filter and manage app users (customers & suppliers).</p>
      <div style={{ marginBottom: 16, display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
        <input
          type="text"
          placeholder="Search name, email, phone"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...input, minWidth: 220 }}
        />
        <select value={role} onChange={(e) => setRole(e.target.value)} style={input}>
          <option value="">All roles</option>
          <option value="customer">Customer</option>
          <option value="supplier">Supplier</option>
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)} style={input}>
          <option value="createdAt">Date</option>
          <option value="name">Name</option>
          <option value="email">Email</option>
        </select>
        <select value={order} onChange={(e) => setOrder(e.target.value)} style={input}>
          <option value="desc">Desc</option>
          <option value="asc">Asc</option>
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
                  <th style={th}>User ID</th>
                  <th style={th}>Name</th>
                  <th style={th}>Email</th>
                  <th style={th}>Phone</th>
                  <th style={th}>Role</th>
                  <th style={th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map((u) => (
                  <tr key={u.id}>
                    {editing?.id === u.id ? (
                      <>
                        <td style={td}>{u.userCode || u.id}</td>
                        <td style={td}>
                          <input
                            value={editing.name}
                            onChange={(e) => setEditing((x) => ({ ...x, name: e.target.value }))}
                            style={{ ...input, width: "100%", margin: 0 }}
                          />
                        </td>
                        <td style={td}>
                          <input
                            value={editing.email}
                            onChange={(e) => setEditing((x) => ({ ...x, email: e.target.value }))}
                            style={{ ...input, width: "100%", margin: 0 }}
                          />
                        </td>
                        <td style={td}>
                          <input
                            value={editing.phone || ""}
                            onChange={(e) => setEditing((x) => ({ ...x, phone: e.target.value }))}
                            style={{ ...input, width: "100%", margin: 0 }}
                          />
                        </td>
                        <td style={td}>{u.role}</td>
                        <td style={td}>
                          <button style={btnPrimary} onClick={handleSaveEdit} disabled={saveLoading}>Save</button>
                          <button style={btnSmall} onClick={() => setEditing(null)}>Cancel</button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td style={td}>{u.userCode || u.id}</td>
                        <td style={td}>{u.name}</td>
                        <td style={td}>{u.email}</td>
                        <td style={td}>{u.phone || "—"}</td>
                        <td style={td}>{u.role}</td>
                        <td style={td}>
                          <button style={btnSmall} onClick={() => setEditing({ ...u })}>Edit</button>
                          {canDeleteUser && ["customer", "supplier"].includes(u.role) && (
                            <button style={{ ...btnSmall, marginLeft: 8, background: "#FEE2E2", color: "#B91C1C" }} onClick={() => handleDelete(u.id)}>Delete</button>
                          )}
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "#6B7C85" }}>Total: {total}</span>
            <div style={{ display: "flex", gap: 8 }}>
              <button style={btnSmall} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
              <span style={{ alignSelf: "center" }}>Page {page}</span>
              <button style={btnSmall} disabled={page * limit >= total} onClick={() => setPage((p) => p + 1)}>Next</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
