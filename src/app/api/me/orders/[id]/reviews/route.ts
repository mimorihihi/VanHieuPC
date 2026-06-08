import { getAuthUser } from "@/lib/auth"
import { execute, query } from "@/lib/db"
import { NextRequest } from "next/server"
import type { RowDataPacket } from "mysql2/promise"

type OrderProductRow = RowDataPacket & {
  product_id: string
}

type ExistingReviewRow = RowDataPacket & {
  id: string
}

type RatingRow = RowDataPacket & {
  avg_rating: number | string | null
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Failed"
}

function canReviewOrder(status: string) {
  return ["COMPLETED", "DELIVERED"].includes(status.toUpperCase())
}

async function refreshProductRating(productId: string) {
  const [rows] = await query<RatingRow[]>(
    "SELECT AVG(rating) AS avg_rating FROM reviews WHERE product_id = ?",
    [productId]
  )
  const avgRating = Number(rows[0]?.avg_rating ?? 0)
  await execute("UPDATE products SET avg_rating = ? WHERE id = ?", [avgRating, productId])
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser()
    if (!authUser) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: orderId } = await params
    const body = await req.json()
    const productId = String(body.product_id ?? "").trim()
    const rating = Number(body.rating)
    const comment = String(body.comment ?? "").trim()

    if (!productId) {
      return Response.json({ error: "product_id is required" }, { status: 400 })
    }

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return Response.json({ error: "Rating must be from 1 to 5." }, { status: 400 })
    }

    const [orderRows] = await query<OrderProductRow[]>(
      `SELECT oi.product_id
       FROM orders o
       JOIN order_items oi ON oi.order_id = o.id
       WHERE o.id = ?
         AND o.user_id = ?
         AND oi.product_id = ?
         AND (o.status IN ('COMPLETED', 'DELIVERED') OR (o.status = 'CONFIRMED' AND o.payment_status = 'PAID'))
       LIMIT 1`,
      [orderId, authUser.id, productId]
    )

    if (orderRows.length === 0) {
      return Response.json({ error: "Bạn chỉ có thể đánh giá sản phẩm trong đơn hàng đã hoàn tất." }, { status: 403 })
    }

    const [existingRows] = await query<ExistingReviewRow[]>(
      "SELECT id FROM reviews WHERE product_id = ? AND user_id = ? LIMIT 1",
      [productId, authUser.id]
    )

    if (existingRows[0]) {
      await execute(
        "UPDATE reviews SET rating = ?, comment = ? WHERE id = ?",
        [rating, comment || null, existingRows[0].id]
      )
    } else {
      await execute(
        "INSERT INTO reviews (id, product_id, user_id, rating, comment, created_at) VALUES (?, ?, ?, ?, ?, NOW(3))",
        [crypto.randomUUID(), productId, authUser.id, rating, comment || null]
      )
    }

    await refreshProductRating(productId)

    return Response.json({ success: true })
  } catch (error: unknown) {
    return Response.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
