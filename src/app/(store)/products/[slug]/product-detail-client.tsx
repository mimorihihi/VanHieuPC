"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
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

type ProductReview = {
  id: string
  user_id: string
  user_name: string
  rating: number
  comment: string
  created_at: string
  isMine: boolean
}

type ReviewsResponse = {
  reviews: ProductReview[]
  reviewCount: number
  avgRating: number
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
  const [currentIndex, setCurrentIndex] = useState(0)
  const [qty, setQty] = useState(1)
  const [isAdding, setIsAdding] = useState(false)
  const [addMessage, setAddMessage] = useState("")
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({})
  const [showVariantPrompt, setShowVariantPrompt] = useState(false)
  const [reviews, setReviews] = useState<ProductReview[]>([])
  const [reviewCount, setReviewCount] = useState(0)
  const [reviewAvg, setReviewAvg] = useState(product.avg_rating)
  const [isLoadingReviews, setIsLoadingReviews] = useState(true)

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

    if (variantImages.length > 0) {
      const urls = variantImages
        .map((img) => img.url.trim())
        .filter(Boolean)

      return urls.length > 0 ? urls : ["/images/placeholder.png"]
    }

    const sourceImages = sharedImages.length > 0 ? sharedImages : product.images
    const galleryUrls = sourceImages
      .map((img) => img.url.trim())
      .filter(Boolean)

    const thumbnailUrl = product.thumbnail_url?.trim()
    const images = thumbnailUrl
      ? [thumbnailUrl, ...galleryUrls.filter((url) => url !== thumbnailUrl)]
      : galleryUrls

    return images.length > 0 ? images : ["/images/placeholder.png"]
  }, [product.images, product.thumbnail_url, selectedVariant, sharedImages])

  useEffect(() => {
    setCurrentIndex(0)
  }, [selectedVariant?.id])

  const hasDiscount = product.sale_price && Number(product.sale_price) < Number(product.price)
  const baseCurrentPrice = hasDiscount ? Number(product.sale_price) : Number(product.price)
  const currentPrice = Number(selectedVariant?.price_override ?? baseCurrentPrice)
  const currentStock = Number(selectedVariant?.stock ?? product.stock ?? 0)
  const variantSelectionRequired = availableVariants.length > 0 && optionKeys.length > 0
  const isVariantSelectionComplete = !variantSelectionRequired || selectedVariant !== null
  const displayRating = reviewCount > 0 ? reviewAvg : product.avg_rating

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

  const loadReviews = async () => {
    setIsLoadingReviews(true)
    try {
      const response = await fetch(`/api/products/${product.slug}/reviews`)
      const data = (await response.json()) as Partial<ReviewsResponse> & { error?: string }

      if (!response.ok) {
        setReviews([])
        return
      }

      const nextReviews = data.reviews ?? []
      setReviews(nextReviews)
      setReviewCount(Number(data.reviewCount ?? nextReviews.length))
      setReviewAvg(Number(data.avgRating ?? product.avg_rating))
    } catch {
      setReviews([])
    } finally {
      setIsLoadingReviews(false)
    }
  }

  useEffect(() => {
    void loadReviews()
  }, [product.slug])


  const handleSelectOption = (key: string, value: string) => {
    setSelectedOptions((prev) => ({
      ...prev,
      [key]: value,
    }))
    setShowVariantPrompt(false)
    setAddMessage("")
  }

  const handleAddToCart = () => {
    if (isAdding) return
    setAddMessage("")

    if (!isVariantSelectionComplete) {
      setShowVariantPrompt(true)
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
              disabled={isAdding || currentStock <= 0}
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
            <div className="mb-5 flex flex-wrap items-center gap-1.5 text-[11px] text-zinc-500">
              <Link href="/" className="hover:text-blue-600">
                Home
              </Link>
              {product.category ? (
                <>
                  <span>•</span>
                  <Link
                    href={{ pathname: "/products", query: { category: product.category.slug } }}
                    className="hover:text-blue-600"
                  >
                    {product.category.name}
                  </Link>
                </>
              ) : null}
              <span>•</span>
              <span className="max-w-[220px] truncate text-zinc-700 sm:max-w-sm">
                {product.name}
              </span>
            </div>

            <h1 className="mb-3 text-4xl font-semibold tracking-tight text-zinc-900">{product.name}</h1>
            <div className="mb-5 flex items-center gap-2">
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={cn(
                      "h-4 w-4",
                      i < Math.round(displayRating) ? "fill-yellow-400 text-yellow-400" : "fill-zinc-300 text-zinc-300",
                    )}
                  />
                ))}
              </div>
              <span className="text-xs text-blue-600">
                {reviewCount > 0 ? `${reviewAvg.toFixed(1)}/5 từ ${reviewCount} đánh giá` : "Chưa có đánh giá"}
              </span>
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
                ) : showVariantPrompt && variantSelectionRequired && optionKeys.some((key) => !selectedOptions[key]) ? (
                  <p className="text-xs text-amber-600">Please choose all variant options.</p>
                ) : showVariantPrompt && variantSelectionRequired ? (
                  <p className="text-xs text-amber-600">This variant combination is unavailable. Please choose another option.</p>
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

            <div className="flex w-full flex-col items-center px-3">
              <div className="mb-3 flex h-[320px] w-full max-w-[520px] items-center justify-center overflow-hidden rounded-3xl bg-white">
                <img
                  src={displayedImages[currentIndex]}
                  alt={displayProductName}
                  className="h-full w-full scale-110 object-contain p-1 transition-transform duration-300"
                />
              </div>

              {displayedImages.length > 1 ? (
                <div className="w-full max-w-[560px] overflow-x-auto rounded-2xl bg-zinc-50 p-2">
                  <div className="flex min-w-max gap-1.5">
                    {displayedImages.map((image, idx) => (
                      <button
                        key={`${image}-${idx}`}
                        type="button"
                        onClick={() => setCurrentIndex(idx)}
                        aria-label={`View product image ${idx + 1}`}
                        className={cn(
                          "flex h-16 w-20 shrink-0 items-center justify-center rounded-xl border bg-white p-1.5 transition-all hover:border-blue-400",
                          currentIndex === idx
                            ? "border-blue-600 ring-2 ring-blue-100"
                            : "border-zinc-200"
                        )}
                      >
                        <img
                          src={image}
                          alt={`${displayProductName} thumbnail ${idx + 1}`}
                          className="h-full w-full object-contain"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-zinc-100 bg-white">
        <div className="container mx-auto px-4 py-10">
          <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">Reviews</p>
              <h2 className="text-2xl font-bold text-zinc-900">Đánh giá & nhận xét sản phẩm</h2>
              <p className="mt-2 text-sm text-zinc-500">
                {reviewCount > 0
                  ? `${reviewCount} khách hàng đã chia sẻ trải nghiệm về sản phẩm này.`
                  : "Hãy là người đầu tiên đánh giá sản phẩm này."}
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3">
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={cn(
                      "h-4 w-4",
                      i < Math.round(displayRating) ? "fill-yellow-400 text-yellow-400" : "fill-zinc-300 text-zinc-300",
                    )}
                  />
                ))}
              </div>
              <span className="text-sm font-semibold text-zinc-900">{reviewCount > 0 ? reviewAvg.toFixed(1) : "0.0"}/5</span>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
            <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-5">
              <h3 className="text-sm font-bold text-zinc-900">Đánh giá sau khi hoàn tất đơn hàng</h3>
              <p className="mt-2 text-xs leading-5 text-zinc-500">
                Để đảm bảo đánh giá đến từ khách đã mua hàng, bạn hãy vào Dashboard, mở đơn hàng đã hoàn tất rồi đánh giá từng sản phẩm trong chi tiết đơn.
              </p>

              <div className="mt-4 rounded-2xl border border-zinc-200 bg-white p-4 text-xs leading-6 text-zinc-600">
                <p className="font-semibold text-zinc-900">Flow đánh giá:</p>
                <p className="mt-2">1. User Dashboard</p>
                <p>2. Đơn hàng của tôi</p>
                <p>3. Chi tiết đơn hàng đã hoàn tất</p>
                <p>4. Đánh giá sản phẩm</p>
              </div>

              <a
                href="/dashboard?tab=orders"
                className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-full bg-blue-600 px-5 text-xs font-semibold text-white transition hover:bg-blue-700"
              >
                Vào đơn hàng của tôi
              </a>
            </div>

            <div className="space-y-3">
              {isLoadingReviews ? (
                <div className="rounded-3xl border border-zinc-200 p-5 text-sm text-zinc-500">Đang tải đánh giá...</div>
              ) : reviews.length > 0 ? (
                reviews.map((review) => (
                  <article key={review.id} className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-bold text-zinc-900">
                          {review.user_name} {review.isMine ? <span className="text-xs font-medium text-blue-600">(Bạn)</span> : null}
                        </h3>
                        <p className="text-xs text-zinc-400">{new Date(review.created_at).toLocaleDateString("vi-VN")}</p>
                      </div>
                      <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={cn(
                              "h-4 w-4",
                              i < review.rating ? "fill-yellow-400 text-yellow-400" : "fill-zinc-300 text-zinc-300",
                            )}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="whitespace-pre-line text-sm leading-6 text-zinc-700">
                      {review.comment || "Khách hàng chưa để lại nhận xét chi tiết."}
                    </p>
                  </article>
                ))
              ) : (
                <div className="rounded-3xl border border-dashed border-zinc-300 bg-zinc-50 p-8 text-center text-sm text-zinc-500">
                  Chưa có nhận xét nào cho sản phẩm này.
                </div>
              )}
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
