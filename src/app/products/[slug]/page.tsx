import { query } from "@/lib/db"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { SupportFeature } from "@/components/home/support-features"
import { ProductDetailClient } from "./product-detail-client"
import { notFound } from "next/navigation"

async function getProduct(slug: string) {
  const [rows] = await query(
    `SELECT
      p.*,
      c.id as category_join_id, c.name as category_join_name, c.slug as category_join_slug,
      b.id as brand_join_id, b.name as brand_join_name, b.slug as brand_join_slug
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
    LEFT JOIN brands b ON b.id = p.brand_id
    WHERE (p.slug = ? OR p.id = ?) AND p.is_active = true
    LIMIT 1`,
    [slug, slug]
  )

  const product = rows[0] as any
  if (!product) return null

  product.price     = product.price?.toString() ?? "0"
  product.sale_price = product.sale_price?.toString() ?? null
  product.avg_rating = Number(product.avg_rating ?? 0)
  product.specs      = typeof product.specs === "string" ? JSON.parse(product.specs) : (product.specs ?? {})

  product.category = product.category_join_id
    ? { id: product.category_join_id, name: product.category_join_name, slug: product.category_join_slug }
    : null
  product.brand = product.brand_join_id
    ? { id: product.brand_join_id, name: product.brand_join_name, slug: product.brand_join_slug }
    : null

  const [images] = await query(
    "SELECT id, url, sort_order FROM product_images WHERE product_id = ? ORDER BY sort_order ASC",
    [product.id]
  )
  product.images = images

  const [variants] = await query(
    "SELECT id, name, attributes FROM product_variants WHERE product_id = ? ORDER BY name ASC",
    [product.id]
  )
  product.variants = (variants as any[]).map((v: any) => ({
    ...v,
    attributes: typeof v.attributes === "string" ? JSON.parse(v.attributes) : v.attributes,
  }))

  // Related products
  let related: any[] = []
  if (product.category_id) {
    const [relRows] = await query(
      `SELECT id, name, slug, price, sale_price, stock, thumbnail_url, avg_rating
       FROM products
       WHERE category_id = ? AND id != ? AND is_active = true
       ORDER BY created_at DESC
       LIMIT 5`,
      [product.category_id, product.id]
    )
    related = (relRows as any[]).map((r: any) => ({
      ...r,
      price: r.price?.toString() ?? "0",
      sale_price: r.sale_price?.toString() ?? null,
      avg_rating: Number(r.avg_rating ?? 0),
    }))
  }
  product.related = related

  return product
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const product = await getProduct(slug).catch(() => null)
  if (!product) notFound()

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <SiteHeader />
      <ProductDetailClient product={product} />
      <SupportFeature />
      <SiteFooter />
    </div>
  )
}
