import type { RowDataPacket } from "mysql2/promise"

export type ChatbotSource = "tool_router" | "chatbot" | "ai_fallback"

export type ChatbotToolName =
  | "searchFAQ"
  | "searchProducts"
  | "recommendProducts"
  | "getProductDetail"
  | "checkInventory"
  | "checkOrderStatus"

export type ToolRoute = {
  toolName: ChatbotToolName
  params: {
    query?: string
    product?: string
    productType?: "PC" | "Laptop" | "Monitor"
    usage?: "gaming" | "workstation" | "office"
    orderNumber?: string
    useCase?: string
    category?: string
    categorySlug?: string
    categoryIds?: string[]
    allowedCategories?: string[]
    forbiddenCategories?: string[]
    minPrice?: number
    maxPrice?: number
    budgetMode?: "approx" | "max" | "min" | "range"
  }
  confidence: number
  reason?: string
}

export type ChatIntent =
  | "search_product"
  | "recommend_product"
  | "ask_product_detail"
  | "ask_product_price"
  | "check_inventory"
  | "ask_faq_policy"
  | "ask_promotion"
  | "check_order_status"
  | "smalltalk"
  | "unclear"
  | "out_of_scope"

export type IntentEntities = {
  query?: string
  product?: string
  productType?: "PC" | "Laptop" | "Monitor"
  usage?: "gaming" | "workstation" | "office"
  category?: string
  categorySlug?: string
  brand?: string
  useCase?: string
  minPrice?: number
  maxPrice?: number
  budgetMode?: "approx" | "max" | "min" | "range"
  orderNumber?: string
}

export type IntentExtractionResult = {
  intent: ChatIntent
  entities: IntentEntities
  confidence: number
  reason?: string
  needsClarification?: boolean
  clarificationQuestion?: string
}

export type IntentConfidenceAction = "execute_tool" | "clarify" | "fallback"

export type ConversationState = "IDLE" | "AWAITING_CLARIFY" | "AWAITING_CONFIRM"

export type PendingConversationState = {
  state: ConversationState
  pendingIntent?: ChatIntent
  pendingEntities?: IntentEntities
  pendingToolName?: ChatbotToolName
  pendingParams?: ToolRoute["params"]
  pendingQuestion?: string
  pendingReason?: string
}

export type ToolExecutionResult = {
  reply: string
  data?: unknown
  toolName?: ChatbotToolName
  source?: ChatbotSource
  hasData?: boolean
}

export type FaqRow = RowDataPacket & {
  id: string
  title?: string | null
  question?: string | null
  content?: string | null
  answer?: string | null
  keywords?: string | null
}

export type ProductRow = RowDataPacket & {
  id: string
  name: string
  slug: string
  short_description: string | null
  price: number | string
  sale_price: number | string | null
  stock: number
  thumbnail_url: string | null
  brand_name?: string | null
  category_name?: string | null
}

export type ChatbotApiResponse = {
  sessionId: string
  reply: string
  data?: unknown
  toolName?: ChatbotToolName
  source: ChatbotSource
  hasData: boolean
}

export type ChatHistoryMessage = {
  id: string
  role: "assistant" | "user"
  content: string
  createdAt?: string
}

export type ChatSessionSummary = {
  sessionId: string
  title: string
  preview: string
  createdAt?: string
  isCurrent?: boolean
}

export type ChatMessageRow = RowDataPacket & {
  id: string
  role: "user" | "assistant"
  content: string
  metadata: string | null
  created_at: Date | string
}

export type ChatSessionRow = RowDataPacket & {
  session_id: string
  created_at: Date | string
  latest_content: string | null
}

export type ProductVariantRow = RowDataPacket & {
  id: string
  product_id: string
  name: string
  stock: number
  price_override: number | string | null
  attributes: string | null
  is_active: number | boolean
}

export type ProductDetailRow = RowDataPacket & {
  id: string
  name: string
  slug: string
  short_description: string | null
  description: string | null
  price: number | string
  sale_price: number | string | null
  stock: number
  thumbnail_url: string | null
  category_name: string | null
  brand_name: string | null
}

export type OrderLookupRow = RowDataPacket & {
  id: string
  order_number: string
  status: string
  payment_status: string
  total: number | string
  created_at: Date | string
}

export type ProductRecommendationIntent = {
  query: string
  productType?: "PC" | "Laptop" | "Monitor"
  usage?: "gaming" | "workstation" | "office"
  useCase?: string
  category?: string
  categoryIds?: string[]
  allowedCategories?: string[]
  forbiddenCategories?: string[]
  minPrice?: number
  maxPrice?: number
  budgetMode?: "approx" | "max" | "min" | "range"
}
