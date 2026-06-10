import { getAuthUser } from "@/lib/auth"
import { query } from "@/lib/db"
import { buildVnpayPaymentUrl, getVnpayClientIp } from "@/lib/vnpay"
import { NextRequest } from "next/server"
import type { RowDataPacket } from "mysql2/promise"

type RetryPaymentBody = {
  order_id?: string
}

type OrderRow = RowDataPacket & {
  id: string
  order_number: string
  payment_method: string | null
  payment_status: string | null
  checkout_option: string | null
  total: number | string
}

function buildPaymentOrderInfo(checkoutOption: string | null, orderNumber: string) {
  if (checkoutOption === "pickup_online") {
    return `Thanh toan lai don hang nhan tai cua hang ${orderNumber}`
  }

  return `Thanh toan lai don hang giao tan noi ${orderNumber}`
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Không thể tạo lại liên kết thanh toán"
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser()
    if (!authUser) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = (await req.json()) as RetryPaymentBody
    const orderId = String(body.order_id ?? "").trim()

    if (!orderId) {
      return Response.json({ error: "Thiếu mã đơn hàng" }, { status: 400 })
    }

    const [rows] = await query<OrderRow[]>(
      `SELECT id, order_number, payment_method, payment_status, checkout_option, total
       FROM orders
       WHERE id = ? AND user_id = ?
       LIMIT 1`,
      [orderId, authUser.id]
    )

    const order = rows[0]
    if (!order) {
      return Response.json({ error: "Không tìm thấy đơn hàng" }, { status: 404 })
    }

    if (order.payment_method !== "VNPAY") {
      return Response.json({ error: "Đơn hàng này không dùng thanh toán online" }, { status: 400 })
    }

    if (order.payment_status === "PAID") {
      return Response.json({ error: "Đơn hàng đã được thanh toán" }, { status: 400 })
    }

    const paymentUrl = buildVnpayPaymentUrl({
      amount: Number(order.total ?? 0),
      ipAddr: getVnpayClientIp(req.headers.get("x-forwarded-for")),
      orderInfo: buildPaymentOrderInfo(order.checkout_option, order.order_number),
      txnRef: order.order_number,
    })

    return Response.json({ paymentUrl })
  } catch (error: unknown) {
    return Response.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
