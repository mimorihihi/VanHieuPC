import type { IntentConfidenceDecision } from "./intent-confidence"
import type { IntentToolMappingResult } from "./intent-tool-mapper"
import type { NormalizedChatInput } from "./input-normalizer"
import type { IntentExtractionResult, ToolExecutionResult } from "../shared/types"

export type IntentDebugLog = {
  shouldReview: boolean
  triggers: string[]
  originalMessage: string
  normalizedMessage: string
  expansions: Record<string, string>
  intent: IntentExtractionResult["intent"]
  entities: IntentExtractionResult["entities"]
  confidence: number
  reason?: string
  action: IntentConfidenceDecision["action"]
  toolName?: string
  hasData: boolean
  clarificationQuestion?: string
  llmEntities?: IntentExtractionResult["entities"]
  deterministicEntityChanges?: string[]
}

export function createIntentDebugLog(params: {
  input: NormalizedChatInput
  intentResult: IntentExtractionResult
  confidenceDecision: IntentConfidenceDecision
  mappingResult: IntentToolMappingResult
  toolResult: ToolExecutionResult | null
  rawIntentResult?: IntentExtractionResult
}): IntentDebugLog {
  const triggers: string[] = []

  if (params.intentResult.confidence < 0.75) triggers.push("low_confidence")
  if (params.intentResult.intent === "unclear") triggers.push("unclear_intent")
  if (params.intentResult.needsClarification) triggers.push("needs_clarification")
  if (params.confidenceDecision.action !== "execute_tool") triggers.push(`action_${params.confidenceDecision.action}`)
  if (params.mappingResult.clarificationReply) triggers.push("missing_required_entity")
  if (params.toolResult && !params.toolResult.data) triggers.push("tool_no_data")

  const deterministicEntityChanges = createDeterministicEntityChangeList(
    params.rawIntentResult?.entities,
    params.intentResult.entities
  )
  if (deterministicEntityChanges.length > 0) triggers.push("deterministic_entity_changed")

  return {
    shouldReview: triggers.length > 0,
    triggers,
    originalMessage: params.input.original,
    normalizedMessage: params.input.normalized,
    expansions: params.input.expansions,
    intent: params.intentResult.intent,
    entities: params.intentResult.entities,
    confidence: params.intentResult.confidence,
    reason: params.mappingResult.reason || params.confidenceDecision.reason || params.intentResult.reason,
    action: params.confidenceDecision.action,
    toolName: params.mappingResult.route?.toolName || params.toolResult?.toolName,
    hasData: Boolean(params.toolResult?.data),
    clarificationQuestion: params.intentResult.clarificationQuestion || params.mappingResult.clarificationReply,
    llmEntities: params.rawIntentResult?.entities,
    deterministicEntityChanges,
  }
}

function createDeterministicEntityChangeList(
  llmEntities: IntentExtractionResult["entities"] | undefined,
  finalEntities: IntentExtractionResult["entities"]
) {
  if (!llmEntities) return []

  const trackedKeys: Array<keyof IntentExtractionResult["entities"]> = [
    "productType",
    "usage",
    "category",
    "categorySlug",
    "useCase",
    "minPrice",
    "maxPrice",
  ]

  return trackedKeys.flatMap((key) => {
    const before = llmEntities[key]
    const after = finalEntities[key]
    if (before === after) return []

    return `${String(key)}:${String(before ?? "empty")}=>${String(after ?? "empty")}`
  })
}
