import { execute, query } from "@/lib/db"
import { NextRequest } from "next/server"

function serializeCoupon(c: any) {
  return {
    ...c,
    value: c.value?.toString() ?? "0",
    min_order: c.min_order?.toString() ?? null,
    max_discount: c.max_discount?.toString() ?? null,
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const { code, type, value, min_order, max_discount, usage_limit, expires_at, is_active } = body

    await execute(
      `UPDATE coupons
       SET code = ?, type = ?, value = ?, min_order = ?, max_discount = ?,
           usage_limit = ?, expires_at = ?, is_active = ?
       WHERE id = ?`,
      [
        code,
        type,
        value,
        min_order ?? null,
        max_discount ?? null,
        usage_limit ?? null,
        expires_at ? new Date(expires_at) : null,
        is_active,
        id,
      ]
    )
    const [rows] = await query("SELECT * FROM coupons WHERE id = ? LIMIT 1", [id])
    return Response.json(serializeCoupon(rows[0]))
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
    await execute("DELETE FROM coupons WHERE id = ?", [id])
    return Response.json({ success: true })
  } catch {
    return Response.json({ error: "Failed to delete" }, { status: 500 })
  }
}
