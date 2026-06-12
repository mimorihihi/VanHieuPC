import { createOpenRouter } from "@openrouter/ai-sdk-provider"
import { streamText, stepCountIs } from "ai"

import { generateHybridFallback } from "./llm/fallback"
import { routeMessageToTool } from "./llm/llm-router"
import { chatbotTools } from "./llm/ai-tools"
import { prepareToolRoute } from "./core/route-preparer"
import { isOrderStatusMessage, routeMessageByRules } from "./core/rule-router"
import { executeChatTool } from "./core/tools"
import { OPENROUTER_API_KEY, OPENROUTER_MODEL } from "./shared/constants"
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
  ToolExecutionResult,
} from "./shared/types"

export { getChatHistory, getChatSessions } from "./stores/session-store"

const openrouter = OPENROUTER_API_KEY
  ? createOpenRouter({
      apiKey: OPENROUTER_API_KEY,
    })
  : null
function isConfirmationMessage(message: string) {
  const normalized = normalizeText(message)
  return ["dung roi", "ok", "oke", "chinh xac", "phai", "yes", "duoc", "tim di", "tu van di"].some((keyword) =>
    normalized === keyword || normalized.includes(keyword)
  )
}

function createTextStreamResponse(content: string, sessionId: string) {
  return new Response(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "x-chat-session-id": sessionId,
      "x-chat-streaming": "true",
    },
  })
}

