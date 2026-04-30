"use client"

import { useEffect, useState, FormEvent } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Save } from "lucide-react"
import { AdminBtn } from "@/components/ui/button"
import { FormInput, FormTextarea, FormSelect, FormToggle } from "@/components/ui/form-fields"
import { ImageUpload } from "@/components/ui/image-upload"

interface Category { id: string; name: string }
interface Brand { id: string; name: string }

export default function NewProductPage() {
  const router = useRouter()
  const [categories, setCategories] = useState<Category[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [form, setForm] = useState({
    name: "", slug: "", description: "", price: "",
    sale_price: "", stock: "0", thumbnail_url: "",
    category_id: "", brand_id: "", is_active: true, is_featured: false,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

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
      fetch("/api/admin/categories").then(r => r.json()),
      fetch("/api/admin/brands").then(r => r.json()),
    ]).then(([catData, brandData]) => {
      setCategories(normalizeOptions(catData.categories ?? []))
      setBrands(normalizeOptions(brandData.brands ?? []))
    })
  }, [])

  // Auto-generate slug
  const handleNameChange = (name: string) => {
    const slug = name.toLowerCase()
      .replace(/[\u0300-\u036f]/g, "")
      .normalize("NFD")
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
    setForm(f => ({ ...f, name, slug }))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError("")
    const res = await fetch("/api/admin/products", {
      method: "POST",
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
      router.push("/admin/products")
    } else {
      const d = await res.json()
      setError(d.error ?? "Failed to create product")
    }
  }

  return (
    <div>
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link href="/admin/products">
            <AdminBtn variant="ghost" size="sm"><ArrowLeft size={16} /></AdminBtn>
          </Link>
          <div>
            <h1 className="page-title">New Product</h1>
            <p className="page-sub">Fill in the details to create a new product</p>
          </div>
        </div>
        <AdminBtn type="submit" form="product-form" loading={saving}>
          <Save size={16} /> Save Product
        </AdminBtn>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <form id="product-form" onSubmit={handleSubmit}>
        <div className="form-section">
          <h3 className="form-section-title">Basic Information</h3>
          <div className="form-grid form-grid-2">
            <FormInput label="Product Name" required value={form.name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleNameChange(e.target.value)} />
            <FormInput label="Slug" required value={form.slug} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, slug: e.target.value }))} />
          </div>
          <div style={{ marginTop: 16 }}>
            <FormTextarea label="Description" value={form.description} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
        </div>

        <div className="form-section">
          <h3 className="form-section-title">Pricing & Stock</h3>
          <div className="form-grid form-grid-3">
            <FormInput label="Price (₫)" required type="number" min="0" value={form.price} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, price: e.target.value }))} />
            <FormInput label="Sale Price (₫)" type="number" min="0" value={form.sale_price} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, sale_price: e.target.value }))} placeholder="Leave empty for no sale" />
            <FormInput label="Stock Quantity" type="number" min="0" value={form.stock} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, stock: e.target.value }))} />
          </div>
        </div>

        <div className="form-section">
          <h3 className="form-section-title">Categorization</h3>
          <div className="form-grid form-grid-2">
            <FormSelect label="Category" required options={categories.map(c => ({ value: c.id, label: c.name }))} value={form.category_id} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm(f => ({ ...f, category_id: e.target.value }))} />
            <FormSelect label="Brand" options={brands.map(b => ({ value: b.id, label: b.name }))} value={form.brand_id} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm(f => ({ ...f, brand_id: e.target.value }))} />
          </div>
        </div>

        <div className="form-section">
          <h3 className="form-section-title">Media</h3>
          <ImageUpload
            label="Thumbnail"
            uploadFolder="datn-ecomm/products"
            value={form.thumbnail_url}
            onChange={(url) => setForm((f) => ({ ...f, thumbnail_url: url }))}
          />
        </div>

        <div className="form-section">
          <h3 className="form-section-title">Visibility</h3>
          <div className="form-grid form-grid-2">
            <FormToggle label="Active (visible on store)" checked={form.is_active} onChange={(v: boolean) => setForm(f => ({ ...f, is_active: v }))} />
            <FormToggle label="Featured product" checked={form.is_featured} onChange={(v: boolean) => setForm(f => ({ ...f, is_featured: v }))} />
          </div>
        </div>
      </form>

      <style>{`
        .page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 28px; gap: 16px; }
        .page-title { font-size: 22px; font-weight: 700; color: #f1f5f9; }
        .page-sub { font-size: 13px; color: #6b7280; margin-top: 2px; }
        .error-banner { background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); color: #f87171; padding: 12px 16px; border-radius: 8px; margin-bottom: 20px; font-size: 14px; }
        .form-section { background: #111827; border: 1px solid #1f2937; border-radius: 12px; padding: 24px; margin-bottom: 16px; }
        .form-section-title { font-size: 15px; font-weight: 600; color: #f1f5f9; margin-bottom: 20px; padding-bottom: 12px; border-bottom: 1px solid #1f2937; }
        .form-grid { display: grid; gap: 16px; }
        .form-grid-2 { grid-template-columns: 1fr 1fr; }
        .form-grid-3 { grid-template-columns: 1fr 1fr 1fr; }
        @media (max-width: 640px) { .form-grid-2, .form-grid-3 { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  )
}
