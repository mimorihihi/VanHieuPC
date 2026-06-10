"use client"

import { useSearchParams } from "next/navigation"
import { ArrowLeft, Package, TriangleAlert } from "lucide-react"
import { PaymentStatusLayout } from "@/components/payment-status-layout"

export default function PaymentFailedPage() {
  const searchParams = useSearchParams()
  const orderNumber = searchParams.get("order")?.trim() || "đơn hàng của bạn"

  const reason = searchParams.get("reason")?.trim() || ""
  const code = searchParams.get("code")?.trim() || ""

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
        "Nếu tiền đã bị trừ nhưng trạng thái chưa cập nhật, hãy liên hệ cửa hàng để được hỗ trợ nhanh hơn.",
        "Bạn có thể xem lại thông tin đơn hàng trong tài khoản cá nhân bất cứ lúc nào.",
      ]}
      actions={[
        {
          href: "/dashboard?tab=orders",
          label: "Xem đơn hàng",
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
      panelTitle="Giao dịch cần được kiểm tra"
      panelDescription="Đừng lo, đơn hàng vẫn có thể được lưu lại. Hãy thử lại hoặc kiểm tra với bộ phận hỗ trợ để tiếp tục nhanh chóng."
      panelIcon={TriangleAlert}
    />
  )
}
