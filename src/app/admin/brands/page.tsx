"use client"

import { useEffect, useState, useCallback, FormEvent } from "react"
import { Plus, Pencil, Trash2, Search } from "lucide-react"
import { Modal } from "@/components/ui/modal"
import { AdminBtn } from "@/components/ui/button"
import { FormInput, FormToggle } from "@/components/ui/form-fields"
import { ImageUpload } from "@/components/ui/image-upload"

interface Brand { id: string; name: string; slug: string; logo_url: string | null; is_active: boolean }

const EMPTY = { name: "", slug: "", logo_url: "", is_active: true }

export default function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<"create" | "edit" | "delete" | null>(null)
  const [selected, setSelected] = useState<Brand | null>(null)
  const [form, setForm] = useState<typeof EMPTY & Record<string, any>>(EMPTY)
  const [saving, setSaving] = useState(false)

  const fetch_ = useCallback(() => {
    setLoading(true)
    fetch(`/api/admin/brands?search=${encodeURIComponent(search)}`)
      .then(r => r.json())
      .then(d => setBrands(d.brands ?? []))
      .finally(() => setLoading(false))
  }, [search])

  useEffect(() => { fetch_() }, [fetch_])

  const save = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const url = modal === "edit" ? `/api/admin/brands/${selected?.id}` : "/api/admin/brands"
    const method = modal === "edit" ? "PUT" : "POST"
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, logo_url: form.logo_url || null }),
    })
    setSaving(false)
    if (res.ok) { setModal(null); fetch_() }
    else { const d = await res.json(); alert(d.error) }
  }

  const del = async () => {
    setSaving(true)
    await fetch(`/api/admin/brands/${selected?.id}`, { method: "DELETE" })
    setSaving(false)
    setModal(null)
    fetch_()
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Brands</h1>
          <p className="page-sub">{brands.length} total brands</p>
        </div>
        <AdminBtn onClick={() => { setForm(EMPTY); setSelected(null); setModal("create") }}>
          <Plus size={16} /> Add Brand
        </AdminBtn>
      </div>

      <div className="table-toolbar">
        <div className="search-wrap">
          <Search size={16} className="search-icon" />
          <input className="search-input" placeholder="Search brands…" value={search} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="brands-grid">
        {loading ? <p className="loading-msg">Loading…</p>
          : brands.length === 0 ? <p className="loading-msg">No brands found</p>
          : brands.map((b, i) => (
            <div key={b?.id || i} className="brand-card">
              <div className="brand-logo-wrap">
                {b?.logo_url
                  ? <img src={b.logo_url} alt={b?.name || "Brand"} className="brand-logo" />
                  : <div className="brand-logo-ph">{b?.name?.[0] || "?"}</div>
                }
              </div>
              <div className="brand-info">
                <div className="brand-name">{b?.name}</div>
                <div className="brand-slug">{b?.slug}</div>
              </div>
              <div className="brand-status">
                <span className={`badge ${b?.is_active ? "badge-green" : "badge-red"}`}>
                  {b?.is_active ? "Active" : "Inactive"}
                </span>
              </div>
              <div className="brand-actions">
                <button className="action-btn edit" onClick={() => { setForm({ ...b, logo_url: b?.logo_url ?? "" } as any); setSelected(b); setModal("edit") }}>
                  <Pencil size={14} />
                </button>
                <button className="action-btn delete" onClick={() => { setSelected(b); setModal("delete") }}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
      </div>

      <Modal open={modal === "create" || modal === "edit"} onClose={() => setModal(null)} title={modal === "edit" ? "Edit Brand" : "New Brand"}>
        <form onSubmit={save}>
          <div className="form-grid form-grid-2" style={{ marginBottom: 16 }}>
            <FormInput label="Name" required value={form.name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, name: e.target.value }))} />
            <FormInput label="Slug" required value={form.slug} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, slug: e.target.value }))} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <ImageUpload label="Logo" value={form.logo_url} onChange={(url) => setForm(f => ({ ...f, logo_url: url }))} />
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

      <Modal open={modal === "delete"} onClose={() => setModal(null)} title="Delete Brand" size="sm">
        <p style={{ color: "#9ca3af", marginBottom: 24 }}>Delete <strong style={{ color: "#f1f5f9" }}>{selected?.name}</strong>?</p>
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
        .brands-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; }
        .loading-msg { color: #6b7280; padding: 40px 0; text-align: center; }
        .brand-card {
          background: #111827; border: 1px solid #1f2937; border-radius: 12px;
          padding: 20px; display: flex; align-items: center; gap: 14px;
          transition: border-color 0.15s, transform 0.15s;
        }
        .brand-card:hover { border-color: #374151; transform: translateY(-1px); }
        .brand-logo-wrap { flex-shrink: 0; }
        .brand-logo { width: 48px; height: 48px; object-fit: contain; border-radius: 8px; background: #1f2937; padding: 4px; }
        .brand-logo-ph { width: 48px; height: 48px; border-radius: 8px; background: linear-gradient(135deg,#6366f1,#8b5cf6); display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 700; color: #fff; }
        .brand-info { flex: 1; min-width: 0; }
        .brand-name { font-weight: 600; color: #f1f5f9; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .brand-slug { font-size: 12px; color: #6b7280; margin-top: 2px; }
        .badge { display: inline-flex; align-items: center; padding: 3px 8px; border-radius: 6px; font-size: 12px; font-weight: 500; }
        .badge-green { background: rgba(16,185,129,0.15); color: #34d399; }
        .badge-red { background: rgba(239,68,68,0.15); color: #f87171; }
        .brand-actions { display: flex; gap: 4px; flex-shrink: 0; }
        .action-btn { background: none; border: none; cursor: pointer; padding: 6px; border-radius: 6px; display: flex; transition: background 0.15s; }
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
