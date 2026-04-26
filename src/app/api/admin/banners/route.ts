import { execute, query } from "@/lib/db"
import { NextRequest } from "next/server"

export async function GET(_req: NextRequest) {
  try {
    const [banners] = await query(
      "SELECT id, title, image_url, link_url, sort_order, is_active FROM banners ORDER BY sort_order ASC"
    )
    return Response.json({ banners })
  } catch {
    return Response.json({ error: "Failed" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { title, image_url, link_url, sort_order, is_active } = body

    const id = crypto.randomUUID()
    await execute(
      `INSERT INTO banners (id, title, image_url, link_url, sort_order, is_active)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, title, image_url, link_url ?? null, sort_order ?? 0, is_active ?? true]
    )

    const [rows] = await query("SELECT * FROM banners WHERE id = ? LIMIT 1", [id])
    return Response.json(rows[0], { status: 201 })
  } catch (error: any) {
    return Response.json({ error: error.message ?? "Failed" }, { status: 500 })
  }
}
