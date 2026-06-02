"use client"

import { useCallback, useEffect, useState, type ChangeEvent } from "react"
import { Search, Trash2, User, UserCog } from "lucide-react"
import { Modal } from "@/components/ui/modal"
import { AdminBtn } from "@/components/ui/button"
import { FormSelect, FormToggle } from "@/components/ui/form-fields"

interface UserRow {
  id: string
  name: string
  email: string
  role: string
  is_active: boolean
  phone: string | null
  avatar_url: string | null
  created_at: string
  _count: { orders: number }
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<UserRow | null>(null)
  const [editRole, setEditRole] = useState("")
  const [editActive, setEditActive] = useState(true)
  const [saving, setSaving] = useState(false)
  const [modal, setModal] = useState<"edit" | "delete" | null>(null)
  const limit = 20

  const fetchUsers = useCallback(() => {
    setLoading(true)
    fetch(`/api/admin/users?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`)
      .then((response) => response.json())
      .then((data) => {
        setUsers(data.users ?? [])
        setTotal(data.total ?? 0)
      })
      .finally(() => setLoading(false))
  }, [page, search])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const openEdit = (user: UserRow) => {
    setSelected(user)
    setEditRole(user.role)
    setEditActive(user.is_active)
    setModal("edit")
  }

  const updateUser = async () => {
    if (!selected) return
    setSaving(true)
    await fetch(`/api/admin/users/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: editRole, is_active: editActive }),
    })
    setSaving(false)
    setModal(null)
    fetchUsers()
  }

  const deleteUser = async () => {
    if (!selected) return
    setSaving(true)
    await fetch(`/api/admin/users/${selected.id}`, { method: "DELETE" })
    setSaving(false)
    setModal(null)
    fetchUsers()
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-zinc-900">Users</h2>
          <p className="mt-1 text-sm text-zinc-500">{total} registered users</p>
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            id="admin-users-search"
            className="h-10 w-full rounded-xl border border-zinc-300 bg-zinc-50 py-2 pl-9 pr-3 text-sm text-zinc-900 outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-400"
            placeholder="Search by name or email..."
            value={search}
            onChange={(event: ChangeEvent<HTMLInputElement>) => {
              setSearch(event.target.value)
              setPage(1)
            }}
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-zinc-200 text-sm">
            <thead className="bg-zinc-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">User</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Phone</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Role</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Orders</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Joined</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-zinc-500">
                    Loading...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-zinc-500">
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="transition-colors hover:bg-zinc-50">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-zinc-100 text-zinc-600">
                          <User className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium text-zinc-900">{user.name}</p>
                          <p className="mt-1 text-xs text-zinc-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-zinc-600">{user.phone ?? "—"}</td>
                    <td className="px-4 py-4">
                      <span className="inline-flex rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700">
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-4 font-medium text-zinc-900">{user._count?.orders ?? 0}</td>
                    <td className="px-4 py-4">
                      <span
                        className={user.is_active
                          ? "inline-flex rounded-full bg-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-700"
                          : "inline-flex rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-500"}
                      >
                        {user.is_active ? "Active" : "Banned"}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-zinc-600">
                      {user.created_at ? new Date(user.created_at).toLocaleDateString("vi-VN") : "—"}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          id={`admin-user-edit-${user.id}`}
                          type="button"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-100 text-zinc-700 transition-colors hover:bg-zinc-200"
                          onClick={() => openEdit(user)}
                          title="Edit user"
                        >
                          <UserCog className="h-4 w-4" />
                        </button>
                        <button
                          id={`admin-user-delete-${user.id}`}
                          type="button"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-100 text-zinc-700 transition-colors hover:bg-zinc-200"
                          onClick={() => {
                            setSelected(user)
                            setModal("delete")
                          }}
                          title="Delete user"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center justify-center gap-4">
          <AdminBtn variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage((prev) => prev - 1)}>
            Previous
          </AdminBtn>
          <span className="text-sm text-zinc-500">Page {page} of {totalPages}</span>
          <AdminBtn variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage((prev) => prev + 1)}>
            Next
          </AdminBtn>
        </div>
      ) : null}

      <Modal open={modal === "edit"} onClose={() => setModal(null)} title={`Edit User: ${selected?.name}`} size="sm">
        <div className="mb-4">
          <FormSelect
            label="Role"
            options={[{ value: "USER", label: "User" }, { value: "ADMIN", label: "Admin" }]}
            value={editRole}
            onChange={(event: ChangeEvent<HTMLSelectElement>) => setEditRole(event.target.value)}
          />
        </div>
        <div className="mb-6">
          <FormToggle label="Account Active" checked={editActive} onChange={(value: boolean) => setEditActive(value)} />
        </div>
        <div className="flex justify-end gap-3">
          <AdminBtn variant="secondary" onClick={() => setModal(null)}>
            Cancel
          </AdminBtn>
          <AdminBtn loading={saving} onClick={updateUser}>
            Save
          </AdminBtn>
        </div>
      </Modal>

      <Modal open={modal === "delete"} onClose={() => setModal(null)} title="Delete User" size="sm">
        <p className="mb-6 text-sm text-zinc-600">
          Permanently delete <strong className="text-zinc-900">{selected?.name}</strong> ({selected?.email})?
        </p>
        <div className="flex justify-end gap-3">
          <AdminBtn variant="secondary" onClick={() => setModal(null)}>
            Cancel
          </AdminBtn>
          <AdminBtn variant="danger" loading={saving} onClick={deleteUser}>
            Delete
          </AdminBtn>
        </div>
      </Modal>
    </div>
  )
}
