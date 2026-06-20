import { generateText } from "ai"
import { createOpenRouter } from "@openrouter/ai-sdk-provider"

import { OPENROUTER_API_KEY, OPENROUTER_MODEL } from "../shared/constants"
import { extractJsonObject } from "../shared/text-utils"
import { formatTaxonomyForPrompt, getValidCategorySlugs } from "../stores/category-store"
import type { NormalizedChatInput } from "../core/input-normalizer"
import type { ChatContext } from "../stores/context-store"
import type { ChatIntent, IntentExtractionResult, IntentEntities } from "../shared/types"

export type ClarificationExtractionResult = {
  entities: IntentEntities
  confidence: number
  reason?: string
}

export type LlmConfirmationAnswer = "confirm" | "reject" | "unclear"
export type PendingFollowupClass = "answer" | "new_request"

const openrouter = OPENROUTER_API_KEY
  ? createOpenRouter({
      apiKey: OPENROUTER_API_KEY,
    })
  : null

const validIntents: ChatIntent[] = [
  "search_product",
  "recommend_product",
  "ask_product_detail",
  "ask_product_price",
  "check_inventory",
  "ask_faq_policy",
  "ask_promotion",
  "check_order_status",
  "smalltalk",
  "unclear",
  "out_of_scope",
]

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined
}

function readNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined
}

function readEnum<T extends string>(value: unknown, allowed: readonly T[]): T | undefined {
  const text = readString(value)
  return text && (allowed as readonly string[]).includes(text) ? (text as T) : undefined
}

function readCategorySlug(value: unknown, validSlugs?: Set<string>) {
  const slug = readString(value)
  if (!slug) return undefined
  if (validSlugs && !validSlugs.has(slug)) return undefined
  return slug
}

function sanitizeConfidence(value: unknown) {
  const confidence = readNumber(value)
  if (typeof confidence !== "number") return 0
  return Math.max(0, Math.min(1, confidence))
}

function sanitizeEntities(value: unknown, validSlugs?: Set<string>): IntentEntities {
  if (!isRecord(value)) return {}

  return {
    query: readString(value.query),
    product: readString(value.product),
    productType: readEnum(value.productType, ["PC", "Laptop", "Monitor"] as const),
    usage: readEnum(value.usage, ["gaming", "workstation", "office"] as const),
    category: readString(value.category),
    categorySlug: readCategorySlug(value.categorySlug, validSlugs),
    brand: readString(value.brand),
    useCase: readString(value.useCase),
    minPrice: readNumber(value.minPrice),
    maxPrice: readNumber(value.maxPrice),
    orderNumber: readString(value.orderNumber),
  }
}

function createUnclearIntent(reason: string): IntentExtractionResult {
  return {
    intent: "unclear",
    entities: {},
    confidence: 0,
    reason,
    needsClarification: true,
    clarificationQuestion: "Bạn muốn tìm sản phẩm, xem giá, kiểm tra tồn kho hay hỏi chính sách ạ?",
  }
}

function formatContextForPrompt(context: ChatContext) {
  return [
    context.lastProductName ? `lastProductName: ${context.lastProductName}` : null,
    context.lastProducts?.length
      ? `lastProducts: ${context.lastProducts.map((product) => product.name).join("; ")}`
      : null,
    context.lastUseCase ? `lastUseCase: ${context.lastUseCase}` : null,
    context.lastProductType ? `lastProductType: ${context.lastProductType}` : null,
    context.lastProductCategory ? `lastProductCategory: ${context.lastProductCategory}` : null,
    context.lastMinPrice || context.lastMaxPrice
      ? `budget: ${context.lastMinPrice ?? "unknown"} - ${context.lastMaxPrice ?? "unknown"} VND`
      : null,
    context.lastOrderNumber ? `lastOrderNumber: ${context.lastOrderNumber}` : null,
  ].filter(Boolean).join("\n") || "Không có ngữ cảnh trước đó."
}

