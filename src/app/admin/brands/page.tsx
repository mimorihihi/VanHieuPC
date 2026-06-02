"use client"

import { type FormEvent, useCallback, useEffect, useState } from "react"
import { Pencil, Plus, Search, Trash2 } from "lucide-react"
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
      .then((response) => response.json())
      .then((data) => setBrands(data.brands ?? []))
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

  const openEdit = (brand: Brand) => {
    setForm({
      name: brand.name ?? "",
      slug: brand.slug ?? "",
      logo_url: brand.logo_url ?? "",
      is_active: !!brand.is_active,
    })
    setSelected(brand)
    setModal("edit")
  }

  const save = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    const url = modal === "edit" ? `/api/admin/brands/${selected?.id}` : "/api/admin/brands"
    const method = modal === "edit" ? "PUT" : "POST"
    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, logo_url: form.logo_url || null }),
    })
    setSaving(false)

    if (response.ok) {
      setModal(null)
      fetchBrands()
      return
    }

    const data = await response.json()
    alert(data.error)
  }

  const deleteBrand = async () => {
    setSaving(true)
    await fetch(`/api/admin/brands/${selected?.id}`, { method: "DELETE" })
    setSaving(false)
    setModal(null)
    fetchBrands()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-zinc-900">Brands</h2>
          <p className="mt-1 text-sm text-zinc-500">{brands.length} total brands</p>
        </div>
        <AdminBtn onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add Brand
        </AdminBtn>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="relative w-full max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            id="admin-brands-search"
            className="h-10 w-full rounded-xl border border-zinc-300 bg-zinc-50 py-2 pl-9 pr-3 text-sm text-zinc-900 outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-400"
            placeholder="Search brands..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {loading ? (
          <p className="col-span-full py-12 text-center text-sm text-zinc-500">Loading...</p>
        ) : brands.length === 0 ? (
          <p className="col-span-full py-12 text-center text-sm text-zinc-500">No brands found</p>
        ) : (
          brands.map((brand) => (
            <div key={brand.id} className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition-colors hover:bg-zinc-50">
              {brand.logo_url ? (
                <img src={brand.logo_url} alt={brand.name || "Brand"} className="h-12 w-12 rounded-xl border border-zinc-200 bg-zinc-50 object-contain p-1" />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-100 text-lg font-semibold text-zinc-700">
                  {brand.name?.[0] || "?"}
                </div>
              )}

              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-zinc-900">{brand.name}</p>
                <p className="mt-1 truncate text-xs text-zinc-500">{brand.slug}</p>
              </div>

              <div className="flex items-center gap-2">
                <span className={brand.is_active ? "inline-flex rounded-full bg-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-700" : "inline-flex rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-500"}>
                  {brand.is_active ? "Active" : "Inactive"}
                </span>
                <button
                  id={`admin-brand-edit-${brand.id}`}
                  type="button"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-100 text-zinc-700 transition-colors hover:bg-zinc-200"
                  onClick={() => openEdit(brand)}
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  id={`admin-brand-delete-${brand.id}`}
                  type="button"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-100 text-zinc-700 transition-colors hover:bg-zinc-200"
                  onClick={() => {
                    setSelected(brand)
                    setModal("delete")
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <Modal open={modal === "create" || modal === "edit"} onClose={() => setModal(null)} title={modal === "edit" ? "Edit Brand" : "New Brand"}>
        <form onSubmit={save} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormInput label="Name" required value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
            <FormInput label="Slug" required value={form.slug} onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))} />
          </div>
          <div>
            <ImageUpload label="Logo" uploadFolder="datn-ecomm/brands" value={form.logo_url} onChange={(url) => setForm((current) => ({ ...current, logo_url: url }))} />
          </div>
          <div>
            <FormToggle label="Active" checked={!!form.is_active} onChange={(value) => setForm((current) => ({ ...current, is_active: value }))} />
          </div>
          <div className="flex justify-end gap-3">
            <AdminBtn type="button" variant="secondary" onClick={() => setModal(null)}>
              Cancel
            </AdminBtn>
            <AdminBtn type="submit" loading={saving}>
              Save
            </AdminBtn>
          </div>
        </form>
      </Modal>

      <Modal open={modal === "delete"} onClose={() => setModal(null)} title="Delete Brand" size="sm">
        <p className="mb-6 text-sm text-zinc-600">
          Delete <strong className="text-zinc-900">{selected?.name}</strong>?
        </p>
        <div className="flex justify-end gap-3">
          <AdminBtn variant="secondary" onClick={() => setModal(null)}>
            Cancel
          </AdminBtn>
          <AdminBtn variant="danger" loading={saving} onClick={deleteBrand}>
            Delete
          </AdminBtn>
        </div>
      </Modal>
    </div>
  )
}
