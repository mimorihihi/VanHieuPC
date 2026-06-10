import { getAuthUser } from "@/lib/auth"
import { query } from "@/lib/db"
import { NextRequest } from "next/server"
import type { RowDataPacket } from "mysql2/promise"

type ReviewAdminRow = RowDataPacket & {
  id: string
  product_id: string
  product_name: string | null
  product_slug: string | null
  user_id: string
  user_name: string | null
  user_email: string | null
  rating: number | string
  comment: string | null
  status: string | null
  created_at: string
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Failed"
}

async function requireAdmin() {
  const authUser = await getAuthUser()
  return authUser?.role === "ADMIN" ? authUser : null
}

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin()
    if (!admin) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = req.nextUrl
    const rawStatus = searchParams.get("status")?.trim().toUpperCase() ?? ""
    const search = searchParams.get("q")?.trim() ?? ""
    const limit = Math.min(Math.max(Number(searchParams.get("limit") ?? 50), 1), 50)

    const where: string[] = []
    const params: Array<string | number> = []

    if (["APPROVED", "HIDDEN"].includes(rawStatus)) {
      where.push("COALESCE(r.status, 'APPROVED') = ?")
      params.push(rawStatus)
    }

    if (search) {
      where.push("(p.name LIKE ? OR u.name LIKE ? OR u.email LIKE ? OR r.comment LIKE ?)")
      const keyword = `%${search}%`
      params.push(keyword, keyword, keyword, keyword)
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : ""

    const [rows] = await query<ReviewAdminRow[]>(
      `SELECT
        r.id,
        r.product_id,
        p.name AS product_name,
        p.slug AS product_slug,
        r.user_id,
        u.name AS user_name,
        u.email AS user_email,
        r.rating,
        r.comment,
        COALESCE(r.status, 'APPROVED') AS status,
        r.created_at
       FROM reviews r
       LEFT JOIN products p ON p.id = r.product_id
       LEFT JOIN users u ON u.id = r.user_id
       ${whereSql}
       ORDER BY r.created_at DESC
       LIMIT ?`,
      [...params, limit]
    )

    const reviews = rows.map((review) => ({
      ...review,
      product_name: review.product_name ?? "Sản phẩm đã xoá",
      product_slug: review.product_slug ?? review.product_id,
      user_name: review.user_name ?? "Khách hàng",
      user_email: review.user_email ?? "—",
      rating: Number(review.rating ?? 0),
      comment: review.comment ?? "",
      status: review.status ?? "APPROVED",
    }))

    return Response.json({ reviews, total: reviews.length, limit })
  } catch (error: unknown) {
    return Response.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