function validateIntentResult(value: unknown, validSlugs?: Set<string>): IntentExtractionResult {
  if (!isRecord(value)) return createUnclearIntent("LLM returned a non-object intent result")

  const intent = readString(value.intent) as ChatIntent | undefined
  if (!intent || !validIntents.includes(intent)) return createUnclearIntent("LLM returned an invalid intent")

  return {
    intent,
    entities: sanitizeEntities(value.entities, validSlugs),
    confidence: sanitizeConfidence(value.confidence),
    reason: readString(value.reason),
    needsClarification: value.needsClarification === true,
    clarificationQuestion: readString(value.clarificationQuestion),
  }
}

function validateClarificationExtractionResult(value: unknown, validSlugs?: Set<string>): ClarificationExtractionResult {
  if (!isRecord(value)) {
    return {
      entities: {},
      confidence: 0,
      reason: "LLM returned a non-object clarification result",
    }
  }

  return {
    entities: sanitizeEntities(value.entities, validSlugs),
    confidence: sanitizeConfidence(value.confidence),
    reason: readString(value.reason),
  }
}

function validateConfirmationAnswer(value: unknown): LlmConfirmationAnswer {
  if (!isRecord(value)) return "unclear"

  const answer = readString(value.answer)
  if (answer === "confirm" || answer === "reject" || answer === "unclear") return answer

  return "unclear"
}

function validatePendingFollowup(value: unknown): PendingFollowupClass {
  if (!isRecord(value)) return "answer"

  const type = readString(value.type)
  if (type === "answer" || type === "new_request") return type

  return "answer"
}

