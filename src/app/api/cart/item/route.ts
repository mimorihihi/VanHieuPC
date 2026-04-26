import { execute, query } from "@/lib/db"
import { NextRequest } from "next/server"

type UpdateCartItemBody = {
  user_id?: string
  item_id?: string
  quantity?: number
}

type DeleteCartItemBody = {
  user_id?: string
  item_id?: string
}

function toPositiveInt(value: unknown, fallback = 1) {
  const num = Number(value)
  if (!Number.isFinite(num) || num <= 0) return fallback
  return Math.floor(num)
}

export async function PATCH(req: NextRequest) {
  try {
    const body: UpdateCartItemBody = await req.json()
    const userId = body.user_id?.trim() ?? ""
    const itemId = body.item_id?.trim() ?? ""
    const quantity = toPositiveInt(body.quantity, 1)

    if (!userId || !itemId) {
      return Response.json({ error: "user_id and item_id are required" }, { status: 400 })
    }

    const [itemRows] = await query(
      `SELECT ci.id, ci.cart_id, p.stock
       FROM cart_items ci
       INNER JOIN carts c ON c.id = ci.cart_id
       LEFT JOIN products p ON p.id = ci.product_id
       WHERE ci.id = ? AND c.user_id = ?
       LIMIT 1`,
      [itemId, userId]
    )
    const item = itemRows[0] as any
    if (!item) {
      return Response.json({ error: "Cart item not found" }, { status: 404 })
    }

    const boundedQty = Math.min(quantity, toPositiveInt(item.stock, quantity))

    await execute(
      `UPDATE cart_items
       SET quantity = ?
       WHERE id = ?`,
      [boundedQty, itemId]
    )
    await execute(`UPDATE carts SET updated_at = NOW() WHERE id = ?`, [item.cart_id])

    return Response.json({ success: true, item_id: itemId, quantity: boundedQty })
  } catch (error: any) {
    return Response.json({ error: error.message ?? "Failed" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body: DeleteCartItemBody = await req.json()
    const userId = body.user_id?.trim() ?? ""
    const itemId = body.item_id?.trim() ?? ""

    if (!userId || !itemId) {
      return Response.json({ error: "user_id and item_id are required" }, { status: 400 })
    }

    const [rows] = await query(
      `SELECT ci.cart_id
       FROM cart_items ci
       INNER JOIN carts c ON c.id = ci.cart_id
       WHERE ci.id = ? AND c.user_id = ?
       LIMIT 1`,
      [itemId, userId]
    )
    const target = rows[0] as any
    if (!target) {
      return Response.json({ error: "Cart item not found" }, { status: 404 })
    }

    await execute(`DELETE FROM cart_items WHERE id = ?`, [itemId])
    await execute(`UPDATE carts SET updated_at = NOW() WHERE id = ?`, [target.cart_id])

    return Response.json({ success: true })
  } catch (error: any) {
    return Response.json({ error: error.message ?? "Failed" }, { status: 500 })
  }
}
