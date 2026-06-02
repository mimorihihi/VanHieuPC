"use client"

import { type ReactNode, useState, useCallback, useTransition } from "react"
import { useRouter, usePathname } from "next/navigation"
import { ProductCard } from "@/components/product-card"
import { SlidersHorizontal, LayoutGrid, List, ChevronLeft, ChevronRight, X, Search, ChevronDown } from "lucide-react"

/* ─── Types ─────────────────────────────────────────── */
interface Product {
  id: string; name: string; slug: string
  price: string; sale_price: string | null
  stock: number; thumbnail_url: string | null
  avg_rating: number; is_featured: boolean
  category: { id: string; name: string; slug: string } | null
  brand:    { id: string; name: string; slug: string } | null
}
interface Category { id: string; name: string; slug: string }
interface Brand    { id: string; name: string; slug: string }
interface PriceRange { min: number; max: number }
interface Filters {
  category?: string
  brand?: string
  minPrice?: string
  maxPrice?: string
  sort?: string
  page?: number
  limit?: number
  search?: string
}

interface Props {
  initialProducts:  Product[]
  initialTotal:     number
  initialTotalPages: number
  categories:       Category[]
  brands:           Brand[]
  priceRange:       PriceRange
  initialFilters:   Record<string, string>
}

const SORT_OPTIONS = [
  { value: "newest",     label: "Newest" },
  { value: "price_asc",  label: "Price: Low → High" },
  { value: "price_desc", label: "Price: High → Low" },
  { value: "rating",     label: "Top Rated" },
  { value: "name_asc",   label: "Name A–Z" },
]
const LIMIT_OPTIONS = [12, 20, 35, 60]