export async function extractMessageIntent(input: NormalizedChatInput, context: ChatContext = {}): Promise<IntentExtractionResult> {
  if (!openrouter) return createUnclearIntent("Missing OpenRouter API key")

  const [taxonomyText, validSlugs] = await Promise.all([formatTaxonomyForPrompt(), getValidCategorySlugs()])

  try {
    const result = await generateText({
      model: openrouter(OPENROUTER_MODEL),
      temperature: 0,
      maxOutputTokens: 280,
      system: [
        "[VAI TRÒ]",
        "Bạn là bộ phân tích intent cho chatbot ecommerce VHPC, không phải chatbot trả lời người dùng.",
        "Nhiệm vụ: suy luận ý định thật và trích xuất entity từ input gốc, input đã normalize và ngữ cảnh gần nhất.",
        "Luôn ưu tiên hiểu theo Input gốc. Gợi ý mở rộng viết tắt chỉ là tham khảo, được phép bỏ qua nếu sai ngữ cảnh.",
        "Chấp nhận sai chính tả, teen code, viết tắt và tiếng Việt không dấu.",

        "[DANH SÁCH INTENT]",
        "Chỉ chọn 1 intent: search_product, recommend_product, ask_product_detail, ask_product_price, check_inventory, ask_faq_policy, ask_promotion, check_order_status, smalltalk, unclear, out_of_scope.",
        "search_product: người dùng đã biết tương đối rõ tên, dòng, thương hiệu, loại hoặc đặc điểm sản phẩm muốn tìm.",
        "recommend_product: người dùng cần tư vấn lựa chọn phù hợp theo nhu cầu sử dụng, ngân sách, game/công việc, cấu hình mong muốn hoặc tình huống mua hàng.",
        "ask_product_detail: hỏi mô tả, cấu hình, thông số, điểm mạnh/yếu hoặc thông tin chi tiết của một sản phẩm cụ thể.",
        "ask_product_price: hỏi giá của một sản phẩm cụ thể; nếu nói 'con này' hãy dùng lastProductName nếu có.",
        "check_inventory: hỏi còn/hết hàng hoặc tình trạng tồn kho của sản phẩm; nếu nói 'con này' hãy dùng lastProductName nếu có.",
        "ask_faq_policy: hỏi quy trình mua hàng, giao/nhận hàng, thanh toán, bảo hành, đổi trả, hoàn tiền hoặc chính sách cửa hàng.",
        "ask_promotion: hỏi ưu đãi, khuyến mãi, mã giảm giá hoặc chương trình giảm giá.",
        "check_order_status: muốn theo dõi trạng thái đơn đã đặt hoặc cung cấp mã đơn hàng.",
        "smalltalk: chào hỏi, cảm ơn, xã giao không cần dữ liệu.",
        "unclear: câu mơ hồ hoặc thiếu thông tin quan trọng để xác định ý định.",
        "out_of_scope: ngoài phạm vi mua hàng ecommerce VHPC.",

        "[QUY TẮC ENTITY]",
        "productType chỉ nhận một trong: PC, Laptop, Monitor. Suy luận theo ngữ nghĩa thực sự của người dùng.",
        "usage chỉ nhận một trong: gaming, workstation, office. gaming cho chơi game/esport; workstation cho render, đồ họa, dựng phim, 3D, AI, lập trình nặng; office cho học tập, văn phòng, lập trình nhẹ.",
        "categorySlug phải khớp CHÍNH XÁC một slug trong phần 'Danh mục hợp lệ'. Nếu không có danh mục phù hợp, để trống categorySlug, tuyệt đối không tự bịa slug.",
        "confidence là số từ 0 đến 1. Không tự bịa entity nếu input hiện tại và context đều không có căn cứ.",

        "[QUY TẮC KẾ THỪA NGỮ CẢNH]",
        "Nếu tin nhắn hiện tại nêu loại sản phẩm hoặc nhu cầu mới rõ ràng, lấy theo tin nhắn hiện tại và KHÔNG để ngữ cảnh cũ ghi đè.",
        "Nếu tin nhắn chỉ tinh chỉnh ngắn như ngân sách, thương hiệu, rẻ hơn, còn khác, đổi màu, đổi hãng, có thể kế thừa productType, usage, category, useCase từ ngữ cảnh gần nhất.",
        "Nếu tin nhắn chỉ có budget và ngữ cảnh gần nhất có lastProductType/lastUseCase/lastProductCategory phù hợp, hãy kế thừa các entity đó.",
        "Nếu không có ngữ cảnh phù hợp, để trống entity còn thiếu, không tự bịa.",

        "[KHI NÀO CẦN CLARIFY]",
        "Nếu thiếu thông tin bắt buộc như product cho hỏi giá/chi tiết/tồn kho, hoặc orderNumber cho trạng thái đơn hàng, đặt needsClarification=true và viết clarificationQuestion ngắn gọn.",
        "Với câu tư vấn sản phẩm đã có productType hoặc usage hoặc category hoặc budget rõ ràng, ưu tiên recommend_product thay vì unclear.",

        "[VÍ DỤ]",
        "Context lastProductType Laptop, lastUseCase gaming; input 'tầm 15tr' => recommend_product, productType Laptop, usage gaming, category Laptop, maxPrice 15000000, confidence cao.",
        "Input 'co con lap nao chs valo tam 15cu ko' => recommend_product, productType Laptop, usage gaming, category Laptop, useCase gaming, maxPrice 15000000, confidence cao.",
        "Input 'ok tìm pc render video 4k' => recommend_product, productType PC, usage workstation, useCase render video 4k, confidence cao.",
        "Input 'có hãy tư vấn cho tôi màn hình gaming' => recommend_product, productType Monitor, usage gaming, category Màn hình, useCase gaming, confidence cao.",
        "Input 'con nay bn tien z' + lastProductName Lenovo LOQ => ask_product_price, product Lenovo LOQ, confidence cao.",
        "Input 'shop co cod ko' => ask_faq_policy, query COD/thanh toán, confidence cao.",
        "Input 'con nay sao' không có context => unclear, needsClarification=true.",

        "[ĐỊNH DẠNG OUTPUT JSON]",
        "Phải trả JSON thuần đúng dạng: {\"intent\": string, \"entities\": {\"query\"?: string, \"product\"?: string, \"productType\"?: \"PC\" | \"Laptop\" | \"Monitor\", \"usage\"?: \"gaming\" | \"workstation\" | \"office\", \"category\"?: string, \"categorySlug\"?: string, \"brand\"?: string, \"useCase\"?: string, \"minPrice\"?: number, \"maxPrice\"?: number, \"orderNumber\"?: string}, \"confidence\": number, \"reason\"?: string, \"needsClarification\"?: boolean, \"clarificationQuestion\"?: string }.",
        "Không bọc markdown. Không thêm giải thích ngoài JSON.",
      ].join("\n"),
      prompt: [
        `Input gốc: ${input.original}`,
        `Input đã normalize: ${input.normalized}`,
        `Gợi ý mở rộng viết tắt (tham khảo, có thể sai, không bắt buộc dùng): ${JSON.stringify(input.expansions)}`,
        `Budget parsed: ${JSON.stringify(input.budget)}`,
        "Ngữ cảnh gần nhất:",
        formatContextForPrompt(context),
        "Danh mục hợp lệ (chọn categorySlug khớp đúng một slug bên dưới):",
        taxonomyText,
      ].join("\n"),
    })

    const raw = result.text.trim()
    const jsonText = extractJsonObject(raw)
    const parsed = JSON.parse(jsonText) as unknown
    return validateIntentResult(parsed, validSlugs)
  } catch {
    return createUnclearIntent("Failed to extract intent from LLM")
  }
}

