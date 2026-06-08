import { generateHybridFallback } from "./llm/fallback"
import { routeMessageToTool } from "./llm/llm-router"
import { prepareToolRoute } from "./core/route-preparer"
import { isOrderStatusMessage, routeMessageByRules } from "./core/rule-router"
import { executeChatTool } from "./core/tools"
import {
  ensureChatSession,
  saveChatMessage,
} from "./stores/session-store"
import {
  extractOrderNumber,
  normalizeText,
} from "./shared/text-utils"
import type {
  ChatbotApiResponse,
  ChatbotSource,
  ToolRoute,
} from "./shared/types"

export { getChatHistory, getChatSessions } from "./stores/session-store"



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

  const activeRoute: ToolRoute | null = routeMessageByRules(message) ?? await routeMessageToTool(message)
  const preparedRoute = prepareToolRoute(activeRoute, message)

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
