
import { generateHybridFallback, streamHybridFallback } from "./llm/fallback"
import { composeToolResponse, streamComposeToolResponse } from "./llm/response-composer"
import { extractMessageIntent } from "./llm/llm-router"
import { normalizeChatInput } from "./core/input-normalizer"
import { evaluateIntentConfidence } from "./core/intent-confidence"
import { createIntentDebugLog } from "./core/intent-logger"
import { mapIntentToToolRoute } from "./core/intent-tool-mapper"
import { handleConversationState } from "./core/conversation-state"
import { isOrderStatusMessage } from "./core/rule-router"
import { executeChatTool } from "./core/tools"

import { extractContextFromToolResult, getChatContext } from "./stores/context-store"
import {
  ensureChatSession,
  saveChatMessage,
} from "./stores/session-store"
import {
  extractOrderNumber,
  normalizeText,
} from "./shared/text-utils"
import { OPENROUTER_MODEL, ENABLE_RESPONSE_COMPOSER } from "./shared/constants"
import type {
  ChatbotApiResponse,
  ChatbotSource,
  IntentExtractionResult,
  ToolRoute,
  PendingConversationState,
  ToolExecutionResult,
} from "./shared/types"

/** Tool nào đáng để LLM viết lại thành câu tự nhiên (có data phong phú). */
const COMPOSABLE_TOOLS = new Set(["searchProducts", "recommendProducts", "getProductDetail"])

/** Context lưu lại để dùng trong onFinish của stream AI fallback. */
type AiStreamCtx = {
  resolvedSessionId: string
  preparedRoute: ToolRoute | null
  intentResult: IntentExtractionResult
}

type ComposerStreamCtx = {
  resolvedSessionId: string
  preparedRoute: ToolRoute | null
  intentResult: IntentExtractionResult
  normalizedInput: ReturnType<typeof normalizeChatInput>
  context: Awaited<ReturnType<typeof getChatContext>>
  toolResult: ToolExecutionResult
  intentDebugLog: ReturnType<typeof createIntentDebugLog>
  confidenceDecision: ReturnType<typeof evaluateIntentConfidence>
  mappingReason?: string
}

type InternalChatbotResult = ChatbotApiResponse & {
  _aiStreamCtx?: AiStreamCtx
  _composerStreamCtx?: ComposerStreamCtx
}

export { getChatHistory, getChatSessions } from "./stores/session-store"


function createTextStreamResponse(content: string, sessionId: string) {
  return new Response(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "x-chat-session-id": sessionId,
      "x-chat-streaming": "true",
    },
  })
}

function shouldTreatAsBudgetOnly(normalizedInput: ReturnType<typeof normalizeChatInput>) {
  const hasBudget = Boolean(normalizedInput.budget.minPrice || normalizedInput.budget.maxPrice)
  if (!hasBudget) return false

  const normalizedMessage = normalizedInput.normalizedForMatching
  const mentionsNewProductType = detectProductType(normalizedMessage) !== undefined
  const mentionsUsage = detectUsage(normalizedMessage) !== undefined

  return !mentionsNewProductType && !mentionsUsage
}

function hasActivePendingState(state: PendingConversationState) {
  return state.state === "AWAITING_CLARIFY" || state.state === "AWAITING_CONFIRM"
}

function createStateContextUpdate(state: PendingConversationState) {
  if (!hasActivePendingState(state)) {
    return {
      conversationState: "IDLE" as const,
      pendingIntent: null,
      pendingEntities: null,
      pendingToolName: null,
      pendingParams: null,
      pendingQuestion: null,
      pendingReason: null,
    }
  }

  return {
    conversationState: state.state,
    pendingIntent: state.pendingIntent,
    pendingEntities: state.pendingEntities,
    pendingToolName: state.pendingToolName,
    pendingParams: state.pendingParams,
    pendingQuestion: state.pendingQuestion,
    pendingReason: state.pendingReason,
  }
}

