import { query } from "@/lib/db"
import { NextRequest } from "next/server"

function serializeOrder(o: any) {
  return {
    ...o,
    payment_method: o.payment_method ?? "PAY_AT_STORE",
    checkout_option: o.checkout_option ?? null,
    subtotal: o.subtotal?.toString() ?? "0",
    shipping_fee: o.shipping_fee?.toString() ?? "0",
    discount: o.discount?.toString() ?? "0",
    total: o.total?.toString() ?? "0",
  }
}


export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const page = parseInt(searchParams.get("page") ?? "1")
    const limit = parseInt(searchParams.get("limit") ?? "20")
    const status = searchParams.get("status") ?? ""

    const whereSql = status ? "WHERE o.status = ?" : ""
    const whereParams = status ? [status] : []
    const [ordersRows, totalRows] = await Promise.all([
      query(
        `SELECT
          o.*,
          u.id as user_join_id, u.name as user_join_name, u.email as user_join_email
         FROM orders o
         LEFT JOIN users u ON u.id = o.user_id
         ${whereSql}
         ORDER BY o.created_at DESC
         LIMIT ? OFFSET ?`,
        [...whereParams, limit, (page - 1) * limit]
      ),
      query(`SELECT COUNT(*) as total FROM orders o ${whereSql}`, whereParams),
    ])
    const orderIds = ordersRows[0].map((o: any) => o.id)
    const itemsByOrder = new Map<string, any[]>()
    if (orderIds.length > 0) {
      const placeholders = orderIds.map(() => "?").join(", ")
      const [itemsRows] = await query(
        `SELECT oi.*, p.name as product_name_join, p.thumbnail_url as product_thumbnail_join
         FROM order_items oi
         LEFT JOIN products p ON p.id = oi.product_id
         WHERE oi.order_id IN (${placeholders})`,
        orderIds
      )
      for (const item of itemsRows as any[]) {
        const list = itemsByOrder.get(item.order_id) ?? []
        list.push({
          ...item,
          product: {
            name: item.product_name_join,
            thumbnail_url: item.product_thumbnail_join,
          },
        })
        itemsByOrder.set(item.order_id, list)
      }
    }
    const orders = ordersRows[0].map((o: any) => ({
      ...o,
      user: o.user_join_id
        ? { id: o.user_join_id, name: o.user_join_name, email: o.user_join_email }
        : null,
      items: itemsByOrder.get(o.id) ?? [],
    }))

    return Response.json({
      orders: orders.map(serializeOrder),
      total: totalRows[0][0].total,
      page,
      limit,
    })
  } catch (error) {
    return Response.json({ error: "Failed" }, { status: 500 })
  }
}
