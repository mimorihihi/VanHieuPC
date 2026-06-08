"use client"

import { useEffect, useState, FormEvent } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Save } from "lucide-react"
import { AdminBtn } from "@/components/ui/button"
import { FormInput, FormTextarea, FormSelect, FormToggle } from "@/components/ui/form-fields"
import { ImageUpload } from "@/components/ui/image-upload"
import { getProductDraftGeneralImageFolder, getProductGeneralImageFolder } from "@/lib/cloudinary-product-folders"

interface Category { id: string; name: string }
interface Brand { id: string; name: string }
interface SpecItem { key: string; value: string }

export default function NewProductPage() {
  const router = useRouter()
  const [categories, setCategories] = useState<Category[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [form, setForm] = useState({
    name: "", slug: "", description: "", short_description: "", price: "",
    sale_price: "", stock: "0", thumbnail_url: "",
    category_id: "", brand_id: "", is_active: true, is_featured: false,
  })
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

    const res = await fetch("/api/admin/products", {
      method: "POST",
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
      setError(d.error ?? "Failed to create product")
    }
  }

  return (
    <div>
      <div className="mb-7 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/admin/products">
            <AdminBtn variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /></AdminBtn>
          </Link>
          <div>
            <h1 className="text-[22px] font-bold text-zinc-900">New Product</h1>
            <p className="mt-0.5 text-[13px] text-zinc-500">Fill in the details to create a new product</p>
          </div>
        </div>
        <AdminBtn type="submit" form="product-form" loading={saving}>
          <Save className="h-4 w-4" /> Save Product
        </AdminBtn>
      </div>

      {error && <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <form id="product-form" onSubmit={handleSubmit}>
        <div className="mb-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h3 className="mb-5 border-b border-zinc-200 pb-3 text-[15px] font-semibold text-zinc-900">Basic Information</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormInput label="Product Name" required value={form.name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleNameChange(e.target.value)} />
            <FormInput label="Slug" required value={form.slug} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, slug: e.target.value }))} />
          </div>
          <div className="mt-4">
            <FormTextarea label="Short Description" value={form.short_description} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setForm(f => ({ ...f, short_description: e.target.value }))} />
          </div>
          <div className="mt-4">
            <FormTextarea label="Description" value={form.description} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
        </div>

        <div className="mb-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h3 className="mb-5 border-b border-zinc-200 pb-3 text-[15px] font-semibold text-zinc-900">Pricing & Stock</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormInput label="Price (₫)" required type="number" min="0" value={form.price} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, price: e.target.value }))} />
            <FormInput label="Sale Price (₫)" type="number" min="0" value={form.sale_price} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, sale_price: e.target.value }))} placeholder="Leave empty for no sale" />
            <FormInput label="Stock Quantity" type="number" min="0" value={form.stock} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, stock: e.target.value }))} />
          </div>
        </div>

        <div className="mb-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h3 className="mb-5 border-b border-zinc-200 pb-3 text-[15px] font-semibold text-zinc-900">Categorization</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormSelect label="Category" required options={categories.map(c => ({ value: c.id, label: c.name }))} value={form.category_id} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm(f => ({ ...f, category_id: e.target.value }))} />
            <FormSelect label="Brand" options={brands.map(b => ({ value: b.id, label: b.name }))} value={form.brand_id} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm(f => ({ ...f, brand_id: e.target.value }))} />
          </div>
        </div>

        <div className="mb-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h3 className="mb-5 border-b border-zinc-200 pb-3 text-[15px] font-semibold text-zinc-900">Media</h3>
          <ImageUpload
            label="Thumbnail"
            uploadFolder={form.slug.trim() ? getProductGeneralImageFolder(form.slug) : getProductDraftGeneralImageFolder()}
            value={form.thumbnail_url}
            onChange={(url) => setForm((f) => ({ ...f, thumbnail_url: url }))}
          />
        </div>

        <div className="mb-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h3 className="mb-5 border-b border-zinc-200 pb-3 text-[15px] font-semibold text-zinc-900">Specifications</h3>
          <div className="space-y-3">
            {specItems.map((item, index) => (
              <div key={`spec-${index}`} className="grid items-end gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto]">
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
                  className="h-[42px] rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-[13px] font-semibold text-red-700 transition-colors hover:border-red-300 hover:bg-red-100"
                >
                  Remove
                </button>
              </div>
            ))}
            <button type="button" onClick={addSpecItem} className="w-fit rounded-xl border border-zinc-300 bg-zinc-50 px-3.5 py-2.5 text-[13px] font-semibold text-zinc-900 transition-colors hover:border-zinc-400 hover:bg-zinc-100">
              + Add Specification
            </button>
          </div>
        </div>

        <div className="mb-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h3 className="mb-5 border-b border-zinc-200 pb-3 text-[15px] font-semibold text-zinc-900">Visibility</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormToggle label="Active (visible on store)" checked={form.is_active} onChange={(v: boolean) => setForm(f => ({ ...f, is_active: v }))} />
            <FormToggle label="Featured product" checked={form.is_featured} onChange={(v: boolean) => setForm(f => ({ ...f, is_featured: v }))} />
          </div>
        </div>
      </form>
    </div>
  )
}
