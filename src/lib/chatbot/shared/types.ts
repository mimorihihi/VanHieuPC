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
    orderNumber?: string
    useCase?: string
    category?: string
    minPrice?: number
    maxPrice?: number
  }
  confidence: number
  reason?: string
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
  useCase?: string
  category?: string
  minPrice?: number
  maxPrice?: number
}
