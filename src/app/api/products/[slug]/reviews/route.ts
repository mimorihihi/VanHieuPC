import { getAuthUser } from "@/lib/auth"
import { query } from "@/lib/db"
import { NextRequest } from "next/server"
import type { RowDataPacket } from "mysql2/promise"

type ProductRow = RowDataPacket & {
  id: string
}

type ReviewRow = RowDataPacket & {
  id: string
  product_id: string
  user_id: string
  rating: number
  comment: string | null
  status: string | null
  created_at: string
  user_name: string | null
}


function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Failed"
}

async function getProductBySlug(slug: string) {
  const [rows] = await query<ProductRow[]>(
    "SELECT id FROM products WHERE (slug = ? OR id = ?) AND is_active = true LIMIT 1",
    [slug, slug]
  )

  return rows[0] ?? null
}


export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const product = await getProductBySlug(slug)
    if (!product) {
      return Response.json({ error: "Product not found" }, { status: 404 })
    }

    const authUser = await getAuthUser()
    const [rows] = await query<ReviewRow[]>(
      `SELECT r.id, r.product_id, r.user_id, r.rating, r.comment, r.created_at, u.name AS user_name
       FROM reviews r
       LEFT JOIN users u ON u.id = r.user_id
       WHERE r.product_id = ?
       ORDER BY r.created_at DESC`,
      [product.id]
    )

    const reviews = rows.map((review) => ({
      id: review.id,
      product_id: review.product_id,
      user_id: review.user_id,
      user_name: review.user_name ?? "Khách hàng",
      rating: Number(review.rating ?? 0),
      comment: review.comment ?? "",
      status: review.status ?? "APPROVED",
      created_at: review.created_at,
      isMine: authUser?.id === review.user_id,
    }))

    const reviewCount = reviews.length
    const avgRating = reviewCount
      ? reviews.reduce((total, review) => total + review.rating, 0) / reviewCount
      : 0

    return Response.json({
      reviews,
      reviewCount,
      avgRating,
      userReview: reviews.find((review) => review.isMine) ?? null,
      canReview: Boolean(authUser),
    })
  } catch (error: unknown) {
    return Response.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}

export async function POST() {
  return Response.json(
    { error: "Vui lòng đánh giá sản phẩm từ chi tiết đơn hàng đã hoàn tất." },
    { status: 405 }
  )
}
