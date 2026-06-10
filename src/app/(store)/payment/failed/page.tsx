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
    "invalid-signature": "Giao dịch không thể xác thực an toàn. Vui lòng thử lại hoặc liên hệ cửa hàng để được hỗ trợ.",
    "missing-order": "Cổng thanh toán chưa gửi đủ thông tin đơn hàng. Vui lòng lưu mã đơn và liên hệ cửa hàng để kiểm tra.",
    "order-not-found": "Hệ thống chưa tìm thấy đơn hàng tương ứng. Vui lòng lưu mã đơn và liên hệ cửa hàng để được hỗ trợ.",
    "invalid-payment-method": "Phương thức thanh toán của đơn hàng không khớp. Vui lòng chọn lại phương thức thanh toán phù hợp.",
    "invalid-amount": "Số tiền thanh toán chưa khớp với tổng đơn hàng. Vui lòng không thanh toán lại ngay nếu tiền đã bị trừ.",
  }

  const codeMap: Record<string, string> = {
    "07": "Giao dịch có dấu hiệu cần kiểm tra thêm từ ngân hàng. Vui lòng liên hệ cửa hàng nếu tiền đã bị trừ.",
    "09": "Thẻ hoặc tài khoản của bạn chưa được đăng ký dịch vụ thanh toán trực tuyến.",
    "10": "Thông tin xác thực thanh toán chưa đúng. Vui lòng kiểm tra lại và thử lại sau.",
    "11": "Giao dịch đã hết thời gian chờ thanh toán. Bạn có thể thực hiện lại nếu vẫn muốn mua hàng.",
    "12": "Thẻ hoặc tài khoản của bạn đang bị khóa nên chưa thể thanh toán.",
    "13": "Mã xác thực giao dịch chưa chính xác. Vui lòng kiểm tra lại thông tin từ ngân hàng.",
    "24": "Bạn đã hủy giao dịch hoặc rời khỏi cổng thanh toán trước khi hoàn tất.",
    "51": "Tài khoản của bạn không đủ số dư để hoàn tất thanh toán.",
    "65": "Tài khoản đã vượt quá hạn mức thanh toán trong ngày.",
    "75": "Ngân hàng thanh toán đang tạm thời bảo trì. Vui lòng thử lại sau.",
    "79": "Bạn đã nhập sai thông tin xác thực quá nhiều lần. Vui lòng thử lại sau hoặc liên hệ ngân hàng.",
    "99": "Giao dịch chưa hoàn tất do lỗi từ cổng thanh toán hoặc ngân hàng. Vui lòng thử lại sau.",
  }

  const failureReason = reasonMap[reason] ?? codeMap[code] ?? "Giao dịch chưa được xác nhận thành công. Vui lòng kiểm tra lại hoặc liên hệ cửa hàng nếu cần hỗ trợ."

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
