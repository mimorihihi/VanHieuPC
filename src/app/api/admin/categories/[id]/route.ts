import { execute, query } from "@/lib/db"
import { NextRequest } from "next/server"

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const { name, slug, parent_id, image_url, is_active, sort_order } = body

    await execute(
      `UPDATE categories
       SET name = ?, slug = ?, parent_id = ?, image_url = ?, is_active = ?, sort_order = ?
       WHERE id = ?`,
      [name, slug, parent_id ?? null, image_url ?? null, is_active, sort_order, id]
    )

    const [rows] = await query("SELECT * FROM categories WHERE id = ? LIMIT 1", [id])
    return Response.json(rows[0])
  } catch (error: any) {
    return Response.json({ error: error.message ?? "Failed" }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await execute("DELETE FROM categories WHERE id = ?", [id])
    return Response.json({ success: true })
  } catch (error) {
    return Response.json({ error: "Failed to delete" }, { status: 500 })
  }
}
