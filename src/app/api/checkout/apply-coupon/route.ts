import { query } from "@/lib/db"
import { NextRequest } from "next/server"

type CouponRow = {
  id: string
  code: string
  type: "PERCENT" | "FIXED"
  value: { toString?: () => string } | number | string
  min_order: { toString?: () => string } | number | string | null
  max_discount: { toString?: () => string } | number | string | null
  usage_limit: number | null
  used_count: number | null
  expires_at: string | Date | null
  is_active: boolean | number
}

function toNumber(value: CouponRow["value"] | CouponRow["min_order"] | CouponRow["max_discount"]) {
  if (value == null) return 0
  if (typeof value === "number") return value
  if (typeof value === "string") return Number(value)
  return Number(value.toString?.() ?? 0)
}

function calculateDiscount(subtotal: number, coupon: CouponRow) {
  if (coupon.type === "FIXED") {
    return Math.min(subtotal, toNumber(coupon.value))
  }

  const rawDiscount = subtotal * (toNumber(coupon.value) / 100)
  const maxDiscount = toNumber(coupon.max_discount)
  if (maxDiscount > 0) {
    return Math.min(rawDiscount, maxDiscount)
  }

  return rawDiscount
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const code = String(body.code ?? "").trim().toUpperCase()
    const subtotal = Number(body.subtotal ?? 0)

    if (!code) {
      return Response.json({ error: "Coupon code is required" }, { status: 400 })
    }

    if (!Number.isFinite(subtotal) || subtotal <= 0) {
      return Response.json({ error: "Cart subtotal must be greater than 0" }, { status: 400 })
    }

    const [rows] = await query<CouponRow[]>(
      `SELECT id, code, type, value, min_order, max_discount, usage_limit, used_count, expires_at, is_active
       FROM coupons
       WHERE UPPER(code) = ?
       LIMIT 1`,
      [code]
    )

    const coupon = rows[0]
    if (!coupon) {
      return Response.json({ error: "Coupon code is invalid" }, { status: 404 })
    }

    if (!coupon.is_active) {
      return Response.json({ error: "Coupon is inactive" }, { status: 400 })
    }

    if (coupon.expires_at && new Date(coupon.expires_at).getTime() < Date.now()) {
      return Response.json({ error: "Coupon has expired" }, { status: 400 })
    }

    if (coupon.usage_limit && Number(coupon.used_count ?? 0) >= Number(coupon.usage_limit)) {
      return Response.json({ error: "Coupon usage limit has been reached" }, { status: 400 })
    }

    const minOrder = toNumber(coupon.min_order)
    if (minOrder > 0 && subtotal < minOrder) {
      return Response.json(
        { error: `Minimum order for this coupon is ${minOrder.toLocaleString("vi-VN")} đ` },
        { status: 400 }
      )
    }

    return Response.json({
      coupon: {
        id: coupon.id,
        code: coupon.code,
        type: coupon.type,
        value: toNumber(coupon.value),
        min_order: minOrder || null,
        max_discount: toNumber(coupon.max_discount) || null,
      },
      discount: Math.floor(calculateDiscount(subtotal, coupon)),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to apply coupon"
    return Response.json({ error: message }, { status: 500 })
  }
}
