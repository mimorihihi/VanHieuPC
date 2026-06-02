"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ProductCard } from "@/components/product-card"
import { cn } from "@/lib/utils"
import { BarChart3, ChevronRight, Heart, Mail, ShoppingCart, Star } from "lucide-react"

export interface Product {
  id: string
  name: string
  slug: string
  description: string
  short_description: string | null
  price: string
  sale_price: string | null
  stock: number
  thumbnail_url: string | null
  avg_rating: number
  is_featured: boolean
  specs: Record<string, string>
  category: { id: string; name: string; slug: string } | null
  brand: { id: string; name: string; slug: string } | null
  images: { id: string; variant_id: string | null; url: string; sort_order: number }[]
  variants: {
    id: string
    name: string
    price_override: string | null
    stock: number
    is_active: boolean
    attributes: Record<string, string>
    images: { id: string; variant_id: string | null; url: string; sort_order: number }[]
  }[]
  related: {
    id: string
    name: string
    slug: string
    price: string
    sale_price: string | null
    stock: number
    thumbnail_url: string | null
    avg_rating: number
  }[]

}

const TABS = ["About Product", "Details", "Specs"] as const

type AuthUser = {
  id: string
  name: string
  email: string
}

type GuestCartItem = {
  product_id: string
  variant_id?: string | null
  variant_name?: string | null
  quantity: number
  product_name: string
  product_slug: string
  thumbnail_url: string | null
  price: string
  sale_price: string | null
}

function isAuthUser(value: unknown): value is AuthUser {
  if (!value || typeof value !== "object") return false
  const v = value as Record<string, unknown>
  return typeof v.id === "string" && typeof v.email === "string"
}

