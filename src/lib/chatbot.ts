import { generateText } from "ai"
import { createOpenRouter } from "@openrouter/ai-sdk-provider"
import type { RowDataPacket } from "mysql2/promise"

import { execute, query } from "@/lib/db"

type ChatbotSource = "tool_router" | "chatbot" | "ai_fallback"

type ChatbotToolName =
  | "searchFAQ"
  | "searchProducts"
  | "getProductDetail"
  | "checkInventory"
  | "checkOrderStatus"

type ToolRoute = {
  toolName: ChatbotToolName
  params: {
    query?: string
    product?: string
    orderNumber?: string
  }
  confidence: number
  reason?: string
}

type ToolExecutionResult = {
  reply: string
  data?: unknown
  toolName?: ChatbotToolName
  source?: ChatbotSource
  hasData?: boolean
}

type FaqRow = RowDataPacket & {
  id: string
  title?: string | null
  question?: string | null
  content?: string | null
  answer?: string | null
  keywords?: string | null
}

type ProductRow = RowDataPacket & {
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

type ChatMessageRow = RowDataPacket & {
  id: string
  role: "user" | "assistant"
  content: string
  metadata: string | null
  created_at: Date | string
}

type ChatSessionRow = RowDataPacket & {
  session_id: string
  created_at: Date | string
  latest_content: string | null
}

type ProductVariantRow = RowDataPacket & {
  id: string
  product_id: string
  name: string
  stock: number
  price_override: number | string | null
  attributes: string | null
  is_active: number | boolean
}

type ProductDetailRow = RowDataPacket & {
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

type OrderLookupRow = RowDataPacket & {
  id: string
  order_number: string
  status: string
  payment_status: string
  total: number | string
  created_at: Date | string
}

const FAQ_FALLBACK = [
  {
    id: "shipping-policy",
    title: "Chính sách giao hàng",
    content: "Shop hỗ trợ giao hàng toàn quốc. Thời gian nhận hàng thường từ 2-5 ngày làm việc tùy khu vực.",
    keywords: "giao hàng, ship, vận chuyển, bao lâu nhận",
  },
  {
    id: "payment-guide",
    title: "Hướng dẫn thanh toán",
    content: "Bạn có thể đặt hàng, kiểm tra giỏ hàng, nhập thông tin nhận hàng và chọn phương thức thanh toán phù hợp ở bước checkout.",
    keywords: "thanh toán, cod, checkout, trả tiền",
  },
  {
    id: "return-policy",
    title: "Chính sách đổi trả",
    content: "Nếu sản phẩm có lỗi hoặc không đúng mô tả, bạn có thể liên hệ chăm sóc khách hàng để được hỗ trợ đổi trả theo chính sách hiện hành.",
    keywords: "đổi trả, hoàn tiền, bảo hành",
  },
] as const

const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "google/gemini-2.5-flash"
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY

const openrouter = OPENROUTER_API_KEY
  ? createOpenRouter({
      apiKey: OPENROUTER_API_KEY,
    })
  : null

function normalizeText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
}

function tokenizeText(value: string) {
  return normalizeText(value)
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 2)
}

function getMeaningfulTokens(message: string) {
  const stopwords = new Set([
    "la",
    "lao",
    "toi",
    "minh",
    "shop",
    "co",
    "cho",
    "xin",
    "voi",
    "ve",
    "va",
    "hay",
    "neu",
    "thi",
    "duoc",
    "khong",
    "nao",
    "the",
    "giup",
    "gi",
    "mot",
    "cac",
    "nhung",
    "nhe",
    "nha",
    "a",
    "ah",
    "ua",
  ])

  return tokenizeText(message).filter((token) => !stopwords.has(token))
}

