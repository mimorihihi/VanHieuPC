import { generateText } from "ai"
import { createOpenRouter } from "@openrouter/ai-sdk-provider"

import { OPENROUTER_API_KEY, OPENROUTER_MODEL } from "../shared/constants"
import { extractJsonObject } from "../shared/text-utils"
import type { ToolRoute } from "../shared/types"

const openrouter = OPENROUTER_API_KEY
  ? createOpenRouter({
      apiKey: OPENROUTER_API_KEY,
    })
  : null

export async function routeMessageToTool(message: string): Promise<ToolRoute | null> {
  if (!openrouter) return null

  try {
    const result = await generateText({
      model: openrouter(OPENROUTER_MODEL),
      temperature: 0,
      maxOutputTokens: 120,
      system: [
        "Bạn là bộ định tuyến tool cho chatbot chăm sóc khách hàng ecommerce VHPC.",
        "Nhiệm vụ của bạn là chọn đúng 1 tool phù hợp nhất cho tin nhắn người dùng.",
        "Chỉ được chọn 1 trong 6 tool: searchFAQ, searchProducts, recommendProducts, getProductDetail, checkInventory, checkOrderStatus.",
        "Ưu tiên chọn tool dựa trên ý định hành động thực tế của người dùng, không trả lời thay cho tool.",
        "Nếu người dùng hỏi giao hàng, vận chuyển, ship, thanh toán, đổi trả, hoàn tiền, bảo hành, chính sách, COD hoặc checkout thì chọn searchFAQ.",
        "Nếu người dùng muốn tìm sản phẩm theo tên, thương hiệu hoặc từ khóa cụ thể thì chọn searchProducts.",
        "Nếu người dùng cần tư vấn, gợi ý, đề xuất sản phẩm/cấu hình theo ngân sách, nhu cầu chơi game, làm việc, học tập, render, đồ họa, laptop hoặc màn hình thì chọn recommendProducts.",
        "Nếu người dùng hỏi giá, thông tin chi tiết, mô tả hoặc thông số của một sản phẩm cụ thể thì chọn getProductDetail.",
        "Nếu người dùng hỏi còn hàng không, hết hàng, tồn kho hoặc stock của sản phẩm thì chọn checkInventory.",
        "Nếu người dùng hỏi trạng thái đơn hàng hoặc cung cấp mã đơn thì chọn checkOrderStatus.",
        "Nếu câu hỏi mơ hồ nhưng vẫn gần với một tool, hãy chọn tool gần nhất thay vì trả về null.",
        "Với searchFAQ dùng params.query. Với searchProducts dùng params.query. Với recommendProducts dùng params.query, category, useCase, minPrice, maxPrice nếu suy luận được. Với getProductDetail và checkInventory dùng params.product. Với checkOrderStatus dùng params.orderNumber nếu thấy mã đơn, nếu chưa có thì để chuỗi rỗng.",
        "category chỉ nên là một trong: PC Gaming, Workstation, Laptop, Monitor nếu phù hợp. useCase có thể là gaming, workstation, laptop, monitor, office, study hoặc design.",
        "confidence là số từ 0 đến 1. reason là mô tả rất ngắn lý do chọn tool.",
        "Phải trả về JSON thuần với dạng: {\"toolName\": string, \"params\": {\"query\"?: string, \"product\"?: string, \"orderNumber\"?: string, \"category\"?: string, \"useCase\"?: string, \"minPrice\"?: number, \"maxPrice\"?: number}, \"confidence\": number, \"reason\"?: string }.",
        "Không bọc markdown. Không thêm giải thích ngoài JSON.",
      ].join(" "),
      prompt: `Tin nhắn người dùng: ${message}`,
    })

    const raw = result.text.trim()
    const jsonText = extractJsonObject(raw)
    const parsed = JSON.parse(jsonText) as ToolRoute

    if (
      !parsed?.toolName ||
      ![
        "searchFAQ",
        "searchProducts",
        "recommendProducts",
        "getProductDetail",
        "checkInventory",
        "checkOrderStatus",
      ].includes(parsed.toolName) ||
      typeof parsed.confidence !== "number"
    ) {
      return null
    }

    return parsed
  } catch {
    return null
  }
}
