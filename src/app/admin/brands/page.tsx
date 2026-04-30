"use client"

import { useEffect, useState, useCallback, FormEvent } from "react"
import { Plus, Pencil, Trash2, Search } from "lucide-react"
import { Modal } from "@/components/ui/modal"
import { AdminBtn } from "@/components/ui/button"
import { FormInput, FormToggle } from "@/components/ui/form-fields"
import { ImageUpload } from "@/components/ui/image-upload"

interface Brand {
  id: string
  name: string
  slug: string
  logo_url: string | null
  is_active: boolean
}

interface BrandFormState {
  name: string
  slug: string
  logo_url: string
  is_active: boolean
}

const EMPTY: BrandFormState = { name: "", slug: "", logo_url: "", is_active: true }

export default function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<"create" | "edit" | "delete" | null>(null)
  const [selected, setSelected] = useState<Brand | null>(null)
  const [form, setForm] = useState<BrandFormState>(EMPTY)
  const [saving, setSaving] = useState(false)

  const fetchBrands = useCallback(() => {
    setLoading(true)
    fetch(`/api/admin/brands?search=${encodeURIComponent(search)}`)
      .then((r) => r.json())
      .then((d) => setBrands(d.brands ?? []))
      .finally(() => setLoading(false))
  }, [search])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchBrands()
    }, 0)
    return () => clearTimeout(timer)
  }, [fetchBrands])

  const openCreate = () => {
    setForm(EMPTY)
    setSelected(null)
    setModal("create")
  }

  const openEdit = (b: Brand) => {
    setForm({
      name: b.name ?? "",
      slug: b.slug ?? "",
      logo_url: b.logo_url ?? "",
      is_active: !!b.is_active,
    })
    setSelected(b)
    setModal("edit")
  }

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
    if (res.ok) {
      setModal(null)
      fetchBrands()
    } else {
      const d = await res.json()
      alert(d.error)
    }
  }

  const del = async () => {
    setSaving(true)
    await fetch(`/api/admin/brands/${selected?.id}`, { method: "DELETE" })
    setSaving(false)
    setModal(null)
    fetchBrands()
  }

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold text-slate-100">Brands</h1>
          <p className="mt-0.5 text-xs text-zinc-500">{brands.length} total brands</p>
        </div>
        <AdminBtn onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" /> Add Brand
        </AdminBtn>
      </div>

      <div className="mb-4 max-w-sm">
        <div className="relative">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            className="h-10 w-full rounded-lg border border-zinc-800 bg-zinc-900 py-2 pr-3 pl-9 text-sm text-slate-200 outline-none transition-colors placeholder:text-zinc-500 focus:border-indigo-500"
            placeholder="Search brands..."
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {loading ? (
          <p className="col-span-full py-10 text-center text-zinc-500">Loading...</p>
        ) : brands.length === 0 ? (
          <p className="col-span-full py-10 text-center text-zinc-500">No brands found</p>
        ) : (
          brands.map((b, i) => (
            <div key={b.id || i} className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-4 transition-colors hover:border-zinc-700">
              {b.logo_url ? (
                <img src={b.logo_url} alt={b.name || "Brand"} className="h-12 w-12 rounded-lg bg-zinc-800 object-contain p-1" />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 text-lg font-bold text-white">
                  {b.name?.[0] || "?"}
                </div>
              )}

              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold text-slate-100">{b.name}</div>
                <div className="mt-0.5 truncate text-xs text-zinc-500">{b.slug}</div>
              </div>

              <div className="flex items-center gap-1.5">
                <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${b.is_active ? "bg-emerald-400/15 text-emerald-300" : "bg-red-400/15 text-red-300"}`}>
                  {b.is_active ? "Active" : "Inactive"}
                </span>
                <button className="rounded-md p-1.5 text-indigo-400 transition-colors hover:bg-indigo-500/15" onClick={() => openEdit(b)}>
                  <Pencil className="h-4 w-4" />
                </button>
                <button className="rounded-md p-1.5 text-red-400 transition-colors hover:bg-red-500/15" onClick={() => { setSelected(b); setModal("delete") }}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <Modal open={modal === "create" || modal === "edit"} onClose={() => setModal(null)} title={modal === "edit" ? "Edit Brand" : "New Brand"}>
        <form onSubmit={save}>
          <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormInput label="Name" required value={form.name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, name: e.target.value }))} />
            <FormInput label="Slug" required value={form.slug} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, slug: e.target.value }))} />
          </div>
          <div className="mb-4">
            <ImageUpload label="Logo" uploadFolder="datn-ecomm/brands" value={form.logo_url} onChange={(url) => setForm((f) => ({ ...f, logo_url: url }))} />
          </div>
          <div className="mb-6">
            <FormToggle label="Active" checked={!!form.is_active} onChange={(v: boolean) => setForm((f) => ({ ...f, is_active: v }))} />
          </div>
          <div className="flex justify-end gap-3">
            <AdminBtn type="button" variant="secondary" onClick={() => setModal(null)}>Cancel</AdminBtn>
            <AdminBtn type="submit" loading={saving}>Save</AdminBtn>
          </div>
        </form>
      </Modal>

      <Modal open={modal === "delete"} onClose={() => setModal(null)} title="Delete Brand" size="sm">
        <p className="mb-6 text-sm text-zinc-400">Delete <strong className="text-slate-100">{selected?.name}</strong>?</p>
        <div className="flex justify-end gap-3">
          <AdminBtn variant="secondary" onClick={() => setModal(null)}>Cancel</AdminBtn>
          <AdminBtn variant="danger" loading={saving} onClick={del}>Delete</AdminBtn>
        </div>
      </Modal>
    </div>
  )
}
