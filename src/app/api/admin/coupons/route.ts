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

export async function GET(_req: NextRequest) {
  try {
    const [coupons] = await query("SELECT * FROM coupons ORDER BY expires_at ASC")
    return Response.json({ coupons: coupons.map(serializeCoupon) })
  } catch {
    return Response.json({ error: "Failed" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { code, type, value, min_order, max_discount, usage_limit, expires_at, is_active } = body

    const id = crypto.randomUUID()
    await execute(
      `INSERT INTO coupons
      (id, code, type, value, min_order, max_discount, usage_limit, used_count, expires_at, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      [
        id,
        code,
        type,
        value,
        min_order ?? null,
        max_discount ?? null,
        usage_limit ?? null,
        expires_at ? new Date(expires_at) : null,
        is_active ?? true,
      ]
    )
    const [rows] = await query("SELECT * FROM coupons WHERE id = ? LIMIT 1", [id])
    return Response.json(serializeCoupon(rows[0]), { status: 201 })
  } catch (error: any) {
    return Response.json({ error: error.message ?? "Failed" }, { status: 500 })
  }
}
