import { query } from "@/lib/db"
import { NextRequest } from "next/server"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const page = parseInt(searchParams.get("page") ?? "1")
    const limit = parseInt(searchParams.get("limit") ?? "20")
    const search = searchParams.get("search") ?? ""

    const whereSql = search ? "WHERE (u.name LIKE ? OR u.email LIKE ?)" : ""
    const whereParams = search ? [`%${search}%`, `%${search}%`] : []
    const offset = (page - 1) * limit
    const [usersRows, totalRows] = await Promise.all([
      query(
        `SELECT
          u.id, u.name, u.email, u.role, u.avatar_url, u.phone, u.is_active, u.created_at,
          COUNT(o.id) as order_count
        FROM users u
        LEFT JOIN orders o ON o.user_id = u.id
        ${whereSql}
        GROUP BY u.id
        ORDER BY u.created_at DESC
        LIMIT ? OFFSET ?`,
        [...whereParams, limit, offset]
      ),
      query(`SELECT COUNT(*) as total FROM users u ${whereSql}`, whereParams),
    ])
    const users = usersRows[0].map((u: any) => ({
      ...u,
      _count: { orders: Number(u.order_count ?? 0) },
    }))

    return Response.json({ users, total: totalRows[0][0].total, page, limit })
  } catch (error) {
    return Response.json({ error: "Failed" }, { status: 500 })
  }
}
