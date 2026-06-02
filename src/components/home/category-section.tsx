"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { ProductCard } from "@/components/product-card"
import { cn } from "@/lib/utils"

interface Product {
  id: string
  slug?: string
  name: string
  price: string | number
  sale_price?: string | number | null
  stock: number
  thumbnail_url: string | null
  avg_rating: string | number
  category_name?: string
}

interface CategorySectionProps {
  title?: string
  products: Product[]
  maxItems?: number
  featuredCard?: {
    title: string
    image: string
    href: string
    buttonText: string
  }
  tabs?: string[]
  activeTab?: string
  onTabChange?: (tab: string) => void
  className?: string
  seeAllHref?: string
  seeAllText?: string
  scrollable?: boolean
}

export function CategorySection({
  title,
  products,
  maxItems,
  featuredCard,
  tabs,
  activeTab,
  onTabChange,
  className,
  seeAllHref = "#",
  seeAllText = "See All Products",
  scrollable = false,
}: CategorySectionProps) {
  const itemsPerPage = typeof maxItems === "number" ? maxItems : products.length
  const maxPage = Math.max(0, Math.ceil(products.length / itemsPerPage) - 1)
  const [page, setPage] = useState(0)
  const currentPage = Math.min(page, maxPage)
  const sectionKey =
    featuredCard?.title?.toLowerCase().replace(/\s+/g, "-") ??
    title?.toLowerCase().replace(/\s+/g, "-") ??
    "product"

  const visibleProducts = useMemo(() => {
    if (typeof maxItems !== "number") {
      return products
    }

    const startIndex = currentPage * itemsPerPage
    return products.slice(startIndex, startIndex + itemsPerPage)
  }, [currentPage, itemsPerPage, maxItems, products])

  const canPage = typeof maxItems === "number" && products.length > maxItems
  const canGoPrevPage = canPage && currentPage > 0
  const canGoNextPage = canPage && currentPage < maxPage

  return (
    <section className={cn("w-full py-8 lg:py-10", className)}>
      <div className="container mx-auto px-4">
        {!featuredCard && (
          <div className="mb-5 flex items-center justify-between gap-4 border-b border-zinc-200 pb-3">
            <div className="flex min-w-0 items-center gap-6 overflow-x-auto">
              {title && (
                <h2 className="shrink-0 whitespace-nowrap text-xl font-bold tracking-tight text-zinc-900">
                  {title}
                </h2>
              )}
            </div>

            <div className="ml-auto flex shrink-0 items-center gap-2">
              <a
                href={seeAllHref}
                className="shrink-0 whitespace-nowrap text-[13px] font-semibold text-blue-600 transition-colors hover:text-blue-700"
              >
                {seeAllText}
              </a>
            </div>
          </div>
        )}

        {featuredCard && tabs && (
          <div className="mb-5 flex items-center gap-3 overflow-x-auto border-b border-zinc-200 pb-3">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => onTabChange?.(tab)}
                className={`whitespace-nowrap rounded-full px-3 py-1.5 text-[13px] font-semibold transition-colors ${
                  activeTab === tab
                    ? "bg-zinc-900 text-white"
                    : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-4 lg:flex-row lg:gap-5">
          {featuredCard && (
            <div className="relative min-h-[280px] overflow-hidden rounded-2xl bg-zinc-950 p-6 text-white lg:w-[260px] lg:shrink-0 lg:p-7">
              <div className="absolute inset-0 bg-gradient-to-br from-black/20 via-black/45 to-black/75" />
              <div className="absolute inset-0 opacity-25">
                {featuredCard.image.trim() ? (
                  <img src={featuredCard.image.trim()} alt={featuredCard.title} className="h-full w-full object-cover" />
                ) : null}
              </div>
              <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/10 to-transparent" />
              <div className="relative z-10 flex h-full flex-col justify-end">
                <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.28em] text-white/70">
                  Featured Collection
                </div>
                <h3 className="mb-5 whitespace-pre-line text-[28px] font-black uppercase leading-[0.95] tracking-tight">
                  {featuredCard.title}
                </h3>
                <a
                  href={featuredCard.href}
                  className="inline-flex w-fit items-center rounded-full border border-white/30 bg-white px-5 py-2 text-xs font-bold uppercase tracking-[0.18em] text-zinc-950 transition-transform transition-colors hover:-translate-y-0.5 hover:bg-zinc-100"
                >
                  {featuredCard.buttonText}
                </a>
              </div>
            </div>
          )}

          <div className="relative flex-1">
            {scrollable && canPage && (
              <>
                <button
                  id={`${sectionKey}-page-left`}
                  type="button"
                  onClick={() => setPage((current) => Math.max(current - 1, 0))}
                  disabled={!canGoPrevPage}
                  aria-label={`Show previous ${title ?? featuredCard?.title ?? "products"}`}
                  className="absolute left-0 top-1/2 z-10 hidden h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-200 bg-white/95 text-zinc-400 shadow-sm transition-all duration-200 hover:scale-105 hover:border-zinc-300 hover:text-zinc-700 disabled:pointer-events-none disabled:opacity-35 md:inline-flex"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  id={`${sectionKey}-page-right`}
                  type="button"
                  onClick={() => setPage((current) => Math.min(current + 1, maxPage))}
                  disabled={!canGoNextPage}
                  aria-label={`Show next ${title ?? featuredCard?.title ?? "products"}`}
                  className="absolute right-0 top-1/2 z-10 hidden translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-200 bg-white/95 text-zinc-400 shadow-sm transition-all duration-200 hover:scale-105 hover:border-zinc-300 hover:text-zinc-700 disabled:pointer-events-none disabled:opacity-35 md:inline-flex h-9 w-9"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </>
            )}

            {!scrollable && canPage && (
              <div className="mb-4 flex items-center justify-end gap-2">
                <button
                  id={`${sectionKey}-page-left`}
                  type="button"
                  onClick={() => setPage((current) => Math.max(current - 1, 0))}
                  disabled={!canGoPrevPage}
                  aria-label={`Show previous ${title ?? featuredCard?.title ?? "products"}`}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-400 shadow-sm transition-all duration-200 hover:scale-105 hover:border-zinc-300 hover:text-zinc-700 disabled:pointer-events-none disabled:opacity-35"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  id={`${sectionKey}-page-right`}
                  type="button"
                  onClick={() => setPage((current) => Math.min(current + 1, maxPage))}
                  disabled={!canGoNextPage}
                  aria-label={`Show next ${title ?? featuredCard?.title ?? "products"}`}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-400 shadow-sm transition-all duration-200 hover:scale-105 hover:border-zinc-300 hover:text-zinc-700 disabled:pointer-events-none disabled:opacity-35"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}

            <div className={cn(
              "grid gap-4",
              scrollable
                ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5"
                : featuredCard
                  ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5"
                  : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6"
            )}>
              {visibleProducts.map((product) => (
                product.href ? (
                  <Link key={product.id} href={product.href} className="block h-full">
                    <ProductCard
                      name={product.name}
                      image={product.image.trim()}
                      price={product.price}
                      originalPrice={product.originalPrice}
                      rating={product.rating}
                      inStock={product.inStock}
                    />
                  </Link>
                ) : (
                  <ProductCard
                    key={product.id}
                    name={product.name}
                    image={product.image.trim()}
                    price={product.price}
                    originalPrice={product.originalPrice}
                    rating={product.rating}
                    inStock={product.inStock}
                  />
                )
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
