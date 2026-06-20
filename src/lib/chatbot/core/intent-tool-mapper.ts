import type { ChatContext } from "../stores/context-store"
import type { IntentExtractionResult, ToolRoute } from "../shared/types"
import { extractOrderNumber, normalizeText } from "../shared/text-utils"
import type { NormalizedChatInput } from "./input-normalizer"

export type IntentToolMappingResult = {
  route: ToolRoute | null
  clarificationReply?: string
  reason?: string
}

function hasText(value: string | undefined): value is string {
  return Boolean(value?.trim())
}

function createRoute(
  toolName: ToolRoute["toolName"],
  params: ToolRoute["params"],
  intentResult: IntentExtractionResult,
  reason: string
): IntentToolMappingResult {
  return {
    route: {
      toolName,
      params,
      confidence: intentResult.confidence,
      reason: intentResult.reason || reason,
    },
    reason,
  }
}

function resolveProduct(intentResult: IntentExtractionResult, context: ChatContext) {
  return intentResult.entities.product || context.lastProductName
}

function resolveOrderNumber(intentResult: IntentExtractionResult, input: NormalizedChatInput, context: ChatContext) {
  return intentResult.entities.orderNumber
    || extractOrderNumber(input.original)
    || extractOrderNumber(input.normalized)
    || context.lastOrderNumber
}

function hasStructuredProductContext(intentResult: IntentExtractionResult, input: NormalizedChatInput) {
  return Boolean(
    intentResult.entities.productType
      || intentResult.entities.usage
      || intentResult.entities.category
      || intentResult.entities.categorySlug
      || intentResult.entities.useCase
      || intentResult.entities.brand
      || intentResult.entities.minPrice
      || intentResult.entities.maxPrice
      || input.budget.minPrice
      || input.budget.maxPrice
  )
}

function resolveEntityQuery(intentResult: IntentExtractionResult) {
  return [
    intentResult.entities.query,
    intentResult.entities.product,
    intentResult.entities.brand,
    intentResult.entities.category,
  ].filter(Boolean).join(" ").trim()
}

function resolveQuery(intentResult: IntentExtractionResult, input: NormalizedChatInput) {
  const entityQuery = resolveEntityQuery(intentResult)
  if (entityQuery) return entityQuery
  if (hasStructuredProductContext(intentResult, input)) return undefined

  return input.normalized || input.original
}

function resolveProductType(intentResult: IntentExtractionResult, input: NormalizedChatInput) {
  const currentText = normalizeText([input.original, input.normalized, resolveEntityQuery(intentResult)].filter(Boolean).join(" "))

  if (/\b(laptop|may tinh xach tay)\b/.test(currentText)) return "Laptop"
  if (/\b(man hinh|monitor)\b/.test(currentText)) return "Monitor"
  if (/\b(pc|desktop|may bo|bo pc|bo may)\b/.test(currentText)) return "PC"

  return intentResult.entities.productType
}

export function mapIntentToToolRoute(
  intentResult: IntentExtractionResult,
  input: NormalizedChatInput,
  context: ChatContext = {}
): IntentToolMappingResult {
  if (intentResult.intent === "search_product") {
    const hasNeedBasedSignals = Boolean(intentResult.entities.usage || intentResult.entities.useCase)

    if (hasNeedBasedSignals) {
      return createRoute(
        "recommendProducts",
        {
          query: resolveQuery(intentResult, input),
          productType: resolveProductType(intentResult, input),
          usage: intentResult.entities.usage,
          category: intentResult.entities.category,
          categorySlug: intentResult.entities.categorySlug,
          useCase: intentResult.entities.useCase,
          minPrice: intentResult.entities.minPrice || input.budget.minPrice,
          maxPrice: intentResult.entities.maxPrice || input.budget.maxPrice,
          budgetMode: intentResult.entities.budgetMode || input.budget.budgetMode,
        },
        intentResult,
        "Mapped search_product intent with usage/useCase to recommendProducts"
      )
    }

    return createRoute(
      "searchProducts",
      {
        query: resolveQuery(intentResult, input),
        productType: resolveProductType(intentResult, input),
        usage: intentResult.entities.usage,
        category: intentResult.entities.category,
        categorySlug: intentResult.entities.categorySlug,
        minPrice: intentResult.entities.minPrice || input.budget.minPrice,
        maxPrice: intentResult.entities.maxPrice || input.budget.maxPrice,
        budgetMode: intentResult.entities.budgetMode || input.budget.budgetMode,
      },
      intentResult,
      "Mapped search_product intent to searchProducts"
    )
  }

  if (intentResult.intent === "recommend_product") {
    return createRoute(
      "recommendProducts",
      {
        query: resolveQuery(intentResult, input),
        productType: resolveProductType(intentResult, input),
        usage: intentResult.entities.usage,
        category: intentResult.entities.category,
        categorySlug: intentResult.entities.categorySlug,
        useCase: intentResult.entities.useCase,
        minPrice: intentResult.entities.minPrice || input.budget.minPrice,
        maxPrice: intentResult.entities.maxPrice || input.budget.maxPrice,
        budgetMode: intentResult.entities.budgetMode || input.budget.budgetMode,
      },
      intentResult,
      "Mapped recommend_product intent to recommendProducts"
    )
  }

  if (intentResult.intent === "ask_product_detail" || intentResult.intent === "ask_product_price") {
    const product = resolveProduct(intentResult, context)

    if (!hasText(product)) {
      return {
        route: null,
        clarificationReply: "Bạn muốn xem giá hoặc thông tin chi tiết của sản phẩm nào ạ?",
        reason: "Missing product entity for product detail intent",
      }
    }

    return createRoute(
      "getProductDetail",
      { product },
      intentResult,
      `Mapped ${intentResult.intent} intent to getProductDetail`
    )
  }

  if (intentResult.intent === "check_inventory") {
    const product = resolveProduct(intentResult, context)

    if (!hasText(product)) {
      return {
        route: null,
        clarificationReply: "Bạn muốn kiểm tra tồn kho sản phẩm nào ạ?",
        reason: "Missing product entity for inventory intent",
      }
    }

    return createRoute("checkInventory", { product }, intentResult, "Mapped check_inventory intent to checkInventory")
  }

  if (intentResult.intent === "ask_faq_policy") {
    return createRoute(
      "searchFAQ",
      { query: intentResult.entities.query || input.normalized || input.original },
      intentResult,
      "Mapped ask_faq_policy intent to searchFAQ"
    )
  }

  if (intentResult.intent === "ask_promotion") {
    return createRoute(
      "searchFAQ",
      { query: intentResult.entities.query || "khuyến mãi voucher mã giảm giá" },
      intentResult,
      "Mapped ask_promotion intent to searchFAQ"
    )
  }

  if (intentResult.intent === "check_order_status") {
    const orderNumber = resolveOrderNumber(intentResult, input, context)

    if (!hasText(orderNumber)) {
      return {
        route: null,
        clarificationReply: "Bạn gửi mình mã đơn hàng để mình kiểm tra trạng thái đơn nhé.",
        reason: "Missing order number for order status intent",
      }
    }

    return createRoute(
      "checkOrderStatus",
      { orderNumber },
      intentResult,
      "Mapped check_order_status intent to checkOrderStatus"
    )
  }

  return {
    route: null,
    reason: `Intent does not map to a tool: ${intentResult.intent}`,
  }
}
