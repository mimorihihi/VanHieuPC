import { execute, query } from "@/lib/db"
import { NextRequest } from "next/server"

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const { name, slug, logo_url, is_active } = body

    await execute(
      "UPDATE brands SET name = ?, slug = ?, logo_url = ?, is_active = ? WHERE id = ?",
      [name, slug, logo_url ?? null, is_active, id]
    )
    const [rows] = await query("SELECT * FROM brands WHERE id = ? LIMIT 1", [id])
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
    await execute("DELETE FROM brands WHERE id = ?", [id])
    return Response.json({ success: true })
  } catch (error) {
    return Response.json({ error: "Failed to delete" }, { status: 500 })
  }
}