export async function extractClarificationEntities(
  input: NormalizedChatInput,
  context: ChatContext
): Promise<ClarificationExtractionResult> {
  if (!openrouter) {
    return {
      entities: {},
      confidence: 0,
      reason: "Missing OpenRouter API key",
    }
  }

  const [taxonomyText, validSlugs] = await Promise.all([formatTaxonomyForPrompt(), getValidCategorySlugs()])

  try {
    const result = await generateText({
      model: openrouter(OPENROUTER_MODEL),
      temperature: 0,
      maxOutputTokens: 120,
      system: [
        "Bạn là bộ trích xuất thông tin bổ sung cho chatbot ecommerce VHPC.",
        "User đang trả lời một câu hỏi làm rõ trước đó, KHÔNG được đổi intent chính và KHÔNG được chọn tool.",
        "Chỉ trích xuất entity mới được user bổ sung: query, product, productType, usage, category, categorySlug, brand, useCase, minPrice, maxPrice, orderNumber.",
        "productType chỉ nhận PC, Laptop hoặc Monitor. usage chỉ nhận gaming, workstation hoặc office. Suy luận theo ngữ nghĩa, không dựa keyword cứng.",
        "categorySlug phải khớp CHÍNH XÁC một slug trong phần 'Danh mục hợp lệ'. Nếu không phù hợp, để trống, không tự bịa.",
        "Nếu user chỉ nói ngân sách như '10tr', 'tầm 15 củ', hãy điền maxPrice tương ứng bằng VND.",
        "Nếu user bổ sung nhu cầu như gaming, học tập, render, thiết kế, hãy điền useCase.",
        "Nếu user bổ sung loại sản phẩm như laptop, màn hình, PC, workstation, hãy điền category.",
        "Không tự bịa entity. Không thay đổi pending intent. Không trả lời người dùng.",
        "Phải trả JSON thuần đúng dạng: {\"entities\": {\"query\"?: string, \"product\"?: string, \"productType\"?: \"PC\" | \"Laptop\" | \"Monitor\", \"usage\"?: \"gaming\" | \"workstation\" | \"office\", \"category\"?: string, \"categorySlug\"?: string, \"brand\"?: string, \"useCase\"?: string, \"minPrice\"?: number, \"maxPrice\"?: number, \"orderNumber\"?: string}, \"confidence\": number, \"reason\"?: string }.",
        "Không bọc markdown. Không thêm giải thích ngoài JSON.",
      ].join(" "),
      prompt: [
        `Pending question: ${context.pendingQuestion || "unknown"}`,
        `Pending intent: ${context.pendingIntent || "unknown"}`,
        `Entities so far: ${JSON.stringify(context.pendingEntities || {})}`,
        `User answer original: ${input.original}`,
        `User answer normalized: ${input.normalized}`,
        `Budget parsed locally: ${JSON.stringify(input.budget)}`,
        "Danh mục hợp lệ (chọn categorySlug khớp đúng một slug bên dưới):",
        taxonomyText,
      ].join("\n"),
    })

    const raw = result.text.trim()
    const jsonText = extractJsonObject(raw)
    const parsed = JSON.parse(jsonText) as unknown
    const extracted = validateClarificationExtractionResult(parsed, validSlugs)

    return {
      ...extracted,
      entities: {
        ...extracted.entities,
        minPrice: extracted.entities.minPrice || input.budget.minPrice,
        maxPrice: extracted.entities.maxPrice || input.budget.maxPrice,
      },
    }
  } catch {
    return {
      entities: {
        minPrice: input.budget.minPrice,
        maxPrice: input.budget.maxPrice,
      },
      confidence: input.budget.minPrice || input.budget.maxPrice ? 0.7 : 0,
      reason: "Failed to extract clarification entities from LLM",
    }
  }
}

