import { generateText } from "ai"
import { createOpenRouter } from "@openrouter/ai-sdk-provider"

import { OPENROUTER_API_KEY, OPENROUTER_MODEL } from "../shared/constants"
import type { ChatbotSource } from "../shared/types"

const openrouter = OPENROUTER_API_KEY
  ? createOpenRouter({
      apiKey: OPENROUTER_API_KEY,
    })
  : null

export async function generateHybridFallback(message: string): Promise<{
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
        "Bạn là trợ lý tư vấn mua hàng của VHPC, chuyên PC Gaming, Workstation, Laptop và Monitor.",
        "Không dùng embedding. Chỉ trả lời ngắn gọn, tự nhiên, dễ hiểu bằng tiếng Việt.",
        "Không được tự bịa giá sản phẩm, tồn kho, mã giảm giá, chính sách cụ thể nếu không có dữ liệu DB xác nhận.",
        "Nếu người dùng hỏi giá hoặc tồn kho nhưng hệ thống chưa tìm thấy dữ liệu chính xác, hãy nói rõ chưa tìm thấy và đề nghị người dùng cung cấp tên sản phẩm cụ thể hơn.",
        "Khi người dùng cần tư vấn mua hàng nhưng thiếu thông tin, hãy hỏi thêm ngân sách, mục đích sử dụng, game/phần mềm chính hoặc kích thước màn hình mong muốn.",
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
