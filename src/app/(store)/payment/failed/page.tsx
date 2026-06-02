"use client"

import { useSearchParams } from "next/navigation"
import { ArrowLeft, RefreshCw, TriangleAlert } from "lucide-react"
import { PaymentStatusLayout } from "@/components/payment-status-layout"

export default function PaymentFailedPage() {
  const searchParams = useSearchParams()
  const orderNumber = searchParams.get("order")?.trim() || "đơn hàng của bạn"

  return (
    <PaymentStatusLayout
      theme="failed"
      badgeLabel="Payment Failed"
      badgeIcon={TriangleAlert}
      title="Thanh toán chưa hoàn tất"
      description={
        <>
          Hệ thống chưa ghi nhận thanh toán thành công cho <span className="font-semibold text-zinc-900">{orderNumber}</span>.
          Đơn hàng vẫn có thể đang chờ xử lý hoặc cần bạn thử lại phương thức thanh toán sau.
        </>
      }
      orderNumber={orderNumber}
      statusLabel="Chờ thanh toán / cần kiểm tra"
      timeline={[
        "Vui lòng kiểm tra lại kết nối mạng hoặc trạng thái giao dịch tại cổng thanh toán.",
        "Nếu tiền đã bị trừ nhưng trạng thái chưa cập nhật, hãy liên hệ cửa hàng để được hỗ trợ nhanh hơn.",
        "Bạn có thể xem lại thông tin đơn hàng trong tài khoản cá nhân bất cứ lúc nào.",
      ]}
      actions={[
        {
          href: "/checkout",
          label: "Thử lại thanh toán",
          icon: RefreshCw,
          variant: "primary",
        },
        {
          href: "/dashboard",
          label: "Về trang đơn hàng",
          icon: ArrowLeft,
          variant: "secondary",
        },
      ]}
      panelTitle="Giao dịch cần được kiểm tra"
      panelDescription="Đừng lo, đơn hàng vẫn có thể được lưu lại. Hãy thử lại hoặc kiểm tra với bộ phận hỗ trợ để tiếp tục nhanh chóng."
      panelIcon={TriangleAlert}
    />
  )
}
