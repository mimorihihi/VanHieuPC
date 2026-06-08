"use client"

import { useEffect, useState, FormEvent } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Save } from "lucide-react"
import { AdminBtn } from "@/components/ui/button"
import { FormInput, FormTextarea, FormSelect, FormToggle } from "@/components/ui/form-fields"
import { ImageUpload } from "@/components/ui/image-upload"
import { getProductDraftGeneralImageFolder, getProductGeneralImageFolder } from "@/lib/cloudinary-product-folders"

interface Category { id: string; name: string }
interface Brand { id: string; name: string }
interface ProductImageItem { id?: string; url: string; sort_order: number }
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
  images?: { id?: string; variant_id?: string | null; url?: string | null; sort_order?: number | null }[]
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
  const [generalImages, setGeneralImages] = useState<ProductImageItem[]>([])

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
      const nextGeneralImages = (nextProduct.images ?? [])
        .filter((image) => image.variant_id == null && image.url)
        .map((image, index) => ({
          id: image.id,
          url: image.url ?? "",
          sort_order: Number(image.sort_order ?? index + 1),
        }))
      setSpecItems(nextSpecItems.length > 0 ? nextSpecItems : [{ key: "", value: "" }])
      setGeneralImages(nextGeneralImages)
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

  const syncGeneralImageOrder = (items: ProductImageItem[]) =>
    items.map((item, index) => ({ ...item, sort_order: index + 1 }))

  const addGeneralImage = () => {
    setGeneralImages((prev) => syncGeneralImageOrder([...prev, { url: "", sort_order: prev.length + 1 }]))
  }

  const updateGeneralImage = (index: number, nextUrl: string) => {
    setGeneralImages((prev) =>
      prev.map((image, imageIndex) =>
        imageIndex === index ? { ...image, url: nextUrl, sort_order: imageIndex + 1 } : image
      )
    )
  }

  const removeGeneralImage = (index: number) => {
    setGeneralImages((prev) => syncGeneralImageOrder(prev.filter((_, imageIndex) => imageIndex !== index)))
  }

  const moveGeneralImage = (index: number, direction: -1 | 1) => {
    setGeneralImages((prev) => {
      const nextIndex = index + direction
      if (nextIndex < 0 || nextIndex >= prev.length) return prev
      const next = [...prev]
      const [current] = next.splice(index, 1)
      next.splice(nextIndex, 0, current)
      return syncGeneralImageOrder(next)
    })
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

    const normalizedGeneralImages = generalImages
      .map((image, index) => ({
        ...image,
        url: image.url.trim(),
        sort_order: index + 1,
      }))
      .filter((image) => image.url.length > 0)

    const res = await fetch(`/api/admin/products/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        specs,
        general_images: normalizedGeneralImages,
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

  if (loading) return <div className="py-10 text-center text-zinc-500">Loading product...</div>

  return (
    <div>
      <div className="mb-7 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/admin/products">
            <AdminBtn variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /></AdminBtn>
          </Link>
          <div>
            <h1 className="text-[22px] font-bold text-zinc-900">Edit Product</h1>
            <p className="mt-0.5 text-[13px] text-zinc-500">{form.name}</p>
          </div>
        </div>
        <AdminBtn type="submit" form="edit-product-form" loading={saving}>
          <Save className="h-4 w-4" /> Save Changes
        </AdminBtn>
      </div>

      {error && <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <form id="edit-product-form" onSubmit={handleSubmit}>
        <div className="mb-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h3 className="mb-5 border-b border-zinc-200 pb-3 text-[15px] font-semibold text-zinc-900">Basic Information</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormInput label="Product Name" required value={form.name ?? ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, name: e.target.value }))} />
            <FormInput label="Slug" required value={form.slug ?? ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, slug: e.target.value }))} />
          </div>
          <div className="mt-4">
            <FormTextarea label="Short Description" value={form.short_description ?? ""} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setForm((f) => ({ ...f, short_description: e.target.value }))} />
          </div>
          <div className="mt-4">
            <FormTextarea label="Description" value={form.description ?? ""} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </div>
        </div>

        <div className="mb-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h3 className="mb-5 border-b border-zinc-200 pb-3 text-[15px] font-semibold text-zinc-900">Pricing & Stock</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormInput label="Price (?)" required type="number" min="0" value={form.price ?? ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, price: e.target.value }))} />
            <FormInput label="Sale Price (?)" type="number" min="0" value={form.sale_price ?? ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, sale_price: e.target.value }))} />
            <FormInput label="Stock" type="number" min="0" value={form.stock ?? 0} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, stock: e.target.value }))} />
          </div>
        </div>

        <div className="mb-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h3 className="mb-5 border-b border-zinc-200 pb-3 text-[15px] font-semibold text-zinc-900">Categorization</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormSelect label="Category" required options={categories.map((c) => ({ value: c.id, label: c.name }))} value={form.category_id ?? ""} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm((f) => ({ ...f, category_id: e.target.value }))} />
            <FormSelect label="Brand" options={brands.map((b) => ({ value: b.id, label: b.name }))} value={form.brand_id ?? ""} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm((f) => ({ ...f, brand_id: e.target.value }))} />
          </div>
        </div>

        <div className="mb-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h3 className="mb-5 border-b border-zinc-200 pb-3 text-[15px] font-semibold text-zinc-900">Media</h3>
          <ImageUpload
            label="Thumbnail"
            uploadFolder={form.slug.trim() ? getProductGeneralImageFolder(form.slug) : getProductDraftGeneralImageFolder()}
            value={form.thumbnail_url ?? ""}
            onChange={(url) => setForm((f) => ({ ...f, thumbnail_url: url }))}
          />

          <div className="mt-6 border-t border-zinc-200 pt-5">
            <div className="mb-4 flex items-start justify-between gap-4 max-sm:flex-col">
              <div>
                <h4 className="text-sm font-semibold text-zinc-900">General Product Gallery</h4>
                <p className="mt-1 max-w-xl text-xs leading-6 text-zinc-500">Upload multiple shared images for laptops, monitors, and other non-variant product views.</p>
              </div>
              <button type="button" onClick={addGeneralImage} className="whitespace-nowrap rounded-xl border border-zinc-300 bg-zinc-50 px-3.5 py-2.5 text-[13px] font-semibold text-zinc-900 transition-colors hover:border-zinc-400 hover:bg-zinc-100">
                + Add Gallery Image
              </button>
            </div>

            {generalImages.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-4 text-[13px] text-zinc-500">No shared gallery images yet. Add one or more product views here.</div>
            ) : (
              <div className="grid gap-4">
                {generalImages.map((image, index) => (
                  <div key={image.id ?? `gallery-${index}`} className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                    <div className="mb-3.5 flex items-start justify-between gap-4 max-sm:flex-col">
                      <div>
                        <div className="text-[13px] font-semibold text-zinc-900">Image {index + 1}</div>
                        <div className="mt-1 text-xs text-zinc-500">Sort order: {index + 1}</div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-45"
                          onClick={() => moveGeneralImage(index, -1)}
                          disabled={index === 0}
                        >
                          Up
                        </button>
                        <button
                          type="button"
                          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-45"
                          onClick={() => moveGeneralImage(index, 1)}
                          disabled={index === generalImages.length - 1}
                        >
                          Down
                        </button>
                        <button
                          type="button"
                          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition-colors hover:border-red-300 hover:bg-red-100"
                          onClick={() => removeGeneralImage(index)}
                        >
                          Remove
                        </button>
                      </div>
                    </div>

                    <ImageUpload
                      label="Gallery Image"
                      uploadFolder={form.slug.trim() ? getProductGeneralImageFolder(form.slug) : getProductDraftGeneralImageFolder()}
                      value={image.url}
                      onChange={(url) => updateGeneralImage(index, url)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
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
            <FormToggle label="Active" checked={!!form.is_active} onChange={(v: boolean) => setForm((f) => ({ ...f, is_active: v }))} />
            <FormToggle label="Featured" checked={!!form.is_featured} onChange={(v: boolean) => setForm((f) => ({ ...f, is_featured: v }))} />
          </div>
        </div>
      </form>
    </div>
  )
}