function clearPendingFieldsFromContext(context: Awaited<ReturnType<typeof getChatContext>>) {
  context.conversationState = "IDLE"
  context.pendingIntent = undefined
  context.pendingEntities = undefined
  context.pendingToolName = undefined
  context.pendingParams = undefined
  context.pendingQuestion = undefined
  context.pendingReason = undefined
}

function createPendingRoutingSnapshot(context: {
  pendingIntent?: unknown
  pendingToolName?: unknown
  pendingParams?: unknown
  pendingEntities?: unknown
  pendingQuestion?: unknown
  pendingReason?: unknown
}) {
  return {
    pendingIntent: context.pendingIntent,
    pendingToolName: context.pendingToolName,
    pendingParams: context.pendingParams,
    pendingEntities: context.pendingEntities,
    pendingQuestion: context.pendingQuestion,
    pendingReason: context.pendingReason,
  }
}

function createExpandedBudgetParams(params: ToolRoute["params"]): ToolRoute["params"] {
  const currentMaxPrice = params.maxPrice

  return {
    ...params,
    minPrice: currentMaxPrice || params.minPrice,
    maxPrice: currentMaxPrice ? Math.round(currentMaxPrice * 1.3) : undefined,
  }
}

function extractContextFromRoute(route: ToolRoute | null) {
  if (!route || (route.toolName !== "searchProducts" && route.toolName !== "recommendProducts")) return undefined

  // Chỉ trả key thực sự có giá trị. extractContextFromRoute được spread SAU
  // extractContextFromToolResult, nên nếu trả undefined sẽ ghi đè giá trị
  // suy luận từ kết quả sản phẩm. Route thắng khi có, inferred bù khi route trống.
  const update: Partial<Awaited<ReturnType<typeof getChatContext>>> = {}
  if (route.params.productType) update.lastProductType = route.params.productType
  if (route.params.useCase) update.lastUseCase = route.params.useCase
  if (route.params.category) update.lastProductCategory = route.params.category

  return Object.keys(update).length ? update : undefined
}

function mergeEntitiesFromRouteParams(
  baseEntities: PendingConversationState["pendingEntities"],
  params: ToolRoute["params"]
): PendingConversationState["pendingEntities"] {
  return {
    ...baseEntities,
    query: params.query || baseEntities?.query,
    product: params.product || baseEntities?.product,
    productType: params.productType || baseEntities?.productType,
    usage: params.usage || baseEntities?.usage,
    category: params.category || baseEntities?.category,
    useCase: params.useCase || baseEntities?.useCase,
    minPrice: params.minPrice || baseEntities?.minPrice,
    maxPrice: params.maxPrice || baseEntities?.maxPrice,
    orderNumber: params.orderNumber || baseEntities?.orderNumber,
  }
}

function detectProductType(...values: Array<string | undefined>): IntentExtractionResult["entities"]["productType"] {
  const normalized = values.map((value) => normalizeText(value ?? "")).join(" ")

  if (/(pc|may bo|bo may|desktop)/.test(normalized)) return "PC"
  if (/(laptop|may tinh xach tay)/.test(normalized)) return "Laptop"
  if (/(man hinh|monitor)/.test(normalized)) return "Monitor"

  return undefined
}

function detectUsage(...values: Array<string | undefined>): IntentExtractionResult["entities"]["usage"] {
  const normalized = values.map((value) => normalizeText(value ?? "")).join(" ")

  if (/(gaming|choi game|game)/.test(normalized)) return "gaming"
  if (/(workstation|render|do hoa|thiet ke|blender|premiere|photoshop|autocad)/.test(normalized)) return "workstation"
  if (/(hoc tap|van phong|lap trinh|code)/.test(normalized)) return "office"

  return undefined
}

function deriveCategory(
  productType?: IntentExtractionResult["entities"]["productType"],
  usage?: IntentExtractionResult["entities"]["usage"],
  fallbackCategory?: string
) {
  if (productType === "PC" && usage === "gaming") return "PC Gaming"
  if (productType === "PC" && usage === "workstation") return "PC Đồ họa"
  if (productType === "PC") return undefined
  if (productType === "Laptop") return "Laptop"
  if (productType === "Monitor") return "Monitor"

  return fallbackCategory
}

