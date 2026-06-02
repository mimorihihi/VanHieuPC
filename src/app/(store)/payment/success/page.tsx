"use client"

import { useSearchParams } from "next/navigation"
import { ArrowLeft, Package, Sparkles } from "lucide-react"
import { PaymentStatusLayout } from "@/components/payment-status-layout"
import successCheckmark from "@/components/dashboard/success-checkmark.json"

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams()
  const orderNumber = searchParams.get("order")?.trim() || "đơn hàng của bạn"

  return (
    <PaymentStatusLayout
      theme="success"
      badgeLabel="Payment Success"
      badgeIcon={Sparkles}
      title="Đặt hàng thành công"
      description={
        <>
          Cảm ơn bạn đã đặt hàng. Chúng tôi đã ghi nhận <span className="font-semibold text-zinc-900">{orderNumber}</span>
          và sẽ sớm liên hệ để xác nhận đơn hàng cũng như hướng dẫn bước thanh toán tiếp theo nếu cần.
        </>
      }
      orderNumber={orderNumber}
      statusLabel="Đã tạo đơn · Chờ xác nhận"
      timeline={[
        "Đơn hàng đã được lưu vào hệ thống của cửa hàng.",
        "Nhân viên sẽ liên hệ để xác nhận tình trạng hàng và thời gian nhận/giao.",
        "Bạn vẫn có thể theo dõi chi tiết đơn trong trang tài khoản của mình.",
      ]}
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
      panelTitle="Cảm ơn bạn!"
      panelDescription="Thông tin đơn hàng của bạn đã được ghi nhận thành công. Chúng tôi sẽ xử lý nhanh nhất có thể."
      animationData={successCheckmark}
    />
  )
}
