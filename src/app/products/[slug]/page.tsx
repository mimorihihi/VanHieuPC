import { query } from "@/lib/db"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { SupportFeature } from "@/components/home/support-features"
import { ProductDetailClient, type Product } from "./product-detail-client"
import { notFound } from "next/navigation"
import type { RowDataPacket } from "mysql2/promise"
import { unstable_noStore as noStore } from "next/cache"

export const dynamic = "force-dynamic"

type ProductRow = RowDataPacket & {
  id: string
  name: string
  slug: string
  description: string | null
  short_description: string | null
  category_id: string | null
  price: number | string | null
  sale_price: number | string | null
  stock: number | null
  thumbnail_url: string | null
  avg_rating: number | string | null
  is_featured: number | boolean | null
  specs: string | Record<string, unknown> | null
  category_join_id: string | null
  category_join_name: string | null
  category_join_slug: string | null
  brand_join_id: string | null
  brand_join_name: string | null
  brand_join_slug: string | null
}

type ImageRow = RowDataPacket & {
  id: string
  url: string
  sort_order: number
}

type VariantRow = RowDataPacket & {
  id: string
  name: string
  price_override: number | string | null
  stock: number
  attributes: string | Record<string, string>
  is_active: number | boolean
}

type RelatedRow = RowDataPacket & {
  id: string
  name: string
  slug: string
  price: number | string | null
  sale_price: number | string | null
  stock: number
  thumbnail_url: string | null
  avg_rating: number | string | null
}

function parseRecord(value: string | Record<string, unknown> | null | undefined) {
  if (!value) return {}
  if (typeof value !== "string") return value

  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === "object" ? parsed : {}
  } catch {
    return {}
  }
}

async function getProduct(slug: string): Promise<Product | null> {
  noStore()
  const [rows] = await query<ProductRow[]>(
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

  const product = rows[0]
  if (!product) return null

  const [images] = await query<ImageRow[]>(
    "SELECT id, url, sort_order FROM product_images WHERE product_id = ? ORDER BY sort_order ASC",
    [product.id]
  )

  const [variants] = await query<VariantRow[]>(
    `SELECT id, name, price_override, stock, attributes, is_active
     FROM product_variants
     WHERE product_id = ?
     ORDER BY name ASC`,
    [product.id]
  )

  let related: Product["related"] = []
  if (product.category_id) {
    const [relRows] = await query<RelatedRow[]>(
      `SELECT id, name, slug, price, sale_price, stock, thumbnail_url, avg_rating
       FROM products
       WHERE category_id = ? AND id != ? AND is_active = true
       ORDER BY created_at DESC
       LIMIT 5`,
      [product.category_id, product.id]
    )

    related = relRows.map((item) => ({
      id: item.id,
      name: item.name,
      slug: item.slug,
      price: item.price?.toString?.() ?? "",
      sale_price: item.sale_price?.toString?.() ?? null,
      stock: Number(item.stock ?? 0),
      thumbnail_url: item.thumbnail_url ?? null,
      avg_rating: Number(item.avg_rating ?? 0),
    }))
  }

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description ?? "",
    short_description: product.short_description?.toString?.().trim() ?? null,
    price: product.price?.toString?.() ?? "",
    sale_price: product.sale_price?.toString?.() ?? null,
    stock: Number(product.stock ?? 0),
    thumbnail_url: product.thumbnail_url ?? null,
    avg_rating: Number(product.avg_rating ?? 0),
    is_featured: Boolean(product.is_featured),
    specs: parseRecord(product.specs) as Record<string, string>,
    category: product.category_join_id
      ? {
          id: product.category_join_id,
          name: product.category_join_name ?? "",
          slug: product.category_join_slug ?? "",
        }
      : null,
    brand: product.brand_join_id
      ? {
          id: product.brand_join_id,
          name: product.brand_join_name ?? "",
          slug: product.brand_join_slug ?? "",
        }
      : null,
    images: images.map((image) => ({
      id: image.id,
      url: image.url,
      sort_order: Number(image.sort_order ?? 0),
    })),
    variants: variants.map((variant) => ({
      id: variant.id,
      name: variant.name,
      price_override: variant.price_override?.toString?.() ?? null,
      stock: Number(variant.stock ?? 0),
      is_active: Boolean(variant.is_active),
      attributes: parseRecord(variant.attributes) as Record<string, string>,
    })),
    related,
  }
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