function extractProductKeyword(message: string) {
  return message
    .replace(/giá|bao nhiêu|sale|còn hàng không|còn hàng|hết hàng|tồn kho|stock|sản phẩm|tìm|xem|mua/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
}


function extractJsonObject(text: string) {
  const trimmed = text.trim()
  if (!trimmed) return ""

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim()
  }

  const firstBrace = trimmed.indexOf("{")
  const lastBrace = trimmed.lastIndexOf("}")

  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1)
  }

  return trimmed
}

async function searchFaq(message: string) {
  const normalizedMessage = normalizeText(message)
  const tokens = getMeaningfulTokens(message)

  try {
    const [rows] = await query<FaqRow[]>(
      `SELECT id, title, question, content, answer, keywords
       FROM chatbot_faq
       WHERE is_active = true`
    )

    const scored = rows
      .map((row) => {
        const title = row.title ?? row.question ?? "FAQ"
        const content = row.content ?? row.answer ?? ""
        const question = row.question ?? ""
        const answer = row.answer ?? ""
        const keywords = row.keywords ?? ""
        const haystack = normalizeText(`${title} ${question} ${content} ${answer} ${keywords}`)
        const normalizedTitle = normalizeText(title)
        const normalizedQuestion = normalizeText(question)
        const normalizedKeywords = normalizeText(keywords)

        let score = 0

        if (normalizedMessage && haystack.includes(normalizedMessage)) score += 8
        if (normalizedMessage && normalizedTitle.includes(normalizedMessage)) score += 6
        if (normalizedMessage && normalizedQuestion.includes(normalizedMessage)) score += 6

        for (const token of tokens) {
          if (!token) continue
          if (normalizedTitle.includes(token)) score += 4
          if (normalizedQuestion.includes(token)) score += 4
          if (normalizedKeywords.includes(token)) score += 3
          if (haystack.includes(token)) score += 2
        }

        return {
          id: row.id,
          title,
          content,
          keywords,
          score,
        }
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)

    return scored.map((item) => ({
      id: item.id,
      title: item.title,
      content: item.content,
      keywords: item.keywords,
    }))
  } catch {
    return FAQ_FALLBACK.filter((item) => {
      const haystack = normalizeText(`${item.title} ${item.content} ${item.keywords}`)
      return tokens.some((token) => token && haystack.includes(token))
    }).slice(0, 3)
  }
}

function buildProductSearchTerms(keyword: string) {
  const normalizedKeyword = normalizeText(keyword)
  const tokens = getMeaningfulTokens(keyword)

  return Array.from(new Set([normalizedKeyword, ...tokens])).filter((term) => term.length >= 2)
}

function scoreProductMatch(product: ProductRow, keyword: string) {
  const terms = buildProductSearchTerms(keyword)
  if (!terms.length) return 0

  const name = normalizeText(product.name)
  const brand = normalizeText(product.brand_name ?? "")
  const category = normalizeText(product.category_name ?? "")
  const description = normalizeText(product.short_description ?? "")
  const haystack = `${name} ${brand} ${category} ${description}`
  const phrase = normalizeText(keyword)

  let score = 0

  if (phrase && name.includes(phrase)) score += 12
  if (phrase && haystack.includes(phrase)) score += 8

  for (const term of terms) {
    if (name.includes(term)) score += 5
    else if (brand.includes(term)) score += 4
    else if (category.includes(term)) score += 3
    else if (description.includes(term)) score += 2
  }

  return score
}

function mapProductRow(product: ProductRow) {
  return {
    ...product,
    price: product.price?.toString?.() ?? "0",
    sale_price: product.sale_price?.toString?.() ?? null,
    stock: Number(product.stock ?? 0),
  }
}

async function findMatchingProducts(keyword: string, limit = 5) {
  if (!keyword) return []

  const terms = buildProductSearchTerms(keyword)
  if (!terms.length) return []

  const likeParams = terms.flatMap((term) => {
    const like = `%${term}%`
    return [like, like, like]
  })

  const whereClause = terms
    .map(
      () => `(
        p.name LIKE ?
        OR COALESCE(br.name, '') LIKE ?
        OR COALESCE(c.name, '') LIKE ?
      )`
    )
    .join(" OR ")

  const [rows] = await query<ProductRow[]>(
    `SELECT
       p.id,
       p.name,
       p.slug,
       p.short_description,
       p.price,
       p.sale_price,
       p.stock,
       p.thumbnail_url,
       br.name AS brand_name,
       c.name AS category_name
     FROM products p
     LEFT JOIN brands br ON br.id = p.brand_id
     LEFT JOIN categories c ON c.id = p.category_id
     WHERE p.is_active = true
       AND (${whereClause})
     ORDER BY p.created_at DESC
     LIMIT 30`,
    likeParams
  )

  return rows
    .map((product) => ({
      ...mapProductRow(product),
      matchScore: scoreProductMatch(product, keyword),
    }))
    .filter((product) => product.matchScore > 0)
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, limit)
    .map((product) => ({
      id: product.id,
      name: product.name,
      slug: product.slug,
      short_description: product.short_description,
      price: product.price,
      sale_price: product.sale_price,
      stock: product.stock,
      thumbnail_url: product.thumbnail_url,
      brand_name: product.brand_name,
      category_name: product.category_name,
    }))
}

