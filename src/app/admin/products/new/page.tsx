"use client"

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, ChevronDown, ChevronRight, Save } from "lucide-react"
import { AdminBtn } from "@/components/ui/button"
import { FormInput, FormTextarea, FormSelect, FormToggle } from "@/components/ui/form-fields"
import { ImageUpload } from "@/components/ui/image-upload"
import { getProductDraftGeneralImageFolder, getProductGeneralImageFolder } from "@/lib/cloudinary-product-folders"

interface Category { id: string; name: string }
interface Brand { id: string; name: string }
interface SpecItem { key: string; value: string }
interface VariantAttributeItem { key: string; value: string }
interface VariantItem {
  name: string
  price_override: string
  stock: string
  is_active: boolean
  attributes: VariantAttributeItem[]
  images: ProductImageItem[]
}
interface ProductImageItem { url: string; sort_order: number }

const createEmptyVariant = (): VariantItem => ({
  name: "",
  price_override: "",
  stock: "0",
  is_active: true,
  attributes: [{ key: "", value: "" }],
  images: [],
})

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
  const [variantItems, setVariantItems] = useState<VariantItem[]>([])
  const [openSpecs, setOpenSpecs] = useState(false)
  const [openVariants, setOpenVariants] = useState(false)

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

  const addSpecItem = () => setSpecItems((prev) => [...prev, { key: "", value: "" }])

  const removeSpecItem = (index: number) => {
    setSpecItems((prev) => (prev.length === 1 ? [{ key: "", value: "" }] : prev.filter((_, idx) => idx !== index)))
  }

  const addVariant = () => {
    setVariantItems((prev) => [...prev, createEmptyVariant()])
    setOpenVariants(true)
  }

  const updateVariant = (index: number, field: keyof Omit<VariantItem, "attributes">, value: string | boolean) => {
    setVariantItems((prev) => prev.map((item, idx) => (idx === index ? { ...item, [field]: value } : item)))
  }

  const removeVariant = (index: number) => {
    setVariantItems((prev) => prev.filter((_, idx) => idx !== index))
  }

  const updateVariantAttribute = (variantIndex: number, attrIndex: number, field: keyof VariantAttributeItem, value: string) => {
    setVariantItems((prev) => prev.map((variant, idx) => {
      if (idx !== variantIndex) return variant
      return {
        ...variant,
        attributes: variant.attributes.map((attr, attrIdx) => (attrIdx === attrIndex ? { ...attr, [field]: value } : attr)),
      }
    }))
  }

  const addVariantAttribute = (variantIndex: number) => {
    setVariantItems((prev) => prev.map((variant, idx) => (
      idx === variantIndex ? { ...variant, attributes: [...variant.attributes, { key: "", value: "" }] } : variant
    )))
  }

  const removeVariantAttribute = (variantIndex: number, attrIndex: number) => {
    setVariantItems((prev) => prev.map((variant, idx) => {
      if (idx !== variantIndex) return variant
      return {
        ...variant,
        attributes: variant.attributes.length === 1
          ? [{ key: "", value: "" }]
          : variant.attributes.filter((_, currentAttrIndex) => currentAttrIndex !== attrIndex),
      }
    }))
  }

  const syncVariantImageOrder = (images: ProductImageItem[]) => images.map((image, index) => ({ ...image, sort_order: index + 1 }))

  const addVariantImage = (variantIndex: number) => {
    setVariantItems((prev) => prev.map((variant, idx) => (
      idx === variantIndex ? { ...variant, images: syncVariantImageOrder([...variant.images, { url: "", sort_order: variant.images.length + 1 }]) } : variant
    )))
  }

  const updateVariantImage = (variantIndex: number, imageIndex: number, url: string) => {
    setVariantItems((prev) => prev.map((variant, idx) => (
      idx === variantIndex
        ? { ...variant, images: syncVariantImageOrder(variant.images.map((image, currentIndex) => currentIndex === imageIndex ? { ...image, url } : image)) }
        : variant
    )))
  }

  const removeVariantImage = (variantIndex: number, imageIndex: number) => {
    setVariantItems((prev) => prev.map((variant, idx) => (
      idx === variantIndex ? { ...variant, images: syncVariantImageOrder(variant.images.filter((_, currentIndex) => currentIndex !== imageIndex)) } : variant
    )))
  }

  const normalizeVariants = () => variantItems
    .map((variant) => {
      const attributes = variant.attributes.reduce<Record<string, string>>((acc, attr) => {
        const key = attr.key.trim()
        const value = attr.value.trim()
        if (key && value) acc[key] = value
        return acc
      }, {})

      return {
        name: variant.name.trim(),
        price_override: variant.price_override ? Number(variant.price_override) : null,
        stock: Number(variant.stock || 0),
        is_active: variant.is_active,
        attributes,
        images: variant.images
          .map((image, index) => ({ url: image.url.trim(), sort_order: index + 1 }))
          .filter((image) => image.url.length > 0),
      }
    })
    .filter((variant) => variant.name.length > 0)

  const specCount = specItems.filter((item) => item.key.trim() && item.value.trim()).length

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
        variants: normalizeVariants(),
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
            <FormInput label="Product Name" required value={form.name} onChange={(e: ChangeEvent<HTMLInputElement>) => handleNameChange(e.target.value)} />
            <FormInput label="Slug" required value={form.slug} onChange={(e: ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, slug: e.target.value }))} />
          </div>
          <div className="mt-4">
            <FormTextarea label="Short Description" value={form.short_description} onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setForm(f => ({ ...f, short_description: e.target.value }))} />
          </div>
          <div className="mt-4">
            <FormTextarea label="Description" value={form.description} onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
        </div>

        <div className="mb-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h3 className="mb-5 border-b border-zinc-200 pb-3 text-[15px] font-semibold text-zinc-900">Pricing & Stock</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormInput label="Price (₫)" required type="number" min="0" value={form.price} onChange={(e: ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, price: e.target.value }))} />
            <FormInput label="Sale Price (₫)" type="number" min="0" value={form.sale_price} onChange={(e: ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, sale_price: e.target.value }))} placeholder="Leave empty for no sale" />
            <FormInput label="Stock Quantity" type="number" min="0" value={form.stock} onChange={(e: ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, stock: e.target.value }))} />
          </div>
        </div>

        <div className="mb-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h3 className="mb-5 border-b border-zinc-200 pb-3 text-[15px] font-semibold text-zinc-900">Categorization</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormSelect label="Category" required options={categories.map(c => ({ value: c.id, label: c.name }))} value={form.category_id} onChange={(e: ChangeEvent<HTMLSelectElement>) => setForm(f => ({ ...f, category_id: e.target.value }))} />
            <FormSelect label="Brand" options={brands.map(b => ({ value: b.id, label: b.name }))} value={form.brand_id} onChange={(e: ChangeEvent<HTMLSelectElement>) => setForm(f => ({ ...f, brand_id: e.target.value }))} />
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

        <div className="mb-4 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
          <button type="button" onClick={() => setOpenSpecs((value) => !value)} className="flex w-full items-center justify-between gap-4 p-6 text-left">
            <div>
              <h3 className="text-[15px] font-semibold text-zinc-900">Specifications</h3>
              <p className="mt-1 text-xs text-zinc-500">{specCount} completed item{specCount === 1 ? "" : "s"}</p>
            </div>
            {openSpecs ? <ChevronDown className="h-5 w-5 text-zinc-500" /> : <ChevronRight className="h-5 w-5 text-zinc-500" />}
          </button>
          {openSpecs && (
            <div className="space-y-3 border-t border-zinc-200 p-6">
              {specItems.map((item, index) => (
                <div key={`spec-${index}`} className="grid items-end gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto]">
                  <FormInput label="Label" value={item.key} onChange={(e: ChangeEvent<HTMLInputElement>) => updateSpecItem(index, "key", e.target.value)} placeholder="CPU" />
                  <FormInput label="Value" value={item.value} onChange={(e: ChangeEvent<HTMLInputElement>) => updateSpecItem(index, "value", e.target.value)} placeholder="Intel Core i7" />
                  <button type="button" onClick={() => removeSpecItem(index)} className="h-[42px] rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-[13px] font-semibold text-red-700 transition-colors hover:border-red-300 hover:bg-red-100">Remove</button>
                </div>
              ))}
              <button type="button" onClick={addSpecItem} className="w-fit rounded-xl border border-zinc-300 bg-zinc-50 px-3.5 py-2.5 text-[13px] font-semibold text-zinc-900 transition-colors hover:border-zinc-400 hover:bg-zinc-100">+ Add Specification</button>
            </div>
          )}
        </div>

        <div className="mb-4 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
          <button type="button" onClick={() => setOpenVariants((value) => !value)} className="flex w-full items-center justify-between gap-4 p-6 text-left">
            <div>
              <h3 className="text-[15px] font-semibold text-zinc-900">Product Variants</h3>
              <p className="mt-1 text-xs text-zinc-500">{variantItems.length} new variant{variantItems.length === 1 ? "" : "s"}</p>
            </div>
            {openVariants ? <ChevronDown className="h-5 w-5 text-zinc-500" /> : <ChevronRight className="h-5 w-5 text-zinc-500" />}
          </button>
          {openVariants && (
            <div className="space-y-4 border-t border-zinc-200 p-6">
              {variantItems.length === 0 && <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-4 text-[13px] text-zinc-500">No variants yet. Add variants only for products with multiple configurations.</div>}
              {variantItems.map((variant, index) => (
                <div key={`variant-${index}`} className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                      <h4 className="text-sm font-semibold text-zinc-900">Variant {index + 1}</h4>
                      <p className="mt-1 text-xs text-zinc-500">Add images for this option below.</p>
                    </div>
                    <button type="button" onClick={() => removeVariant(index)} className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition-colors hover:border-red-300 hover:bg-red-100">Remove</button>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <FormInput label="Variant Name" required value={variant.name} onChange={(e: ChangeEvent<HTMLInputElement>) => updateVariant(index, "name", e.target.value)} placeholder="16GB RAM / RTX 4060" />
                    <FormInput label="Price Override (₫)" type="number" min="0" value={variant.price_override} onChange={(e: ChangeEvent<HTMLInputElement>) => updateVariant(index, "price_override", e.target.value)} placeholder="Leave empty" />
                    <FormInput label="Stock" type="number" min="0" value={variant.stock} onChange={(e: ChangeEvent<HTMLInputElement>) => updateVariant(index, "stock", e.target.value)} />
                  </div>
                  <div className="mt-4">
                    <FormToggle label="Active variant" checked={variant.is_active} onChange={(value: boolean) => updateVariant(index, "is_active", value)} />
                  </div>
                  <div className="mt-4 space-y-3 border-t border-zinc-200 pt-4">
                    <div className="text-[13px] font-semibold text-zinc-900">Attributes</div>
                    {variant.attributes.map((attr, attrIndex) => (
                      <div key={`variant-${index}-attr-${attrIndex}`} className="grid items-end gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                        <FormInput label="Label" value={attr.key} onChange={(e: ChangeEvent<HTMLInputElement>) => updateVariantAttribute(index, attrIndex, "key", e.target.value)} placeholder="RAM" />
                        <FormInput label="Value" value={attr.value} onChange={(e: ChangeEvent<HTMLInputElement>) => updateVariantAttribute(index, attrIndex, "value", e.target.value)} placeholder="16GB" />
                        <button type="button" onClick={() => removeVariantAttribute(index, attrIndex)} className="h-[42px] rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-[13px] font-semibold text-zinc-700 transition-colors hover:bg-zinc-100">Remove</button>
                      </div>
                    ))}
                    <button type="button" onClick={() => addVariantAttribute(index)} className="w-fit rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-[13px] font-semibold text-zinc-900 transition-colors hover:bg-zinc-100">+ Add Attribute</button>
                  </div>
                  <div className="mt-4 space-y-3 border-t border-zinc-200 pt-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-[13px] font-semibold text-zinc-900">Variant Images</div>
                        <p className="mt-1 text-xs text-zinc-500">These images will use this variant id after creation.</p>
                      </div>
                      <button type="button" onClick={() => addVariantImage(index)} className="rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-[13px] font-semibold text-zinc-900 transition-colors hover:bg-zinc-100">+ Add Image</button>
                    </div>
                    {variant.images.length === 0 && <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-4 text-[13px] text-zinc-500">No variant images yet.</div>}
                    {variant.images.map((image, imageIndex) => (
                      <div key={`variant-${index}-image-${imageIndex}`} className="rounded-xl border border-zinc-200 bg-white p-4">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <div className="text-xs font-semibold text-zinc-600">Image {imageIndex + 1}</div>
                          <button type="button" onClick={() => removeVariantImage(index, imageIndex)} className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition-colors hover:border-red-300 hover:bg-red-100">Remove</button>
                        </div>
                        <ImageUpload
                          label="Variant Image"
                          uploadFolder={form.slug.trim() ? getProductGeneralImageFolder(form.slug) : getProductDraftGeneralImageFolder()}
                          value={image.url}
                          onChange={(url) => updateVariantImage(index, imageIndex, url)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <button type="button" onClick={addVariant} className="w-fit rounded-xl border border-zinc-300 bg-zinc-50 px-3.5 py-2.5 text-[13px] font-semibold text-zinc-900 transition-colors hover:border-zinc-400 hover:bg-zinc-100">+ Add Variant</button>
            </div>
          )}
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
