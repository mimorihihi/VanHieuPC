"use client"

import { useEffect, useState, useCallback } from "react"
import { Search, ShieldCheck, ShieldOff, Trash2, UserCog } from "lucide-react"
import { Modal } from "@/components/ui/modal"
import { AdminBtn } from "@/components/ui/button"
import { FormSelect, FormToggle } from "@/components/ui/form-fields"

interface User {
  id: string; name: string; email: string; role: string
  is_active: boolean; phone: string | null; avatar_url: string | null
  created_at: string; _count: { orders: number }
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<User | null>(null)
  const [editRole, setEditRole] = useState("")
  const [editActive, setEditActive] = useState(true)
  const [saving, setSaving] = useState(false)
  const [modal, setModal] = useState<"edit" | "delete" | null>(null)
  const limit = 20

  const fetch_ = useCallback(() => {
    setLoading(true)
    fetch(`/api/admin/users?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`)
      .then(r => r.json())
      .then(d => { setUsers(d.users ?? []); setTotal(d.total ?? 0) })
      .finally(() => setLoading(false))
  }, [page, search])

  useEffect(() => { fetch_() }, [fetch_])

  const openEdit = (u: User) => {
    setSelected(u); setEditRole(u.role); setEditActive(u.is_active); setModal("edit")
  }

