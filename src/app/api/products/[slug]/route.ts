import { query } from "@/lib/db"
import { NextRequest } from "next/server"
import type { RowDataPacket } from "mysql2/promise"

type ProductRow = RowDataPacket & {
  id: string
  category_id: string | null
  price: number | string
  sale_price: number | string | null
  avg_rating: number | string | null
  short_description: string | null
  specs: string | Record<string, unknown> | null
  category_join_id: string | null
  category_join_name: string | null
  category_join_slug: string | null
  brand_join_id: string | null
  brand_join_name: string | null
  brand_join_slug: string | null
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
  price: number | string
  sale_price: number | string | null
  stock: number
  thumbnail_url: string | null
  avg_rating: number | string | null
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params

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

    const product = rows[0] as (ProductRow & Record<string, unknown>) | undefined
    if (!product) {
      return Response.json({ error: "Product not found" }, { status: 404 })
    }

    product.price = product.price?.toString?.() ?? "0"
    product.sale_price = product.sale_price?.toString?.() ?? null
    product.avg_rating = Number(product.avg_rating ?? 0)
    product.short_description = product.short_description?.toString?.().trim() ?? null
    product.specs =
      typeof product.specs === "string"
        ? JSON.parse(product.specs)
        : (product.specs ?? {})

    product.category = product.category_join_id
      ? {
          id: product.category_join_id,
          name: product.category_join_name,
          slug: product.category_join_slug,
        }
      : null

    product.brand = product.brand_join_id
      ? {
          id: product.brand_join_id,
          name: product.brand_join_name,
          slug: product.brand_join_slug,
        }
      : null

    const [images] = await query(
      "SELECT id, url, sort_order FROM product_images WHERE product_id = ? ORDER BY sort_order ASC",
      [product.id]
    )
    product.images = images

    const [variants] = await query<VariantRow[]>(
      `SELECT id, name, price_override, stock, attributes, is_active
       FROM product_variants
       WHERE product_id = ?
       ORDER BY name ASC`,
      [product.id]
    )
    product.variants = variants.map((variant) => ({
      ...variant,
      price_override: variant.price_override?.toString?.() ?? null,
      stock: Number(variant.stock ?? 0),
      is_active: Boolean(variant.is_active),
      attributes:
        typeof variant.attributes === "string"
          ? JSON.parse(variant.attributes)
          : variant.attributes,
    }))

    let related: RelatedRow[] = []
    if (product.category_id) {
      const [relatedRows] = await query<RelatedRow[]>(
        `SELECT id, name, slug, price, sale_price, stock, thumbnail_url, avg_rating
         FROM products
         WHERE category_id = ? AND id != ? AND is_active = true
         ORDER BY created_at DESC
         LIMIT 5`,
        [product.category_id, product.id]
      )

      related = relatedRows.map((item) => ({
        ...item,
        price: item.price?.toString?.() ?? "0",
        sale_price: item.sale_price?.toString?.() ?? null,
        avg_rating: Number(item.avg_rating ?? 0),
      }))
    }

    product.related = related

    return Response.json(product)
  } catch (error) {
    console.error("[/api/products/[slug]] Error:", error)
    return Response.json({ error: "Failed to fetch product" }, { status: 500 })
  }
}
