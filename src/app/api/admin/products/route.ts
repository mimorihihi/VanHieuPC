import crypto from "node:crypto"
import { execute, query } from "@/lib/db"
import { NextRequest } from "next/server"

function serializeProduct(p: any) {
  return {
    ...p,
    price: p.price?.toString() ?? "0",
    sale_price: p.sale_price?.toString() ?? null,
    avg_rating: p.avg_rating?.toString() ?? "0",
  }
}

type VariantInput = {
  name?: unknown
  price_override?: unknown
  stock?: unknown
  is_active?: unknown
  attributes?: unknown
  images?: unknown
}

type ProductImageInput = {
  url?: unknown
  sort_order?: unknown
}

function normalizeAttributes(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {}

  return Object.entries(value).reduce<Record<string, string>>((acc, [key, attrValue]) => {
    const nextKey = key.trim()
    const nextValue = attrValue == null ? "" : String(attrValue).trim()
    if (nextKey && nextValue) acc[nextKey] = nextValue
    return acc
  }, {})
}

function normalizeImages(value: unknown) {
  if (!Array.isArray(value)) return []

  return value
    .filter((image): image is ProductImageInput => !!image && typeof image === "object")
    .map((image, index) => ({
      url: image.url == null ? "" : String(image.url).trim(),
      sort_order: Number(image.sort_order ?? index + 1),
    }))
    .filter((image) => image.url.length > 0)
}

function normalizeVariants(value: unknown) {
  if (!Array.isArray(value)) return []

  return value
    .filter((variant): variant is VariantInput => !!variant && typeof variant === "object")
    .map((variant) => ({
      name: typeof variant.name === "string" ? variant.name.trim() : "",
      price_override:
        variant.price_override === null || variant.price_override === "" || variant.price_override === undefined
          ? null
          : Number(variant.price_override),
      stock: Number(variant.stock ?? 0),
      is_active: variant.is_active ?? true,
      attributes: normalizeAttributes(variant.attributes),
      images: normalizeImages(variant.images),
    }))
    .filter((variant) => variant.name.length > 0)
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const page = parseInt(searchParams.get("page") ?? "1")
    const limit = parseInt(searchParams.get("limit") ?? "20")
    const search = searchParams.get("search") ?? ""

    const searchTerm = search.trim()
    const whereSql = searchTerm ? "WHERE p.name LIKE ? OR p.slug LIKE ? OR p.id LIKE ?" : ""
    const whereParams = searchTerm ? [`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`] : []
    const [productsRows, totalRows] = await Promise.all([
      query(
        `SELECT
          p.*,
          c.id as category_join_id, c.name as category_join_name,
          b.id as brand_join_id, b.name as brand_join_name
        FROM products p
        LEFT JOIN categories c ON c.id = p.category_id
        LEFT JOIN brands b ON b.id = p.brand_id
        ${whereSql}
        ORDER BY p.created_at DESC
        LIMIT ? OFFSET ?`,
        [...whereParams, limit, (page - 1) * limit]
      ),
      query(`SELECT COUNT(*) as total FROM products p ${whereSql}`, whereParams),
    ])
    const products = productsRows[0].map((p: any) => ({
      ...p,
      category: p.category_join_id ? { id: p.category_join_id, name: p.category_join_name } : null,
      brand: p.brand_join_id ? { id: p.brand_join_id, name: p.brand_join_name } : null,
      specs: typeof p.specs === "string" ? JSON.parse(p.specs) : p.specs,
    }))

    return Response.json({
      products: products.map(serializeProduct),
      total: totalRows[0][0].total,
      page,
      limit,
    })
  } catch (error) {
    console.error(error)
    return Response.json({ error: "Failed to fetch products" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      name,
      slug,
      description,
      short_description,
      price,
      sale_price,
      stock,
      thumbnail_url,
      category_id,
      brand_id,
      is_active,
      is_featured,
      specs,
      variants,
    } = body

    const id = crypto.randomUUID()
    await execute(
      `INSERT INTO products
      (id, name, slug, description, short_description, price, sale_price, stock, thumbnail_url, category_id, brand_id, specs, avg_rating, is_active, is_featured, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, NOW())`,
      [
        id,
        name,
        slug,
        description ?? "",
        short_description?.trim?.() || "",
        price,
        sale_price ?? null,
        stock ?? 0,
        thumbnail_url ?? null,
        category_id,
        brand_id ?? null,
        JSON.stringify(specs ?? {}),
        is_active ?? true,
        is_featured ?? false,
      ]
    )
    const normalizedVariants = normalizeVariants(variants)

    for (const variant of normalizedVariants) {
      const variantId = crypto.randomUUID()
      await execute(
        `INSERT INTO product_variants
        (id, product_id, name, price_override, stock, attributes, is_active, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          variantId,
          id,
          variant.name,
          variant.price_override,
          Number.isFinite(variant.stock) ? variant.stock : 0,
          JSON.stringify(variant.attributes),
          variant.is_active ? 1 : 0,
        ]
      )

      for (const image of variant.images) {
        await execute(
          "INSERT INTO product_images (id, product_id, variant_id, url, sort_order) VALUES (?, ?, ?, ?, ?)",
          [crypto.randomUUID(), id, variantId, image.url, image.sort_order]
        )
      }
    }

    const [rows] = await query("SELECT * FROM products WHERE id = ? LIMIT 1", [id])
    return Response.json(serializeProduct(rows[0]), { status: 201 })
  } catch (error: any) {
    console.error(error)
    return Response.json({ error: error.message ?? "Failed to create product" }, { status: 500 })
  }
}
