import { useState, useEffect } from "react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import PageHeader from "../components/PageHeader";
import LoadingState from "../components/LoadingState";

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
    <div className="admin-page">
      <PageHeader title="Users" subtitle="Search, filter and manage app users (customers & suppliers)." />
      <div className="filters-bar">
        <input
          type="text"
          className="input input-wide"
          placeholder="Search name, email, phone"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="select" value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="">All roles</option>
          <option value="customer">Customer</option>
          <option value="supplier">Supplier</option>
        </select>
        <select className="select" value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="createdAt">Date</option>
          <option value="name">Name</option>
          <option value="email">Email</option>
        </select>
        <select className="select" value={order} onChange={(e) => setOrder(e.target.value)}>
          <option value="desc">Desc</option>
          <option value="asc">Asc</option>
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
                  <th>User ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Role</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map((u) => (
                  <tr key={u.id}>
                    {editing?.id === u.id ? (
                      <>
                        <td>{u.userCode || u.id}</td>
                        <td>
                          <input
                            className="input"
                            value={editing.name}
                            onChange={(e) => setEditing((x) => ({ ...x, name: e.target.value }))}
                          />
                        </td>
                        <td>
                          <input
                            className="input"
                            value={editing.email}
                            onChange={(e) => setEditing((x) => ({ ...x, email: e.target.value }))}
                          />
                        </td>
                        <td>
                          <input
                            className="input"
                            value={editing.phone || ""}
                            onChange={(e) => setEditing((x) => ({ ...x, phone: e.target.value }))}
                          />
                        </td>
                        <td>{u.role}</td>
                        <td>
                          <button className="btn btn-primary btn-sm" onClick={handleSaveEdit} disabled={saveLoading}>Save</button>
                          <button className="btn btn-secondary btn-sm" onClick={() => setEditing(null)}>Cancel</button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td>{u.userCode || u.id}</td>
                        <td>{u.name}</td>
                        <td>{u.email}</td>
                        <td>{u.phone || "—"}</td>
                        <td><span className="badge badge-progress">{u.role}</span></td>
                        <td>
                          <button className="btn btn-secondary btn-sm" onClick={() => setEditing({ ...u })}>Edit</button>
                          {canDeleteUser && ["customer", "supplier"].includes(u.role) && (
                            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(u.id)}>Delete</button>
                          )}
                        </td>
                      </>
                    )}
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
    </div>
  );
}
