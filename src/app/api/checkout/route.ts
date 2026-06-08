import { getAuthUser } from "@/lib/auth"
import { getConnection, query } from "@/lib/db"
import { NextRequest } from "next/server"
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise"
import { buildVnpayPaymentUrl, getVnpayClientIp } from "@/lib/vnpay"

type CheckoutOption = "pickup_store" | "pickup_online" | "delivery_online"
type PaymentMethod = "PAY_AT_STORE" | "VNPAY"

type CheckoutItemInput = {
  product_id?: string
  variant_id?: string | null
  quantity?: number
}

type CheckoutBody = {
  items?: CheckoutItemInput[]
  coupon_id?: string | null
  checkout_option?: CheckoutOption
  shipping_address?: {
    email?: string
    fullName?: string
    phone?: string
    province?: string
    district?: string
    ward?: string
    address?: string
  }
  note?: string
}

type CartItemRow = RowDataPacket & {
  product_id: string
  variant_id: string | null
  quantity: number
}

type ProductRow = RowDataPacket & {
  id: string
  name: string
  stock: number
  is_active: number | boolean
  price: number | string
  sale_price: number | string | null
}

type VariantRow = RowDataPacket & {
  id: string
  product_id: string
  name: string
  stock: number
  is_active: number | boolean
  price_override: number | string | null
}

type CouponRow = RowDataPacket & {
  id: string
  type: "PERCENT" | "FIXED"
  value: number | string
  min_order: number | string | null
  max_discount: number | string | null
  usage_limit: number | null
  used_count: number | null
  expires_at: string | Date | null
  is_active: number | boolean
}

function toNumber(value: unknown) {
  if (typeof value === "number") return value
  if (typeof value === "string") return Number(value)
  if (value && typeof value === "object" && "toString" in value) {
    return Number(value.toString())
  }
  return 0
}

function toPositiveInt(value: unknown, fallback = 1) {
  const num = Number(value)
  if (!Number.isFinite(num) || num <= 0) return fallback
  return Math.floor(num)
}

function getPaymentMethod(checkoutOption: CheckoutOption): PaymentMethod {
  return checkoutOption === "pickup_store" ? "PAY_AT_STORE" : "VNPAY"
}

function calculateDiscount(subtotal: number, coupon: CouponRow | null) {
  if (!coupon || subtotal <= 0) return 0

  const minOrder = toNumber(coupon.min_order)
  if (minOrder > 0 && subtotal < minOrder) return 0

  if (coupon.type === "FIXED") {
    return Math.min(subtotal, toNumber(coupon.value))
  }

  const rawDiscount = subtotal * (toNumber(coupon.value) / 100)
  const maxDiscount = toNumber(coupon.max_discount)
  return maxDiscount > 0 ? Math.min(rawDiscount, maxDiscount) : rawDiscount
}

function buildOrderNumber() {
  return `ORD${Date.now()}${Math.floor(Math.random() * 1000)}`
}

function buildPaymentOrderInfo(checkoutOption: CheckoutOption, orderNumber: string) {
  if (checkoutOption === "pickup_online") {
    return `Thanh toan don hang nhan tai cua hang ${orderNumber}`
  }

  return `Thanh toan don hang giao tan noi ${orderNumber}`
}

