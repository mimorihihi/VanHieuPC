"use client"

import { useEffect, useState, useCallback, FormEvent } from "react"
import { Plus, Pencil, Trash2, Search } from "lucide-react"
import { Modal } from "@/components/ui/modal"
import { AdminBtn } from "@/components/ui/button"
import { FormInput, FormSelect, FormToggle } from "@/components/ui/form-fields"
import { ImageUpload } from "@/components/ui/image-upload"

interface Category { id: string; name: string; slug: string; parent: { id: string; name: string } | null; is_active: boolean; sort_order: number }

const EMPTY = { name: "", slug: "", parent_id: "", image_url: "", is_active: true, sort_order: 0 }

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<"create" | "edit" | "delete" | null>(null)
  const [selected, setSelected] = useState<Category | null>(null)
  const [form, setForm] = useState<typeof EMPTY & Record<string, any>>(EMPTY)
  const [saving, setSaving] = useState(false)

  const fetch_ = useCallback(() => {
    setLoading(true)
    fetch(`/api/admin/categories?search=${encodeURIComponent(search)}`)
      .then(r => r.json())
      .then(d => setCategories(d.categories ?? []))
      .finally(() => setLoading(false))
  }, [search])

  useEffect(() => { fetch_() }, [fetch_])

  const save = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const url = modal === "edit" ? `/api/admin/categories/${selected?.id}` : "/api/admin/categories"
    const method = modal === "edit" ? "PUT" : "POST"
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, parent_id: form.parent_id || null, sort_order: Number(form.sort_order) }),
    })
    setSaving(false)
    if (res.ok) { setModal(null); fetch_() }
    else { const d = await res.json(); alert(d.error) }
  }

  const del = async () => {
    setSaving(true)
    await fetch(`/api/admin/categories/${selected?.id}`, { method: "DELETE" })
    setSaving(false)
    setModal(null)
    fetch_()
  }

  const parentOptions = categories
    .filter(c => !selected || c?.id !== selected?.id)
    .map(c => ({ value: c?.id ?? "", label: c?.name ?? "" }))

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Categories</h1>
          <p className="page-sub">{categories.length} total categories</p>
        </div>
        <AdminBtn onClick={() => { setForm(EMPTY); setSelected(null); setModal("create") }}>
          <Plus size={16} /> Add Category
        </AdminBtn>
      </div>

      <div className="table-toolbar">
        <div className="search-wrap">
          <Search size={16} className="search-icon" />
          <input className="search-input" placeholder="Search categories…" value={search} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Slug</th>
              <th>Parent</th>
              <th>Order</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={6} className="table-empty">Loading…</td></tr>
              : categories.length === 0 ? <tr><td colSpan={6} className="table-empty">No categories found</td></tr>
              : categories.map((c, i) => (
                <tr key={c?.id || i}>
                  <td className="cell-bold">{c?.name}</td>
                  <td className="cell-mono">{c?.slug}</td>
                  <td>{c?.parent ? <span className="badge badge-gray">{c.parent.name}</span> : <span style={{ color: "#6b7280" }}>—</span>}</td>
                  <td>{c?.sort_order}</td>
                  <td><span className={`badge ${c?.is_active ? "badge-green" : "badge-red"}`}>{c?.is_active ? "Active" : "Inactive"}</span></td>
                  <td>
                    <div className="action-btns">
                      <button className="action-btn edit" onClick={() => { setForm({ ...c, parent_id: c?.parent?.id ?? "" } as any); setSelected(c); setModal("edit") }}><Pencil size={14} /></button>
                      <button className="action-btn delete" onClick={() => { setSelected(c); setModal("delete") }}><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <Modal open={modal === "create" || modal === "edit"} onClose={() => setModal(null)} title={modal === "edit" ? "Edit Category" : "New Category"}>
        <form onSubmit={save}>
          <div className="form-grid form-grid-2">
            <FormInput label="Name" required value={form.name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, name: e.target.value }))} />
            <FormInput label="Slug" required value={form.slug} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, slug: e.target.value }))} />
            <FormSelect label="Parent Category" options={parentOptions} value={form.parent_id} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm(f => ({ ...f, parent_id: e.target.value }))} />
            <FormInput label="Sort Order" type="number" value={form.sort_order} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, sort_order: e.target.value }))} />
          </div>
          <div style={{ marginTop: 16, marginBottom: 16 }}>
            <ImageUpload label="Category Image" value={form.image_url} onChange={(url) => setForm(f => ({ ...f, image_url: url }))} />
          </div>
          <div style={{ marginBottom: 24 }}>
            <FormToggle label="Active" checked={!!form.is_active} onChange={(v: boolean) => setForm(f => ({ ...f, is_active: v }))} />
          </div>
          <div className="form-actions">
            <AdminBtn type="button" variant="secondary" onClick={() => setModal(null)}>Cancel</AdminBtn>
            <AdminBtn type="submit" loading={saving}>Save</AdminBtn>
          </div>
        </form>
      </Modal>

      <Modal open={modal === "delete"} onClose={() => setModal(null)} title="Delete Category" size="sm">
        <p style={{ color: "#9ca3af", marginBottom: 24 }}>
          Delete <strong style={{ color: "#f1f5f9" }}>{selected?.name}</strong>? Child categories will be detached.
        </p>
        <div className="form-actions">
          <AdminBtn variant="secondary" onClick={() => setModal(null)}>Cancel</AdminBtn>
          <AdminBtn variant="danger" loading={saving} onClick={del}>Delete</AdminBtn>
        </div>
      </Modal>

      <style>{`
        .page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 24px; gap: 16px; }
        .page-title { font-size: 22px; font-weight: 700; color: #f1f5f9; }
        .page-sub { font-size: 13px; color: #6b7280; margin-top: 2px; }
        .table-toolbar { display: flex; margin-bottom: 16px; }
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
        .cell-bold { font-weight: 600; color: #f1f5f9; }
        .cell-mono { font-family: monospace; font-size: 13px; color: #9ca3af; }
        .badge { display: inline-flex; align-items: center; padding: 3px 8px; border-radius: 6px; font-size: 12px; font-weight: 500; }
        .badge-green { background: rgba(16,185,129,0.15); color: #34d399; }
        .badge-red { background: rgba(239,68,68,0.15); color: #f87171; }
        .badge-gray { background: #1f2937; color: #9ca3af; }
        .action-btns { display: flex; gap: 6px; }
        .action-btn { background: none; border: none; cursor: pointer; padding: 6px; border-radius: 6px; display: flex; transition: background 0.15s, color 0.15s; }
        .action-btn.edit { color: #6366f1; }
        .action-btn.edit:hover { background: rgba(99,102,241,0.15); }
        .action-btn.delete { color: #ef4444; }
        .action-btn.delete:hover { background: rgba(239,68,68,0.15); }
        .form-grid { display: grid; gap: 16px; }
        .form-grid-2 { grid-template-columns: 1fr 1fr; }
        @media (max-width: 640px) { .form-grid-2 { grid-template-columns: 1fr; } }
        .form-actions { display: flex; gap: 12px; justify-content: flex-end; }
      `}</style>
    </div>
  )
}