function deriveUseCase(usage?: IntentExtractionResult["entities"]["usage"], fallbackUseCase?: string) {
  if (usage === "gaming") return "gaming game"
  if (usage === "workstation") return "render do hoa thiet ke workstation"
  if (usage === "office") return "hoc tap van phong office"

  return fallbackUseCase
}

function applyDeterministicEntities(
  intentResult: IntentExtractionResult,
  normalizedInput: ReturnType<typeof normalizeChatInput>
): IntentExtractionResult {
  // LLM là source of truth; deterministic layer chỉ là fallback net khi LLM bỏ trống hoặc under-classify câu rõ ràng.
  const expandedInput = [
    normalizedInput.normalized,
    normalizedInput.normalizedForMatching,
    ...Object.values(normalizedInput.expansions),
  ].join(" ")
  const productType = intentResult.entities.productType ?? detectProductType(expandedInput)
  const usage = intentResult.entities.usage ?? detectUsage(expandedInput)
  const minPrice = normalizedInput.budget.minPrice || intentResult.entities.minPrice
  const maxPrice = normalizedInput.budget.maxPrice || intentResult.entities.maxPrice
  const category = intentResult.entities.category
    ?? (!intentResult.entities.categorySlug ? deriveCategory(productType, usage) : undefined)
  const useCase = intentResult.entities.useCase ?? deriveUseCase(usage)
  const hasRecommendationSignal = Boolean(productType || usage || category || useCase || minPrice || maxPrice)
  const shouldUpgradeToRecommend = hasRecommendationSignal
    && (intentResult.intent === "unclear" || intentResult.intent === "smalltalk")

  return {
    ...intentResult,
    intent: shouldUpgradeToRecommend ? "recommend_product" : intentResult.intent,
    confidence: shouldUpgradeToRecommend ? Math.max(intentResult.confidence, 0.78) : intentResult.confidence,
    needsClarification: shouldUpgradeToRecommend ? false : intentResult.needsClarification,
    clarificationQuestion: shouldUpgradeToRecommend ? undefined : intentResult.clarificationQuestion,
    reason: shouldUpgradeToRecommend
      ? `${intentResult.reason || "LLM under-classified input"}; deterministic recommendation signal detected`
      : intentResult.reason,
    entities: {
      ...intentResult.entities,
      productType,
      usage,
      minPrice,
      maxPrice,
      category,
      useCase,
    },
  }
}

function createBudgetFollowUpRoute(
  context: Awaited<ReturnType<typeof getChatContext>>,
  normalizedInput: ReturnType<typeof normalizeChatInput>
): ToolRoute | null {
  if (!shouldTreatAsBudgetOnly(normalizedInput)) return null
  if (!normalizedInput.budget.minPrice && !normalizedInput.budget.maxPrice) return null
  if (!context.pendingToolName || !context.pendingParams) return null
  if (context.pendingToolName !== "searchProducts" && context.pendingToolName !== "recommendProducts") return null

  return {
    toolName: context.pendingToolName,
    params: {
      ...context.pendingParams,
      minPrice: normalizedInput.budget.minPrice,
      maxPrice: normalizedInput.budget.maxPrice,
    },
    confidence: 1,
    reason: "Budget-only follow-up reused recent product context",
  }
}

