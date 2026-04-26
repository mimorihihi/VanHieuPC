import { query } from "@/lib/db"
import { NextRequest } from "next/server"

export async function GET(_req: NextRequest) {
  try {
    const [productsRows, ordersRows, usersRows, pendingRows, revenueRows] = await Promise.all([
      query("SELECT COUNT(*) as total FROM products WHERE is_active = true"),
      query("SELECT COUNT(*) as total FROM orders"),
      query("SELECT COUNT(*) as total FROM users"),
      query("SELECT COUNT(*) as total FROM orders WHERE status = 'PENDING'"),
      query("SELECT COALESCE(SUM(total), 0) as revenue FROM orders WHERE payment_status = 'PAID'"),
    ])
    const revenue = revenueRows[0][0].revenue?.toString() ?? "0"

    return Response.json({
      totalProducts: productsRows[0][0].total,
      totalOrders: ordersRows[0][0].total,
      totalUsers: usersRows[0][0].total,
      pendingOrders: pendingRows[0][0].total,
      revenue,
    })
  } catch (error) {
    console.error(error)
    return Response.json({ error: "Failed to fetch stats" }, { status: 500 })
  }
}
