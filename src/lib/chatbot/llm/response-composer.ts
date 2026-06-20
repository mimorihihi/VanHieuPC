import { generateText, streamText } from "ai"
import { createOpenRouter } from "@openrouter/ai-sdk-provider"

import type { NormalizedChatInput } from "../core/input-normalizer"
import type { ChatContext } from "../stores/context-store"
import { OPENROUTER_API_KEY, OPENROUTER_MODEL } from "../shared/constants"
import type { IntentExtractionResult, ToolExecutionResult } from "../shared/types"

const openrouter = OPENROUTER_API_KEY
  ? createOpenRouter({
      apiKey: OPENROUTER_API_KEY,
    })
  : null

function formatContext(context: ChatContext) {
  return [
    context.lastProductName ? `Sản phẩm gần nhất: ${context.lastProductName}` : null,
    context.lastUseCase ? `Nhu cầu gần nhất: ${context.lastUseCase}` : null,
    context.lastMinPrice || context.lastMaxPrice
      ? `Ngân sách gần nhất: ${context.lastMinPrice ?? "không rõ"} - ${context.lastMaxPrice ?? "không rõ"} VND`
      : null,
    context.lastOrderNumber ? `Mã đơn gần nhất: ${context.lastOrderNumber}` : null,
  ].filter(Boolean).join("\n") || "Không có ngữ cảnh."
}

export async function composeToolResponse(params: {
  input: NormalizedChatInput
  context: ChatContext
  intentResult: IntentExtractionResult
  toolResult: ToolExecutionResult
}) {
  if (!openrouter || !params.toolResult.data) return params.toolResult.reply

  try {
    const result = await generateText({
      model: openrouter(OPENROUTER_MODEL),
      temperature: 0.2,
      maxOutputTokens: 420,
      system: createComposerSystemPrompt(),
      prompt: createComposerPrompt(params),
    })

    return result.text.trim() || params.toolResult.reply
  } catch {
    return params.toolResult.reply
  }
}

function createComposerSystemPrompt() {
  return [
    "Bạn là trợ lý tư vấn mua hàng VHPC.",
    "Nhiệm vụ: viết lại kết quả tool thành câu trả lời tiếng Việt tự nhiên, ngắn gọn, thân thiện.",
    "BẮT BUỘC giữ bố cục nhiều dòng, dễ đọc. Không dồn danh sách sản phẩm thành một đoạn văn dài.",
    "Không dùng markdown bold/italic như **, __, *, _. Không bọc tên sản phẩm bằng ký tự đặc biệt.",
    "Với danh sách sản phẩm, mỗi sản phẩm phải nằm trên block riêng gồm tên, giá và tình trạng trên các dòng riêng.",
    "Chỉ dùng dữ liệu có trong toolResult. Không bịa giá, tồn kho, thông số, khuyến mãi hoặc sản phẩm ngoài dữ liệu.",
    "Nếu có nhiều sản phẩm, chỉ nêu tối đa 3-5 lựa chọn nổi bật.",
    "Nếu dữ liệu có giá, hãy nêu giá rõ ràng. Nếu có tồn kho, hãy nêu tình trạng còn/hết hàng.",
    "Không hiển thị JSON, metadata, tên intent hoặc chi tiết kỹ thuật tool.",
    "Không tự tạo link nếu dữ liệu không có link.",
  ].join(" ")
}

function createComposerPrompt(params: {
  input: NormalizedChatInput
  context: ChatContext
  intentResult: IntentExtractionResult
  toolResult: ToolExecutionResult
}) {
  return [
    `Tin nhắn gốc: ${params.input.original}`,
    `Tin nhắn đã normalize: ${params.input.normalized}`,
    `Intent: ${params.intentResult.intent}`,
    `Entities: ${JSON.stringify(params.intentResult.entities)}`,
    "Ngữ cảnh:",
    formatContext(params.context),
    `Câu trả lời formatter hiện tại: ${params.toolResult.reply}`,
    `Dữ liệu toolResult: ${JSON.stringify(params.toolResult.data).slice(0, 7000)}`,
  ].join("\n")
}

/** Stream composer only after tool data exists, so product answers show typing effect. */
export function streamComposeToolResponse(
  params: {
    input: NormalizedChatInput
    context: ChatContext
    intentResult: IntentExtractionResult
    toolResult: ToolExecutionResult
  },
  onFinish?: (text: string) => Promise<void>
): ReadableStream<Uint8Array> | null {
  if (!openrouter || !params.toolResult.data) return null

  const result = streamText({
    model: openrouter(OPENROUTER_MODEL),
    temperature: 0.2,
    maxOutputTokens: 420,
    system: createComposerSystemPrompt(),
    prompt: createComposerPrompt(params),
    onFinish: onFinish
      ? async ({ text }) => { await onFinish(text.trim() || params.toolResult.reply) }
      : undefined,
  })

  return result.textStream.pipeThrough(new TextEncoderStream())
}
