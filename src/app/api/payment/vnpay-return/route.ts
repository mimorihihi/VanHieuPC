import type { RowDataPacket } from "mysql2/promise"
import { query, execute } from "@/lib/db"
import { isVnpaySuccess, verifyVnpayReturn } from "@/lib/vnpay"

type OrderRow = RowDataPacket & {
  id: string
  order_number: string
  payment_method: string | null
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
    `SELECT id, order_number, payment_method
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

  const success = isVnpaySuccess(
    verification.params.vnp_ResponseCode,
    verification.params.vnp_TransactionStatus
  )

  await execute(
    `UPDATE orders
     SET payment_status = ?,
         status = CASE
           WHEN ? = 'PAID' THEN 'CONFIRMED'
           WHEN ? = 'FAILED' THEN 'PENDING'
           ELSE status
         END
     WHERE id = ?`,
    [success ? "PAID" : "FAILED", success ? "PAID" : "FAILED", success ? "PAID" : "FAILED", order.id]
  )

  const redirectUrl = new URL(success ? "/payment/success" : "/payment/failed", url.origin)
  redirectUrl.searchParams.set("order", order.order_number)
  redirectUrl.searchParams.set("code", verification.params.vnp_ResponseCode ?? "")
  return Response.redirect(redirectUrl, 302)
}
