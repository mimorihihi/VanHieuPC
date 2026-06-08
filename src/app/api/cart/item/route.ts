import { getAuthUser } from "@/lib/auth"
import { execute, query } from "@/lib/db"
import { NextRequest } from "next/server"
import type { RowDataPacket } from "mysql2/promise"

type UpdateCartItemBody = {
  item_id?: string
  quantity?: number
}

type DeleteCartItemBody = {
  item_id?: string
}

type CartItemStockRow = RowDataPacket & {
  id: string
  cart_id: string
  variant_id: string | null
  stock: number
  variant_stock: number | null
}

type CartItemDeleteRow = RowDataPacket & {
  cart_id: string
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Failed"
}

function toPositiveInt(value: unknown, fallback = 1) {
  const num = Number(value)
  if (!Number.isFinite(num) || num <= 0) return fallback
  return Math.floor(num)
}

async function requireAuthUserId() {
  const authUser = await getAuthUser()
  return authUser?.id ?? ""
}

export async function PATCH(req: NextRequest) {
  try {
    const userId = await requireAuthUserId()
    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body: UpdateCartItemBody = await req.json()
    const itemId = body.item_id?.trim() ?? ""
    const quantity = toPositiveInt(body.quantity, 1)

    if (!itemId) {
      return Response.json({ error: "item_id is required" }, { status: 400 })
    }

    const [itemRows] = await query<CartItemStockRow[]>(
      `SELECT ci.id, ci.cart_id, ci.variant_id, p.stock, pv.stock as variant_stock
       FROM cart_items ci
       INNER JOIN carts c ON c.id = ci.cart_id
       LEFT JOIN products p ON p.id = ci.product_id
       LEFT JOIN product_variants pv ON pv.id = ci.variant_id
       WHERE ci.id = ? AND c.user_id = ?
       LIMIT 1`,
      [itemId, userId]
    )
    const item = itemRows[0]
    if (!item) {
      return Response.json({ error: "Cart item not found" }, { status: 404 })
    }

    const stockLimit = item.variant_id ? toPositiveInt(item.variant_stock, quantity) : toPositiveInt(item.stock, quantity)
    const boundedQty = Math.min(quantity, stockLimit)

    await execute(
      `UPDATE cart_items
       SET quantity = ?
       WHERE id = ?`,
      [boundedQty, itemId]
    )
    await execute(`UPDATE carts SET updated_at = NOW() WHERE id = ?`, [item.cart_id])

    return Response.json({ success: true, item_id: itemId, quantity: boundedQty })
  } catch (error: unknown) {
    return Response.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const userId = await requireAuthUserId()
    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body: DeleteCartItemBody = await req.json()
    const itemId = body.item_id?.trim() ?? ""

    if (!itemId) {
      return Response.json({ error: "item_id is required" }, { status: 400 })
    }

    const [rows] = await query<CartItemDeleteRow[]>(
      `SELECT ci.cart_id
       FROM cart_items ci
       INNER JOIN carts c ON c.id = ci.cart_id
       WHERE ci.id = ? AND c.user_id = ?
       LIMIT 1`,
      [itemId, userId]
    )
    const target = rows[0]
    if (!target) {
      return Response.json({ error: "Cart item not found" }, { status: 404 })
    }

    await execute(`DELETE FROM cart_items WHERE id = ?`, [itemId])
    await execute(`UPDATE carts SET updated_at = NOW() WHERE id = ?`, [target.cart_id])

    return Response.json({ success: true })
  } catch (error: unknown) {
    return Response.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
