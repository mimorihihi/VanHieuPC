import { generateText, streamText } from "ai"
import { createOpenRouter } from "@openrouter/ai-sdk-provider"

import { OPENROUTER_API_KEY, OPENROUTER_MODEL } from "../shared/constants"
import type { ChatbotSource } from "../shared/types"

const openrouter = OPENROUTER_API_KEY
  ? createOpenRouter({
      apiKey: OPENROUTER_API_KEY,
    })
  : null

const FALLBACK_SYSTEM_PROMPT = [
  "Bạn là trợ lý mua hàng của VHPC, hỗ trợ PC Gaming, Workstation, Laptop và Monitor.",
  "Chỉ trả lời ngắn gọn, tự nhiên bằng tiếng Việt.",
  "Không được tự bịa giá, tồn kho, mã giảm giá, chính sách, trạng thái đơn hàng hoặc tên sản phẩm nếu hệ thống chưa cung cấp dữ liệu.",
  "Nếu câu hỏi cần dữ liệu thật nhưng chưa có kết quả từ hệ thống, hãy nói rõ là mình chưa có dữ liệu chính xác và yêu cầu người dùng cung cấp tên sản phẩm, mã đơn hàng hoặc nhu cầu cụ thể hơn.",
  "Nếu người dùng hỏi tư vấn nhưng thiếu thông tin, chỉ hỏi thêm ngân sách, mục đích sử dụng, game/phần mềm chính hoặc kích thước màn hình mong muốn.",
  "Không đưa ra danh sách sản phẩm cụ thể trong fallback. Danh sách sản phẩm chỉ được trả khi tool/database tìm thấy.",
].join(" ")

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
      system: FALLBACK_SYSTEM_PROMPT,
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

/**
 * Trả về ReadableStream<Uint8Array> để pipe thẳng vào Response — stream thật token-by-token.
 * onFinish được gọi bởi AI SDK sau khi toàn bộ text đã stream xong, dùng để lưu DB.
 * Trả null nếu OPENROUTER_API_KEY chưa được cấu hình.
 */
export function streamHybridFallback(
  message: string,
  onFinish?: (text: string) => Promise<void>
): ReadableStream<Uint8Array> | null {
  if (!openrouter) return null

  const result = streamText({
    model: openrouter(OPENROUTER_MODEL),
    temperature: 0.3,
    maxOutputTokens: 220,
    system: FALLBACK_SYSTEM_PROMPT,
    prompt: message,
    onFinish: onFinish
      ? async ({ text }) => { await onFinish(text.trim()) }
      : undefined,
  })

  return result.textStream.pipeThrough(new TextEncoderStream())
}
