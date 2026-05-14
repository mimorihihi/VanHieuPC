import { execute, query } from "@/lib/db"
import { NextRequest } from "next/server"
import type { RowDataPacket } from "mysql2/promise"

type AddCartBody = {
  user_id?: string
  product_id?: string
  variant_id?: string | null
  quantity?: number
}

type CartRow = RowDataPacket & {
  id: string
  user_id: string
  product_id: string
  variant_id: string | null
  quantity: number
  variant_name: string | null
  product_name: string
  product_slug: string
  thumbnail_url: string | null
  price: number | string
  sale_price: number | string | null
  stock: number
  is_active: number | boolean
  in_stock: number | boolean
}

type ProductRow = RowDataPacket & {
  id: string
  stock: number
  is_active: number | boolean
  price: number | string
  sale_price: number | string | null
}

type VariantRow = RowDataPacket & {
  id: string
  name: string
  price_override: number | string | null
  stock: number
  is_active: number | boolean
}

type ExistingCartItemRow = RowDataPacket & {
  id: string
  quantity: number
}

type CartIdRow = RowDataPacket & {
  id: string
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Failed"
}

function toPositiveInt(value: unknown, fallback = 1) {
  const num = Number(value)
  if (!Number.isFinite(num) || num <= 0) return fallback
  return Math.floor(num)
}

async function getOrCreateCartId(userId: string) {
  const [cartRows] = await query<CartIdRow[]>(
    `SELECT id
     FROM carts
     WHERE user_id = ?
     ORDER BY updated_at DESC
     LIMIT 1`,
    [userId]
  )

  const existingCart = cartRows[0]
  if (existingCart?.id) return existingCart.id

  const id = crypto.randomUUID()
  // Some schemas require updated_at without a default value.
  await execute(
    `INSERT INTO carts (id, user_id, updated_at)
     VALUES (?, ?, NOW())`,
    [id, userId]
  )
  return id
}

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get("user_id")?.trim() ?? ""
    if (!userId) {
      return Response.json({ error: "user_id is required" }, { status: 400 })
    }

    const [rows] = await query<CartRow[]>(
      `SELECT
        ci.id,
        c.user_id,
        ci.product_id,
        ci.variant_id,
        ci.quantity,
        pv.name as variant_name,
        p.name as product_name,
        p.slug as product_slug,
        p.thumbnail_url,
        ci.unit_price as price,
        NULL as sale_price,
        p.stock,
        p.is_active,
        CASE
          WHEN p.is_active = 1
            AND COALESCE(CASE WHEN ci.variant_id IS NOT NULL THEN pv.stock ELSE p.stock END, 0) >= ci.quantity
          THEN 1
          ELSE 0
        END as in_stock
      FROM cart_items ci
      INNER JOIN carts c ON c.id = ci.cart_id
      LEFT JOIN products p ON p.id = ci.product_id
      LEFT JOIN product_variants pv ON pv.id = ci.variant_id
      WHERE c.user_id = ?
      ORDER BY c.updated_at DESC, ci.id DESC`,
      [userId]
    )

    const items = rows.map((item) => ({
      ...item,
      price: item.price?.toString?.() ?? "0",
      sale_price: item.sale_price?.toString?.() ?? null,
      in_stock: Number(item.in_stock) === 1,
    }))

    return Response.json({ items })
  } catch (error: unknown) {
    return Response.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: AddCartBody = await req.json()
    const userId = body.user_id?.trim() ?? ""
    const productId = body.product_id?.trim() ?? ""
    const variantId = body.variant_id ?? null
    const quantity = toPositiveInt(body.quantity, 1)

    if (!userId || !productId) {
      return Response.json(
        { error: "user_id and product_id are required" },
        { status: 400 }
      )
    }

    const [productRows] = await query<ProductRow[]>(
      `SELECT id, stock, is_active, price, sale_price
       FROM products
       WHERE id = ?
       LIMIT 1`,
      [productId]
    )
    const product = productRows[0]
    if (!product || !product.is_active) {
      return Response.json({ error: "Product is unavailable" }, { status: 404 })
    }

    let variant: VariantRow | null = null
    if (variantId) {
      const [variantRows] = await query<VariantRow[]>(
        `SELECT id, name, price_override, stock, is_active
         FROM product_variants
         WHERE id = ? AND product_id = ?
         LIMIT 1`,
        [variantId, productId]
      )
      variant = variantRows[0] ?? null
      if (!variant || !variant.is_active) {
        return Response.json({ error: "Variant is unavailable" }, { status: 404 })
      }
    }

    const cartId = await getOrCreateCartId(userId)

    const [existingRows] = await query<ExistingCartItemRow[]>(
      `SELECT id, quantity
       FROM cart_items
       WHERE cart_id = ? AND product_id = ? AND (variant_id <=> ?)
       LIMIT 1`,
      [cartId, productId, variantId]
    )
    const existing = existingRows[0]

    if (existing) {
      const nextQty = toPositiveInt(existing.quantity, 1) + quantity
      const stockLimit = variant ? toPositiveInt(variant.stock, nextQty) : toPositiveInt(product.stock, nextQty)
      const boundedQty = Math.min(nextQty, stockLimit)

      await execute(
        `UPDATE cart_items
         SET quantity = ?
         WHERE id = ?`,
        [boundedQty, existing.id]
      )

      await execute(`UPDATE carts SET updated_at = NOW() WHERE id = ?`, [cartId])
      return Response.json({ success: true, id: existing.id, quantity: boundedQty })
    }

    const stockLimit = variant ? toPositiveInt(variant.stock, quantity) : toPositiveInt(product.stock, quantity)
    const boundedQty = Math.min(quantity, stockLimit)
    const unitPrice = Number(variant?.price_override ?? product.sale_price ?? product.price ?? 0)
    const id = crypto.randomUUID()

    await execute(
      `INSERT INTO cart_items (id, cart_id, product_id, variant_id, quantity, unit_price)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, cartId, productId, variantId, boundedQty, unitPrice]
    )
    await execute(`UPDATE carts SET updated_at = NOW() WHERE id = ?`, [cartId])

    return Response.json({ success: true, id, quantity: boundedQty }, { status: 201 })
  } catch (error: unknown) {
    return Response.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