async function saveStreamingToolReply(sessionId: string, toolResult: ToolExecutionResult, toolName: ToolRoute["toolName"]) {
  const contextUpdate = extractContextFromToolResult(toolName, toolResult.data)

  await saveChatMessage(sessionId, "assistant", toolResult.reply, {
    source: "tool_router",
    hasData: Boolean(toolResult.data),
    toolName,
    entities: contextUpdate,
    streaming: true,
  })
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

export async function handleChatbotMessageStream(message: string, sessionId?: string): Promise<Response> {
  const resolvedSessionId = await ensureChatSession(sessionId)
  const normalized = normalizeText(message)

  if (!normalized) {
    return new Response("Vui lòng nhập nội dung cần hỗ trợ.", {
      status: 400,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "x-chat-session-id": resolvedSessionId,
      },
    })
  }

  await saveChatMessage(resolvedSessionId, "user", message)

  if (!openrouter) {
    const fallback = "Chatbot AI chưa được cấu hình API key. Bạn vui lòng thử lại sau."
    await saveChatMessage(resolvedSessionId, "assistant", fallback, {
      source: "chatbot",
      hasData: false,
      reason: "Missing OpenRouter API key",
    })

    return new Response(fallback, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "x-chat-session-id": resolvedSessionId,
      },
    })
  }

  const context = await getChatContext(resolvedSessionId)
  const contextSummary = [
    context.lastUseCase ? `Nhu cầu gần nhất: ${context.lastUseCase}` : null,
    context.lastProductName ? `Sản phẩm gần nhất: ${context.lastProductName}` : null,
    context.lastProducts?.length
      ? `Danh sách sản phẩm gần nhất: ${context.lastProducts.map((product) => product.name).join("; ")}`
      : null,
    context.lastMinPrice || context.lastMaxPrice
      ? `Ngân sách đã nhắc: ${context.lastMinPrice ?? "không rõ"} - ${context.lastMaxPrice ?? "không rõ"} VND`
      : null,
    context.lastOrderNumber ? `Mã đơn hàng gần nhất: ${context.lastOrderNumber}` : null,
  ].filter(Boolean).join("\n")

  if (isConfirmationMessage(message) && context.lastUseCase && (context.lastMinPrice || context.lastMaxPrice)) {
    const route: ToolRoute = {
      toolName: "recommendProducts",
      params: {
        query: context.lastUseCase,
        useCase: context.lastUseCase,
        category: context.lastUseCase.includes("render") || context.lastUseCase.includes("thiết kế") ? "Workstation" : undefined,
        minPrice: context.lastMinPrice,
        maxPrice: context.lastMaxPrice,
      },
      confidence: 1,
      reason: "User confirmed previous recommendation intent",
    }
    const toolResult = await executeChatTool(route)

    if (toolResult) {
      await saveStreamingToolReply(resolvedSessionId, toolResult, "recommendProducts")
      return createTextStreamResponse(toolResult.reply, resolvedSessionId)
    }
  }

  let assistantReply = ""
  let usedToolName: string | undefined
  let usedToolData: unknown
  let hasToolData = false

  const result = streamText({
    model: openrouter(OPENROUTER_MODEL),
    tools: chatbotTools,
    toolChoice: "auto",
    stopWhen: stepCountIs(4),
    temperature: 0.2,
    maxOutputTokens: 700,
    system: [
      "Bạn là trợ lý tư vấn mua hàng cho website thương mại điện tử VHPC.",
      "Luôn trả lời bằng tiếng Việt, ngắn gọn, thân thiện và dễ hiểu.",
      "Khi người dùng hỏi dữ liệu sản phẩm, tồn kho hoặc đơn hàng, hãy dùng tool phù hợp thay vì tự bịa thông tin.",
      "Khi người dùng hỏi FAQ/chính sách như giao hàng, vận chuyển, ship, thanh toán, COD, checkout, đổi trả, hoàn tiền hoặc bảo hành, bắt buộc dùng tool searchFAQ và chỉ trả lời dựa trên dữ liệu tool.",
      "Nếu tool trả về không có dữ liệu, hãy hỏi lại người dùng thông tin còn thiếu hoặc gợi ý cách hỏi rõ hơn.",
      "Khi tool trả về dữ liệu sản phẩm, hãy tổng hợp tối đa 3-5 lựa chọn nổi bật, nêu giá và lý do phù hợp nếu có.",
      "Nếu tin nhắn mới chỉ thay đổi ngân sách như 'khoảng 50 triệu', hãy giữ nguyên nhu cầu gần nhất trong ngữ cảnh, ví dụ render/thiết kế đồ họa hoặc gaming.",
      "Với nhu cầu render, thiết kế đồ họa hoặc workstation, ưu tiên PC/workstation, CPU mạnh, RAM cao, GPU phù hợp; không tự chuyển sang laptop gaming nếu người dùng không yêu cầu laptop.",
      "Không hiển thị JSON hoặc chi tiết kỹ thuật tool cho người dùng.",
    ].join(" "),
    prompt: contextSummary
      ? `Ngữ cảnh hội thoại trước đó:\n${contextSummary}\n\nTin nhắn mới của khách: ${message}`
      : message,
    onChunk: ({ chunk }) => {
      if (chunk.type === "text-delta") {
        assistantReply += chunk.text
      }

      if (chunk.type === "tool-result") {
        usedToolName = String(chunk.toolName)
        const output = chunk.output as { data?: unknown; hasData?: boolean } | undefined
        usedToolData = output?.data
        hasToolData = Boolean(output?.hasData)
      }
    },
    onFinish: async () => {
      const reply = assistantReply.trim() || "Mình chưa tạo được phản hồi phù hợp. Bạn vui lòng thử hỏi lại rõ hơn nhé."

      const contextUpdate = extractContextFromToolResult(
        usedToolName as Parameters<typeof extractContextFromToolResult>[0],
        usedToolData
      )

      await saveChatMessage(resolvedSessionId, "assistant", reply, {
        source: usedToolName ? "tool_router" : "ai_fallback",
        hasData: hasToolData,
        toolName: usedToolName,
        entities: contextUpdate,
        provider: "openrouter",
        model: OPENROUTER_MODEL,
        streaming: true,
      })
    },
  })

  return result.toTextStreamResponse({
    headers: {
      "x-chat-session-id": resolvedSessionId,
      "x-chat-streaming": "true",
    },
  })
}
