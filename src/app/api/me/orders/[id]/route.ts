import { getAuthUser } from "@/lib/auth"
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
  shipping_address: string | Record<string, unknown> | null
  note: string | null
  created_at: string
  user_id: string | null
  user_name: string | null
  user_email: string | null
  items?: OrderItemRow[]
}

type OrderItemRow = RowDataPacket & {
  id: string
  order_id: string
  product_id: string
  variant_id: string | null
  product_name: string
  variant_name: string | null
  unit_price: number | string
  quantity: number
  subtotal: number | string
  product_name_join: string | null
  product_thumbnail_join: string | null
  review_id: string | null
  review_rating: number | null
  review_comment: string | null
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Failed"
}

function serializeOrder(order: OrderRow) {
  const shippingAddress =
    typeof order.shipping_address === "string"
      ? (() => {
          try {
            return JSON.parse(order.shipping_address)
          } catch {
            return null
          }
        })()
      : order.shipping_address

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
    shipping_address: shippingAddress,
    note: order.note ?? "",
    created_at: order.created_at,
    user: order.user_id
      ? { id: order.user_id, name: order.user_name, email: order.user_email }
      : null,
    items: (order.items ?? []).map((item) => ({
      id: item.id,
      product_id: item.product_id,
      product_name: item.product_name,
      variant_name: item.variant_name,
      unit_price: item.unit_price?.toString() ?? "0",
      quantity: Number(item.quantity ?? 0),
      subtotal: item.subtotal?.toString() ?? "0",
      product: {
        name: item.product_name_join ?? item.product_name,
        thumbnail_url: item.product_thumbnail_join ?? null,
      },
      review: item.review_id
        ? {
            id: item.review_id,
            rating: Number(item.review_rating ?? 0),
            comment: item.review_comment ?? "",
            status: "APPROVED",
          }
        : null,
    })),
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser()
    if (!authUser) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const [orderRows] = await query<OrderRow[]>(
      `SELECT o.*, u.id as user_id, u.name as user_name, u.email as user_email
       FROM orders o
       LEFT JOIN users u ON u.id = o.user_id
       WHERE o.id = ? AND o.user_id = ?
       LIMIT 1`,
      [id, authUser.id]
    )
    const order = orderRows[0]
    if (!order) {
      return Response.json({ error: "Order not found" }, { status: 404 })
    }

    const [itemRows] = await query<OrderItemRow[]>(
      `SELECT
        oi.*,
        p.name as product_name_join,
        p.thumbnail_url as product_thumbnail_join,
        r.id as review_id,
        r.rating as review_rating,
        r.comment as review_comment
       FROM order_items oi
       LEFT JOIN products p ON p.id = oi.product_id
       LEFT JOIN reviews r ON r.product_id = oi.product_id AND r.user_id = ?
       WHERE oi.order_id = ?
       ORDER BY oi.id ASC`,
      [authUser.id, id]
    )

    return Response.json({
      order: serializeOrder({
        ...order,
        items: itemRows,
      }),
    })
  } catch (error: unknown) {
    return Response.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
