"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { ArrowLeft, Package, ShoppingCart, TriangleAlert } from "lucide-react"
import { PaymentStatusLayout } from "@/components/payment-status-layout"

export default function PaymentFailedPage() {
  const searchParams = useSearchParams()
  const orderNumber = searchParams.get("order")?.trim() || "đơn hàng của bạn"

  const reason = searchParams.get("reason")?.trim() || ""
  const code = searchParams.get("code")?.trim() || ""
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    let mounted = true

    void (async () => {
      try {
        const response = await fetch("/api/me", { cache: "no-store" })
        if (mounted) {
          setIsAuthenticated(response.ok)
        }
      } catch {
        if (mounted) {
          setIsAuthenticated(false)
        }
      }
    })()

    return () => {
      mounted = false
    }
  }, [])

  const reasonMap: Record<string, string> = {
    "invalid-signature": "Giao dịch không hợp lệ hoặc chữ ký thanh toán không khớp.",
    "missing-order": "Thiếu mã đơn hàng trong phản hồi từ cổng thanh toán.",
    "order-not-found": "Không tìm thấy đơn hàng tương ứng trong hệ thống.",
    "invalid-payment-method": "Phương thức thanh toán của đơn hàng không khớp với VNPay.",
    "invalid-amount": "Số tiền thanh toán trả về không khớp với tổng đơn hàng.",
  }

  const failureReason = reasonMap[reason] ?? (code ? `Cổng thanh toán trả về mã lỗi ${code}.` : "Giao dịch chưa được xác nhận thành công.")

  return (
    <PaymentStatusLayout
      theme="failed"
      badgeLabel="Payment Failed"
      badgeIcon={TriangleAlert}
      title="Thanh toán chưa hoàn tất"
      description={
        <>
          Hệ thống chưa ghi nhận thanh toán thành công cho <span className="break-all font-semibold text-zinc-900">{orderNumber}</span>.
          {" "}{failureReason}
        </>
      }
      orderNumber={orderNumber}
      statusLabel={code ? `Thanh toán lỗi · Mã ${code}` : "Chờ thanh toán / cần kiểm tra"}
      timeline={[
        failureReason,
        isAuthenticated
          ? "Bạn có thể mở trang đơn hàng để kiểm tra lại trạng thái và thanh toán lại nếu cần."
          : "Nếu bạn thanh toán với tư cách khách, hãy lưu lại mã đơn hàng để cửa hàng hỗ trợ kiểm tra giao dịch.",
        "Nếu tiền đã bị trừ nhưng trạng thái chưa cập nhật, hãy liên hệ cửa hàng để được hỗ trợ nhanh hơn.",
      ]}
      actions={
        isAuthenticated
          ? [
              {
                href: "/dashboard?tab=orders",
                label: "Xem đơn hàng",
                icon: Package,
                variant: "primary",
              },
              {
                href: "/products",
                label: "Tiếp tục mua sắm",
                icon: ShoppingCart,
                variant: "secondary",
              },
            ]
          : [
              {
                href: "/",
                label: "Về trang chủ",
                icon: ArrowLeft,
                variant: "primary",
              },
              {
                href: "/products",
                label: "Tiếp tục mua sắm",
                icon: ShoppingCart,
                variant: "secondary",
              },
            ]
      }
      panelTitle="Giao dịch cần được kiểm tra"
      panelDescription={
        isAuthenticated
          ? "Bạn có thể kiểm tra đơn hàng trong tài khoản và thanh toán lại đúng đơn nếu giao dịch chưa hoàn tất."
          : "Đơn hàng có thể vẫn được lưu lại. Vui lòng lưu mã đơn hàng và liên hệ cửa hàng nếu cần kiểm tra hoặc hỗ trợ thanh toán lại."
      }
      panelIcon={TriangleAlert}
    />
  )
}