/* ─── Main Component ─────────────────────────────────── */
export function CatalogClient({
  initialProducts, initialTotal, initialTotalPages,
  categories, brands, priceRange, initialFilters,
}: Props) {
  const router     = useRouter()
  const pathname   = usePathname()
  const [pending, startTransition] = useTransition()

  const [products,   setProducts]   = useState(initialProducts)
  const [total,      setTotal]      = useState(initialTotal)
  const [totalPages, setTotalPages] = useState(initialTotalPages)
  const [loading,    setLoading]    = useState(false)
  const [viewMode,   setViewMode]   = useState<"grid" | "list">("grid")
  const [sidebarOpen, setSidebarOpen] = useState(false)

  /* live filter state */
  const [search,   setSearch]   = useState(initialFilters.search   ?? "")
  const [category, setCategory] = useState(initialFilters.category ?? "")
  const [brand,    setBrand]    = useState(initialFilters.brand     ?? "")
  const [sort,     setSort]     = useState(initialFilters.sort      ?? "newest")
  const [page,     setPage]     = useState(Number(initialFilters.page ?? 1))
  const [limit,    setLimit]    = useState(Number(initialFilters.limit ?? 20))
  const [minPrice, setMinPrice] = useState(initialFilters.minPrice  ?? "")
  const [maxPrice, setMaxPrice] = useState(initialFilters.maxPrice  ?? "")

  /* fetch from API */
  const fetchProducts = useCallback(async (params: Filters) => {
    setLoading(true)
    const q = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => { if (v) q.set(k, String(v)) })
    try {
      const res  = await fetch(`/api/products?${q}`)
      const data = await res.json()
      setProducts(data.products ?? [])
      setTotal(data.total ?? 0)
      setTotalPages(data.totalPages ?? 0)
    } finally {
      setLoading(false)
    }
  }, [])

  const applyFilters = useCallback((overrides: Partial<Filters> = {}) => {
    const next = {
      search, category, brand, sort,
      minPrice, maxPrice,
      limit, page: 1,
      ...overrides,
    }
    fetchProducts(next)
    /* sync URL */
    const q = new URLSearchParams()
    Object.entries(next).forEach(([k, v]) => { if (v && v !== "1" && !(k === "limit" && Number(v) === 20)) q.set(k, String(v)) })
    startTransition(() => router.replace(`${pathname}?${q}`, { scroll: false }))
  }, [search, category, brand, sort, minPrice, maxPrice, limit, fetchProducts, pathname, router])

  const clearFilter = (key: string) => {
    if (key === "category") { setCategory(""); applyFilters({ category: "" }) }
    if (key === "brand")    { setBrand("");    applyFilters({ brand: "" }) }
    if (key === "minPrice") { setMinPrice(""); applyFilters({ minPrice: "" }) }
    if (key === "maxPrice") { setMaxPrice(""); applyFilters({ maxPrice: "" }) }
    if (key === "search")   { setSearch("");   applyFilters({ search: "" }) }
  }

  const clearAll = () => {
    setCategory(""); setBrand(""); setMinPrice(""); setMaxPrice(""); setSearch("")
    fetchProducts({ sort, limit, page: 1 })
    startTransition(() => router.replace(pathname, { scroll: false }))
  }

  const goPage = (p: number) => {
    setPage(p)
    applyFilters({ page: p })
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  /* active filter chips */
  const activeChips: { key: string; label: string }[] = []
  if (search)   activeChips.push({ key: "search",   label: `"${search}"` })
  if (category) activeChips.push({ key: "category", label: categories.find(c => c.slug === category)?.name ?? category })
  if (brand)    activeChips.push({ key: "brand",    label: brands.find(b => b.slug === brand)?.name ?? brand })
  if (minPrice) activeChips.push({ key: "minPrice", label: `≥ $${minPrice}` })
  if (maxPrice) activeChips.push({ key: "maxPrice", label: `≤ $${maxPrice}` })

  const fmt = (v: string | number) => Number(v).toLocaleString("en-US", { minimumFractionDigits: 0 })

  return (
    <main className="flex-1 bg-white">
      {/* Breadcrumb */}
      <div className="border-b border-zinc-200 bg-zinc-50">
        <div className="container mx-auto px-4 py-2 text-xs text-zinc-500 flex items-center gap-1">
          <a href="/" className="hover:text-blue-600">Home</a>
          <ChevronRight className="h-3 w-3" />
          <span className="text-zinc-800 font-medium">Products</span>
          {category && <>
            <ChevronRight className="h-3 w-3" />
            <span className="text-zinc-800 font-medium capitalize">{categories.find(c => c.slug === category)?.name ?? category}</span>
          </>}
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="flex gap-6">

          {/* ── LEFT SIDEBAR ── */}
          <aside className={`w-64 flex-shrink-0 ${sidebarOpen ? "block" : "hidden"} lg:block`}>

            {/* Back */}
            <a href="/" className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-blue-600 mb-4 transition-colors">
              <ChevronLeft className="h-4 w-4" /> Back
            </a>

            {/* Filter box */}
            <div className="border border-zinc-200 rounded mb-4">
              <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200">
                <span className="text-sm font-bold text-zinc-800 flex items-center gap-1.5">
                  <SlidersHorizontal className="h-4 w-4 text-zinc-500" /> Filters
                </span>
                <button onClick={clearAll} className="text-[11px] text-blue-600 hover:underline font-medium">Clear Filter</button>
              </div>

              {/* Search */}
              <div className="px-4 py-3 border-b border-zinc-100">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Search products…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && applyFilters({ search })}
                    className="w-full pl-8 pr-3 py-2 text-xs border border-zinc-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
                  />
                </div>
              </div>

              {/* Category */}
              <FilterSection title="Category">
                <ul className="space-y-1">
                  <li>
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-600 hover:text-blue-600">
                      <input type="radio" name="cat" checked={category === ""} onChange={() => { setCategory(""); applyFilters({ category: "" }) }}
                        className="text-blue-600 accent-blue-600" />
                      All Categories
                    </label>
                  </li>
                  {categories.map(c => (
                    <li key={c.id}>
                      <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-600 hover:text-blue-600">
                        <input type="radio" name="cat" checked={category === c.slug} onChange={() => { setCategory(c.slug); applyFilters({ category: c.slug }) }}
                          className="text-blue-600 accent-blue-600" />
                        {c.name}
                      </label>
                    </li>
                  ))}
                </ul>
              </FilterSection>

              {/* Price Range */}
              <FilterSection title="Price">
                <div className="flex items-center gap-2">
                  <input
                    type="number" placeholder={`$${priceRange.min}`}
                    value={minPrice}
                    onChange={e => setMinPrice(e.target.value)}
                    className="w-full text-xs border border-zinc-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
                  />
                  <span className="text-zinc-400 text-xs">–</span>
                  <input
                    type="number" placeholder={`$${priceRange.max}`}
                    value={maxPrice}
                    onChange={e => setMaxPrice(e.target.value)}
                    className="w-full text-xs border border-zinc-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
                  />
                </div>
                <button onClick={() => applyFilters({ minPrice, maxPrice })}
                  className="mt-2 w-full bg-blue-600 text-white text-xs font-bold py-1.5 rounded hover:bg-blue-700 transition-colors">
                  Apply Price
                </button>
              </FilterSection>

              {/* Brands */}
              <FilterSection title="Brands" noBorder>
                <ul className="space-y-1">
                  <li>
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-600 hover:text-blue-600">
                      <input type="radio" name="brand" checked={brand === ""} onChange={() => { setBrand(""); applyFilters({ brand: "" }) }}
                        className="accent-blue-600" />
                      All Brands
                    </label>
                  </li>
                  {brands.map(b => (
                    <li key={b.id}>
                      <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-600 hover:text-blue-600">
                        <input type="radio" name="brand" checked={brand === b.slug} onChange={() => { setBrand(b.slug); applyFilters({ brand: b.slug }) }}
                          className="accent-blue-600" />
                        {b.name}
                      </label>
                    </li>
                  ))}
                </ul>
              </FilterSection>
            </div>
          </aside>

          {/* ── MAIN CONTENT ── */}
          <div className="flex-1 min-w-0">
            {/* Page title + mobile filter toggle */}
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-xl font-bold text-zinc-900">
                Products
                <span className="ml-2 text-sm font-normal text-zinc-400">({total.toLocaleString()})</span>
              </h1>
              <button onClick={() => setSidebarOpen(v => !v)}
                className="lg:hidden flex items-center gap-1.5 border border-zinc-300 rounded px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50">
                <SlidersHorizontal className="h-3.5 w-3.5" /> Filters
              </button>
            </div>

            {/* Active filter chips */}
            {activeChips.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {activeChips.map(chip => (
                  <span key={chip.key} className="flex items-center gap-1 bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-semibold px-2.5 py-1 rounded-full uppercase">
                    {chip.label}
                    <button onClick={() => clearFilter(chip.key)} className="ml-0.5 hover:text-red-500">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                <button onClick={clearAll} className="text-[11px] font-semibold text-red-500 hover:text-red-700 underline underline-offset-2">
                  Clear All
                </button>
              </div>
            )}

            {/* Sort + limit + view toggle bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5 pb-4 border-b border-zinc-100">
              <div className="flex items-center gap-3">
                {/* Sort */}
                <div className="relative">
                  <label className="text-xs text-zinc-500 mr-1">Sort By:</label>
                  <select value={sort} onChange={e => { setSort(e.target.value); applyFilters({ sort: e.target.value }) }}
                    className="text-xs border border-zinc-200 rounded px-2 py-1.5 pr-7 appearance-none bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 font-medium text-zinc-700">
                    {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-zinc-400 pointer-events-none mt-2.5" />
                </div>
                {/* Limit */}
                <div className="relative">
                  <label className="text-xs text-zinc-500 mr-1">Show:</label>
                  <select value={limit} onChange={e => { const v = Number(e.target.value); setLimit(v); applyFilters({ limit: v, page: 1 }) }}
                    className="text-xs border border-zinc-200 rounded px-2 py-1.5 pr-7 appearance-none bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 font-medium text-zinc-700">
                    {LIMIT_OPTIONS.map(n => <option key={n} value={n}>{n} per page</option>)}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-zinc-400 pointer-events-none mt-2.5" />
                </div>
              </div>
              {/* View toggle */}
              <div className="flex items-center gap-1 border border-zinc-200 rounded overflow-hidden">
                <button onClick={() => setViewMode("grid")}
                  className={`p-2 ${viewMode === "grid" ? "bg-blue-600 text-white" : "text-zinc-500 hover:bg-zinc-50"}`}>
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button onClick={() => setViewMode("list")}
                  className={`p-2 ${viewMode === "list" ? "bg-blue-600 text-white" : "text-zinc-500 hover:bg-zinc-50"}`}>
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Products */}
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
                {Array.from({ length: limit }).map((_, i) => (
                  <div key={i} className="border border-zinc-100 rounded p-3 animate-pulse">
                    <div className="aspect-square bg-zinc-100 rounded mb-3" />
                    <div className="h-2.5 bg-zinc-100 rounded mb-2" />
                    <div className="h-2.5 bg-zinc-100 rounded w-3/4 mb-3" />
                    <div className="h-3 bg-zinc-100 rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-zinc-400 gap-3">
                <Search className="h-12 w-12 opacity-30" />
                <p className="text-lg font-semibold">No products found</p>
                <p className="text-sm">Try adjusting your filters</p>
                <button onClick={clearAll} className="mt-2 text-sm text-blue-600 hover:underline font-medium">Clear all filters</button>
              </div>
            ) : viewMode === "grid" ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
                {products.map(p => (
                  <a key={p.id} href={`/products/${p.slug || p.id}`} className="block h-full">
                    <ProductCard
                      name={p.name}
                      image={p.thumbnail_url ?? "/images/placeholder.png"}
                      price={p.sale_price ?? p.price}
                      originalPrice={p.sale_price ? p.price : undefined}
                      rating={Math.round(p.avg_rating)}
                      inStock={p.stock > 0}
                    />
                  </a>
                ))}
              </div>
            ) : (
              /* List view */
              <div className="flex flex-col gap-3">
                {products.map(p => (
                  <a key={p.id} href={`/products/${p.slug || p.id}`}
                    className="flex gap-4 border border-zinc-100 rounded p-4 hover:shadow-md transition-shadow group">
                    <div className="w-24 h-24 flex-shrink-0 bg-zinc-50 rounded flex items-center justify-center overflow-hidden">
                      <img src={p.thumbnail_url ?? "/images/placeholder.png"} alt={p.name}
                        className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1 mb-1">
                        {[...Array(5)].map((_, i) => (
                          <svg key={i} className={`w-3 h-3 ${i < p.avg_rating ? "text-yellow-400 fill-current" : "text-zinc-200 fill-current"}`} viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 00.951-.69l1.07-3.292z"/>
                          </svg>
                        ))}
                        <span className="text-[10px] text-zinc-400 ml-1">{p.avg_rating.toFixed(1)}</span>
                      </div>
                      <h3 className="text-sm font-semibold text-zinc-800 group-hover:text-blue-600 transition-colors line-clamp-2 mb-1">{p.name}</h3>
                      {p.category && <p className="text-[11px] text-zinc-400 mb-2">{p.category.name}{p.brand ? ` · ${p.brand.name}` : ""}</p>}
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-zinc-900">${fmt(p.sale_price ?? p.price)}</span>
                        {p.sale_price && <span className="text-xs text-zinc-400 line-through">${fmt(p.price)}</span>}
                      </div>
                    </div>
                    <div className="flex flex-col items-end justify-between flex-shrink-0">
                      <span className={`text-[11px] font-semibold ${p.stock > 0 ? "text-green-600" : "text-red-500"}`}>
                        {p.stock > 0 ? "In Stock" : "Out of Stock"}
                      </span>
                    </div>
                  </a>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-1 mt-8">
                <button onClick={() => goPage(page - 1)} disabled={page <= 1}
                  className="p-2 border border-zinc-200 rounded hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  let p: number
                  if (totalPages <= 7) p = i + 1
                  else if (page <= 4)  p = i + 1
                  else if (page >= totalPages - 3) p = totalPages - 6 + i
                  else p = page - 3 + i
                  return (
                    <button key={p} onClick={() => goPage(p)}
                      className={`min-w-[36px] h-9 px-2 border rounded text-sm font-medium transition-colors
                        ${p === page ? "bg-blue-600 border-blue-600 text-white" : "border-zinc-200 text-zinc-700 hover:bg-zinc-50"}`}>
                      {p}
                    </button>
                  )
                })}
                <button onClick={() => goPage(page + 1)} disabled={page >= totalPages}
                  className="p-2 border border-zinc-200 rounded hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Count info */}
            {total > 0 && (
              <p className="text-center text-xs text-zinc-400 mt-3">
                Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total.toLocaleString()} products
              </p>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}

/* ─── Reusable filter section ─── */
function FilterSection({ title, children, noBorder = false }: { title: string; children: ReactNode; noBorder?: boolean }) {
  const [open, setOpen] = useState(true)
  return (
    <div className={noBorder ? "" : "border-b border-zinc-100"}>
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-xs font-bold text-zinc-700 hover:bg-zinc-50 transition-colors">
        {title}
        <ChevronDown className={`h-3.5 w-3.5 text-zinc-400 transition-transform ${open ? "" : "-rotate-90"}`} />
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  )
}
