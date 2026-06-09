import { extractRecommendationIntent } from "../products/product-recommendation"
import type { ChatContext } from "../stores/context-store"
import { extractOrderNumber, extractProductKeyword } from "../shared/text-utils"
import type { ToolRoute } from "../shared/types"

export function prepareToolRoute(route: ToolRoute | null, message: string, context: ChatContext = {}): ToolRoute | null {
  if (!route) return null

  const recommendationIntent = extractRecommendationIntent(message)
  const productKeyword = extractProductKeyword(message) || context.lastProductName || message
  const orderNumber = extractOrderNumber(message) || context.lastOrderNumber

  return {
    ...route,
    params: {
      query: route.params?.query ?? (route.toolName === "searchFAQ" ? message : productKeyword),
      product:
        route.params?.product ??
        (route.toolName === "getProductDetail" || route.toolName === "checkInventory" ? productKeyword : undefined),
      orderNumber: route.params?.orderNumber ?? (route.toolName === "checkOrderStatus" ? orderNumber : undefined),
      category: route.params?.category ?? (route.toolName === "recommendProducts" ? recommendationIntent.category : undefined),
      useCase: route.params?.useCase ?? (route.toolName === "recommendProducts" ? recommendationIntent.useCase : undefined),
      minPrice: route.params?.minPrice ?? (route.toolName === "recommendProducts" ? recommendationIntent.minPrice ?? context.lastMinPrice : undefined),
      maxPrice: route.params?.maxPrice ?? (route.toolName === "recommendProducts" ? recommendationIntent.maxPrice ?? context.lastMaxPrice : undefined),
    },
  }
}
