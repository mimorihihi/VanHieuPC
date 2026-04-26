"use client"

import { useEffect, useState, useCallback, FormEvent } from "react"
import { Plus, Pencil, Trash2, GripVertical } from "lucide-react"
import { Modal } from "@/components/ui/modal"
import { AdminBtn } from "@/components/ui/button"
import { FormInput, FormToggle } from "@/components/ui/form-fields"
import { ImageUpload } from "@/components/ui/image-upload"

interface Banner {
  id: string; title: string; image_url: string; link_url: string | null
  sort_order: number; is_active: boolean
}

const EMPTY = { title: "", image_url: "", link_url: "", sort_order: 0, is_active: true }

export default function BannersPage() {
  const [banners, setBanners] = useState<Banner[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<"create" | "edit" | "delete" | null>(null)
  const [selected, setSelected] = useState<Banner | null>(null)
  const [form, setForm] = useState<typeof EMPTY & Record<string, any>>(EMPTY)
  const [saving, setSaving] = useState(false)

  const fetch_ = useCallback(() => {
    setLoading(true)
    fetch("/api/admin/banners")
      .then(r => r.json())
      .then(d => setBanners(d.banners ?? []))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetch_() }, [fetch_])

  const save = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const url = modal === "edit" ? `/api/admin/banners/${selected?.id}` : "/api/admin/banners"
    const method = modal === "edit" ? "PUT" : "POST"
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, sort_order: Number(form.sort_order), link_url: form.link_url || null }),
    })
    setSaving(false)
    if (res.ok) { setModal(null); fetch_() }
    else { const d = await res.json(); alert(d.error) }
  }

  const del = async () => {
    setSaving(true)
    await fetch(`/api/admin/banners/${selected?.id}`, { method: "DELETE" })
    setSaving(false); setModal(null); fetch_()
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Banners</h1>
          <p className="page-sub">{banners.length} banners (sorted by order)</p>
        </div>
        <AdminBtn onClick={() => { setForm(EMPTY); setSelected(null); setModal("create") }}>
          <Plus size={16} /> Add Banner
        </AdminBtn>
        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-indigo-400 hover:text-indigo-300 border border-indigo-800 hover:border-indigo-600 px-3 py-1.5 rounded-lg transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          Preview Homepage
        </a>
      </div>

      {loading ? <p className="loading-msg">Loading…</p>
        : banners.length === 0 ? <p className="loading-msg">No banners yet</p>
        : (
          <div className="banners-list">
            {banners.map((b, i) => (
              <div key={b?.id || i} className="banner-card">
                <div className="banner-drag"><GripVertical size={16} /></div>
                <div className="banner-img-wrap">
                  <img src={b?.image_url} alt={b?.title || "Banner"} className="banner-img" />
                </div>
                <div className="banner-info">
                  <div className="banner-title">{b?.title}</div>
                  {b?.link_url && <a href={b.link_url} className="banner-link" target="_blank" rel="noreferrer">{b.link_url}</a>}
                  <div style={{ marginTop: 6 }}>
                    <span className={`badge ${b?.is_active ? "badge-green" : "badge-red"}`}>{b?.is_active ? "Active" : "Inactive"}</span>
                    <span className="sort-badge">Order: {b?.sort_order}</span>
                  </div>
                </div>
                <div className="banner-actions">
                  <button className="action-btn edit" onClick={() => {
                    setForm({ ...b, link_url: b?.link_url ?? "" } as any)
                    setSelected(b); setModal("edit")
                  }}>
                    <Pencil size={14} />
                  </button>
                  <button className="action-btn delete" onClick={() => { setSelected(b); setModal("delete") }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

      <Modal open={modal === "create" || modal === "edit"} onClose={() => setModal(null)} title={modal === "edit" ? "Edit Banner" : "New Banner"}>
        <form onSubmit={save}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 24 }}>
            <FormInput label="Title" required value={form.title} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, title: e.target.value }))} />
            <ImageUpload label="Banner Image" required value={form.image_url} onChange={(url) => setForm(f => ({ ...f, image_url: url }))} />
            <FormInput label="Link URL" value={form.link_url} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, link_url: e.target.value }))} placeholder="https://... (optional)" />
            <FormInput label="Sort Order" type="number" value={form.sort_order} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))} />
            <FormToggle label="Active" checked={!!form.is_active} onChange={(v: boolean) => setForm(f => ({ ...f, is_active: v }))} />
          </div>
          <div className="form-actions">
            <AdminBtn type="button" variant="secondary" onClick={() => setModal(null)}>Cancel</AdminBtn>
            <AdminBtn type="submit" loading={saving}>Save</AdminBtn>
          </div>
        </form>
      </Modal>

      <Modal open={modal === "delete"} onClose={() => setModal(null)} title="Delete Banner" size="sm">
        <p style={{ color: "#9ca3af", marginBottom: 24 }}>Delete banner <strong style={{ color: "#f1f5f9" }}>{selected?.title}</strong>?</p>
        <div className="form-actions">
          <AdminBtn variant="secondary" onClick={() => setModal(null)}>Cancel</AdminBtn>
          <AdminBtn variant="danger" loading={saving} onClick={del}>Delete</AdminBtn>
        </div>
      </Modal>

      <style>{`
        .page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 24px; gap: 16px; }
        .page-title { font-size: 22px; font-weight: 700; color: #f1f5f9; }
        .page-sub { font-size: 13px; color: #6b7280; margin-top: 2px; }
        .loading-msg { color: #6b7280; text-align: center; padding: 40px; }
        .banners-list { display: flex; flex-direction: column; gap: 12px; }
        .banner-card { background: #111827; border: 1px solid #1f2937; border-radius: 12px; display: flex; align-items: center; gap: 16px; padding: 16px; transition: border-color 0.15s; }
        .banner-card:hover { border-color: #374151; }
        .banner-drag { color: #4b5563; cursor: grab; }
        .banner-img-wrap { flex-shrink: 0; }
        .banner-img { width: 200px; height: 100px; object-fit: cover; border-radius: 8px; background: #1f2937; }
        .banner-info { flex: 1; min-width: 0; }
        .banner-title { font-size: 15px; font-weight: 600; color: #f1f5f9; margin-bottom: 4px; }
        .banner-link { font-size: 12px; color: #6366f1; text-decoration: none; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; }
        .banner-link:hover { text-decoration: underline; }
        .badge { display: inline-flex; align-items: center; padding: 3px 8px; border-radius: 6px; font-size: 12px; font-weight: 500; }
        .badge-green { background: rgba(16,185,129,0.15); color: #34d399; }
        .badge-red { background: rgba(239,68,68,0.15); color: #f87171; }
        .sort-badge { display: inline-flex; align-items: center; padding: 3px 8px; border-radius: 6px; font-size: 12px; background: #1f2937; color: #6b7280; margin-left: 6px; }
        .banner-actions { display: flex; gap: 6px; flex-shrink: 0; }
        .action-btn { background: none; border: none; cursor: pointer; padding: 6px; border-radius: 6px; display: flex; transition: background 0.15s; }
        .action-btn.edit { color: #6366f1; }
        .action-btn.edit:hover { background: rgba(99,102,241,0.15); }
        .action-btn.delete { color: #ef4444; }
        .action-btn.delete:hover { background: rgba(239,68,68,0.15); }
        .form-actions { display: flex; gap: 12px; justify-content: flex-end; }
      `}</style>
    </div>
  )
}
