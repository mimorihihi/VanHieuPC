import { query } from "@/lib/db"
import { NextRequest } from "next/server"
import type { RowDataPacket } from "mysql2/promise"

type OrderRow = RowDataPacket & {
  id: string
  order_number: string
  status: string
  payment_status: string
  payment_method: string
  checkout_option: string | null
  subtotal: number | string
  shipping_fee: number | string
  discount: number | string
  total: number | string
  created_at: string
  item_count: number | string
}


function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Failed"
}

function serializeOrder(order: OrderRow) {
  return {
    id: order.id,
    order_number: order.order_number,
    status: order.status,
    payment_status: order.payment_status,
    payment_method: order.payment_method,
    checkout_option: order.checkout_option,
    subtotal: order.subtotal?.toString() ?? "0",
    shipping_fee: order.shipping_fee?.toString() ?? "0",
    discount: order.discount?.toString() ?? "0",
    total: order.total?.toString() ?? "0",
    created_at: order.created_at,
    item_count: Number(order.item_count ?? 0),
  }
}


export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get("user_id")?.trim() ?? ""
    if (!userId) {
      return Response.json({ error: "user_id is required" }, { status: 400 })
    }

    const [rows] = await query<OrderRow[]>(
      `SELECT
        o.id,
        o.order_number,
        o.status,
        o.payment_status,
        o.payment_method,
        o.checkout_option,
        o.subtotal,
        o.shipping_fee,
        o.discount,
        o.total,
        o.created_at,
        COUNT(oi.id) AS item_count
       FROM orders o
       LEFT JOIN order_items oi ON oi.order_id = o.id
       WHERE o.user_id = ?
       GROUP BY o.id
       ORDER BY o.created_at DESC`,
      [userId]
    )

    return Response.json({ orders: rows.map(serializeOrder) })
  } catch (error: unknown) {
    return Response.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
