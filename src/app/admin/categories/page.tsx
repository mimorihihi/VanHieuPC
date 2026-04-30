"use client"

import { useEffect, useState, useCallback, FormEvent } from "react"
import { Plus, Pencil, Trash2, Search } from "lucide-react"
import { Modal } from "@/components/ui/modal"
import { AdminBtn } from "@/components/ui/button"
import { FormInput, FormSelect, FormToggle } from "@/components/ui/form-fields"
import { ImageUpload } from "@/components/ui/image-upload"

interface Category {
  id: string
  name: string
  slug: string
  parent: { id: string; name: string } | null
  is_active: boolean
  sort_order: number
  image_url?: string | null
}

interface CategoryFormState {
  name: string
  slug: string
  parent_id: string
  image_url: string
  is_active: boolean
  sort_order: number
}

const EMPTY: CategoryFormState = {
  name: "",
  slug: "",
  parent_id: "",
  image_url: "",
  is_active: true,
  sort_order: 0,
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<"create" | "edit" | "delete" | null>(null)
  const [selected, setSelected] = useState<Category | null>(null)
  const [form, setForm] = useState<CategoryFormState>(EMPTY)
  const [saving, setSaving] = useState(false)

  const fetchCategories = useCallback(() => {
    setLoading(true)
    fetch(`/api/admin/categories?search=${encodeURIComponent(search)}`)
      .then((r) => r.json())
      .then((d) => setCategories(d.categories ?? []))
      .finally(() => setLoading(false))
  }, [search])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCategories()
    }, 0)
    return () => clearTimeout(timer)
  }, [fetchCategories])

  const openCreate = () => {
    setForm(EMPTY)
    setSelected(null)
    setModal("create")
  }

  const openEdit = (c: Category) => {
    setForm({
      name: c.name ?? "",
      slug: c.slug ?? "",
      parent_id: c.parent?.id ?? "",
      image_url: c.image_url ?? "",
      is_active: !!c.is_active,
      sort_order: Number(c.sort_order ?? 0),
    })
    setSelected(c)
    setModal("edit")
  }

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
    if (res.ok) {
      setModal(null)
      fetchCategories()
    } else {
      const d = await res.json()
      alert(d.error)
    }
  }

  const del = async () => {
    setSaving(true)
    await fetch(`/api/admin/categories/${selected?.id}`, { method: "DELETE" })
    setSaving(false)
    setModal(null)
    fetchCategories()
  }

  const parentOptions = categories
    .filter((c) => !selected || c.id !== selected.id)
    .map((c) => ({ value: c.id ?? "", label: c.name ?? "" }))

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold text-slate-100">Categories</h1>
          <p className="mt-0.5 text-xs text-zinc-500">{categories.length} total categories</p>
        </div>
        <AdminBtn onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" /> Add Category
        </AdminBtn>
      </div>

      <div className="mb-4 max-w-sm">
        <div className="relative">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            className="h-10 w-full rounded-lg border border-zinc-800 bg-zinc-900 py-2 pr-3 pl-9 text-sm text-slate-200 outline-none transition-colors placeholder:text-zinc-500 focus:border-indigo-500"
            placeholder="Search categories..."
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-800">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              {["Name", "Slug", "Parent", "Order", "Status", "Actions"].map((head) => (
                <th key={head} className="border-b border-zinc-800 bg-zinc-950 px-4 py-3 text-left text-xs font-medium tracking-wider text-zinc-500 uppercase">
                  {head}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-zinc-500">Loading...</td></tr>
            ) : categories.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-zinc-500">No categories found</td></tr>
            ) : (
              categories.map((c, i) => (
                <tr key={c.id || i} className="border-b border-zinc-800 last:border-b-0 hover:bg-white/[0.02]">
                  <td className="px-4 py-3 font-semibold text-slate-100">{c.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-400">{c.slug}</td>
                  <td className="px-4 py-3">
                    {c.parent ? <span className="inline-flex rounded-md bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">{c.parent.name}</span> : <span className="text-zinc-500">-</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-200">{c.sort_order}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${c.is_active ? "bg-emerald-400/15 text-emerald-300" : "bg-red-400/15 text-red-300"}`}>
                      {c.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      <button className="rounded-md p-1.5 text-indigo-400 transition-colors hover:bg-indigo-500/15" onClick={() => openEdit(c)}>
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button className="rounded-md p-1.5 text-red-400 transition-colors hover:bg-red-500/15" onClick={() => { setSelected(c); setModal("delete") }}>
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

      <Modal open={modal === "create" || modal === "edit"} onClose={() => setModal(null)} title={modal === "edit" ? "Edit Category" : "New Category"}>
        <form onSubmit={save}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormInput label="Name" required value={form.name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, name: e.target.value }))} />
            <FormInput label="Slug" required value={form.slug} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, slug: e.target.value }))} />
            <FormSelect label="Parent Category" options={parentOptions} value={form.parent_id} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm((f) => ({ ...f, parent_id: e.target.value }))} />
            <FormInput label="Sort Order" type="number" value={form.sort_order} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, sort_order: Number(e.target.value) }))} />
          </div>
          <div className="my-4">
            <ImageUpload label="Category Image" uploadFolder="datn-ecomm/categories" value={form.image_url} onChange={(url) => setForm((f) => ({ ...f, image_url: url }))} />
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

      <Modal open={modal === "delete"} onClose={() => setModal(null)} title="Delete Category" size="sm">
        <p className="mb-6 text-sm text-zinc-400">
          Delete <strong className="text-slate-100">{selected?.name}</strong>? Child categories will be detached.
        </p>
        <div className="flex justify-end gap-3">
          <AdminBtn variant="secondary" onClick={() => setModal(null)}>Cancel</AdminBtn>
          <AdminBtn variant="danger" loading={saving} onClick={del}>Delete</AdminBtn>
        </div>
      </Modal>
    </div>
  )
}