  const updateUser = async () => {
    if (!selected) return
    setSaving(true)
    await fetch(`/api/admin/users/${selected?.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: editRole, is_active: editActive }),
    })
    setSaving(false)
    setModal(null)
    fetch_()
  }

  const deleteUser = async () => {
    if (!selected) return
    setSaving(true)
    await fetch(`/api/admin/users/${selected?.id}`, { method: "DELETE" })
    setSaving(false)
    setModal(null)
    fetch_()
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Users</h1>
          <p className="page-sub">{total} registered users</p>
        </div>
      </div>

      <div className="table-toolbar">
        <div className="search-wrap">
          <Search size={16} className="search-icon" />
          <input className="search-input" placeholder="Search by name or email…" value={search} onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setSearch(e.target.value); setPage(1) }} />
        </div>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Phone</th>
              <th>Role</th>
              <th>Orders</th>
              <th>Status</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={7} className="table-empty">Loading…</td></tr>
              : users.length === 0 ? <tr><td colSpan={7} className="table-empty">No users found</td></tr>
              : users.map((u, i) => (
                <tr key={u?.id || i}>
                  <td>
                    <div className="user-cell">
                      <div className="user-avatar">{u?.name?.[0] ?? "?"}</div>
                      <div>
                        <div className="cell-bold">{u?.name}</div>
                        <div className="cell-sub">{u?.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="cell-sub">{u?.phone ?? "—"}</td>
                  <td>
                    <span className={`badge ${u?.role === "ADMIN" ? "badge-purple" : "badge-gray"}`}>{u?.role}</span>
                  </td>
                  <td>{u?._count?.orders ?? 0}</td>
                  <td>
                    <span className={`badge ${u?.is_active ? "badge-green" : "badge-red"}`}>{u?.is_active ? "Active" : "Banned"}</span>
                  </td>
                  <td className="cell-sub">{u?.created_at ? new Date(u.created_at).toLocaleDateString("vi-VN") : "—"}</td>
                  <td>
                    <div className="action-btns">
                      <button className="action-btn edit" onClick={() => openEdit(u)} title="Edit user"><UserCog size={14} /></button>
                      <button className="action-btn delete" onClick={() => { setSelected(u); setModal("delete") }} title="Delete user"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <AdminBtn variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</AdminBtn>
          <span className="page-info">Page {page} of {totalPages}</span>
          <AdminBtn variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</AdminBtn>
        </div>
      )}

      <Modal open={modal === "edit"} onClose={() => setModal(null)} title={`Edit User: ${selected?.name}`} size="sm">
        <div style={{ marginBottom: 16 }}>
          <FormSelect
            label="Role"
            options={[{ value: "USER", label: "User" }, { value: "ADMIN", label: "Admin" }]}
            value={editRole}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setEditRole(e.target.value)}
          />
        </div>
        <div style={{ marginBottom: 24 }}>
          <FormToggle label="Account Active" checked={editActive} onChange={(v: boolean) => setEditActive(v)} />
        </div>
        <div className="form-actions">
          <AdminBtn variant="secondary" onClick={() => setModal(null)}>Cancel</AdminBtn>
          <AdminBtn loading={saving} onClick={updateUser}>Save</AdminBtn>
        </div>
      </Modal>

      <Modal open={modal === "delete"} onClose={() => setModal(null)} title="Delete User" size="sm">
        <p style={{ color: "#9ca3af", marginBottom: 24 }}>
          Permanently delete <strong style={{ color: "#f1f5f9" }}>{selected?.name}</strong> ({selected?.email})?
        </p>
        <div className="form-actions">
          <AdminBtn variant="secondary" onClick={() => setModal(null)}>Cancel</AdminBtn>
          <AdminBtn variant="danger" loading={saving} onClick={deleteUser}>Delete</AdminBtn>
        </div>
      </Modal>

      <style>{`
        .page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 24px; gap: 16px; }
        .page-title { font-size: 22px; font-weight: 700; color: #f1f5f9; }
        .page-sub { font-size: 13px; color: #6b7280; margin-top: 2px; }
        .table-toolbar { margin-bottom: 16px; }
        .search-wrap { position: relative; max-width: 360px; width: 100%; }
        .search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #6b7280; }
        .search-input { width: 100%; background: #111827; border: 1px solid #1f2937; color: #e2e8f0; border-radius: 8px; padding: 9px 12px 9px 36px; font-size: 14px; }
        .search-input:focus { outline: none; border-color: #6366f1; }
        .admin-table-wrap { overflow-x: auto; border-radius: 12px; border: 1px solid #1f2937; }
        .admin-table { width: 100%; border-collapse: collapse; font-size: 14px; }
        .admin-table th { background: #0f1117; color: #6b7280; font-weight: 500; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; padding: 12px 16px; text-align: left; border-bottom: 1px solid #1f2937; }
        .admin-table td { padding: 14px 16px; border-bottom: 1px solid #1f2937; color: #e2e8f0; vertical-align: middle; }
        .admin-table tr:last-child td { border-bottom: none; }
        .admin-table tr:hover td { background: rgba(255,255,255,0.02); }
        .table-empty { text-align: center; color: #6b7280; padding: 40px 0 !important; }
        .user-cell { display: flex; align-items: center; gap: 12px; }
        .user-avatar { width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg,#6366f1,#8b5cf6); display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700; color: #fff; flex-shrink: 0; }
        .cell-bold { font-weight: 600; color: #f1f5f9; }
        .cell-sub { font-size: 12px; color: #6b7280; margin-top: 2px; }
        .badge { display: inline-flex; align-items: center; padding: 3px 8px; border-radius: 6px; font-size: 12px; font-weight: 500; }
        .badge-green { background: rgba(16,185,129,0.15); color: #34d399; }
        .badge-red { background: rgba(239,68,68,0.15); color: #f87171; }
        .badge-purple { background: rgba(139,92,246,0.15); color: #a78bfa; }
        .badge-gray { background: #1f2937; color: #9ca3af; }
        .action-btns { display: flex; gap: 6px; }
        .action-btn { background: none; border: none; cursor: pointer; padding: 6px; border-radius: 6px; display: flex; transition: background 0.15s; }
        .action-btn.edit { color: #6366f1; }
        .action-btn.edit:hover { background: rgba(99,102,241,0.15); }
        .action-btn.delete { color: #ef4444; }
        .action-btn.delete:hover { background: rgba(239,68,68,0.15); }
        .pagination { display: flex; align-items: center; justify-content: center; gap: 16px; margin-top: 20px; }
        .page-info { font-size: 14px; color: #6b7280; }
        .form-actions { display: flex; gap: 12px; justify-content: flex-end; }
      `}</style>
    </div>
  )
}
