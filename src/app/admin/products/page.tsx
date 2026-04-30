"use client"

import { useEffect, useState, useCallback, FormEvent } from "react"
import { Plus, Pencil, Trash2, Search, Star } from "lucide-react"
import Link from "next/link"
import { Modal } from "@/components/ui/modal"
import { AdminBtn } from "@/components/ui/button"
import { FormInput, FormTextarea, FormSelect, FormToggle } from "@/components/ui/form-fields"
import { ImageUpload } from "@/components/ui/image-upload"

interface Category {
  id: string
  name: string
}

interface Brand {
  id: string
  name: string
}

interface Product {
  id: string
  name: string
  price: string
  sale_price: string | null
  stock: number
  thumbnail_url: string | null
  avg_rating: string
  is_active: boolean
  is_featured: boolean
  slug: string
  category: Category | null
  brand: Brand | null
}

interface ProductFormState {
  name: string
  slug: string
  description: string
  price: string
  sale_price: string
  stock: number
  thumbnail_url: string
  category_id: string
  brand_id: string
  is_active: boolean
  is_featured: boolean
}

const EMPTY: ProductFormState = {
  name: "",
  slug: "",
  description: "",
  price: "",
  sale_price: "",
  stock: 0,
  thumbnail_url: "",
  category_id: "",
  brand_id: "",
  is_active: true,
  is_featured: false,
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<"create" | "edit" | "delete" | null>(null)
  const [selected, setSelected] = useState<Product | null>(null)
  const [form, setForm] = useState<ProductFormState>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [brands, setBrands] = useState<Brand[]>([])

  const limit = 15

  const normalizeOptions = (items: unknown[]): { id: string; name: string }[] =>
    items
      .filter((item): item is { id?: unknown; name?: unknown } => !!item && typeof item === "object")
      .map((item) => ({
        id: typeof item.id === "string" ? item.id : "",
        name: typeof item.name === "string" ? item.name : "",
      }))
      .filter((item) => item.id.length > 0)

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/categories").then((r) => r.json()),
      fetch("/api/admin/brands").then((r) => r.json()),
    ]).then(([catData, brandData]) => {
      setCategories(normalizeOptions(catData.categories ?? []))
      setBrands(normalizeOptions(brandData.brands ?? []))
    })
  }, [])

  const fetchProducts = useCallback(() => {
    setLoading(true)
    fetch(`/api/admin/products?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`)
      .then((r) => r.json())
      .then((d) => {
        setProducts(d.products ?? [])
        setTotal(d.total ?? 0)
      })
      .finally(() => setLoading(false))
  }, [page, search])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts()
    }, 0)
    return () => clearTimeout(timer)
  }, [fetchProducts])

  const openEdit = (p: Product) => {
    setForm({
      name: p.name ?? "",
      slug: p.slug ?? "",
      description: "",
      price: p.price?.toString() ?? "",
      sale_price: p.sale_price?.toString() ?? "",
      stock: Number(p.stock ?? 0),
      thumbnail_url: p.thumbnail_url ?? "",
      category_id: p.category?.id ?? "",
      brand_id: p.brand?.id ?? "",
      is_active: !!p.is_active,
      is_featured: !!p.is_featured,
    })
    setSelected(p)
    setModal("edit")
  }

  const openDelete = (p: Product) => {
    setSelected(p)
    setModal("delete")
  }

  const saveProduct = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const url = modal === "edit" ? `/api/admin/products/${selected?.id}` : "/api/admin/products"
    const method = modal === "edit" ? "PUT" : "POST"
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        price: Number(form.price),
        sale_price: form.sale_price ? Number(form.sale_price) : null,
        stock: Number(form.stock),
        brand_id: form.brand_id || null,
      }),
    })
    setSaving(false)
    if (res.ok) {
      setModal(null)
      fetchProducts()
    } else {
      const d = await res.json()
      alert(d.error)
    }
  }

  const deleteProduct = async () => {
    setSaving(true)
    await fetch(`/api/admin/products/${selected?.id}`, { method: "DELETE" })
    setSaving(false)
    setModal(null)
    fetchProducts()
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold text-slate-100">Products</h1>
          <p className="mt-0.5 text-xs text-zinc-500">{total} total products</p>
        </div>
        <Link href="/admin/products/new">
          <AdminBtn>
            <Plus className="mr-2 h-4 w-4" /> Add Product
          </AdminBtn>
        </Link>
      </div>

      <div className="mb-4 max-w-sm">
        <div className="relative">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            className="h-10 w-full rounded-lg border border-zinc-800 bg-zinc-900 py-2 pr-3 pl-9 text-sm text-slate-200 outline-none transition-colors placeholder:text-zinc-500 focus:border-indigo-500"
            placeholder="Search products..."
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setSearch(e.target.value)
              setPage(1)
            }}
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-800">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              {["Product", "Category", "Price", "Stock", "Rating", "Status", "Actions"].map((head) => (
                <th key={head} className="border-b border-zinc-800 bg-zinc-950 px-4 py-3 text-left text-xs font-medium tracking-wider text-zinc-500 uppercase">
                  {head}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-zinc-500">Loading...</td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-zinc-500">No products found</td>
              </tr>
            ) : (
              products.map((p, i) => (
                <tr key={p.id || i} className="border-b border-zinc-800 last:border-b-0 hover:bg-white/[0.02]">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {p.thumbnail_url ? (
                        <img src={p.thumbnail_url} alt={p.name || "Product"} className="h-10 w-10 rounded-lg bg-zinc-800 object-cover" />
                      ) : (
                        <div className="h-10 w-10 shrink-0 rounded-lg bg-zinc-800" />
                      )}
                      <div>
                        <div className="max-w-[220px] truncate font-medium text-slate-100">{p.name}</div>
                        <div className="text-xs text-zinc-500">{p.slug}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-md bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">{p.category?.name ?? "-"}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-semibold text-slate-100">₫{Number(p.price || 0).toLocaleString()}</span>
                      {p.sale_price && <span className="text-xs text-indigo-300">₫{Number(p.sale_price).toLocaleString()}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${Number(p.stock || 0) > 0 ? "bg-emerald-400/15 text-emerald-300" : "bg-red-400/15 text-red-300"}`}>
                      {p.stock || 0}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-amber-300">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      <span>{p.avg_rating || "0"}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${p.is_active ? "bg-emerald-400/15 text-emerald-300" : "bg-red-400/15 text-red-300"}`}>
                        {p.is_active ? "Active" : "Inactive"}
                      </span>
                      {p.is_featured && <span className="inline-flex rounded-md bg-violet-400/15 px-2 py-0.5 text-xs font-medium text-violet-300">Featured</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      <button className="rounded-md p-1.5 text-indigo-400 transition-colors hover:bg-indigo-500/15" onClick={() => openEdit(p)}>
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button className="rounded-md p-1.5 text-red-400 transition-colors hover:bg-red-500/15" onClick={() => openDelete(p)}>
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

      {totalPages > 1 && (
        <div className="mt-5 flex items-center justify-center gap-4">
          <AdminBtn variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </AdminBtn>
          <span className="text-sm text-zinc-500">Page {page} of {totalPages}</span>
          <AdminBtn variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Next
          </AdminBtn>
        </div>
      )}

      <Modal open={modal === "edit"} onClose={() => setModal(null)} title="Edit Product" size="lg">
        <form onSubmit={saveProduct}>
          <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormInput label="Name" required value={form.name ?? ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, name: e.target.value }))} />
            <FormInput label="Slug" required value={form.slug ?? ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, slug: e.target.value }))} />
            <FormInput label="Price (₫)" required type="number" value={form.price ?? ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, price: e.target.value }))} />
            <FormInput label="Sale Price (₫)" type="number" value={form.sale_price ?? ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, sale_price: e.target.value }))} />
            <FormInput label="Stock" type="number" value={form.stock ?? 0} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, stock: Number(e.target.value) }))} />
            <div className="md:col-span-2">
              <ImageUpload label="Thumbnail" uploadFolder="datn-ecomm/products" value={form.thumbnail_url ?? ""} onChange={(url) => setForm((f) => ({ ...f, thumbnail_url: url }))} />
            </div>
            <FormSelect label="Category" required options={categories.map((c) => ({ value: c.id ?? "", label: c.name ?? "" }))} value={form.category_id ?? ""} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm((f) => ({ ...f, category_id: e.target.value }))} />
            <FormSelect label="Brand" options={brands.map((b) => ({ value: b.id ?? "", label: b.name ?? "" }))} value={form.brand_id ?? ""} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm((f) => ({ ...f, brand_id: e.target.value }))} />
          </div>

          <div className="mb-4">
            <FormTextarea label="Description" value={form.description ?? ""} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </div>

          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormToggle label="Active" checked={!!form.is_active} onChange={(v: boolean) => setForm((f) => ({ ...f, is_active: v }))} />
            <FormToggle label="Featured" checked={!!form.is_featured} onChange={(v: boolean) => setForm((f) => ({ ...f, is_featured: v }))} />
          </div>

          <div className="flex justify-end gap-3">
            <AdminBtn type="button" variant="secondary" onClick={() => setModal(null)}>Cancel</AdminBtn>
            <AdminBtn type="submit" loading={saving}>Save Changes</AdminBtn>
          </div>
        </form>
      </Modal>

      <Modal open={modal === "delete"} onClose={() => setModal(null)} title="Delete Product" size="sm">
        <p className="mb-6 text-sm text-zinc-400">
          Are you sure you want to delete <strong className="text-slate-100">{selected?.name}</strong>? This action cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <AdminBtn variant="secondary" onClick={() => setModal(null)}>Cancel</AdminBtn>
          <AdminBtn variant="danger" loading={saving} onClick={deleteProduct}>Delete</AdminBtn>
        </div>
      </Modal>
    </div>
  )
}
