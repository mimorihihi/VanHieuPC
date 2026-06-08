import { extractRecommendationIntent, isRecommendationMessage } from "../products/product-recommendation"
import { extractOrderNumber, normalizeText } from "../shared/text-utils"
import type { ToolRoute } from "../shared/types"

export function isOrderStatusMessage(message: string) {
  const normalized = normalizeText(message)
  const hasOrderKeyword = ["don hang", "ma don", "order", "trang thai don", "kiem tra don"].some((keyword) =>
    normalized.includes(keyword)
  )

  return hasOrderKeyword || Boolean(extractOrderNumber(message))
}

export function routeMessageByRules(message: string): ToolRoute | null {
  const orderNumber = extractOrderNumber(message)

  if (isOrderStatusMessage(message)) {
    return orderNumber
      ? {
          toolName: "checkOrderStatus",
          params: {
            orderNumber,
          },
          confidence: 1,
          reason: "Direct order status heuristic",
        }
      : {
          toolName: "checkOrderStatus",
          params: {},
          confidence: 0.5,
          reason: "Order status intent without order number",
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
