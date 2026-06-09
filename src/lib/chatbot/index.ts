import { generateHybridFallback } from "./llm/fallback"
import { routeMessageToTool } from "./llm/llm-router"
import { prepareToolRoute } from "./core/route-preparer"
import { isOrderStatusMessage, routeMessageByRules } from "./core/rule-router"
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
  const hasPromotionIntent = ["ma giam gia", "voucher", "coupon", "khuyen mai", "discount", "uu dai"].some((keyword) =>
    normalized.includes(keyword)
  )
  const isBudgetOnlyIntent = /(ngan sach|tam|khoang|trieu|muon dung)/.test(normalized)
    && !/(pc|laptop|man hinh|monitor|gaming|choi game|render|blender|do hoa|workstation)/.test(normalized)

  await saveChatMessage(resolvedSessionId, "user", message)

  if (isBudgetOnlyIntent) {
    const result: ChatbotApiResponse = {
      sessionId: resolvedSessionId,
      reply: "Bạn muốn dùng ngân sách này cho PC Gaming, Workstation, Laptop hay Monitor? Bạn cho mình biết thêm nhu cầu chính để mình tư vấn đúng hơn nhé.",
      source: "chatbot",
      hasData: false,
    }

    await saveChatMessage(resolvedSessionId, "assistant", result.reply, {
      source: result.source,
      hasData: result.hasData,
      routing: {
        source: result.source,
        hasData: result.hasData,
        reason: "Budget only intent needs more details",
      },
    })

    return result
  }

  if (hasPromotionIntent) {
    const result: ChatbotApiResponse = {
      sessionId: resolvedSessionId,
      reply: "Hiện mình chưa có dữ liệu mã giảm giá chính xác trong hệ thống. Bạn có thể kiểm tra ở trang khuyến mãi/checkout hoặc liên hệ shop để được xác nhận ưu đãi mới nhất nhé.",
      toolName: "searchFAQ",
      source: "chatbot",
      hasData: false,
    }

    await saveChatMessage(resolvedSessionId, "assistant", result.reply, {
      source: result.source,
      hasData: result.hasData,
      toolName: result.toolName,
      routing: {
        source: result.source,
        toolName: result.toolName,
        hasData: result.hasData,
        reason: "Promotion intent without verified coupon data",
      },
    })

    return result
  }

  const context = await getChatContext(resolvedSessionId)
  const activeRoute: ToolRoute | null = routeMessageByRules(message, context) ?? await routeMessageToTool(message)
  const preparedRoute = prepareToolRoute(activeRoute, message, context)

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

  const shouldUseAiFallback = !result.hasData && !result.toolName

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
  const contextUpdate = extractContextFromToolResult(finalToolName, finalResult.data)

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
    entities: contextUpdate,
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
