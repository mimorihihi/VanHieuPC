import { extractRecommendationIntent, isRecommendationMessage } from "../products/product-recommendation"
import type { ChatContext } from "../stores/context-store"
import { extractOrderNumber, normalizeText } from "../shared/text-utils"
import type { ToolRoute } from "../shared/types"

export function isOrderStatusMessage(message: string) {
  const normalized = normalizeText(message)
  const hasOrderKeyword = ["don hang", "ma don", "order", "trang thai don", "kiem tra don"].some((keyword) =>
    normalized.includes(keyword)
  )

  return hasOrderKeyword || Boolean(extractOrderNumber(message))
}

function hasAnyKeyword(normalized: string, keywords: string[]) {
  return keywords.some((keyword) => normalized.includes(keyword))
}

function isProductFollowUpMessage(normalized: string) {
  return hasAnyKeyword(normalized, ["may nay", "san pham nay", "mau nay", "cai nay", "con nay"])
}

function isSearchProductMessage(normalized: string) {
  return hasAnyKeyword(normalized, ["tim", "tim giup", "kiem tra gia", "xem gia"])
}

function hasContextRecommendationNeed(normalized: string) {
  return hasAnyKeyword(normalized, ["pc gaming", "choi game", "gaming", "valorant", "fps", "render", "blender", "do hoa", "workstation", "may lam"])
}

function isBudgetOnlyMessage(normalized: string) {
  const hasBudgetKeyword = hasAnyKeyword(normalized, ["ngan sach", "tam", "khoang", "trieu", "muon dung"])
  return hasBudgetKeyword && !hasContextRecommendationNeed(normalized) && !hasAnyKeyword(normalized, ["pc", "laptop", "man hinh", "monitor"])
}

export function routeMessageByRules(message: string, context: ChatContext = {}): ToolRoute | null {
  const normalized = normalizeText(message)
  const orderNumber = extractOrderNumber(message)

  if (isBudgetOnlyMessage(normalized)) return null

  if (isSearchProductMessage(normalized) && !isRecommendationMessage(message)) {
    return {
      toolName: "searchProducts",
      params: {
        query: message,
      },
      confidence: 0.9,
      reason: "Direct product search heuristic",
    }
  }

  if (isOrderStatusMessage(message)) {
    return orderNumber || context.lastOrderNumber
      ? {
          toolName: "checkOrderStatus",
          params: {
            orderNumber: orderNumber || context.lastOrderNumber,
          },
          confidence: orderNumber ? 1 : 0.9,
          reason: orderNumber ? "Direct order status heuristic" : "Order status follow-up from context",
        }
      : {
          toolName: "checkOrderStatus",
          params: {},
          confidence: 0.5,
          reason: "Order status intent without order number",
        }
  }

  if (context.lastProductName && isProductFollowUpMessage(normalized)) {
    if (hasAnyKeyword(normalized, ["con hang", "ton kho", "het hang", "stock"])) {
      return {
        toolName: "checkInventory",
        params: {
          product: context.lastProductName,
        },
        confidence: 0.9,
        reason: "Product inventory follow-up from context",
      }
    }

    if (hasAnyKeyword(normalized, ["chi tiet", "thong tin", "gia", "bao nhieu", "xem"])) {
      return {
        toolName: "getProductDetail",
        params: {
          product: context.lastProductName,
        },
        confidence: 0.9,
        reason: "Product detail follow-up from context",
      }
    }
  }

  if ((context.lastMinPrice || context.lastMaxPrice) && hasContextRecommendationNeed(normalized)) {
    return {
      toolName: "recommendProducts",
      params: extractRecommendationIntent(message),
      confidence: 0.9,
      reason: "Recommendation follow-up with budget context",
    }
  }

  if (isRecommendationMessage(message)) {
    return {
      toolName: "recommendProducts",
      params: extractRecommendationIntent(message),
      confidence: 0.95,
      reason: "Direct recommendation heuristic",
    }
  }

  return null
}
