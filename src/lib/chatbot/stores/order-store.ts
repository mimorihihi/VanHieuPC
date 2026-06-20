import { query } from "@/lib/db"
import type { OrderLookupRow } from "../shared/types"

export async function checkOrderStatus(orderNumber: string) {
  const normalizedOrderNumber = orderNumber.trim().replace(/^#/, "").toUpperCase()
  if (!normalizedOrderNumber) return null

  const [rows] = await query<OrderLookupRow[]>(
    `SELECT id, order_number, status, payment_status, total, created_at
     FROM orders
     WHERE UPPER(order_number) = ?
     LIMIT 1`,
    [normalizedOrderNumber]
  )

  const order = rows[0]
  if (!order) return null

  return {
    id: order.id,
    order_number: order.order_number,
    status: order.status,
    payment_status: order.payment_status,
    total: order.total?.toString?.() ?? "0",
    created_at: order.created_at instanceof Date ? order.created_at.toISOString() : String(order.created_at),
  }
}