function createFollowUpStateFromRoute(
  route: ToolRoute | null,
  intentResult: { intent: PendingConversationState["pendingIntent"]; entities?: PendingConversationState["pendingEntities"] } | null,
  hasData: boolean
): PendingConversationState {
  if (!route) return { state: "IDLE" }
  if (route.toolName !== "searchProducts" && route.toolName !== "recommendProducts") return { state: "IDLE" }

  const pendingEntities = {
    ...intentResult?.entities,
    query: route.params.query || intentResult?.entities?.query,
    productType: route.params.productType || intentResult?.entities?.productType,
    usage: route.params.usage || intentResult?.entities?.usage,
    category: route.params.category || intentResult?.entities?.category,
    useCase: route.params.useCase || intentResult?.entities?.useCase,
    minPrice: route.params.minPrice || intentResult?.entities?.minPrice,
    maxPrice: route.params.maxPrice || intentResult?.entities?.maxPrice,
  }

  if (!hasData && route.toolName === "recommendProducts") {
    const expandedParams = createExpandedBudgetParams(route.params)

    return {
      state: "AWAITING_CONFIRM",
      pendingIntent: intentResult?.intent,
      pendingEntities: {
        ...pendingEntities,
        minPrice: expandedParams.minPrice,
        maxPrice: expandedParams.maxPrice,
      },
      pendingToolName: route.toolName,
      pendingParams: expandedParams,
      pendingQuestion: "Bạn có muốn mình nới ngân sách lên một chút để tìm thêm lựa chọn phù hợp không?",
      pendingReason: "No recommendation results; ask user to confirm expanded budget search",
    }
  }

  if (!hasData) return { state: "IDLE" }

  return {
    state: "AWAITING_CLARIFY",
    pendingIntent: intentResult?.intent,
    pendingEntities,
    pendingToolName: route.toolName,
    pendingParams: route.params,
    pendingQuestion: "Bạn muốn lọc thêm theo ngân sách, thương hiệu hoặc nhu cầu nào không?",
    pendingReason: "Keep successful product result available for short follow-up filters",
  }
}

