import { query } from "@/lib/db"
import { extractBudgetRange, normalizeText } from "../shared/text-utils"
import { detectUsage } from "../core/signal-detector"
import type {
  ChatIntent,
  ChatMessageRow,
  ChatbotToolName,
  ConversationState,
  IntentEntities,
  ToolRoute,
} from "../shared/types"

type ProductContextItem = {
  id?: string
  name: string
}

type StoredChatMetadata = {
  toolName?: ChatbotToolName
  entities?: ChatContext
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

export type ChatContext = {
  lastOrderNumber?: string
  lastProductId?: string
  lastProductName?: string
  lastProducts?: ProductContextItem[]
  lastMinPrice?: number
  lastMaxPrice?: number
  lastUseCase?: string
  lastProductType?: ToolRoute["params"]["productType"]
  lastProductCategory?: string
  conversationState?: ConversationState
  pendingIntent?: ChatIntent
  pendingEntities?: IntentEntities
  pendingToolName?: ChatbotToolName
  pendingParams?: ToolRoute["params"]
  pendingQuestion?: string
  pendingReason?: string
}

function parseMetadata(metadata: unknown): StoredChatMetadata | null {
  if (!metadata) return null

  if (isRecord(metadata)) return metadata as StoredChatMetadata

  if (typeof metadata !== "string") return null

  try {
    return JSON.parse(metadata) as StoredChatMetadata
  } catch {
    return null
  }
}

function mergeContext(base: ChatContext, next?: ChatContext) {
  if (!next) return base

  const merged: ChatContext = { ...base }

  if (next.lastOrderNumber) merged.lastOrderNumber = next.lastOrderNumber
  if (next.lastProductId) merged.lastProductId = next.lastProductId
  if (next.lastProductName) merged.lastProductName = next.lastProductName
  if (next.lastProducts?.length) merged.lastProducts = next.lastProducts
  if (typeof next.lastMinPrice === "number") merged.lastMinPrice = next.lastMinPrice
  if (typeof next.lastMaxPrice === "number") merged.lastMaxPrice = next.lastMaxPrice
  if (next.lastUseCase) merged.lastUseCase = next.lastUseCase
  if (next.lastProductType) merged.lastProductType = next.lastProductType
  if (next.lastProductCategory) merged.lastProductCategory = next.lastProductCategory
  if (next.conversationState) merged.conversationState = next.conversationState

  if (next.conversationState === "IDLE") {
    delete merged.pendingIntent
    delete merged.pendingEntities
    delete merged.pendingToolName
    delete merged.pendingParams
    delete merged.pendingQuestion
    delete merged.pendingReason
    return merged
  }

  if (next.pendingIntent === null) delete merged.pendingIntent
  else if (next.pendingIntent) merged.pendingIntent = next.pendingIntent
  if (next.pendingEntities === null) delete merged.pendingEntities
  else if (next.pendingEntities) merged.pendingEntities = next.pendingEntities
  if (next.pendingToolName === null) delete merged.pendingToolName
  else if (next.pendingToolName) merged.pendingToolName = next.pendingToolName
  if (next.pendingParams === null) delete merged.pendingParams
  else if (next.pendingParams) merged.pendingParams = next.pendingParams
  if (next.pendingQuestion === null) delete merged.pendingQuestion
  else if (next.pendingQuestion) merged.pendingQuestion = next.pendingQuestion
  if (next.pendingReason === null) delete merged.pendingReason
  else if (next.pendingReason) merged.pendingReason = next.pendingReason

  return merged
}

function extractUseCaseFromMessage(message: string) {
  const usage = detectUsage(message)
  const labels = {
    gaming: "gaming",
    workstation: "render và thiết kế đồ họa",
    office: "học tập, văn phòng hoặc lập trình",
  } as const

  if (usage) return labels[usage]

  const normalized = normalizeText(message)
  if (["laptop", "may tinh xach tay", "mong nhe"].some((keyword) => normalized.includes(keyword))) {
    return "laptop"
  }

  return undefined
}

export async function getChatContext(sessionId: string): Promise<ChatContext> {
  const [rows] = await query<ChatMessageRow[]>(
    `SELECT id, role, content, metadata, created_at
     FROM chat_messages
     WHERE session_id = ?
     ORDER BY created_at DESC, id DESC
     LIMIT 12`,
    [sessionId]
  )

  return rows.reverse().reduce<ChatContext>((context, row) => {
    if (row.role === "user") {
      const budget = extractBudgetRange(row.content)
      return mergeContext(context, {
        lastMinPrice: budget.minPrice,
        lastMaxPrice: budget.maxPrice,
        lastUseCase: extractUseCaseFromMessage(row.content),
      })
    }

    const metadata = parseMetadata(row.metadata)
    return mergeContext(context, metadata?.entities)
  }, {})
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined
}

function extractProductEntity(value: unknown): ProductContextItem | null {
  if (!isRecord(value)) return null

  const name = readString(value.name)
  if (!name) return null

  return {
    id: readString(value.id),
    name,
  }
}

function isProductContextItem(product: ProductContextItem | null): product is ProductContextItem {
  return Boolean(product)
}

/**
 * Suy productType/category/useCase từ category_name của các sản phẩm kết quả.
 * Đây là nguồn context bền nhất: luôn có dữ liệu kể cả lượt follow-up budget-only
 * ("20tr") khi LLM lẫn regex đều không trích được loại sản phẩm từ câu chữ.
 */
function inferFacetsFromResultRows(data: unknown[]): ChatContext {
  const counts = new Map<string, number>()

  for (const row of data) {
    if (!isRecord(row)) continue
    const category = readString(row.category_name)
    if (!category) continue
    counts.set(category, (counts.get(category) ?? 0) + 1)
  }

  if (!counts.size) return {}

  // Majority vote: category xuất hiện nhiều nhất trong tập kết quả.
  const dominantCategory = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0]
  const normalized = normalizeText(dominantCategory)

  if (/laptop/.test(normalized)) {
    return { lastProductType: "Laptop", lastProductCategory: dominantCategory }
  }
  if (/monitor|man hinh/.test(normalized)) {
    return { lastProductType: "Monitor", lastProductCategory: dominantCategory }
  }
  if (/do hoa|lam viec|workstation/.test(normalized)) {
    return { lastProductType: "PC", lastProductCategory: dominantCategory, lastUseCase: "render do hoa thiet ke" }
  }
  if (/gaming|game/.test(normalized)) {
    return { lastProductType: "PC", lastProductCategory: dominantCategory, lastUseCase: "gaming" }
  }
  if (/\bpc\b|may bo|desktop/.test(normalized)) {
    return { lastProductType: "PC", lastProductCategory: dominantCategory }
  }

  return { lastProductCategory: dominantCategory }
}

export function extractContextFromToolResult(toolName: ChatbotToolName | undefined, data: unknown): ChatContext | undefined {
  if (!toolName || !data) return undefined

  if (toolName === "checkOrderStatus" && isRecord(data)) {
    const orderNumber = readString(data.order_number)
    return orderNumber ? { lastOrderNumber: orderNumber } : undefined
  }

  if (toolName === "getProductDetail" || toolName === "checkInventory") {
    const product = extractProductEntity(data)
    return product
      ? {
          lastProductId: product.id,
          lastProductName: product.name,
          lastProducts: [product],
        }
      : undefined
  }

  if ((toolName === "searchProducts" || toolName === "recommendProducts") && Array.isArray(data)) {
    const products = data.map(extractProductEntity).filter(isProductContextItem)

    if (!products.length) return undefined

    return {
      lastProductId: products[0].id,
      lastProductName: products[0].name,
      lastProducts: products.slice(0, 5),
      ...inferFacetsFromResultRows(data),
    }
  }

  return undefined
}