export async function classifyConfirmationAnswerWithLlm(input: NormalizedChatInput, context: ChatContext): Promise<LlmConfirmationAnswer> {
  if (!openrouter) return "unclear"

  try {
    const result = await generateText({
      model: openrouter(OPENROUTER_MODEL),
      temperature: 0,
      maxOutputTokens: 60,
      system: [
        "Bạn là bộ phân loại câu trả lời xác nhận cho chatbot ecommerce VHPC.",
        "User đang trả lời một confirmation target trước đó.",
        "Chỉ phân loại ý nghĩa câu trả lời là confirm, reject hoặc unclear.",
        "confirm: đồng ý, đúng, ok, chuẩn, tiếp tục, xác nhận.",
        "reject: không, sai, không phải, đổi ý, huỷ.",
        "unclear: câu không đủ rõ để biết user đồng ý hay từ chối.",
        "Không chọn intent. Không chọn tool. Không trả lời người dùng.",
        "Phải trả JSON thuần đúng dạng: {\"answer\": \"confirm\" | \"reject\" | \"unclear\"}.",
        "Không bọc markdown. Không thêm giải thích ngoài JSON.",
      ].join(" "),
      prompt: [
        `Confirmation target: ${context.pendingQuestion || context.pendingReason || "unknown"}`,
        `Pending tool: ${context.pendingToolName || "unknown"}`,
        `Pending params: ${JSON.stringify(context.pendingParams || {})}`,
        `User answer original: ${input.original}`,
        `User answer normalized: ${input.normalized}`,
      ].join("\n"),
    })

    const raw = result.text.trim()
    const jsonText = extractJsonObject(raw)
    const parsed = JSON.parse(jsonText) as unknown
    return validateConfirmationAnswer(parsed)
  } catch {
    return "unclear"
  }
}

export async function classifyPendingFollowup(
  input: NormalizedChatInput,
  context: ChatContext
): Promise<PendingFollowupClass> {
  if (!openrouter) return "answer"

  try {
    const result = await generateText({
      model: openrouter(OPENROUTER_MODEL),
      temperature: 0,
      maxOutputTokens: 50,
      system: [
        "Bạn là bộ phân loại xem tin nhắn mới của user là đang trả lời câu hỏi pending hay mở một yêu cầu hoàn toàn mới.",
        "answer: user bổ sung/từ chối/xác nhận đúng cho câu hỏi đang chờ, hoặc cung cấp ngắn gọn phần còn thiếu như ngân sách, loại sản phẩm, mã đơn.",
        "new_request: user chuyển chủ đề, hỏi sản phẩm/đơn hàng/chính sách khác, hoặc nêu nhu cầu mới không liên quan câu hỏi pending.",
        "Khi user vừa trả lời vừa đổi hướng, ưu tiên new_request.",
        "Trả JSON thuần {\"type\":\"answer\"|\"new_request\"}, không markdown, không giải thích.",
      ].join(" "),
      prompt: [
        `Pending question: ${context.pendingQuestion || "unknown"}`,
        `Pending intent: ${context.pendingIntent || "unknown"}`,
        `Pending tool: ${context.pendingToolName || "unknown"}`,
        `Entities so far: ${JSON.stringify(context.pendingEntities || {})}`,
        `Pending params: ${JSON.stringify(context.pendingParams || {})}`,
        `User message original: ${input.original}`,
        `User message normalized: ${input.normalized}`,
        "Few-shot:",
        "pending='Bạn muốn lọc thêm ngân sách?' + user='15tr' => answer",
        "pending='Bạn muốn lọc thêm ngân sách?' + user='thôi cho mình xem màn hình gaming đi' => new_request",
      ].join("\n"),
    })

    const raw = result.text.trim()
    const jsonText = extractJsonObject(raw)
    const parsed = JSON.parse(jsonText) as unknown
    return validatePendingFollowup(parsed)
  } catch {
    return "answer"
  }
}

