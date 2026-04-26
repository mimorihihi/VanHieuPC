import { execute, query } from "@/lib/db"
import { NextRequest } from "next/server"

function serializeOrder(o: any) {
  return {
    ...o,
    subtotal: o.subtotal?.toString() ?? "0",
    shipping_fee: o.shipping_fee?.toString() ?? "0",
    discount: o.discount?.toString() ?? "0",
    total: o.total?.toString() ?? "0",
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const [rows] = await query(
      `SELECT
        o.*,
        u.id as user_join_id, u.name as user_join_name, u.email as user_join_email,
        c.id as coupon_join_id, c.code as coupon_join_code, c.type as coupon_join_type, c.value as coupon_join_value
       FROM orders o
       LEFT JOIN users u ON u.id = o.user_id
       LEFT JOIN coupons c ON c.id = o.coupon_id
       WHERE o.id = ?
       LIMIT 1`,
      [id]
    )
    const order = rows[0] as any
    if (!order) return Response.json({ error: "Not found" }, { status: 404 })
    const [itemsRows] = await query(
      `SELECT
        oi.*,
        p.name as product_join_name, p.thumbnail_url as product_join_thumbnail_url,
        pv.name as variant_join_name
       FROM order_items oi
       LEFT JOIN products p ON p.id = oi.product_id
       LEFT JOIN product_variants pv ON pv.id = oi.variant_id
       WHERE oi.order_id = ?`,
      [id]
    )
    order.user = order.user_join_id
      ? { id: order.user_join_id, name: order.user_join_name, email: order.user_join_email }
      : null
    order.coupon = order.coupon_join_id
      ? {
          id: order.coupon_join_id,
          code: order.coupon_join_code,
          type: order.coupon_join_type,
          value: order.coupon_join_value,
        }
      : null
    order.items = (itemsRows as any[]).map((item) => ({
      ...item,
      product: { name: item.product_join_name, thumbnail_url: item.product_join_thumbnail_url },
      variant: item.variant_join_name ? { name: item.variant_join_name } : null,
    }))
    return Response.json(serializeOrder(order))
  } catch {
    return Response.json({ error: "Failed" }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { status, payment_status } = await req.json()

    await execute(
      `UPDATE orders
       SET status = COALESCE(?, status),
           payment_status = COALESCE(?, payment_status)
       WHERE id = ?`,
      [status ?? null, payment_status ?? null, id]
    )
    const [rows] = await query("SELECT * FROM orders WHERE id = ? LIMIT 1", [id])
    return Response.json(serializeOrder(rows[0]))
  } catch (error: any) {
    return Response.json({ error: error.message ?? "Failed" }, { status: 500 })
  }
}
