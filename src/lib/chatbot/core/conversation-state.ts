import type { ChatContext } from "../stores/context-store"
import type { IntentEntities, PendingConversationState, ToolRoute } from "../shared/types"
import type { NormalizedChatInput } from "./input-normalizer"
import { classifyConfirmationAnswerWithLlm, classifyPendingFollowup, extractClarificationEntities } from "../llm/llm-router"

export type ConfirmationAnswer = "confirm" | "reject" | "unclear"

export type ConversationStateResult =
  | {
      handled: false
      reason: string
    }
  | {
      handled: false
      escaped: true
      clearPending: true
      reason: string
    }
  | {
      handled: true
      action: "execute_pending_tool"
      route: ToolRoute
      nextState: PendingConversationState
      reason: string
    }
  | {
      handled: true
      action: "reply"
      reply: string
      nextState: PendingConversationState
      reason: string
    }

const confirmationPhrases = [
  "dung",
  "ok",
  "oke",
  "oki",
  "uh",
  "u",
  "um",
  "co",
  "có",
  "duoc",
  "được",
  "dong y",
  "đồng ý",
  "tiep",
  "tiếp",
  "xem tiep",
  "xem tiếp",
  "chuẩn",
  "chuan",
  "phai",
  "phải",
  "yes",
  "yep",
  "yeah",
  "chinh xac",
  "chính xác",
]

const rejectionPhrases = [
  "khong",
  "không",
  "ko",
  "k",
  "sai",
  "khong phai",
  "không phải",
  "no",
  "hong",
  "hông",
]

function createIdleState(): PendingConversationState {
  return { state: "IDLE" }
}

function createEscapeResult(reason: string): ConversationStateResult {
  return {
    handled: false,
    escaped: true,
    clearPending: true,
    reason,
  }
}

function normalizeShortAnswer(input: NormalizedChatInput) {
  return input.normalizedForMatching.trim().replace(/\s+/g, " ")
}

function isExactShortPhrase(value: string, phrases: string[]) {
  return phrases.includes(value)
}

export function classifyConfirmationAnswer(input: NormalizedChatInput): ConfirmationAnswer {
  const normalized = normalizeShortAnswer(input)

  if (!normalized) return "unclear"
  if (isExactShortPhrase(normalized, confirmationPhrases)) return "confirm"
  if (isExactShortPhrase(normalized, rejectionPhrases)) return "reject"

  return "unclear"
}

export function isConfirmationMessage(input: NormalizedChatInput) {
  return classifyConfirmationAnswer(input) === "confirm"
}

export function isRejectionMessage(input: NormalizedChatInput) {
  return classifyConfirmationAnswer(input) === "reject"
}

export function hasPendingConversationState(context: ChatContext) {
  return context.conversationState === "AWAITING_CLARIFY" || context.conversationState === "AWAITING_CONFIRM"
}

export function clearPendingConversationState(): PendingConversationState {
  return createIdleState()
}

function createPendingStateFromContext(context: ChatContext): PendingConversationState {
  return {
    state: context.conversationState || "IDLE",
    pendingIntent: context.pendingIntent,
    pendingEntities: context.pendingEntities,
    pendingToolName: context.pendingToolName,
    pendingParams: context.pendingParams,
    pendingQuestion: context.pendingQuestion,
    pendingReason: context.pendingReason,
  }
}

function createToolRouteFromPendingState(context: ChatContext): ToolRoute | null {
  if (!context.pendingToolName || !context.pendingParams) return null

  return {
    toolName: context.pendingToolName,
    params: context.pendingParams,
    confidence: 1,
    reason: context.pendingReason || "Confirmed pending conversation action",
  }
}

function isProductPendingTool(context: ChatContext) {
  return context.pendingToolName === "searchProducts" || context.pendingToolName === "recommendProducts"
}

function createBudgetRevisionRoute(context: ChatContext, input: NormalizedChatInput): ToolRoute | null {
  if (!isProductPendingTool(context)) return null
  if (!context.pendingToolName || !context.pendingParams) return null
  if (!input.budget.minPrice && !input.budget.maxPrice) return null

  return {
    toolName: context.pendingToolName,
    params: {
      ...context.pendingParams,
      minPrice: input.budget.minPrice,
      maxPrice: input.budget.maxPrice,
      budgetMode: input.budget.budgetMode,
    },
    confidence: 1,
    reason: "User revised budget for pending product search",
  }
}

function mergeClarificationEntities(
  context: ChatContext,
  input: NormalizedChatInput,
  extractedEntities: IntentEntities = {}
): IntentEntities {
  return {
    ...context.pendingEntities,
    ...extractedEntities,
    minPrice: extractedEntities.minPrice || input.budget.minPrice || context.pendingEntities?.minPrice,
    maxPrice: extractedEntities.maxPrice || input.budget.maxPrice || context.pendingEntities?.maxPrice,
    budgetMode: extractedEntities.budgetMode || input.budget.budgetMode || context.pendingEntities?.budgetMode,
  }
}

function hasExplicitProductRequestSignal(input: NormalizedChatInput) {
  const normalized = input.normalizedForMatching

  return /\b(pc|desktop|may bo|bo pc|bo may|laptop|may tinh xach tay|man hinh|monitor)\b/.test(normalized)
    || /\b(gaming|choi game|game|valorant|lol|pubg|cs2|workstation|render|do hoa|thiet ke|hoc tap|van phong|lap trinh|code)\b/.test(normalized)
}

