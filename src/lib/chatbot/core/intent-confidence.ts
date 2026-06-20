import type { IntentConfidenceAction, IntentExtractionResult } from "../shared/types"

export type IntentConfidenceDecision = {
  action: IntentConfidenceAction
  reply?: string
  reason: string
}

const HIGH_CONFIDENCE_THRESHOLD = 0.75
const LOW_CONFIDENCE_THRESHOLD = 0.45

function getDefaultClarificationQuestion(intent: IntentExtractionResult["intent"]) {
  if (intent === "ask_product_price" || intent === "ask_product_detail") {
    return "Bạn muốn xem giá hoặc thông tin chi tiết của sản phẩm nào ạ?"
  }

  if (intent === "check_inventory") {
    return "Bạn muốn kiểm tra tồn kho sản phẩm nào ạ?"
  }

  if (intent === "check_order_status") {
    return "Bạn gửi mình mã đơn hàng để mình kiểm tra trạng thái đơn nhé."
  }

  if (intent === "recommend_product") {
    return "Bạn muốn dùng sản phẩm cho nhu cầu gì và ngân sách khoảng bao nhiêu ạ?"
  }

  if (intent === "search_product") {
    return "Bạn muốn tìm sản phẩm theo tên, thương hiệu hay loại sản phẩm nào ạ?"
  }

  if (intent === "out_of_scope") {
    return "Mình chỉ hỗ trợ các câu hỏi về sản phẩm, đơn hàng và chính sách của shop VHPC thôi ạ."
  }

  if (intent === "smalltalk") {
    return "Mình có thể hỗ trợ bạn tìm sản phẩm, xem giá, kiểm tra tồn kho, đơn hàng hoặc chính sách của shop ạ."
  }

  return "Bạn muốn tìm sản phẩm, xem giá, kiểm tra tồn kho hay hỏi chính sách ạ?"
}

export function evaluateIntentConfidence(intentResult: IntentExtractionResult): IntentConfidenceDecision {
  const clarificationQuestion =
    intentResult.clarificationQuestion?.trim() || getDefaultClarificationQuestion(intentResult.intent)

  if (intentResult.intent === "smalltalk" || intentResult.intent === "out_of_scope") {
    return {
      action: "fallback",
      reply: clarificationQuestion,
      reason: `Intent does not require tool execution: ${intentResult.intent}`,
    }
  }

  if (intentResult.needsClarification || intentResult.intent === "unclear") {
    return {
      action: "clarify",
      reply: clarificationQuestion,
      reason: intentResult.intent === "unclear"
        ? "Intent is unclear"
        : "Intent extraction requested clarification",
    }
  }

  if (intentResult.confidence >= HIGH_CONFIDENCE_THRESHOLD) {
    return {
      action: "execute_tool",
      reason: "Intent confidence is high enough for tool execution",
    }
  }

  if (intentResult.confidence >= LOW_CONFIDENCE_THRESHOLD) {
    return {
      action: "clarify",
      reply: clarificationQuestion,
      reason: "Intent confidence is medium and needs clarification",
    }
  }

  return {
    action: "fallback",
    reply: clarificationQuestion,
    reason: "Intent confidence is too low for tool execution",
  }
}