async function _handleChatbotMessageInternal(
  message: string,
  sessionId?: string,
  returnBeforeAiFallback = false
): Promise<InternalChatbotResult> {
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

  const context = await getChatContext(resolvedSessionId)
  const normalizedInput = normalizeChatInput(message)
  const stateResult = await handleConversationState(normalizedInput, context)

  if (!stateResult.handled && "escaped" in stateResult && stateResult.escaped) {
    clearPendingFieldsFromContext(context)
  }

  if (stateResult.handled) {
    if (stateResult.action === "execute_pending_tool") {
      const executedEntities = mergeEntitiesFromRouteParams(context.pendingEntities, stateResult.route.params)
      const toolResult = await executeChatTool(stateResult.route)
      const formattedReply = toolResult?.reply ?? "Mình chưa tìm thấy dữ liệu phù hợp. Bạn thử mô tả rõ hơn giúp mình nhé."
      const result: ChatbotApiResponse = {
        sessionId: resolvedSessionId,
        reply: formattedReply,
        data: toolResult?.data,
        toolName: toolResult?.toolName,
        source: toolResult ? "tool_router" : "chatbot",
        hasData: Boolean(toolResult?.data),
      }
      const contextUpdate = {
        ...extractContextFromToolResult(result.toolName, result.data),
        ...extractContextFromRoute(stateResult.route),
      }
      const followUpState = createFollowUpStateFromRoute(stateResult.route, {
        intent: context.pendingIntent,
        entities: executedEntities,
      }, result.hasData)
      const stateContextUpdate = createStateContextUpdate(followUpState)

      await saveChatMessage(resolvedSessionId, "assistant", result.reply, {
        source: result.source,
        hasData: result.hasData,
        toolName: result.toolName,
        routing: {
          source: result.source,
          stateBefore: context.conversationState || "IDLE",
          stateAfter: followUpState.state,
          toolName: result.toolName,
          hasData: result.hasData,
          reason: stateResult.reason,
          normalizedInput: normalizedInput.normalized,
          pendingBefore: createPendingRoutingSnapshot(context),
          pendingAfter: createPendingRoutingSnapshot(followUpState),
        },
        entities: {
          ...contextUpdate,
          ...stateContextUpdate,
        },
      })

      return result
    }

    const result: ChatbotApiResponse = {
      sessionId: resolvedSessionId,
      reply: stateResult.reply,
      source: "chatbot",
      hasData: false,
    }

    await saveChatMessage(resolvedSessionId, "assistant", result.reply, {
      source: result.source,
      hasData: result.hasData,
      routing: {
        source: result.source,
        stateBefore: context.conversationState || "IDLE",
        stateAfter: stateResult.nextState.state,
        hasData: result.hasData,
        reason: stateResult.reason,
        normalizedInput: normalizedInput.normalized,
        pendingBefore: createPendingRoutingSnapshot(context),
        pendingAfter: createPendingRoutingSnapshot(stateResult.nextState),
      },
      entities: createStateContextUpdate(stateResult.nextState),
    })

    return result
  }

  const budgetFollowUpRoute = createBudgetFollowUpRoute(context, normalizedInput)

  if (budgetFollowUpRoute) {
    const executedEntities = mergeEntitiesFromRouteParams(context.pendingEntities, budgetFollowUpRoute.params)
    const toolResult = await executeChatTool(budgetFollowUpRoute)
    const result: ChatbotApiResponse = {
      sessionId: resolvedSessionId,
      reply: toolResult?.reply ?? "Mình chưa tìm thấy dữ liệu phù hợp. Bạn thử mô tả rõ hơn giúp mình nhé.",
      data: toolResult?.data,
      toolName: toolResult?.toolName,
      source: toolResult ? "tool_router" : "chatbot",
      hasData: Boolean(toolResult?.data),
    }
    const contextUpdate = {
      ...extractContextFromToolResult(result.toolName, result.data),
      ...extractContextFromRoute(budgetFollowUpRoute),
    }
    const followUpState = createFollowUpStateFromRoute(budgetFollowUpRoute, {
      intent: context.pendingIntent,
      entities: executedEntities,
    }, result.hasData)
    const stateContextUpdate = createStateContextUpdate(followUpState)

    await saveChatMessage(resolvedSessionId, "assistant", result.reply, {
      source: result.source,
      hasData: result.hasData,
      toolName: result.toolName,
      routing: {
        source: result.source,
        stateBefore: context.conversationState || "IDLE",
        stateAfter: followUpState.state,
        toolName: result.toolName,
        hasData: result.hasData,
        reason: budgetFollowUpRoute.reason,
        normalizedInput: normalizedInput.normalized,
        pendingBefore: createPendingRoutingSnapshot(context),
        pendingAfter: createPendingRoutingSnapshot(followUpState),
      },
      entities: {
        ...contextUpdate,
        ...stateContextUpdate,
      },
    })

    return result
  }

  const extractedIntentResult = await extractMessageIntent(normalizedInput, context)
  const intentResult = applyDeterministicEntities(extractedIntentResult, normalizedInput)
  const confidenceDecision = evaluateIntentConfidence(intentResult)
  const mappingResult = confidenceDecision.action === "execute_tool"
    ? mapIntentToToolRoute(intentResult, normalizedInput, context)
    : { route: null, clarificationReply: confidenceDecision.reply, reason: confidenceDecision.reason }
  const preparedRoute = mappingResult.route

  let result: Omit<ChatbotApiResponse, "sessionId">

  const toolResult = preparedRoute ? await executeChatTool(preparedRoute) : null
  const intentDebugLog = createIntentDebugLog({
    input: normalizedInput,
    intentResult,
    confidenceDecision,
    mappingResult,
    toolResult,
    rawIntentResult: extractedIntentResult,
  })
  const shouldUseToolResult = Boolean(
    toolResult && (toolResult.data || (preparedRoute && (preparedRoute.confidence >= 0.75 || preparedRoute.toolName === "checkOrderStatus")))
  )

  if (shouldUseToolResult && toolResult) {
    // Response-composer: LLM viết lại kết quả tool thành câu tự nhiên khi có data & tool phù hợp.
    // Tự động fallback về toolResult.reply nếu openrouter chưa cấu hình hoặc composer lỗi.
    const shouldCompose =
      ENABLE_RESPONSE_COMPOSER &&
      Boolean(toolResult.data) &&
      Boolean(toolResult.toolName) &&
      COMPOSABLE_TOOLS.has(toolResult.toolName!)

    // Streaming mode: không gọi composer blocking ở đây. Trả context để stream composer trực tiếp,
    // tránh user phải chờ generateText xong rồi mới nhận single chunk.
    if (shouldCompose && returnBeforeAiFallback) {
      return {
        sessionId: resolvedSessionId,
        reply: "",
        data: toolResult.data,
        toolName: toolResult.toolName,
        source: "tool_router",
        hasData: true,
        _composerStreamCtx: {
          resolvedSessionId,
          preparedRoute,
          intentResult,
          normalizedInput,
          context,
          toolResult,
          intentDebugLog,
          confidenceDecision,
          mappingReason: mappingResult.reason,
        },
      }
    }

    const composedReply = shouldCompose
      ? await composeToolResponse({ input: normalizedInput, context, intentResult, toolResult })
      : toolResult.reply

    result = {
      reply: composedReply,
      data: toolResult.data,
      toolName: toolResult.toolName,
      source: "tool_router",
      hasData: Boolean(toolResult.data),
    }
  } else if (mappingResult.clarificationReply) {
    result = {
      reply: mappingResult.clarificationReply,
      toolName: preparedRoute?.toolName,
      source: "chatbot",
      hasData: false,
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

  const shouldUseAiFallback = !result.hasData && !result.toolName

  // Streaming mode: trả về sớm để handleChatbotMessageStream có thể dùng streamText.
  // User message đã được lưu ở trên; assistant message sẽ được lưu trong onFinish.
  if (shouldUseAiFallback && returnBeforeAiFallback) {
    return {
      sessionId: resolvedSessionId,
      reply: "",
      source: "ai_fallback",
      hasData: false,
      _aiStreamCtx: { resolvedSessionId, preparedRoute, intentResult },
    }
  }

  const aiResult = shouldUseAiFallback ? await generateHybridFallback(message) : null
  const finalResultBase = aiResult ?? result
  const finalSource: ChatbotSource = aiResult ? "ai_fallback" : result.source
  const finalToolName = aiResult ? undefined : result.toolName
  const finalHasData = typeof finalResultBase.hasData === "boolean" ? finalResultBase.hasData : Boolean(finalResultBase.data)
  const finalResult: ChatbotApiResponse = {
    sessionId: resolvedSessionId,
    reply: finalResultBase.reply,
    data: finalResultBase.data,
    toolName: finalToolName,
    source: finalSource,
    hasData: finalHasData,
  }
  const contextUpdate = {
    ...extractContextFromToolResult(finalToolName, finalResult.data),
    ...extractContextFromRoute(preparedRoute),
  }
  const followUpState = createFollowUpStateFromRoute(preparedRoute, intentResult, finalResult.hasData)
  const stateContextUpdate = createStateContextUpdate(followUpState)

  await saveChatMessage(resolvedSessionId, "assistant", finalResult.reply, {
    source: finalResult.source,
    hasData: finalResult.hasData,
    toolName: finalResult.toolName,
    routing: {
      source: finalResult.source,
      stateBefore: context.conversationState || "IDLE",
      stateAfter: followUpState.state,
      intent: intentResult.intent,
      toolName: finalResult.toolName,
      mappedToolName: preparedRoute?.toolName,
      hasData: finalResult.hasData,
      confidence: intentResult.confidence,
      confidenceAction: confidenceDecision.action,
      reason: mappingResult.reason || confidenceDecision.reason || intentResult.reason,
      needsClarification: intentResult.needsClarification,
      normalizedInput: normalizedInput.normalized,
      pendingBefore: createPendingRoutingSnapshot(context),
      pendingAfter: createPendingRoutingSnapshot(followUpState),
      review: intentDebugLog.shouldReview,
      reviewTriggers: intentDebugLog.triggers,
      debug: intentDebugLog,
    },
    entities: {
      ...contextUpdate,
      ...stateContextUpdate,
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

/** Public API — blocking, trả ChatbotApiResponse đầy đủ. */
export async function handleChatbotMessage(message: string, sessionId?: string): Promise<ChatbotApiResponse> {
  return _handleChatbotMessageInternal(message, sessionId, false)
}

/**
 * Public API — streaming.
 * - Các nhánh tool/chatbot (FAQ, search, order…): trả single-chunk ngay (không có gì để stream).
 * - Nhánh AI fallback (smalltalk/unclear): dùng streamText, token đến đâu flush đến đó.
 *   saveChatMessage được gọi trong onFinish của AI SDK sau khi stream hoàn thành.
 */
export async function handleChatbotMessageStream(message: string, sessionId?: string): Promise<Response> {
  const result = await _handleChatbotMessageInternal(message, sessionId, true)

  if (result._aiStreamCtx) {
    const { resolvedSessionId, preparedRoute, intentResult } = result._aiStreamCtx

    const stream = streamHybridFallback(message, async (text) => {
      // Lưu assistant message sau khi stream hoàn thành — text là toàn bộ nội dung đã stream.
      const followUpState = createFollowUpStateFromRoute(preparedRoute, intentResult, Boolean(text))
      const stateContextUpdate = createStateContextUpdate(followUpState)
      await saveChatMessage(resolvedSessionId, "assistant", text, {
        source: "ai_fallback",
        hasData: true,
        entities: stateContextUpdate,
        provider: "openrouter",
        model: OPENROUTER_MODEL,
      })
    })

    if (!stream) {
      // openrouter chưa cấu hình — trả reply tĩnh, lưu DB.
      const fallbackReply = "Mình chưa tạo được phản hồi lúc này. Bạn vui lòng thử lại nhé."
      await saveChatMessage(resolvedSessionId, "assistant", fallbackReply, {
        source: "chatbot",
        hasData: false,
      })
      return createTextStreamResponse(fallbackReply, resolvedSessionId)
    }

    // Stream thật: pipe token thẳng ra client.
    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "x-chat-session-id": resolvedSessionId,
        "x-chat-streaming": "true",
      },
    })
  }

  if (result._composerStreamCtx) {
    const {
      resolvedSessionId,
      preparedRoute,
      intentResult,
      normalizedInput,
      context,
      toolResult,
      intentDebugLog,
      confidenceDecision,
      mappingReason,
    } = result._composerStreamCtx

    const stream = streamComposeToolResponse(
      { input: normalizedInput, context, intentResult, toolResult },
      async (text) => {
        const finalReply = text || toolResult.reply
        const contextUpdate = {
          ...extractContextFromToolResult(toolResult.toolName, toolResult.data),
          ...extractContextFromRoute(preparedRoute),
        }
        const followUpState = createFollowUpStateFromRoute(preparedRoute, intentResult, Boolean(toolResult.data))
        const stateContextUpdate = createStateContextUpdate(followUpState)

        await saveChatMessage(resolvedSessionId, "assistant", finalReply, {
          source: "tool_router",
          hasData: Boolean(toolResult.data),
          toolName: toolResult.toolName,
          routing: {
            source: "tool_router",
            stateBefore: context.conversationState || "IDLE",
            stateAfter: followUpState.state,
            intent: intentResult.intent,
            toolName: toolResult.toolName,
            mappedToolName: preparedRoute?.toolName,
            hasData: Boolean(toolResult.data),
            confidence: intentResult.confidence,
            confidenceAction: confidenceDecision.action,
            reason: mappingReason || confidenceDecision.reason || intentResult.reason,
            needsClarification: intentResult.needsClarification,
            normalizedInput: normalizedInput.normalized,
            pendingBefore: createPendingRoutingSnapshot(context),
            pendingAfter: createPendingRoutingSnapshot(followUpState),
            review: intentDebugLog.shouldReview,
            reviewTriggers: intentDebugLog.triggers,
            debug: intentDebugLog,
          },
          entities: {
            ...contextUpdate,
            ...stateContextUpdate,
          },
        })
      }
    )

    if (!stream) {
      await saveChatMessage(resolvedSessionId, "assistant", toolResult.reply, {
        source: "tool_router",
        hasData: Boolean(toolResult.data),
        toolName: toolResult.toolName,
      })
      return createTextStreamResponse(toolResult.reply, resolvedSessionId)
    }

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "x-chat-session-id": resolvedSessionId,
        "x-chat-streaming": "true",
      },
    })
  }

  // Không cần stream (tool result không compose, clarification, early exit…): single-chunk.
  return createTextStreamResponse(result.reply, result.sessionId)
}
