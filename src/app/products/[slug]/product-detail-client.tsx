"use client"

import React, { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ProductCard } from "@/components/product-card"
import { cn } from "@/lib/utils"
import { BarChart3, ChevronRight, Heart, Mail, ShoppingCart, Star } from "lucide-react"

interface Product {
  id: string
  name: string
  slug: string
  description: string
  price: string
  sale_price: string | null
  stock: number
  thumbnail_url: string | null
  avg_rating: number
  is_featured: boolean
  specs: Record<string, string>
  category: { id: string; name: string; slug: string } | null
  brand: { id: string; name: string; slug: string } | null
  images: { id: string; url: string; sort_order: number }[]
  variants: { id: string; name: string; attributes: Record<string, string> }[]
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

  const allImages =
    product.images.length > 0
      ? product.images.map((img) => img.url)
      : product.thumbnail_url
        ? [product.thumbnail_url]
        : ["/images/placeholder.png"]

  const hasDiscount = product.sale_price && Number(product.sale_price) < Number(product.price)
  const currentPrice = hasDiscount ? product.sale_price! : product.price
  const formatPrice = (value: string | number) =>
    Number(value).toLocaleString("en-US", { minimumFractionDigits: 2 })

  const detailList = useMemo(() => {
    const fromDescription = (product.description || "")
      .split("\n")
      .map((line) => line.replace(/^[-*]\s*/, "").trim())
      .filter(Boolean)

    if (fromDescription.length > 0) return fromDescription
    return Object.entries(product.specs).slice(0, 10).map(([key, value]) => `${key}: ${value}`)
  }, [product.description, product.specs])

  const handleAddToCart = () => {
    if (isAdding) return
    setAddMessage("")

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
        const existingIdx = guestItems.findIndex((item) => item.product_id === product.id)
        const maxQty = Math.max(1, Number(product.stock ?? 1))

        if (existingIdx >= 0) {
          const nextQty = Math.max(1, Number(guestItems[existingIdx].quantity ?? 1)) + qty
          guestItems[existingIdx].quantity = Math.min(nextQty, maxQty)
        } else {
          guestItems.push({
            product_id: product.id,
            quantity: Math.min(qty, maxQty),
            product_name: product.name,
            product_slug: product.slug,
            thumbnail_url: product.thumbnail_url,
            price: product.price,
            sale_price: product.sale_price,
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
              On Sale from <span className="font-semibold text-zinc-900">${formatPrice(currentPrice)}</span>
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
                onClick={() => setQty((prev) => prev + 1)}
                className="h-full px-3 text-zinc-500 transition-colors hover:bg-zinc-100"
              >
                +
              </button>
            </div>
            <button
              onClick={handleAddToCart}
              disabled={isAdding || product.stock <= 0}
              className="inline-flex h-10 items-center rounded-full bg-blue-600 px-6 text-xs font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <ShoppingCart className="mr-2 h-4 w-4" />
              {isAdding ? "Adding..." : "Add to Cart"}
            </button>
            <button className="inline-flex h-10 items-center rounded-full bg-amber-400 px-6 text-xs font-semibold text-zinc-900 transition-colors hover:bg-amber-300">
              PayPal
            </button>
          </div>
          {addMessage ? <p className="w-full text-right text-xs text-zinc-600">{addMessage}</p> : null}
        </div>
      </div>

      <section className="bg-[#eef0f5]">
        <div className="container mx-auto grid grid-cols-1 px-4 lg:grid-cols-2">
          <div className="py-10 lg:pr-10">
            <div className="mb-5 flex items-center gap-1.5 text-[11px] text-zinc-500">
              <a href="/" className="hover:text-blue-600">
                Home
              </a>
              <span>•</span>
              <a href="/products" className="hover:text-blue-600">
                Laptops
              </a>
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

            {activeTab === "About Product" && (
              <p className="max-w-xl whitespace-pre-line text-sm leading-7 text-zinc-700">
                {product.description ||
                  "MSI MPG Trident series desktop designed for gaming and creative tasks with compact form factor, strong performance, and easy setup for daily workloads."}
              </p>
            )}

            {activeTab === "Details" && (
              <ul className="max-w-xl list-disc space-y-1 pl-4 text-sm leading-6 text-zinc-700">
                {detailList.length > 0 ? (
                  detailList.map((item, idx) => <li key={`${item}-${idx}`}>{item}</li>)
                ) : (
                  <li>Detailed product information will be updated soon.</li>
                )}
              </ul>
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

            <img src={allImages[selectedImage]} alt={product.name} className="mb-6 h-[360px] w-full max-w-[320px] object-contain" />

            <div className="mt-2 flex items-center gap-1.5">
              {allImages.slice(0, 3).map((_, idx) => (
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