export function ProductDetailClient({ product }: { product: Product }) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>("About Product")
  const [selectedImage, setSelectedImage] = useState(0)
  const [qty, setQty] = useState(1)
  const [isAdding, setIsAdding] = useState(false)
  const [addMessage, setAddMessage] = useState("")
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({})

  const availableVariants = useMemo(
    () => product.variants.filter((variant) => variant.is_active),
    [product.variants]
  )

  const variantOptionGroups = useMemo(() => {
    return availableVariants.reduce<Record<string, string[]>>((acc, variant) => {
      Object.entries(variant.attributes ?? {}).forEach(([key, value]) => {
        if (!value) return
        const current = acc[key] ?? []
        if (!current.includes(value)) {
          current.push(value)
        }
        acc[key] = current
      })
      return acc
    }, {})
  }, [availableVariants])

  const optionKeys = useMemo(() => Object.keys(variantOptionGroups), [variantOptionGroups])

  const selectedVariant = useMemo(() => {
    if (availableVariants.length === 0) return null
    if (optionKeys.length === 0) return availableVariants[0]

    return (
      availableVariants.find((variant) =>
        optionKeys.every((key) => {
          const selectedValue = selectedOptions[key]
          if (!selectedValue) return false
          return variant.attributes?.[key] === selectedValue
        })
      ) ?? null
    )
  }, [availableVariants, optionKeys, selectedOptions])

  const sharedImages = useMemo(
    () => product.images.filter((image) => image.variant_id === null),
    [product.images]
  )

  const displayedImages = useMemo(() => {
    const variantImages = selectedVariant?.images ?? []
    const sourceImages =
      variantImages.length > 0
        ? variantImages
        : sharedImages.length > 0
          ? sharedImages
          : product.images

    if (sourceImages.length > 0) {
      return sourceImages.map((img) => img.url)
    }

    if (product.thumbnail_url) {
      return [product.thumbnail_url]
    }

    return ["/images/placeholder.png"]
  }, [product.images, product.thumbnail_url, selectedVariant, sharedImages])

  const hasDiscount = product.sale_price && Number(product.sale_price) < Number(product.price)
  const baseCurrentPrice = hasDiscount ? Number(product.sale_price) : Number(product.price)
  const currentPrice = Number(selectedVariant?.price_override ?? baseCurrentPrice)
  const currentStock = Number(selectedVariant?.stock ?? product.stock ?? 0)
  const variantSelectionRequired = availableVariants.length > 0 && optionKeys.length > 0
  const isVariantSelectionComplete = !variantSelectionRequired || selectedVariant !== null

  const formatPrice = (value: string | number) =>
    Number(value).toLocaleString("vi-VN")

  const aboutProductContent = useMemo(() => {
    const shortDescription = product.short_description?.trim()

    if (!shortDescription || shortDescription === "0") {
      return "About product information will be updated soon."
    }

    return shortDescription
  }, [product.short_description])

  const detailList = useMemo(() => {
    return (product.description || "")
      .split("\n")
      .map((line) => line.replace(/^[-*]\s*/, "").trim())
      .filter(Boolean)
  }, [product.description])

  const displayProductName = selectedVariant ? `${product.name} - ${selectedVariant.name}` : product.name

  const handleSelectOption = (key: string, value: string) => {
    setSelectedOptions((prev) => ({
      ...prev,
      [key]: value,
    }))
    setSelectedImage(0)
    setAddMessage("")
  }

  const handleAddToCart = () => {
    if (isAdding) return
    setAddMessage("")

    if (!isVariantSelectionComplete) {
      setAddMessage("Please choose a variant before adding to cart.")
      return
    }

    let user: unknown = null
    try {
      const raw = window.localStorage.getItem("auth_user")
      user = raw ? JSON.parse(raw) : null
    } catch {
      user = null
    }

    if (!isAuthUser(user)) {
      try {
        const rawGuest = window.localStorage.getItem("cart_guest_v1")
        const guestItems = rawGuest ? (JSON.parse(rawGuest) as GuestCartItem[]) : []
        const existingIdx = guestItems.findIndex(
          (item) => item.product_id === product.id && (item.variant_id ?? null) === (selectedVariant?.id ?? null)
        )
        const maxQty = Math.max(1, currentStock)

        if (existingIdx >= 0) {
          const nextQty = Math.max(1, Number(guestItems[existingIdx].quantity ?? 1)) + qty
          guestItems[existingIdx].quantity = Math.min(nextQty, maxQty)
        } else {
          guestItems.push({
            product_id: product.id,
            variant_id: selectedVariant?.id ?? null,
            variant_name: selectedVariant?.name ?? null,
            quantity: Math.min(qty, maxQty),
            product_name: displayProductName,
            product_slug: product.slug,
            thumbnail_url: product.thumbnail_url,
            price: String(currentPrice),
            sale_price: null,
          })
        }

        window.localStorage.setItem("cart_guest_v1", JSON.stringify(guestItems))
        setAddMessage("Added to cart.")
      } catch {
        setAddMessage("Cannot save guest cart.")
      }
      return
    }
    const userId = user.id

    setIsAdding(true)
    void (async () => {
      try {
        const response = await fetch("/api/cart", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: userId,
            product_id: product.id,
            variant_id: selectedVariant?.id ?? null,
            quantity: qty,
          }),
        })

        const data = await response.json()
        if (!response.ok) {
          setAddMessage(data.error ?? "Add to cart failed.")
          return
        }

        setAddMessage("Added to cart. Redirecting...")
        setTimeout(() => router.push("/cart"), 450)
      } catch {
        setAddMessage("Cannot connect to server.")
      } finally {
        setIsAdding(false)
      }
    })()
  }

  return (
    <main className="flex-1 bg-white">
      <div className="border-y border-zinc-200 bg-zinc-50">
        <div className="container mx-auto flex flex-wrap items-center justify-between gap-4 px-4 py-3">
          <nav className="flex items-center gap-5">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "relative pb-1 text-xs font-semibold transition-colors",
                  activeTab === tab ? "text-zinc-900" : "text-zinc-500 hover:text-zinc-900",
                )}
              >
                {tab}
                <span
                  className={cn(
                    "absolute inset-x-0 -bottom-1 h-0.5 bg-blue-600 transition-opacity",
                    activeTab === tab ? "opacity-100" : "opacity-0",
                  )}
                />
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <p className="text-xs text-zinc-600">
              On Sale from <span className="font-semibold text-zinc-900">{formatPrice(currentPrice * qty)}đ</span>
            </p>
            <div className="flex h-10 items-center overflow-hidden rounded border border-zinc-200 bg-white">
              <button
                onClick={() => setQty((prev) => Math.max(1, prev - 1))}
                className="h-full px-3 text-zinc-500 transition-colors hover:bg-zinc-100"
              >
                -
              </button>
              <span className="w-8 text-center text-sm font-semibold text-zinc-900">{qty}</span>
              <button
                onClick={() => setQty((prev) => Math.min(currentStock, prev + 1))}
                disabled={currentStock <= 0 || qty >= currentStock}
                className="h-full px-3 text-zinc-500 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                +
              </button>
            </div>
            <button
              onClick={handleAddToCart}
              disabled={isAdding || currentStock <= 0 || !isVariantSelectionComplete}
              className="inline-flex h-10 items-center rounded-full bg-blue-600 px-6 text-xs font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <ShoppingCart className="mr-2 h-4 w-4" />
              {isAdding ? "Adding..." : "Add to Cart"}
            </button>
          </div>
          {addMessage ? <p className="w-full text-right text-xs text-zinc-600">{addMessage}</p> : null}
        </div>
      </div>

      <section className="bg-[#eef0f5]">
        <div className="container mx-auto grid grid-cols-1 px-4 lg:grid-cols-2">
          <div className="py-10 lg:pr-10">
            <div className="mb-5 flex items-center gap-1.5 text-[11px] text-zinc-500">
              <Link href="/" className="hover:text-blue-600">
                Home
              </Link>
              <span>•</span>
              <Link href="/products" className="hover:text-blue-600">
                Laptops
              </Link>
              <span>•</span>
              <span>{product.brand?.name ?? "Series"}</span>
            </div>

            <h1 className="mb-3 text-4xl font-semibold tracking-tight text-zinc-900">{product.name}</h1>
            <div className="mb-5 flex items-center gap-2">
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={cn(
                      "h-4 w-4",
                      i < Math.round(product.avg_rating) ? "fill-yellow-400 text-yellow-400" : "fill-zinc-300 text-zinc-300",
                    )}
                  />
                ))}
              </div>
              <span className="text-xs text-blue-600">Be the first to review this product</span>
            </div>

            {activeTab === "Details" && (
              <ul className="max-w-xl list-disc space-y-1 pl-4 text-base leading-7 text-zinc-800">
                {detailList.length > 0 ? (
                  detailList.map((item, idx) => <li key={`${item}-${idx}`}>{item}</li>)
                ) : (
                  <li>Detailed product information will be updated soon.</li>
                )}
              </ul>
            )}

            {activeTab === "About Product" && (
              <p className="max-w-xl whitespace-pre-line text-sm leading-7 text-zinc-700">{aboutProductContent}</p>
            )}

            {activeTab === "Specs" && (
              <div className="max-w-md overflow-hidden border border-zinc-300 bg-white">
                {Object.keys(product.specs).length > 0 ? (
                  Object.entries(product.specs)
                    .slice(0, 6)
                    .map(([key, value], idx) => (
                      <div key={key} className={cn("grid grid-cols-[1fr_2fr] text-sm", idx % 2 === 0 ? "bg-zinc-50" : "bg-white")}>
                        <div className="border-b border-r border-zinc-200 px-4 py-2.5 text-zinc-700">{key}</div>
                        <div className="border-b border-zinc-200 px-4 py-2.5 text-zinc-600">{value || "N/A"}</div>
                      </div>
                    ))
                ) : (
                  <div className="px-4 py-3 text-sm text-zinc-500">No specifications available.</div>
                )}
              </div>
            )}

            {availableVariants.length > 0 ? (
              <div className="mt-6 max-w-xl space-y-4">
                {optionKeys.map((key) => (
                  <div key={key}>
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      {key}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {variantOptionGroups[key].map((value) => {
                        const active = selectedOptions[key] === value

                        return (
                          <button
                            key={`${key}-${value}`}
                            type="button"
                            onClick={() => handleSelectOption(key, value)}
                            className={cn(
                              "rounded-full border px-4 py-2 text-xs font-semibold transition-colors",
                              active
                                ? "border-blue-600 bg-blue-600 text-white"
                                : "border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400 hover:bg-zinc-50"
                            )}
                          >
                            {value}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}

                {selectedVariant ? (
                  <p className="text-xs text-zinc-500">
                    Selected: <span className="font-semibold text-zinc-900">{selectedVariant.name}</span>
                  </p>
                ) : variantSelectionRequired ? (
                  <p className="text-xs text-amber-600">Please choose all variant options.</p>
                ) : null}
              </div>
            ) : null}

            <div className="mt-8 flex items-center justify-between text-xs">
              <p className="text-zinc-700">
                Have a Question?{" "}
                <a href="#" className="font-semibold text-blue-600 hover:underline">
                  Contact Us
                </a>
              </p>
              <p className="text-zinc-500">SKU {product.id.slice(0, 8).toUpperCase()}</p>
            </div>

            <button className="mt-10 text-xs font-semibold uppercase tracking-wide text-zinc-900">+ More Information</button>
          </div>

          <div className="flex flex-col items-center justify-center border-l border-zinc-200 bg-white py-10">
            <div className="mb-4 flex flex-col gap-2 self-start pl-2 lg:pl-0">
              <button className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-zinc-300 text-zinc-500 hover:bg-zinc-100">
                <Heart className="h-4 w-4" />
              </button>
              <button className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-zinc-300 text-zinc-500 hover:bg-zinc-100">
                <BarChart3 className="h-4 w-4" />
              </button>
              <button className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-zinc-300 text-zinc-500 hover:bg-zinc-100">
                <Mail className="h-4 w-4" />
              </button>
            </div>

            <img src={displayedImages[selectedImage]} alt={displayProductName} className="mb-6 h-[360px] w-full max-w-[320px] object-contain" />

            <div className="mt-2 flex items-center gap-1.5">
              {displayedImages.slice(0, 3).map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImage(idx)}
                  className={cn(
                    "h-2 w-2 rounded-full transition-colors",
                    selectedImage === idx ? "bg-blue-600" : "bg-zinc-300 hover:bg-zinc-400",
                  )}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {product.related.length > 0 && (
        <section className="border-t border-zinc-100 bg-zinc-50">
          <div className="container mx-auto px-4 py-10">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-zinc-900">Related Products</h2>
              {product.category && (
                <a href={`/products?category=${product.category.slug}`} className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline">
                  See All
                  <ChevronRight className="h-3 w-3" />
                </a>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
              {product.related.map((item) => (
                <a key={item.id} href={`/products/${item.slug || item.id}`} className="block h-full">
                  <ProductCard
                    name={item.name}
                    image={item.thumbnail_url ?? "/images/placeholder.png"}
                    price={item.sale_price ?? item.price}
                    originalPrice={item.sale_price ? item.price : undefined}
                    rating={Math.round(item.avg_rating)}
                    inStock={item.stock > 0}
                  />
                </a>
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  )
}
