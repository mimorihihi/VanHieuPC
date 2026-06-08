import { searchFaq } from "../stores/faq-store"
import {
  formatCurrency,
  formatInventoryReply,
  formatProductDetailReply,
  formatProductSearchReply,
  formatRecommendationReply,
} from "../shared/formatters"
import { checkOrderStatus } from "../stores/order-store"
import { recommendProducts, searchProducts } from "../products/product-recommendation"
import { checkInventory, getProductDetail } from "../products/product-store"
import type { ProductRecommendationIntent, ToolExecutionResult, ToolRoute } from "../shared/types"

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
    const products = await searchProducts(keyword)

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
    const intent: ProductRecommendationIntent = {
      query: route.params.query ?? "",
      category: route.params.category,
      useCase: route.params.useCase,
      minPrice: route.params.minPrice,
      maxPrice: route.params.maxPrice,
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
          reply: `Đơn hàng ${order.order_number} hiện ở trạng thái ${order.status}. Thanh toán: ${order.payment_status}. Tổng tiền: ${formatCurrency(order.total)}.`,
          data: order,
          toolName: route.toolName,
        }
  }

  return null
}
