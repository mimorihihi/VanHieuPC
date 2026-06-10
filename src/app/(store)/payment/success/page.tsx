"use client"

import { useSearchParams } from "next/navigation"
import { ArrowLeft, Package, Sparkles } from "lucide-react"
import { PaymentStatusLayout } from "@/components/payment-status-layout"
import successCheckmark from "@/components/dashboard/success-checkmark.json"

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams()
  const orderNumber = searchParams.get("order")?.trim() || "đơn hàng của bạn"

  const isPaymentSuccess = searchParams.get("code") === "00"

  return (
    <PaymentStatusLayout
      theme="success"
      badgeLabel={isPaymentSuccess ? "Payment Success" : "Order Success"}
      badgeIcon={Sparkles}
      title={isPaymentSuccess ? "Thanh toán thành công" : "Đặt hàng thành công"}
      description={
        isPaymentSuccess ? (
          <>
            Thanh toán cho <span className="break-all font-semibold text-zinc-900">{orderNumber}</span> đã được ghi nhận thành công.
            Đơn hàng của bạn đã được xác nhận và sẽ sớm được cửa hàng xử lý.
          </>
        ) : (
          <>
            Cảm ơn bạn đã đặt hàng. Chúng tôi đã ghi nhận <span className="break-all font-semibold text-zinc-900">{orderNumber}</span>
            và sẽ sớm liên hệ để xác nhận đơn hàng cũng như hướng dẫn bước thanh toán tiếp theo nếu cần.
          </>
        )
      }
      orderNumber={orderNumber}
      statusLabel={isPaymentSuccess ? "Đã thanh toán · Đã xác nhận" : "Đã tạo đơn · Chờ xác nhận"}
      timeline={
        isPaymentSuccess
          ? [
              "Giao dịch thanh toán online đã được cổng thanh toán xác nhận thành công.",
              "Đơn hàng đã chuyển sang trạng thái đã xác nhận trong hệ thống.",
              "Bạn có thể theo dõi chi tiết đơn trong trang tài khoản của mình.",
            ]
          : [
              "Đơn hàng đã được lưu vào hệ thống của cửa hàng.",
              "Nhân viên sẽ liên hệ để xác nhận tình trạng hàng và thời gian nhận/giao.",
              "Bạn vẫn có thể theo dõi chi tiết đơn trong trang tài khoản của mình.",
            ]
      }
      actions={[
        {
          href: "/dashboard",
          label: "Xem đơn hàng của tôi",
          icon: Package,
          variant: "primary",
        },
        {
          href: "/",
          label: "Tiếp tục mua sắm",
          icon: ArrowLeft,
          variant: "secondary",
        },
      ]}
      panelTitle={isPaymentSuccess ? "Thanh toán đã hoàn tất!" : "Cảm ơn bạn!"}
      panelDescription={
        isPaymentSuccess
          ? "Thông tin thanh toán và đơn hàng đã được cập nhật thành công. Cửa hàng sẽ xử lý đơn nhanh nhất có thể."
          : "Thông tin đơn hàng của bạn đã được ghi nhận thành công. Chúng tôi sẽ xử lý nhanh nhất có thể."
      }
      animationData={successCheckmark}
    />
  )
}
