import { execute, query } from "@/lib/db"
import { NextRequest } from "next/server"

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { role, is_active } = await req.json()

    await execute(
      `UPDATE users
       SET role = COALESCE(?, role),
           is_active = COALESCE(?, is_active)
       WHERE id = ?`,
      [role ?? null, is_active ?? null, id]
    )
    const [rows] = await query(
      "SELECT id, name, email, role, is_active FROM users WHERE id = ? LIMIT 1",
      [id]
    )
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
    await execute("DELETE FROM users WHERE id = ?", [id])
    return Response.json({ success: true })
  } catch (error) {
    return Response.json({ error: "Failed to delete" }, { status: 500 })
  }
}
