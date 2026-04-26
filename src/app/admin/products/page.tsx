"use client"

import { useEffect, useState, useCallback, FormEvent } from "react"
import { Plus, Pencil, Trash2, Search, Eye, EyeOff, Star } from "lucide-react"
import Link from "next/link"
import { Modal } from "@/components/ui/modal"
import { AdminBtn } from "@/components/ui/button"
import { FormInput, FormTextarea, FormSelect, FormToggle } from "@/components/ui/form-fields"
import { ImageUpload } from "@/components/ui/image-upload"

interface Category { id: string; name: string }
interface Brand { id: string; name: string }
interface Product {
  id: string; name: string; price: string; sale_price: string | null
  stock: number; thumbnail_url: string | null; avg_rating: string
  is_active: boolean; is_featured: boolean; slug: string
  category: Category | null; brand: Brand | null
}

const EMPTY: Partial<Product> & Record<string, any> = {
  name: "", slug: "", description: "", price: "",
  sale_price: "", stock: 0, thumbnail_url: "", category_id: "",
  brand_id: "", is_active: true, is_featured: false,
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<"create" | "edit" | "delete" | null>(null)
  const [selected, setSelected] = useState<Product | null>(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [brands, setBrands] = useState<Brand[]>([])

  const limit = 15

  const normalizeOptions = (items: unknown[]): { id: string; name: string }[] =>
    items
      .filter((item): item is { id?: unknown; name?: unknown } => !!item && typeof item === "object")
      .map((item: any) => ({
        id: item && typeof item.id === "string" ? item.id : "",
        name: item && typeof item.name === "string" ? item.name : "",
      }))
      .filter((item) => item.id.length > 0)

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/categories").then(r => r.json()),
      fetch("/api/admin/brands").then(r => r.json()),
    ]).then(([catData, brandData]) => {
      setCategories(normalizeOptions(catData.categories ?? []))
      setBrands(normalizeOptions(brandData.brands ?? []))
    })
  }, [])

  const fetchProducts = useCallback(() => {
    setLoading(true)
    fetch(`/api/admin/products?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`)
      .then(r => r.json())
      .then(d => { setProducts(d.products ?? []); setTotal(d.total ?? 0) })
      .finally(() => setLoading(false))
  }, [page, search])

  useEffect(() => { fetchProducts() }, [fetchProducts])

  const openCreate = () => { setForm({ ...EMPTY }); setSelected(null); setModal("create") }
  const openEdit = (p: Product) => {
    setForm({ ...p, category_id: p?.category?.id ?? "", brand_id: p?.brand?.id ?? "" } as any)
    setSelected(p); setModal("edit")
  }
  const openDelete = (p: Product) => { setSelected(p); setModal("delete") }

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
    if (res.ok) { setModal(null); fetchProducts() }
    else { const d = await res.json(); alert(d.error) }
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
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Products</h1>
          <p className="page-sub">{total} total products</p>
        </div>
        <Link href="/admin/products/new">
          <AdminBtn>
            <Plus size={16} /> Add Product
          </AdminBtn>
        </Link>
      </div>

      {/* Search */}
      <div className="table-toolbar">
        <div className="search-wrap">
          <Search size={16} className="search-icon" />
          <input
            className="search-input"
            placeholder="Search products..."
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setSearch(e.target.value); setPage(1) }}
          />
        </div>
      </div>

      {/* Table */}
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Category</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Rating</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="table-empty">Loading…</td></tr>
            ) : products.length === 0 ? (
              <tr><td colSpan={7} className="table-empty">No products found</td></tr>
            ) : products.map((p, i) => (
              <tr key={p?.id || i}>
                <td>
                  <div className="product-cell">
                    {p?.thumbnail_url ? (
                      <img src={p.thumbnail_url} alt={p?.name || "Product"} className="product-thumb" />
                    ) : (
                      <div className="product-thumb-placeholder" />
                    )}
                    <div>
                      <div className="product-name">{p?.name}</div>
                      <div className="product-slug">{p?.slug}</div>
                    </div>
                  </div>
                </td>
                <td><span className="badge badge-gray">{p?.category?.name ?? "—"}</span></td>
                <td>
                  <div className="price-col">
                    <span className="price-main">₫{Number(p?.price || 0).toLocaleString()}</span>
                    {p?.sale_price && (
                      <span className="price-sale">₫{Number(p.sale_price).toLocaleString()}</span>
                    )}
                  </div>
                </td>
                <td>
                  <span className={`badge ${(p?.stock || 0) > 0 ? "badge-green" : "badge-red"}`}>
                    {p?.stock || 0}
                  </span>
                </td>
                <td>
                  <div className="rating-cell">
                    <Star size={12} fill="#f59e0b" stroke="none" />
                    {p?.avg_rating || "0"}
                  </div>
                </td>
                <td>
                  <span className={`badge ${p?.is_active ? "badge-green" : "badge-red"}`}>
                    {p?.is_active ? "Active" : "Inactive"}
                  </span>
                  {p?.is_featured && <span className="badge badge-purple" style={{ marginLeft: 4 }}>Featured</span>}
                </td>
                <td>
                  <div className="action-btns">
                    <button className="action-btn edit" onClick={() => openEdit(p)}><Pencil size={14} /></button>
                    <button className="action-btn delete" onClick={() => openDelete(p)}><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <AdminBtn variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
            Previous
          </AdminBtn>
          <span className="page-info">Page {page} of {totalPages}</span>
          <AdminBtn variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
            Next
          </AdminBtn>
        </div>
      )}

      {/* Edit Modal */}
      <Modal open={modal === "edit"} onClose={() => setModal(null)} title="Edit Product" size="lg">
        <form onSubmit={saveProduct}>
          <div className="form-grid form-grid-2" style={{ marginBottom: 16 }}>
            <FormInput label="Name" required value={form.name ?? ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, name: e.target.value }))} />
            <FormInput label="Slug" required value={form.slug ?? ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, slug: e.target.value }))} />
            <FormInput label="Price (₫)" required type="number" value={form.price ?? ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, price: e.target.value }))} />
            <FormInput label="Sale Price (₫)" type="number" value={form.sale_price ?? ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, sale_price: e.target.value }))} />
            <FormInput label="Stock" type="number" value={form.stock ?? 0} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, stock: Number(e.target.value) }))} />
            <div style={{ gridColumn: "1 / -1" }}>
              <ImageUpload label="Thumbnail" value={form.thumbnail_url ?? ""} onChange={(url) => setForm(f => ({ ...f, thumbnail_url: url }))} />
            </div>
            <FormSelect label="Category" required options={categories.map(c => ({ value: c?.id ?? "", label: c?.name ?? "" }))} value={form.category_id ?? ""} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm(f => ({ ...f, category_id: e.target.value }))} />
            <FormSelect label="Brand" options={brands.map(b => ({ value: b?.id ?? "", label: b?.name ?? "" }))} value={form.brand_id ?? ""} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm(f => ({ ...f, brand_id: e.target.value }))} />
          </div>
          <div className="form-grid" style={{ marginBottom: 16, gap: 12 }}>
            <FormTextarea label="Description" value={form.description ?? ""} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="form-grid form-grid-2" style={{ marginBottom: 24 }}>
            <FormToggle label="Active" checked={!!form.is_active} onChange={(v: boolean) => setForm(f => ({ ...f, is_active: v }))} />
            <FormToggle label="Featured" checked={!!form.is_featured} onChange={(v: boolean) => setForm(f => ({ ...f, is_featured: v }))} />
          </div>
          <div className="form-actions">
            <AdminBtn type="button" variant="secondary" onClick={() => setModal(null)}>Cancel</AdminBtn>
            <AdminBtn type="submit" loading={saving}>Save Changes</AdminBtn>
          </div>
        </form>
      </Modal>

      {/* Delete Modal */}
      <Modal open={modal === "delete"} onClose={() => setModal(null)} title="Delete Product" size="sm">
        <p style={{ color: "#9ca3af", marginBottom: 24 }}>
          Are you sure you want to delete <strong style={{ color: "#f1f5f9" }}>{selected?.name}</strong>? This action cannot be undone.
        </p>
        <div className="form-actions">
          <AdminBtn variant="secondary" onClick={() => setModal(null)}>Cancel</AdminBtn>
          <AdminBtn variant="danger" loading={saving} onClick={deleteProduct}>Delete</AdminBtn>
        </div>
      </Modal>

      <style>{`
        .page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 24px; gap: 16px; }
        .page-title { font-size: 22px; font-weight: 700; color: #f1f5f9; }
        .page-sub { font-size: 13px; color: #6b7280; margin-top: 2px; }
        .table-toolbar { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
        .search-wrap { position: relative; flex: 1; max-width: 360px; }
        .search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #6b7280; }
        .search-input {
          width: 100%; background: #111827; border: 1px solid #1f2937; color: #e2e8f0;
          border-radius: 8px; padding: 9px 12px 9px 36px; font-size: 14px;
          transition: border-color 0.15s;
        }
        .search-input:focus { outline: none; border-color: #6366f1; }
        .admin-table-wrap { overflow-x: auto; border-radius: 12px; border: 1px solid #1f2937; }
        .admin-table { width: 100%; border-collapse: collapse; font-size: 14px; }
        .admin-table th {
          background: #0f1117; color: #6b7280; font-weight: 500; font-size: 12px;
          text-transform: uppercase; letter-spacing: 0.05em;
          padding: 12px 16px; text-align: left; border-bottom: 1px solid #1f2937;
          white-space: nowrap;
        }
        .admin-table td { padding: 14px 16px; border-bottom: 1px solid #1f2937; color: #e2e8f0; vertical-align: middle; }
        .admin-table tr:last-child td { border-bottom: none; }
        .admin-table tr:hover td { background: rgba(255,255,255,0.02); }
        .table-empty { text-align: center; color: #6b7280; padding: 40px 0 !important; }
        .product-cell { display: flex; align-items: center; gap: 12px; }
        .product-thumb { width: 40px; height: 40px; object-fit: cover; border-radius: 8px; background: #1f2937; }
        .product-thumb-placeholder { width: 40px; height: 40px; border-radius: 8px; background: #1f2937; flex-shrink: 0; }
        .product-name { font-weight: 500; color: #f1f5f9; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .product-slug { font-size: 12px; color: #6b7280; }
        .price-col { display: flex; flex-direction: column; gap: 2px; }
        .price-main { font-weight: 600; color: #f1f5f9; }
        .price-sale { font-size: 12px; color: #6366f1; }
        .rating-cell { display: flex; align-items: center; gap: 4px; color: #f59e0b; }
        .badge { display: inline-flex; align-items: center; padding: 3px 8px; border-radius: 6px; font-size: 12px; font-weight: 500; }
        .badge-green { background: rgba(16,185,129,0.15); color: #34d399; }
        .badge-red { background: rgba(239,68,68,0.15); color: #f87171; }
        .badge-gray { background: #1f2937; color: #9ca3af; }
        .badge-purple { background: rgba(139,92,246,0.15); color: #a78bfa; }
        .action-btns { display: flex; gap: 6px; }
        .action-btn { background: none; border: none; cursor: pointer; padding: 6px; border-radius: 6px; display: flex; transition: background 0.15s, color 0.15s; }
        .action-btn.edit { color: #6366f1; }
        .action-btn.edit:hover { background: rgba(99,102,241,0.15); }
        .action-btn.delete { color: #ef4444; }
        .action-btn.delete:hover { background: rgba(239,68,68,0.15); }
        .pagination { display: flex; align-items: center; justify-content: center; gap: 16px; margin-top: 20px; }
        .page-info { font-size: 14px; color: #6b7280; }
      `}</style>
    </div>
  )
}
