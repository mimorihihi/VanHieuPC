"use client"

import { type FormEvent, useCallback, useEffect, useState } from "react"
import { Pencil, Plus, Search, Trash2 } from "lucide-react"
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
      .then((response) => response.json())
      .then((data) => setCategories(data.categories ?? []))
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

  const openEdit = (category: Category) => {
    setForm({
      name: category.name ?? "",
      slug: category.slug ?? "",
      parent_id: category.parent?.id ?? "",
      image_url: category.image_url ?? "",
      is_active: !!category.is_active,
      sort_order: Number(category.sort_order ?? 0),
    })
    setSelected(category)
    setModal("edit")
  }

  const save = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    const url = modal === "edit" ? `/api/admin/categories/${selected?.id}` : "/api/admin/categories"
    const method = modal === "edit" ? "PUT" : "POST"
    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, parent_id: form.parent_id || null, sort_order: Number(form.sort_order) }),
    })
    setSaving(false)

    if (response.ok) {
      setModal(null)
      fetchCategories()
      return
    }

    const data = await response.json()
    alert(data.error)
  }

  const deleteCategory = async () => {
    setSaving(true)
    await fetch(`/api/admin/categories/${selected?.id}`, { method: "DELETE" })
    setSaving(false)
    setModal(null)
    fetchCategories()
  }

  const parentOptions = categories
    .filter((category) => !selected || category.id !== selected.id)
    .map((category) => ({ value: category.id ?? "", label: category.name ?? "" }))

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-zinc-900">Categories</h2>
          <p className="mt-1 text-sm text-zinc-500">{categories.length} total categories</p>
        </div>
        <AdminBtn onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add Category
        </AdminBtn>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="relative w-full max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            id="admin-categories-search"
            className="h-10 w-full rounded-xl border border-zinc-300 bg-zinc-50 py-2 pl-9 pr-3 text-sm text-zinc-900 outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-400"
            placeholder="Search categories..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-zinc-200 text-sm">
            <thead className="bg-zinc-100">
              <tr>
                {["Name", "Slug", "Parent", "Order", "Status", "Actions"].map((head) => (
                  <th key={head} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm text-zinc-500">
                    Loading...
                  </td>
                </tr>
              ) : categories.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm text-zinc-500">
                    No categories found
                  </td>
                </tr>
              ) : (
                categories.map((category) => (
                  <tr key={category.id} className="transition-colors hover:bg-zinc-50">
                    <td className="px-4 py-4 font-medium text-zinc-900">{category.name}</td>
                    <td className="px-4 py-4 font-mono text-xs text-zinc-500">{category.slug}</td>
                    <td className="px-4 py-4">
                      {category.parent ? <span className="inline-flex rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700">{category.parent.name}</span> : <span className="text-zinc-500">-</span>}
                    </td>
                    <td className="px-4 py-4 text-zinc-600">{category.sort_order}</td>
                    <td className="px-4 py-4">
                      <span className={category.is_active ? "inline-flex rounded-full bg-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-700" : "inline-flex rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-500"}>
                        {category.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          id={`admin-category-edit-${category.id}`}
                          type="button"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-100 text-zinc-700 transition-colors hover:bg-zinc-200"
                          onClick={() => openEdit(category)}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          id={`admin-category-delete-${category.id}`}
                          type="button"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-100 text-zinc-700 transition-colors hover:bg-zinc-200"
                          onClick={() => {
                            setSelected(category)
                            setModal("delete")
                          }}
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

      <Modal open={modal === "create" || modal === "edit"} onClose={() => setModal(null)} title={modal === "edit" ? "Edit Category" : "New Category"}>
        <form onSubmit={save} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormInput label="Name" required value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
            <FormInput label="Slug" required value={form.slug} onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))} />
            <FormSelect label="Parent Category" options={parentOptions} value={form.parent_id} onChange={(event) => setForm((current) => ({ ...current, parent_id: event.target.value }))} />
            <FormInput label="Sort Order" type="number" value={form.sort_order} onChange={(event) => setForm((current) => ({ ...current, sort_order: Number(event.target.value) }))} />
          </div>
          <div>
            <ImageUpload label="Category Image" uploadFolder="datn-ecomm/categories" value={form.image_url} onChange={(url) => setForm((current) => ({ ...current, image_url: url }))} />
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

      <Modal open={modal === "delete"} onClose={() => setModal(null)} title="Delete Category" size="sm">
        <p className="mb-6 text-sm text-zinc-600">
          Delete <strong className="text-zinc-900">{selected?.name}</strong>? Child categories will be detached.
        </p>
        <div className="flex justify-end gap-3">
          <AdminBtn variant="secondary" onClick={() => setModal(null)}>
            Cancel
          </AdminBtn>
          <AdminBtn variant="danger" loading={saving} onClick={deleteCategory}>
            Delete
          </AdminBtn>
        </div>
      </Modal>
    </div>
  )
}