async function findProductByName(keyword: string) {
  const products = await findMatchingProducts(keyword, 1)
  return products[0] ?? null
}

async function searchProducts(keyword: string) {
  return findMatchingProducts(keyword, 5)
}

function formatCurrency(value: string | number | null | undefined) {
  const amount = Number(value ?? 0)
  if (!Number.isFinite(amount)) return "0đ"

  return `${amount.toLocaleString("vi-VN")}đ`
}

async function getProductDetail(keyword: string) {
  const matchedProduct = await findProductByName(keyword)
  if (!matchedProduct) return null

  const [rows] = await query<ProductDetailRow[]>(
    `SELECT
       p.id,
       p.name,
       p.slug,
       p.short_description,
       p.description,
       p.price,
       p.sale_price,
       p.stock,
       p.thumbnail_url,
       c.name AS category_name,
       b.name AS brand_name
     FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     LEFT JOIN brands b ON b.id = p.brand_id
     WHERE p.id = ?
     LIMIT 1`,
    [matchedProduct.id]
  )

  const product = rows[0]
  if (!product) return null

  const [variantRows] = await query<ProductVariantRow[]>(
    `SELECT id, product_id, name, stock, price_override, attributes, is_active
     FROM product_variants
     WHERE product_id = ?
     ORDER BY name ASC`,
    [product.id]
  )

  return {
    ...product,
    price: product.price?.toString?.() ?? "0",
    sale_price: product.sale_price?.toString?.() ?? null,
    stock: Number(product.stock ?? 0),
    variants: variantRows.map((variant) => ({
      id: variant.id,
      name: variant.name,
      stock: Number(variant.stock ?? 0),
      price_override: variant.price_override?.toString?.() ?? null,
      is_active: Boolean(variant.is_active),
    })),
  }
}

async function checkInventory(keyword: string) {
  const product = await getProductDetail(keyword)
  if (!product) return null

  const activeVariants = Array.isArray(product.variants)
    ? product.variants.filter((variant) => variant.is_active)
    : []

  return {
    id: product.id,
    name: product.name,
    brand_name: product.brand_name,
    category_name: product.category_name,
    stock: product.stock,
    variants: activeVariants,
  }
}

function formatProductLabel(product: {
  name: string
  brand_name?: string | null
  category_name?: string | null
}) {
  const extras = [product.brand_name, product.category_name].filter(Boolean).join(" • ")
  return extras ? `${product.name} (${extras})` : product.name
}

