"use client"

import { useEffect, useState, FormEvent } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Save } from "lucide-react"
import { AdminBtn } from "@/components/ui/button"
import { FormInput, FormTextarea, FormSelect, FormToggle } from "@/components/ui/form-fields"
import { ImageUpload } from "@/components/ui/image-upload"

interface Category { id: string; name: string }
interface Brand { id: string; name: string }
interface ProductFormState {
  name: string
  slug: string
  description: string
  short_description: string
  price: string
  sale_price: string
  stock: string
  thumbnail_url: string
  category_id: string
  brand_id: string
  is_active: boolean
  is_featured: boolean
}

interface SpecItem { key: string; value: string }

interface ProductResponse {
  name?: string
  slug?: string
  description?: string
  short_description?: string | null
  price?: string | number | null
  sale_price?: string | number | null
  stock?: string | number | null
  thumbnail_url?: string | null
  is_active?: boolean
  is_featured?: boolean
  specs?: Record<string, string | number | null>
  category?: { id?: string | null } | null
  brand?: { id?: string | null } | null
}

export default function EditProductPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [categories, setCategories] = useState<Category[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [form, setForm] = useState<ProductFormState>({
    name: "",
    slug: "",
    description: "",
    short_description: "",
    price: "",
    sale_price: "",
    stock: "0",
    thumbnail_url: "",
    category_id: "",
    brand_id: "",
    is_active: true,
    is_featured: false,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [specItems, setSpecItems] = useState<SpecItem[]>([{ key: "", value: "" }])

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
      fetch(`/api/admin/products/${id}`).then((r) => r.json()),
    ]).then(([catData, brandData, product]) => {
      const nextProduct = product as ProductResponse

      setCategories(normalizeOptions(catData.categories ?? []))
      setBrands(normalizeOptions(brandData.brands ?? []))
      setForm({
        name: nextProduct.name ?? "",
        slug: nextProduct.slug ?? "",
        description: nextProduct.description ?? "",
        short_description: nextProduct.short_description ?? "",
        price: nextProduct.price?.toString?.() ?? "",
        sale_price: nextProduct.sale_price?.toString?.() ?? "",
        stock: nextProduct.stock?.toString?.() ?? "0",
        thumbnail_url: nextProduct.thumbnail_url ?? "",
        category_id: nextProduct.category?.id ?? "",
        brand_id: nextProduct.brand?.id ?? "",
        is_active: Boolean(nextProduct.is_active),
        is_featured: Boolean(nextProduct.is_featured),
      })
      const nextSpecItems = Object.entries(nextProduct.specs ?? {}).map(([key, value]) => ({
        key,
        value: typeof value === "string" ? value : String(value ?? ""),
      }))
      setSpecItems(nextSpecItems.length > 0 ? nextSpecItems : [{ key: "", value: "" }])
      setLoading(false)
    })
  }, [id])

  const updateSpecItem = (index: number, field: keyof SpecItem, value: string) => {
    setSpecItems((prev) => prev.map((item, idx) => (idx === index ? { ...item, [field]: value } : item)))
  }

  const addSpecItem = () => {
    setSpecItems((prev) => [...prev, { key: "", value: "" }])
  }

  const removeSpecItem = (index: number) => {
    setSpecItems((prev) => (prev.length === 1 ? [{ key: "", value: "" }] : prev.filter((_, idx) => idx !== index)))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError("")
    const specs = specItems.reduce<Record<string, string>>((acc, item) => {
      const specKey = item.key.trim()
      const specValue = item.value.trim()

      if (!specKey || !specValue) return acc
      acc[specKey] = specValue
      return acc
    }, {})

    const res = await fetch(`/api/admin/products/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        specs,
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
      setError(d.error ?? "Failed to update product")
    }
  }

  if (loading) return <div className="load-msg">Loading product...</div>

  return (
    <div>
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link href="/admin/products">
            <AdminBtn variant="ghost" size="sm"><ArrowLeft size={16} /></AdminBtn>
          </Link>
          <div>
            <h1 className="page-title">Edit Product</h1>
            <p className="page-sub">{form.name}</p>
          </div>
        </div>
        <AdminBtn type="submit" form="edit-product-form" loading={saving}>
          <Save size={16} /> Save Changes
        </AdminBtn>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <form id="edit-product-form" onSubmit={handleSubmit}>
        <div className="form-section">
          <h3 className="form-section-title">Basic Information</h3>
          <div className="form-grid form-grid-2">
            <FormInput label="Product Name" required value={form.name ?? ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, name: e.target.value }))} />
            <FormInput label="Slug" required value={form.slug ?? ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, slug: e.target.value }))} />
          </div>
          <div style={{ marginTop: 16 }}>
            <FormTextarea label="Short Description" value={form.short_description ?? ""} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setForm((f) => ({ ...f, short_description: e.target.value }))} />
          </div>
          <div style={{ marginTop: 16 }}>
            <FormTextarea label="Description" value={form.description ?? ""} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </div>
        </div>

        <div className="form-section">
          <h3 className="form-section-title">Pricing & Stock</h3>
          <div className="form-grid form-grid-3">
            <FormInput label="Price (?)" required type="number" min="0" value={form.price ?? ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, price: e.target.value }))} />
            <FormInput label="Sale Price (?)" type="number" min="0" value={form.sale_price ?? ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, sale_price: e.target.value }))} />
            <FormInput label="Stock" type="number" min="0" value={form.stock ?? 0} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, stock: e.target.value }))} />
          </div>
        </div>

        <div className="form-section">
          <h3 className="form-section-title">Categorization</h3>
          <div className="form-grid form-grid-2">
            <FormSelect label="Category" required options={categories.map((c) => ({ value: c.id, label: c.name }))} value={form.category_id ?? ""} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm((f) => ({ ...f, category_id: e.target.value }))} />
            <FormSelect label="Brand" options={brands.map((b) => ({ value: b.id, label: b.name }))} value={form.brand_id ?? ""} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm((f) => ({ ...f, brand_id: e.target.value }))} />
          </div>
        </div>

        <div className="form-section">
          <h3 className="form-section-title">Media</h3>
          <ImageUpload
            label="Thumbnail"
            uploadFolder="datn-ecomm/products"
            value={form.thumbnail_url ?? ""}
            onChange={(url) => setForm((f) => ({ ...f, thumbnail_url: url }))}
          />
        </div>

        <div className="form-section">
          <h3 className="form-section-title">Specifications</h3>
          <div className="space-y-3">
            {specItems.map((item, index) => (
              <div key={`spec-${index}`} className="form-grid form-grid-specs">
                <FormInput
                  label={index === 0 ? "Label" : "Label"}
                  value={item.key}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateSpecItem(index, "key", e.target.value)}
                  placeholder="CPU"
                />
                <FormInput
                  label={index === 0 ? "Value" : "Value"}
                  value={item.value}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateSpecItem(index, "value", e.target.value)}
                  placeholder="Intel Core i7"
                />
                <button
                  type="button"
                  onClick={() => removeSpecItem(index)}
                  className="spec-remove-btn"
                >
                  Remove
                </button>
              </div>
            ))}
            <button type="button" onClick={addSpecItem} className="spec-add-btn">
              + Add Specification
            </button>
          </div>
        </div>

        <div className="form-section">
          <h3 className="form-section-title">Visibility</h3>
          <div className="form-grid form-grid-2">
            <FormToggle label="Active" checked={!!form.is_active} onChange={(v: boolean) => setForm((f) => ({ ...f, is_active: v }))} />
            <FormToggle label="Featured" checked={!!form.is_featured} onChange={(v: boolean) => setForm((f) => ({ ...f, is_featured: v }))} />
          </div>
        </div>
      </form>

      <style>{`
        .page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 28px; gap: 16px; }
        .page-title { font-size: 22px; font-weight: 700; color: #f1f5f9; }
        .page-sub { font-size: 13px; color: #6b7280; margin-top: 2px; }
        .error-banner { background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); color: #f87171; padding: 12px 16px; border-radius: 8px; margin-bottom: 20px; font-size: 14px; }
        .load-msg { color: #6b7280; padding: 40px; text-align: center; }
        .form-section { background: #111827; border: 1px solid #1f2937; border-radius: 12px; padding: 24px; margin-bottom: 16px; }
        .form-section-title { font-size: 15px; font-weight: 600; color: #f1f5f9; margin-bottom: 20px; padding-bottom: 12px; border-bottom: 1px solid #1f2937; }
        .form-grid { display: grid; gap: 16px; }
        .form-grid-2 { grid-template-columns: 1fr 1fr; }
        .form-grid-3 { grid-template-columns: 1fr 1fr 1fr; }
        .form-grid-specs { grid-template-columns: minmax(0, 1fr) minmax(0, 1.4fr) auto; align-items: end; }
        .spec-add-btn { width: fit-content; border: 1px solid #374151; background: #0f172a; color: #e5e7eb; border-radius: 10px; padding: 10px 14px; font-size: 13px; font-weight: 600; }
        .spec-remove-btn { border: 1px solid rgba(248,113,113,0.3); background: rgba(127,29,29,0.35); color: #fca5a5; border-radius: 10px; padding: 10px 14px; font-size: 13px; font-weight: 600; height: 42px; }
        @media (max-width: 640px) { .form-grid-2, .form-grid-3, .form-grid-specs { grid-template-columns: 1fr; } .spec-remove-btn { height: auto; } }
      `}</style>
    </div>
  )
}
