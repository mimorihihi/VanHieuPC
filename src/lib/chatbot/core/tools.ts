import { searchFaq } from "../stores/faq-store"
import {
  formatCurrency,
  formatInventoryReply,
  formatProductDetailReply,
  formatProductSearchReply,
  formatRecommendationReply,
} from "../shared/formatters"
import { checkOrderStatus } from "../stores/order-store"
import { getCategoryIdsBySlug } from "../stores/category-store"
import { recommendProducts, searchProducts } from "../products/product-recommendation"
import { checkInventory, getProductDetail } from "../products/product-store"
import type { ProductRecommendationIntent, ToolExecutionResult, ToolRoute } from "../shared/types"

function formatOrderStatusLabel(status?: string) {
  const normalized = status?.toUpperCase()
  const labels: Record<string, string> = {
    PENDING: "đang chờ xác nhận",
    CONFIRMED: "đã xác nhận",
    PROCESSING: "đang xử lý",
    SHIPPING: "đang giao hàng",
    DELIVERED: "đã giao hàng",
    CANCELLED: "đã hủy",
  }

  return normalized ? labels[normalized] || normalized : "chưa rõ"
}

function formatPaymentStatusLabel(status?: string) {
  const normalized = status?.toUpperCase()
  const labels: Record<string, string> = {
    PENDING: "chưa thanh toán",
    PAID: "đã thanh toán",
    FAILED: "thanh toán thất bại",
    REFUNDED: "đã hoàn tiền",
  }

  return normalized ? labels[normalized] || normalized : "chưa rõ"
}

function formatOrderDate(value?: string) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""

  return date.toLocaleDateString("vi-VN")
}

function formatOrderStatusReply(order: {
  order_number: string
  status?: string
  payment_status?: string
  total?: string | number
  created_at?: string
}) {
  const lines = [
    `Đơn hàng ${order.order_number}: ${formatOrderStatusLabel(order.status)}.`,
    `Thanh toán: ${formatPaymentStatusLabel(order.payment_status)}.`,
    `Tổng tiền: ${formatCurrency(order.total ?? 0)}.`,
  ]
  const createdDate = formatOrderDate(order.created_at)
  if (createdDate) lines.push(`Ngày đặt: ${createdDate}.`)
  if (order.payment_status?.toUpperCase() === "FAILED") {
    lines.push("Thanh toán của đơn này đang thất bại, bạn có thể thử thanh toán lại hoặc liên hệ shop để được hỗ trợ.")
  }

  return lines.join("\n")
}

export async function executeChatTool(route: ToolRoute): Promise<ToolExecutionResult | null> {
  if (route.toolName === "searchFAQ") {
    const docs = await searchFaq(route.params.query ?? "")
    const top = docs[0]
    if (!top) {
      return {
        reply: "Mình chưa tìm thấy nội dung FAQ phù hợp. Bạn có thể hỏi rõ hơn về giao hàng, thanh toán hoặc đổi trả.",
        toolName: route.toolName,
      }
    }

    return {
      reply: top.content,
      data: docs,
      toolName: route.toolName,
    }
  }

  if (route.toolName === "searchProducts") {
    const keyword = route.params.query ?? route.params.product ?? ""
    const categoryIds = route.params.categoryIds ?? (await getCategoryIdsBySlug(route.params.categorySlug))
    const products = await searchProducts({
      query: keyword,
      productType: route.params.productType,
      categoryIds,
      minPrice: route.params.minPrice,
      maxPrice: route.params.maxPrice,
    })

    return !products.length
      ? {
          reply: "Mình chưa tìm thấy sản phẩm phù hợp. Bạn thử nhập tên sản phẩm rõ hơn nhé.",
          toolName: route.toolName,
        }
      : {
          reply: formatProductSearchReply(products),
          data: products,
          toolName: route.toolName,
        }
  }

  if (route.toolName === "recommendProducts") {
    const categoryIds = route.params.categoryIds ?? (await getCategoryIdsBySlug(route.params.categorySlug))
    const intent: ProductRecommendationIntent = {
      query: route.params.query ?? "",
      productType: route.params.productType,
      usage: route.params.usage,
      category: route.params.category,
      categoryIds,
      useCase: route.params.useCase,
      minPrice: route.params.minPrice,
      maxPrice: route.params.maxPrice,
      budgetMode: route.params.budgetMode,
    }
    const products = await recommendProducts(intent)

    return !products.length
      ? {
          reply: "Mình chưa tìm thấy sản phẩm khớp nhu cầu này. Bạn có thể nới ngân sách hoặc nói rõ hơn về mục đích sử dụng để mình lọc lại nhé.",
          toolName: route.toolName,
        }
      : {
          reply: formatRecommendationReply(products, intent),
          data: products,
          toolName: route.toolName,
        }
  }

  if (route.toolName === "getProductDetail") {
    const product = await getProductDetail(route.params.product ?? route.params.query ?? "")

    return !product
      ? {
          reply: "Mình chưa tìm thấy sản phẩm phù hợp để xem chi tiết. Bạn thử nhập tên sản phẩm cụ thể hơn nhé.",
          toolName: route.toolName,
        }
      : {
          reply: formatProductDetailReply(product),
          data: product,
          toolName: route.toolName,
        }
  }

  if (route.toolName === "checkInventory") {
    const inventory = await checkInventory(route.params.product ?? route.params.query ?? "")

    return !inventory
      ? {
          reply: "Mình chưa tìm thấy sản phẩm để kiểm tra tồn kho. Bạn thử nhập tên sản phẩm cụ thể hơn nhé.",
          toolName: route.toolName,
        }
      : {
          reply: formatInventoryReply(inventory),
          data: inventory,
          toolName: route.toolName,
        }
  }

  if (route.toolName === "checkOrderStatus") {
    const order = await checkOrderStatus(route.params.orderNumber ?? "")

    return !order
      ? {
          reply: "Mình chưa tìm thấy đơn hàng phù hợp. Bạn vui lòng kiểm tra lại mã đơn hàng nhé.",
          toolName: route.toolName,
        }
      : {
          reply: formatOrderStatusReply(order),
          data: order,
          toolName: route.toolName,
        }
  }

  return null
}
