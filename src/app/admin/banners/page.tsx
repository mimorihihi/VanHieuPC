"use client"

import { useEffect, useState, useCallback, FormEvent } from "react"
import Image from "next/image"
import { Plus, Pencil, Trash2, GripVertical } from "lucide-react"
import { Modal } from "@/components/ui/modal"
import { AdminBtn } from "@/components/ui/button"
import { FormInput, FormToggle } from "@/components/ui/form-fields"
import { ImageUpload } from "@/components/ui/image-upload"

interface Banner {
  id: string; title: string; image_url: string; link_url: string | null
  sort_order: number; is_active: boolean
}

type BannerForm = Omit<Banner, "id"> & { link_url: string }

const EMPTY: BannerForm = { title: "", image_url: "", link_url: "", sort_order: 0, is_active: true }

export default function BannersPage() {
  const [banners, setBanners] = useState<Banner[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<"create" | "edit" | "delete" | null>(null)
  const [selected, setSelected] = useState<Banner | null>(null)
  const [form, setForm] = useState<BannerForm>(EMPTY)
  const [saving, setSaving] = useState(false)

  const fetch_ = useCallback(() => {
    setLoading(true)
    fetch("/api/admin/banners")
      .then(r => r.json())
      .then(d => setBanners(d.banners ?? []))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const loadBanners = () => fetch_()
    loadBanners()
  }, [fetch_])

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
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold text-zinc-900">Banners</h1>
          <p className="mt-0.5 text-[13px] text-zinc-500">{banners.length} banners (sorted by order)</p>
        </div>
        <AdminBtn onClick={() => { setForm(EMPTY); setSelected(null); setModal("create") }}>
          <Plus className="h-4 w-4" /> Add Banner
        </AdminBtn>
        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 px-3 py-1.5 text-sm text-indigo-600 transition-colors hover:border-indigo-300 hover:bg-indigo-50"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          Preview Homepage
        </a>
      </div>

      {loading ? <p className="py-10 text-center text-zinc-500">Loading…</p>
        : banners.length === 0 ? <p className="py-10 text-center text-zinc-500">No banners yet</p>
        : (
          <div className="flex flex-col gap-3">
            {banners.map((b, i) => (
              <div key={b?.id || i} className="flex items-center gap-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition-colors hover:border-zinc-300 max-md:flex-col max-md:items-start">
                <div className="cursor-grab text-zinc-400"><GripVertical className="h-4 w-4" /></div>
                <div className="shrink-0">
                  <Image src={b?.image_url} alt={b?.title || "Banner"} width={200} height={100} className="h-[100px] w-[200px] rounded-lg bg-zinc-100 object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 text-[15px] font-semibold text-zinc-900">{b?.title}</div>
                  {b?.link_url && <a href={b.link_url} className="block truncate text-xs text-indigo-600 hover:underline" target="_blank" rel="noreferrer">{b.link_url}</a>}
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    <span className={b?.is_active ? "inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700" : "inline-flex items-center rounded-md bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700"}>{b?.is_active ? "Active" : "Inactive"}</span>
                    <span className="inline-flex items-center rounded-md bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500">Order: {b?.sort_order}</span>
                  </div>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <button className="flex rounded-md p-1.5 text-indigo-600 transition-colors hover:bg-indigo-50" onClick={() => {
                    setForm({ ...b, link_url: b?.link_url ?? "" })
                    setSelected(b); setModal("edit")
                  }}>
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button className="flex rounded-md p-1.5 text-red-600 transition-colors hover:bg-red-50" onClick={() => { setSelected(b); setModal("delete") }}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

      <Modal open={modal === "create" || modal === "edit"} onClose={() => setModal(null)} title={modal === "edit" ? "Edit Banner" : "New Banner"}>
        <form onSubmit={save}>
          <div className="mb-6 flex flex-col gap-4">
            <FormInput label="Title" required value={form.title} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, title: e.target.value }))} />
            <ImageUpload label="Banner Image" required uploadFolder="datn-ecomm/banners" value={form.image_url} onChange={(url) => setForm(f => ({ ...f, image_url: url }))} />
            <FormInput label="Link URL" value={form.link_url} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, link_url: e.target.value }))} placeholder="https://... (optional)" />
            <FormInput label="Sort Order" type="number" value={form.sort_order} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))} />
            <FormToggle label="Active" checked={!!form.is_active} onChange={(v: boolean) => setForm(f => ({ ...f, is_active: v }))} />
          </div>
          <div className="flex justify-end gap-3">
            <AdminBtn type="button" variant="secondary" onClick={() => setModal(null)}>Cancel</AdminBtn>
            <AdminBtn type="submit" loading={saving}>Save</AdminBtn>
          </div>
        </form>
      </Modal>

      <Modal open={modal === "delete"} onClose={() => setModal(null)} title="Delete Banner" size="sm">
        <p className="mb-6 text-zinc-500">Delete banner <strong className="text-zinc-900">{selected?.title}</strong>?</p>
        <div className="flex justify-end gap-3">
          <AdminBtn variant="secondary" onClick={() => setModal(null)}>Cancel</AdminBtn>
          <AdminBtn variant="danger" loading={saving} onClick={del}>Delete</AdminBtn>
        </div>
      </Modal>
    </div>
  )
}