export async function POST(req: NextRequest) {
  const connection = await getConnection()

  try {
    const body = (await req.json()) as CheckoutBody
    const checkoutOption = body.checkout_option ?? "pickup_store"
    const paymentMethod = getPaymentMethod(checkoutOption)
    const shippingFee = checkoutOption === "delivery_online" ? 30000 : 0
    const clientIp = getVnpayClientIp(req.headers.get("x-forwarded-for"))
    const shippingAddress = {
      email: String(body.shipping_address?.email ?? "").trim(),
      fullName: String(body.shipping_address?.fullName ?? "").trim(),
      phone: String(body.shipping_address?.phone ?? "").trim(),
      province: String(body.shipping_address?.province ?? "").trim(),
      district: String(body.shipping_address?.district ?? "").trim(),
      ward: String(body.shipping_address?.ward ?? "").trim(),
      address: String(body.shipping_address?.address ?? "").trim(),
    }
    const note = String(body.note ?? "").trim()
    const authUser = await getAuthUser()
    const userId = authUser?.id ?? ""

    if (!shippingAddress.email || !shippingAddress.fullName || !shippingAddress.phone) {
      return Response.json({ error: "Thiếu thông tin liên hệ" }, { status: 400 })
    }

    if (checkoutOption === "delivery_online") {
      if (!shippingAddress.address || !shippingAddress.province || !shippingAddress.district || !shippingAddress.ward) {
        return Response.json({ error: "Thiếu địa chỉ giao hàng" }, { status: 400 })
      }
    }

    let requestedItems: Array<{ product_id: string; variant_id: string | null; quantity: number }> = []
    let cartId: string | null = null

    if (userId) {
      const [cartRows] = await query<CartItemRow[]>(
        `SELECT ci.product_id, ci.variant_id, ci.quantity, c.id as cart_id
         FROM cart_items ci
         INNER JOIN carts c ON c.id = ci.cart_id
         WHERE c.user_id = ?`,
        [userId]
      )

      requestedItems = cartRows.map((item) => ({
        product_id: item.product_id,
        variant_id: item.variant_id,
        quantity: Number(item.quantity ?? 1),
      }))
      cartId = (cartRows[0] as (CartItemRow & { cart_id?: string }) | undefined)?.cart_id ?? null
    } else {
      requestedItems = (body.items ?? []).map((item) => ({
        product_id: String(item.product_id ?? "").trim(),
        variant_id: item.variant_id?.trim() || null,
        quantity: toPositiveInt(item.quantity, 1),
      }))
    }

    requestedItems = requestedItems.filter((item) => item.product_id)

    if (requestedItems.length === 0) {
      return Response.json({ error: "Giỏ hàng đang trống" }, { status: 400 })
    }

    const normalizedItems: Array<{
      product_id: string
      variant_id: string | null
      quantity: number
      product_name: string
      variant_name: string | null
      unit_price: number
      subtotal: number
    }> = []

    for (const item of requestedItems) {
      const [productRows] = await query<ProductRow[]>(
        `SELECT id, name, stock, is_active, price, sale_price
         FROM products
         WHERE id = ?
         LIMIT 1`,
        [item.product_id]
      )
      const product = productRows[0]
      if (!product || !product.is_active) {
        return Response.json({ error: "Sản phẩm không khả dụng" }, { status: 400 })
      }

      let variantName: string | null = null
      let unitPrice = toNumber(product.sale_price ?? product.price)
      let stockLimit = Number(product.stock ?? 0)

      if (item.variant_id) {
        const [variantRows] = await query<VariantRow[]>(
          `SELECT id, product_id, name, stock, is_active, price_override
           FROM product_variants
           WHERE id = ? AND product_id = ?
           LIMIT 1`,
          [item.variant_id, item.product_id]
        )
        const variant = variantRows[0]
        if (!variant || !variant.is_active) {
          return Response.json({ error: "Phiên bản sản phẩm không khả dụng" }, { status: 400 })
        }

        variantName = variant.name
        stockLimit = Number(variant.stock ?? 0)
        unitPrice = toNumber(variant.price_override ?? product.sale_price ?? product.price)
      }

      if (stockLimit < item.quantity) {
        return Response.json({ error: `Sản phẩm ${product.name} không đủ số lượng tồn kho` }, { status: 400 })
      }

      normalizedItems.push({
        product_id: product.id,
        variant_id: item.variant_id,
        quantity: item.quantity,
        product_name: product.name,
        variant_name: variantName,
        unit_price: unitPrice,
        subtotal: unitPrice * item.quantity,
      })
    }

    const subtotal = normalizedItems.reduce((sum, item) => sum + item.subtotal, 0)
    const vat = Math.floor(subtotal * 0.1)

    let coupon: CouponRow | null = null
    if (body.coupon_id) {
      const [couponRows] = await query<CouponRow[]>(
        `SELECT id, type, value, min_order, max_discount, usage_limit, used_count, expires_at, is_active
         FROM coupons
         WHERE id = ?
         LIMIT 1`,
        [body.coupon_id]
      )
      coupon = couponRows[0] ?? null

      if (!coupon || !coupon.is_active) {
        return Response.json({ error: "Mã giảm giá không hợp lệ" }, { status: 400 })
      }

      if (coupon.expires_at && new Date(coupon.expires_at).getTime() < Date.now()) {
        return Response.json({ error: "Mã giảm giá đã hết hạn" }, { status: 400 })
      }

      if (coupon.usage_limit && Number(coupon.used_count ?? 0) >= Number(coupon.usage_limit)) {
        return Response.json({ error: "Mã giảm giá đã hết lượt sử dụng" }, { status: 400 })
      }
    }

    const discount = Math.floor(calculateDiscount(subtotal, coupon))
    const total = subtotal + shippingFee + vat - discount
    const orderId = crypto.randomUUID()
    const orderNumber = buildOrderNumber()

    await connection.beginTransaction()

    await connection.execute<ResultSetHeader>(
      `INSERT INTO orders (
        id,
        order_number,
        user_id,
        coupon_id,
        status,
        subtotal,
        shipping_fee,
        discount,
        total,
        shipping_address,
        payment_method,
        checkout_option,
        payment_status,
        note,
        created_at
      ) VALUES (?, ?, ?, ?, 'PENDING', ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, NOW(3))`,
      [
        orderId,
        orderNumber,
        userId || null,
        body.coupon_id ?? null,
        subtotal,
        shippingFee,
        discount,
        total,
        JSON.stringify(shippingAddress),
        paymentMethod,
        checkoutOption,
        note || null,
      ]
    )

    for (const item of normalizedItems) {
      await connection.execute<ResultSetHeader>(
        `INSERT INTO order_items (
          id,
          order_id,
          product_id,
          variant_id,
          product_name,
          variant_name,
          unit_price,
          quantity,
          subtotal
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          crypto.randomUUID(),
          orderId,
          item.product_id,
          item.variant_id,
          item.product_name,
          item.variant_name,
          item.unit_price,
          item.quantity,
          item.subtotal,
        ]
      )
    }

    if (coupon) {
      await connection.execute<ResultSetHeader>(
        `UPDATE coupons
         SET used_count = used_count + 1
         WHERE id = ?`,
        [coupon.id]
      )
    }

    if (cartId) {
      await connection.execute<ResultSetHeader>(`DELETE FROM cart_items WHERE cart_id = ?`, [cartId])
      await connection.execute<ResultSetHeader>(`UPDATE carts SET updated_at = NOW() WHERE id = ?`, [cartId])
    }

    await connection.commit()

    const paymentUrl = paymentMethod === "VNPAY"
      ? buildVnpayPaymentUrl({
          amount: total,
          ipAddr: clientIp,
          orderInfo: buildPaymentOrderInfo(checkoutOption, orderNumber),
          txnRef: orderNumber,
        })
      : null

    return Response.json({
      success: true,
      order: {
        id: orderId,
        order_number: orderNumber,
        checkout_option: checkoutOption,
        payment_method: paymentMethod,
        payment_status: "PENDING",
        subtotal,
        shipping_fee: shippingFee,
        vat,
        discount,
        total,
      },
      paymentUrl,
    })
  } catch (error) {
    await connection.rollback()
    const message = error instanceof Error ? error.message : "Không thể tạo đơn hàng"
    return Response.json({ error: message }, { status: 500 })
  } finally {
    connection.release()
  }
}
