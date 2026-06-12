import { query } from "@/lib/db"
import { extractBudgetRange, normalizeText } from "../shared/text-utils"
import type { ChatMessageRow, ChatbotToolName } from "../shared/types"

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

  return merged
}

function extractUseCaseFromMessage(message: string) {
  const normalized = normalizeText(message)

  if (["render", "do hoa", "thiet ke", "blender", "premiere", "photoshop", "autocad", "workstation"].some((keyword) => normalized.includes(keyword))) {
    return "render và thiết kế đồ họa"
  }

  if (["gaming", "choi game", "game", "valorant", "lol", "pubg", "cs2"].some((keyword) => normalized.includes(keyword))) {
    return "gaming"
  }

  if (["hoc tap", "van phong", "lap trinh", "code"].some((keyword) => normalized.includes(keyword))) {
    return "học tập, văn phòng hoặc lập trình"
  }

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
    }
  }

  return undefined
}
