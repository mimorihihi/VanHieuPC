import { execute, query } from "@/lib/db"
import { NextRequest } from "next/server"
import type { RowDataPacket } from "mysql2/promise"

type WishlistRow = RowDataPacket & {
  id: string
  user_id: string
  product_id: string
  created_at: string
  product_name: string | null
  product_slug: string | null
  thumbnail_url: string | null
  price: number | string | null
  sale_price: number | string | null
  stock: number | string | null
  category_name: string | null
  brand_name: string | null
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Failed"
}

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get("user_id")?.trim() ?? ""
    if (!userId) {
      return Response.json({ error: "user_id is required" }, { status: 400 })
    }

    const [rows] = await query<WishlistRow[]>(
      `SELECT
        w.id,
        w.user_id,
        w.product_id,
        w.created_at,
        p.name as product_name,
        p.slug as product_slug,
        p.thumbnail_url,
        p.price,
        p.sale_price,
        p.stock,
        c.name as category_name,
        b.name as brand_name
       FROM wishlists w
       LEFT JOIN products p ON p.id = w.product_id
       LEFT JOIN categories c ON c.id = p.category_id
       LEFT JOIN brands b ON b.id = p.brand_id
       WHERE w.user_id = ?
       ORDER BY w.created_at DESC`,
      [userId]
    )

    const items = rows.map((item) => ({
      ...item,
      price: item.price?.toString?.() ?? "0",
      sale_price: item.sale_price?.toString?.() ?? null,
    }))

    return Response.json({ items })
  } catch (error: unknown) {
    return Response.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const userId = body.user_id?.trim() ?? ""
    const productId = body.product_id?.trim() ?? ""
    if (!userId || !productId) {
      return Response.json({ error: "user_id and product_id are required" }, { status: 400 })
    }

    const [existingRows] = await query<RowDataPacket[]>(
      "SELECT id FROM wishlists WHERE user_id = ? AND product_id = ? LIMIT 1",
      [userId, productId]
    )
    if (existingRows.length > 0) {
      return Response.json({ success: true, existed: true })
    }

    await execute(
      "INSERT INTO wishlists (id, user_id, product_id, created_at) VALUES (?, ?, ?, NOW())",
      [crypto.randomUUID(), userId, productId]
    )

    return Response.json({ success: true }, { status: 201 })
  } catch (error: unknown) {
    return Response.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json()
    const userId = body.user_id?.trim() ?? ""
    const productId = body.product_id?.trim() ?? ""
    if (!userId || !productId) {
      return Response.json({ error: "user_id and product_id are required" }, { status: 400 })
    }

    await execute("DELETE FROM wishlists WHERE user_id = ? AND product_id = ?", [userId, productId])
    return Response.json({ success: true })
  } catch (error: unknown) {
    return Response.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
