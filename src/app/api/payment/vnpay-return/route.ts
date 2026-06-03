import type { RowDataPacket } from "mysql2/promise"
import { query, execute } from "@/lib/db"
import { isVnpaySuccess, verifyVnpayReturn } from "@/lib/vnpay"

type OrderRow = RowDataPacket & {
  id: string
  order_number: string
  payment_method: string | null
  payment_status: string | null
  total: number | string
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const verification = verifyVnpayReturn({ query: url.searchParams })
  const orderNumber = verification.params.vnp_TxnRef?.trim() || ""

  if (!verification.isValidSignature) {
    const failedUrl = new URL("/payment/failed", url.origin)
    if (orderNumber) {
      failedUrl.searchParams.set("order", orderNumber)
    }
    failedUrl.searchParams.set("reason", "invalid-signature")
    return Response.redirect(failedUrl, 302)
  }

  if (!orderNumber) {
    const failedUrl = new URL("/payment/failed", url.origin)
    failedUrl.searchParams.set("reason", "missing-order")
    return Response.redirect(failedUrl, 302)
  }

  const [rows] = await query<OrderRow[]>(
    `SELECT id, order_number, payment_method, payment_status, total
     FROM orders
     WHERE order_number = ?
     LIMIT 1`,
    [orderNumber]
  )

  const order = rows[0]

  if (!order) {
    const failedUrl = new URL("/payment/failed", url.origin)
    failedUrl.searchParams.set("order", orderNumber)
    failedUrl.searchParams.set("reason", "order-not-found")
    return Response.redirect(failedUrl, 302)
  }

  if (order.payment_method !== "VNPAY") {
    const failedUrl = new URL("/payment/failed", url.origin)
    failedUrl.searchParams.set("order", order.order_number)
    failedUrl.searchParams.set("reason", "invalid-payment-method")
    return Response.redirect(failedUrl, 302)
  }

  const success = isVnpaySuccess(
    verification.params.vnp_ResponseCode,
    verification.params.vnp_TransactionStatus
  )

  if (!success) {
    await execute(
      `UPDATE orders
       SET payment_status = 'FAILED',
           status = 'PENDING'
       WHERE id = ? AND payment_status <> 'PAID'`,
      [order.id]
    )

    const failedUrl = new URL("/payment/failed", url.origin)
    failedUrl.searchParams.set("order", order.order_number)
    failedUrl.searchParams.set("code", verification.params.vnp_ResponseCode ?? "")
    return Response.redirect(failedUrl, 302)
  }

  const expectedAmount = Math.round(Number(order.total ?? 0) * 100)
  const returnedAmount = Number(verification.params.vnp_Amount ?? 0)

  if (expectedAmount !== returnedAmount) {
    const failedUrl = new URL("/payment/failed", url.origin)
    failedUrl.searchParams.set("order", order.order_number)
    failedUrl.searchParams.set("reason", "invalid-amount")
    failedUrl.searchParams.set("code", verification.params.vnp_ResponseCode ?? "")
    return Response.redirect(failedUrl, 302)
  }

  if (order.payment_status === "PAID") {
    const redirectUrl = new URL("/payment/success", url.origin)
    redirectUrl.searchParams.set("order", order.order_number)
    redirectUrl.searchParams.set("code", verification.params.vnp_ResponseCode ?? "00")
    return Response.redirect(redirectUrl, 302)
  }

  await execute(
    `UPDATE orders
     SET payment_status = 'PAID',
         status = 'CONFIRMED'
     WHERE id = ?`,
    [order.id]
  )

  const redirectUrl = new URL("/payment/success", url.origin)
  redirectUrl.searchParams.set("order", order.order_number)
  redirectUrl.searchParams.set("code", verification.params.vnp_ResponseCode ?? "00")
  return Response.redirect(redirectUrl, 302)
}