function formatProductSearchReply(products: Array<{
  name: string
  brand_name?: string | null
  category_name?: string | null
}>) {
  const preview = products.slice(0, 3).map((product) => formatProductLabel(product)).join(", ")
  return products.length > 3
    ? `Mình tìm thấy ${products.length} sản phẩm phù hợp. Nổi bật gồm: ${preview}.`
    : `Mình tìm thấy ${products.length} sản phẩm phù hợp: ${preview}.`
}

function formatProductDetailReply(product: {
  name: string
  price: string | number
  sale_price?: string | number | null
  short_description?: string | null
  brand_name?: string | null
  category_name?: string | null
  variants?: Array<{ name: string; stock: number; is_active: boolean }>
}) {
  const intro = formatProductLabel(product)
  const priceText = product.sale_price
    ? `${intro} hiện có giá ${formatCurrency(product.sale_price)}. Giá niêm yết là ${formatCurrency(product.price)}.`
    : `${intro} hiện có giá ${formatCurrency(product.price)}.`
  const descriptionText = product.short_description ? ` ${product.short_description}` : ""
  const activeVariants = Array.isArray(product.variants) ? product.variants.filter((variant) => variant.is_active) : []
  const variantText = activeVariants.length
    ? ` Hiện có ${activeVariants.length} biến thể đang hoạt động.`
    : ""

  return `${priceText}${descriptionText}${variantText}`
}

function formatInventoryReply(inventory: {
  name: string
  brand_name?: string | null
  category_name?: string | null
  stock: number
  variants?: Array<{ name: string; stock: number }>
}) {
  const intro = formatProductLabel(inventory)
  if (inventory.stock <= 0) {
    return `${intro} hiện đang hết hàng.`
  }

  const topVariants = Array.isArray(inventory.variants)
    ? inventory.variants
        .slice(0, 2)
        .map((variant) => `${variant.name}: ${variant.stock}`)
        .join(", ")
    : ""

  return topVariants
    ? `${intro} hiện còn hàng. Tồn kho tổng là ${inventory.stock}. Một số biến thể: ${topVariants}.`
    : `${intro} hiện còn hàng. Số lượng tồn kho hiện tại là ${inventory.stock}.`
}

async function checkOrderStatus(orderNumber: string) {
  if (!orderNumber) return null

  const [rows] = await query<OrderLookupRow[]>(
    `SELECT id, order_number, status, payment_status, total, created_at
     FROM orders
     WHERE order_number = ?
     LIMIT 1`,
    [orderNumber]
  )

  const order = rows[0]
  if (!order) return null

  return {
    id: order.id,
    order_number: order.order_number,
    status: order.status,
    payment_status: order.payment_status,
    total: order.total?.toString?.() ?? "0",
    created_at: order.created_at instanceof Date ? order.created_at.toISOString() : String(order.created_at),
  }
}

