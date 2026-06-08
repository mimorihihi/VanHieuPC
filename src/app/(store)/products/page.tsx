import { query } from "@/lib/db"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { SupportFeature } from "@/components/home/support-features"
import { CatalogClient } from "./catalog-client"

type CatalogProductRow = {
  id: string
  name: string
  slug: string
  price: string | number | null
  sale_price: string | number | null
  stock: number
  thumbnail_url: string | null
  avg_rating: string | number | null
  is_featured: boolean | number
  category_id: string | null
  category_name: string | null
  category_slug: string | null
  brand_id: string | null
  brand_name: string | null
  brand_slug: string | null
}

type CountRow = { total: string | number }
type PriceRow = { min_price: string | number | null; max_price: string | number | null }
type OptionRow = { id: string; name: string; slug: string }

async function getInitialData(searchParams: Record<string, string>) {
  const category = searchParams.category ?? ""
  const brand    = searchParams.brand    ?? ""
  const minPrice = searchParams.minPrice ?? ""
  const maxPrice = searchParams.maxPrice ?? ""
  const sort     = searchParams.sort     ?? "newest"
  const page     = searchParams.page     ?? "1"
  const limit    = searchParams.limit    ?? "20"
  const search   = searchParams.search   ?? ""

  const conditions: string[] = ["p.is_active = true"]
  const params: (string | number)[] = []

  if (search)   { conditions.push("p.name LIKE ?");  params.push(`%${search}%`) }
  if (category) { conditions.push("c.slug = ?");     params.push(category) }
  if (brand)    { conditions.push("br.slug = ?");    params.push(brand) }
  if (minPrice) { conditions.push("p.price >= ?");   params.push(Number(minPrice)) }
  if (maxPrice) { conditions.push("p.price <= ?");   params.push(Number(maxPrice)) }

  const where = `WHERE ${conditions.join(" AND ")}`
  const orderMap: Record<string, string> = {
    newest:     "p.created_at DESC",
    price_asc:  "p.price ASC",
    price_desc: "p.price DESC",
    rating:     "p.avg_rating DESC",
    name_asc:   "p.name ASC",
  }
  const orderBy = orderMap[sort] ?? "p.created_at DESC"
  const pageNum  = Math.max(1, parseInt(page))
  const limitNum = Math.min(60, parseInt(limit))
  const offset   = (pageNum - 1) * limitNum

  const [productsResult, totalResult, categoriesResult, brandsResult, priceResult] = await Promise.all([
    query(
      `SELECT p.id, p.name, p.slug, p.price, p.sale_price, p.stock,
              p.thumbnail_url, p.avg_rating, p.is_featured,
              c.id as category_id, c.name as category_name, c.slug as category_slug,
              br.id as brand_id, br.name as brand_name, br.slug as brand_slug
       FROM products p
       LEFT JOIN categories c  ON c.id  = p.category_id
       LEFT JOIN brands     br ON br.id = p.brand_id
       ${where}
       ORDER BY ${orderBy}
       LIMIT ? OFFSET ?`,
      [...params, limitNum, offset]
    ),
    query(
      `SELECT COUNT(*) as total
       FROM products p
       LEFT JOIN categories c  ON c.id  = p.category_id
       LEFT JOIN brands     br ON br.id = p.brand_id
       ${where}`,
      params
    ),
    query(`SELECT id, name, slug FROM categories WHERE is_active = true ORDER BY sort_order ASC`),
    query(`SELECT id, name, slug FROM brands WHERE is_active = true ORDER BY name ASC`),
    query(`SELECT MIN(price) as min_price, MAX(price) as max_price FROM products WHERE is_active = true`),
  ])

  const serialize = (p: CatalogProductRow) => ({
    id:            p.id,
    name:          p.name,
    slug:          p.slug,
    price:         String(p.price ?? 0),
    sale_price:    p.sale_price == null ? null : String(p.sale_price),
    stock:         Number(p.stock),
    thumbnail_url: p.thumbnail_url ?? null,
    avg_rating:    Number(p.avg_rating ?? 0),
    is_featured:   Boolean(p.is_featured),
    category:      p.category_id ? { id: p.category_id, name: p.category_name ?? "", slug: p.category_slug ?? "" } : null,
    brand:         p.brand_id    ? { id: p.brand_id,    name: p.brand_name ?? "",    slug: p.brand_slug ?? ""    } : null,
  })

  const productRows = productsResult[0] as CatalogProductRow[]
  const countRows = totalResult[0] as CountRow[]
  const categoryRows = categoriesResult[0] as OptionRow[]
  const brandRows = brandsResult[0] as OptionRow[]
  const priceRowsData = priceResult[0] as PriceRow[]
  const total = Number(countRows[0]?.total ?? 0)
  const priceInfo = priceRowsData[0]

  return {
    products:   productRows.map(serialize),
    total,
    totalPages: Math.ceil(total / limitNum),
    page:       pageNum,
    categories: categoryRows,
    brands:     brandRows,
    priceRange: { min: Number(priceInfo?.min_price ?? 0), max: Number(priceInfo?.max_price ?? 10000) },
  }
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>
}) {
  const sp   = await searchParams
  const data = await getInitialData(sp).catch(() => ({
    products: [], total: 0, totalPages: 0, page: 1,
    categories: [], brands: [], priceRange: { min: 0, max: 10000 },
  }))

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <SiteHeader />
      <CatalogClient
        key={JSON.stringify(sp)}
        initialProducts={data.products}
        initialTotal={data.total}
        initialTotalPages={data.totalPages}
        categories={data.categories}
        brands={data.brands}
        priceRange={data.priceRange}
        initialFilters={sp}
      />
      <SupportFeature />
      <SiteFooter />
    </div>
  )
}