function isBudgetOnlyFollowUp(input: NormalizedChatInput) {
  const hasParsedBudget = Boolean(input.budget.minPrice || input.budget.maxPrice)
  if (!hasParsedBudget) return false

  return !hasExplicitProductRequestSignal(input)
}

function mergePendingParams(context: ChatContext, entities: IntentEntities): ToolRoute["params"] | undefined {
  if (!context.pendingParams) return undefined

  return {
    ...context.pendingParams,
    query: entities.query || context.pendingParams.query,
    product: entities.product || context.pendingParams.product,
    productType: entities.productType || context.pendingParams.productType,
    usage: entities.usage || context.pendingParams.usage,
    category: entities.category || context.pendingParams.category,
    categorySlug: entities.categorySlug || context.pendingParams.categorySlug,
    useCase: entities.useCase || context.pendingParams.useCase,
    minPrice: entities.minPrice || context.pendingParams.minPrice,
    maxPrice: entities.maxPrice || context.pendingParams.maxPrice,
    budgetMode: entities.budgetMode || context.pendingParams.budgetMode,
    orderNumber: entities.orderNumber || context.pendingParams.orderNumber,
  }
}

export async function handleAwaitingConfirm(
  input: NormalizedChatInput,
  context: ChatContext
): Promise<ConversationStateResult> {
  const deterministicAnswer = classifyConfirmationAnswer(input)
  let answer = deterministicAnswer

  if (deterministicAnswer === "unclear") {
    const followupClass = await classifyPendingFollowup(input, context)
    if (followupClass === "new_request") {
      return createEscapeResult("User issued new request during AWAITING_CONFIRM")
    }

    const budgetRevisionRoute = createBudgetRevisionRoute(context, input)
    if (budgetRevisionRoute) {
      return {
        handled: true,
        action: "execute_pending_tool",
        route: budgetRevisionRoute,
        nextState: clearPendingConversationState(),
        reason: budgetRevisionRoute.reason || "User revised budget for pending product search",
      }
    }

    answer = await classifyConfirmationAnswerWithLlm(input, context)
  }

  if (answer === "confirm") {
    const route = createToolRouteFromPendingState(context)

    if (!route) {
      return {
        handled: true,
        action: "reply",
        reply: "Mình chưa có thao tác nào để xác nhận. Bạn cho mình biết lại nhu cầu cần hỗ trợ nhé.",
        nextState: clearPendingConversationState(),
        reason: "Confirmation received but pending route is missing",
      }
    }

    return {
      handled: true,
      action: "execute_pending_tool",
      route,
      nextState: clearPendingConversationState(),
      reason: "User confirmed pending action",
    }
  }

  if (answer === "reject") {
    return {
      handled: true,
      action: "reply",
      reply: "Không sao ạ. Bạn muốn mình điều chỉnh lại theo nhu cầu nào?",
      nextState: clearPendingConversationState(),
      reason: "User rejected pending action",
    }
  }

  return {
    handled: true,
    action: "reply",
    reply: context.pendingQuestion || "Bạn xác nhận giúp mình là đúng hay không đúng nhé.",
    nextState: createPendingStateFromContext(context),
    reason: "Confirmation answer is unclear",
  }
}

export async function handleAwaitingClarify(
  input: NormalizedChatInput,
  context: ChatContext
): Promise<ConversationStateResult> {
  const shouldCheckNewRequest = !isProductPendingTool(context) || !isBudgetOnlyFollowUp(input)

  if (shouldCheckNewRequest) {
    const followupClass = await classifyPendingFollowup(input, context)
    if (followupClass === "new_request") {
      return createEscapeResult("User issued new request during AWAITING_CLARIFY")
    }
  }

  const extraction = await extractClarificationEntities(input, context)
  const mergedEntities = mergeClarificationEntities(context, input, extraction.entities)
  const mergedParams = mergePendingParams(context, mergedEntities)
  const nextState: PendingConversationState = {
    ...createPendingStateFromContext(context),
    pendingEntities: mergedEntities,
    pendingParams: mergedParams,
  }

  if (context.pendingToolName && mergedParams) {
    return {
      handled: true,
      action: "execute_pending_tool",
      route: {
        toolName: context.pendingToolName,
        params: mergedParams,
        confidence: 1,
        reason: extraction.reason || context.pendingReason || "Clarification completed pending action",
      },
      nextState: clearPendingConversationState(),
      reason: extraction.reason || "Clarification completed pending action",
    }
  }

  return {
    handled: true,
    action: "reply",
    reply: context.pendingQuestion || "Bạn bổ sung thêm thông tin giúp mình nhé.",
    nextState,
    reason: extraction.reason || "Clarification state captured additional entities",
  }
}

export async function handleConversationState(
  input: NormalizedChatInput,
  context: ChatContext
): Promise<ConversationStateResult> {
  if (context.conversationState === "AWAITING_CONFIRM") {
    return handleAwaitingConfirm(input, context)
  }

  if (context.conversationState === "AWAITING_CLARIFY") {
    return handleAwaitingClarify(input, context)
  }

  return {
    handled: false,
    reason: "No pending conversation state",
  }
}