function extractOrderNumber(message: string) {
  const contextualMatch =
    message.match(/(?:mã đơn|ma don|đơn hàng|don hang|order)\s*[:#-]?\s*([A-Za-z]{1,5}\d{2,}|[A-Z]{2,}[0-9]{2,}|[A-Z0-9_-]{6,})/i) ??
    message.match(/#([A-Za-z]{1,5}\d{2,}|[A-Z]{2,}[0-9]{2,}|[A-Z0-9_-]{6,})/)

  if (contextualMatch) {
    return contextualMatch[1] ?? contextualMatch[0]?.replace(/^#/, "") ?? ""
  }

  const standaloneMatch = message.match(/\b([A-Z]{2,}[0-9]{2,}|[A-Z0-9_-]{8,})\b/)
  return standaloneMatch?.[1] ?? ""
}

function isOrderStatusMessage(message: string) {
  const normalized = normalizeText(message)
  const hasOrderKeyword = ["don hang", "ma don", "order", "trang thai don", "kiem tra don"].some((keyword) => normalized.includes(keyword))
  return hasOrderKeyword || Boolean(extractOrderNumber(message))
}


async function executeChatTool(route: ToolRoute): Promise<ToolExecutionResult | null> {
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

async function ensureChatSession(sessionId?: string) {
  const resolvedSessionId = sessionId?.trim() || crypto.randomUUID()

  const [rows] = await query<RowDataPacket[]>(
    `SELECT id FROM chat_sessions WHERE id = ? LIMIT 1`,
    [resolvedSessionId]
  )

  if (!rows[0]) {
    await execute(
      `INSERT INTO chat_sessions (id, user_id, session_token)
       VALUES (?, NULL, ?)`,
      [resolvedSessionId, resolvedSessionId]
    )
  }

  return resolvedSessionId
}

async function saveChatMessage(
  sessionId: string,
  role: "user" | "assistant",
  content: string,
  metadata?: Record<string, unknown>
) {
  const id = crypto.randomUUID()

  await execute(
    `INSERT INTO chat_messages (id, session_id, role, content, metadata)
     VALUES (?, ?, ?, ?, ?)`,
    [id, sessionId, role, content, metadata ? JSON.stringify(metadata) : null]
  )
}

export async function getChatHistory(sessionId?: string): Promise<ChatHistoryMessage[]> {
  const resolvedSessionId = sessionId?.trim()
  if (!resolvedSessionId) return []

  const [rows] = await query<ChatMessageRow[]>(
    `SELECT id, role, content, metadata, created_at
     FROM chat_messages
     WHERE session_id = ?
     ORDER BY created_at ASC`,
    [resolvedSessionId]
  )

  return rows.map((row) => ({
    id: row.id,
    role: row.role,
    content: row.content,
    createdAt:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : String(row.created_at),
  }))
}

export async function getChatSessions(currentSessionId?: string): Promise<ChatSessionSummary[]> {
  const [rows] = await query<ChatSessionRow[]>(
    `SELECT
       cs.id AS session_id,
       cs.created_at,
       (
         SELECT cm.content
         FROM chat_messages cm
         WHERE cm.session_id = cs.id
         ORDER BY cm.created_at DESC
         LIMIT 1
       ) AS latest_content
     FROM chat_sessions cs
     ORDER BY cs.created_at DESC
     LIMIT 10`
  )

  return rows.map((row, index) => {
    const preview = (row.latest_content ?? "Chưa có nội dung").trim()
    const title = index === 0 ? "Cuộc trò chuyện gần nhất" : `Cuộc trò chuyện #${index + 1}`

    return {
      sessionId: row.session_id,
      title,
      preview: preview.length > 72 ? `${preview.slice(0, 72)}...` : preview,
      createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
      isCurrent: currentSessionId?.trim() === row.session_id,
    }
  })
}

async function routeMessageToTool(message: string): Promise<ToolRoute | null> {
  if (!openrouter) return null

  try {
    const result = await generateText({
      model: openrouter(OPENROUTER_MODEL),
      temperature: 0,
      maxOutputTokens: 120,
      system: [
        "Bạn là bộ định tuyến tool cho chatbot chăm sóc khách hàng ecommerce.",
        "Nhiệm vụ của bạn là chọn đúng 1 tool phù hợp nhất cho tin nhắn người dùng.",
        "Chỉ được chọn 1 trong 5 tool: searchFAQ, searchProducts, getProductDetail, checkInventory, checkOrderStatus.",
        "Ưu tiên chọn tool dựa trên ý định hành động thực tế của người dùng, không trả lời thay cho tool.",
        "Nếu người dùng hỏi giao hàng, vận chuyển, ship, thanh toán, đổi trả, hoàn tiền, bảo hành, chính sách, COD hoặc checkout thì chọn searchFAQ.",
        "Nếu người dùng muốn tìm sản phẩm, xem các sản phẩm phù hợp, gợi ý sản phẩm thì chọn searchProducts.",
        "Nếu người dùng hỏi giá, thông tin chi tiết, mô tả hoặc thông số của một sản phẩm cụ thể thì chọn getProductDetail.",
        "Nếu người dùng hỏi còn hàng không, hết hàng, tồn kho hoặc stock của sản phẩm thì chọn checkInventory.",
        "Nếu người dùng hỏi trạng thái đơn hàng hoặc cung cấp mã đơn thì chọn checkOrderStatus.",
        "Nếu câu hỏi mơ hồ nhưng vẫn gần với một tool, hãy chọn tool gần nhất thay vì trả về null.",
        "Với searchFAQ dùng params.query. Với searchProducts dùng params.query. Với getProductDetail và checkInventory dùng params.product. Với checkOrderStatus dùng params.orderNumber nếu thấy mã đơn, nếu chưa có thì để chuỗi rỗng.",
        "confidence là số từ 0 đến 1. reason là mô tả rất ngắn lý do chọn tool.",
        "Phải trả về JSON thuần với dạng: {\"toolName\": string, \"params\": {\"query\"?: string, \"product\"?: string, \"orderNumber\"?: string}, \"confidence\": number, \"reason\"?: string }.",
        "Không bọc markdown. Không thêm giải thích ngoài JSON.",
      ].join(" "),
      prompt: `Tin nhắn người dùng: ${message}`,
    })

    const raw = result.text.trim()
    const jsonText = extractJsonObject(raw)
    const parsed = JSON.parse(jsonText) as ToolRoute

    if (
      !parsed?.toolName ||
      ![
        "searchFAQ",
        "searchProducts",
        "getProductDetail",
        "checkInventory",
        "checkOrderStatus",
      ].includes(parsed.toolName) ||
      typeof parsed.confidence !== "number"
    ) {
      return null
    }

    return parsed
  } catch {
    return null
  }
}

async function generateHybridFallback(message: string): Promise<{
  reply: string
  data: {
    provider: string
    model: string
  }
  source: ChatbotSource
  hasData: boolean
} | null> {
  if (!openrouter) return null

  try {
    const result = await generateText({
      model: openrouter(OPENROUTER_MODEL),
      temperature: 0.3,
      maxOutputTokens: 220,
      system: [
        "Bạn là chatbot chăm sóc khách hàng cho website thương mại điện tử.",
        "Không dùng embedding. Chỉ trả lời ngắn gọn, tự nhiên, dễ hiểu bằng tiếng Việt.",
        "Không được tự bịa giá sản phẩm, tồn kho, mã giảm giá, chính sách cụ thể nếu không có dữ liệu DB xác nhận.",
        "Nếu người dùng hỏi giá hoặc tồn kho nhưng hệ thống chưa tìm thấy dữ liệu chính xác, hãy nói rõ chưa tìm thấy và đề nghị người dùng cung cấp tên sản phẩm cụ thể hơn.",
        "Bạn có thể hỗ trợ các câu hỏi FAQ phổ biến, hướng dẫn mua hàng, thanh toán, giao hàng, đổi trả ở mức tổng quát.",
      ].join(" "),
      prompt: message,
    })

    const reply = result.text.trim()
    if (!reply) return null

    return {
      reply,
      data: {
        provider: "openrouter",
        model: OPENROUTER_MODEL,
      },
      source: "ai_fallback",
      hasData: true,
    }
  } catch {
    return null
  }
}

export async function handleChatbotMessage(message: string, sessionId?: string): Promise<ChatbotApiResponse> {
  const resolvedSessionId = await ensureChatSession(sessionId)
  const normalized = normalizeText(message)

  if (!normalized) {
    return {
      sessionId: resolvedSessionId,
      reply: "Vui lòng nhập nội dung cần hỗ trợ.",
      source: "chatbot",
      hasData: false,
    }
  }

  const extractedOrderNumber = extractOrderNumber(message)
  const hasOrderIntent = isOrderStatusMessage(message)

  await saveChatMessage(resolvedSessionId, "user", message)

  const activeRoute = hasOrderIntent
    ? extractedOrderNumber
      ? {
          toolName: "checkOrderStatus" as const,
          params: {
            orderNumber: extractedOrderNumber,
          },
          confidence: 1,
          reason: "Direct order status heuristic",
        }
      : null
    : await routeMessageToTool(message)

  const preparedRoute = activeRoute
    ? {
        ...activeRoute,
        params: {
          query:
            activeRoute.params?.query ??
            (activeRoute.toolName === "searchFAQ" ? message : extractProductKeyword(message) || message),
          product:
            activeRoute.params?.product ??
            (activeRoute.toolName === "getProductDetail" || activeRoute.toolName === "checkInventory"
              ? extractProductKeyword(message) || message
              : undefined),
          orderNumber:
            activeRoute.params?.orderNumber ??
            (activeRoute.toolName === "checkOrderStatus" ? extractedOrderNumber : undefined),
        },
      }
    : null

  let result: Omit<ChatbotApiResponse, "sessionId">

  const toolResult = preparedRoute ? await executeChatTool(preparedRoute) : null
  const shouldUseToolResult = Boolean(
    toolResult && (toolResult.data || (preparedRoute && (preparedRoute.confidence >= 0.75 || preparedRoute.toolName === "checkOrderStatus")))
  )

  if (shouldUseToolResult && toolResult) {
    result = {
      reply: toolResult.reply,
      data: toolResult.data,
      toolName: toolResult.toolName,
      source: "tool_router",
      hasData: Boolean(toolResult.data),
    }
  } else if (hasOrderIntent) {
    result = extractedOrderNumber
      ? {
          reply: "Mình chưa tìm thấy đơn hàng phù hợp. Bạn vui lòng kiểm tra lại mã đơn hàng nhé.",
          toolName: "checkOrderStatus",
          source: "chatbot",
          hasData: false,
        }
      : {
          reply: "Bạn vui lòng cung cấp mã đơn hàng để mình kiểm tra trạng thái đơn nhé.",
          toolName: "checkOrderStatus",
          source: "chatbot",
          hasData: false,
        }
  } else {
    result = {
      reply: "Mình có thể hỗ trợ FAQ, kiểm tra giá, tồn kho, thông tin sản phẩm hoặc trạng thái đơn hàng. Bạn hãy nhập câu hỏi cụ thể hơn nhé.",
      source: "chatbot",
      hasData: false,
    }
  }

  const shouldUseAiFallback = !result.hasData && result.toolName !== "checkOrderStatus"

  const aiResult = shouldUseAiFallback ? await generateHybridFallback(message) : null
  const finalResultBase = aiResult ?? result
  const finalSource: ChatbotSource = aiResult ? "ai_fallback" : result.source
  const finalToolName = aiResult ? undefined : result.toolName
  const finalHasData = Boolean(finalResultBase.data)
  const finalResult: ChatbotApiResponse = {
    sessionId: resolvedSessionId,
    reply: finalResultBase.reply,
    data: finalResultBase.data,
    toolName: finalToolName,
    source: finalSource,
    hasData: finalHasData,
  }

  await saveChatMessage(resolvedSessionId, "assistant", finalResult.reply, {
    source: finalResult.source,
    hasData: finalResult.hasData,
    toolName: finalResult.toolName,
    routing: {
      source: finalResult.source,
      toolName: finalResult.toolName,
      hasData: finalResult.hasData,
      confidence: preparedRoute?.confidence,
      reason: preparedRoute?.reason,
    },
    provider:
      aiResult && typeof finalResult.data === "object" && finalResult.data && "provider" in finalResult.data
        ? (finalResult.data as { provider?: string }).provider
        : undefined,
    model:
      aiResult && typeof finalResult.data === "object" && finalResult.data && "model" in finalResult.data
        ? (finalResult.data as { model?: string }).model
        : undefined,
  })

  return finalResult
}
