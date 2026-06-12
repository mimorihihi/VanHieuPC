import { query } from "@/lib/db"
import { findProductByName } from "./product-recommendation"
import type { ProductDetailRow, ProductVariantRow } from "../shared/types"

export async function getProductDetail(keyword: string) {
  const cleanKeyword = keyword.trim()
  if (!cleanKeyword) return null

  const [exactRows] = await query<ProductDetailRow[]>(
    `SELECT
       p.id,
       p.name,
       p.slug,
       p.short_description,
       p.description,
       p.price,
       p.sale_price,
       p.stock,
       p.thumbnail_url,
       c.name AS category_name,
       b.name AS brand_name
     FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     LEFT JOIN brands b ON b.id = p.brand_id
     WHERE p.is_active = true
       AND (LOWER(p.name) = LOWER(?) OR p.slug = ?)
     LIMIT 1`,
    [cleanKeyword, cleanKeyword]
  )

  const matchedProduct = exactRows[0] ?? await findProductByName(cleanKeyword)
  if (!matchedProduct) return null

  const product = exactRows[0] ?? (await query<ProductDetailRow[]>(
    `SELECT
       p.id,
       p.name,
       p.slug,
       p.short_description,
       p.description,
       p.price,
       p.sale_price,
       p.stock,
       p.thumbnail_url,
       c.name AS category_name,
       b.name AS brand_name
     FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     LEFT JOIN brands b ON b.id = p.brand_id
     WHERE p.id = ?
     LIMIT 1`,
    [matchedProduct.id]
  ))[0][0]

  if (!product) return null

  const [variantRows] = await query<ProductVariantRow[]>(
    `SELECT id, product_id, name, stock, price_override, attributes, is_active
     FROM product_variants
     WHERE product_id = ?
     ORDER BY name ASC`,
    [product.id]
  )

  return {
    ...product,
    price: product.price?.toString?.() ?? "0",
    sale_price: product.sale_price?.toString?.() ?? null,
    stock: Number(product.stock ?? 0),
    variants: variantRows.map((variant) => ({
      id: variant.id,
      name: variant.name,
      stock: Number(variant.stock ?? 0),
      price_override: variant.price_override?.toString?.() ?? null,
      is_active: Boolean(variant.is_active),
    })),
  }
}

export async function checkInventory(keyword: string) {
  const product = await getProductDetail(keyword)
  if (!product) return null

  const activeVariants = Array.isArray(product.variants)
    ? product.variants.filter((variant) => variant.is_active)
    : []

  return {
    id: product.id,
    name: product.name,
    brand_name: product.brand_name,
    category_name: product.category_name,
    stock: product.stock,
    variants: activeVariants,
  }
}
