import { tool } from "ai"
import { z } from "zod"

import { executeChatTool } from "../core/tools"
import type { ToolRoute } from "../shared/types"

const optionalText = z.string().trim().optional()
const optionalPrice = z.number().nonnegative().optional()

function createRoute(toolName: ToolRoute["toolName"], params: ToolRoute["params"]): ToolRoute {
  return {
    toolName,
    params,
    confidence: 1,
    reason: "AI SDK tool calling",
  }
}

async function runTool(route: ToolRoute) {
  const result = await executeChatTool(route)

  return {
    reply: result?.reply ?? "Mình chưa tìm thấy dữ liệu phù hợp. Bạn thử hỏi cụ thể hơn nhé.",
    data: result?.data ?? null,
    toolName: route.toolName,
    hasData: Boolean(result?.data),
  }
}

export const chatbotTools = {
  searchFAQ: tool({
    description:
      "Tra cứu FAQ/chính sách cố định của shop như giao hàng, vận chuyển, thanh toán, COD, checkout, đổi trả, hoàn tiền, bảo hành. Luôn dùng tool này cho câu hỏi chính sách để tránh tự bịa.",
    inputSchema: z.object({
      query: optionalText.describe("Câu hỏi hoặc chủ đề chính sách/FAQ người dùng cần tra cứu"),
    }),
    execute: async ({ query }) => {
      return runTool(createRoute("searchFAQ", { query: query ?? "" }))
    },
  }),

  searchProducts: tool({
    description:
      "Tìm sản phẩm theo tên, từ khóa, thương hiệu, danh mục hoặc khoảng giá. Dùng khi khách muốn tìm sản phẩm cụ thể.",
    inputSchema: z.object({
      query: optionalText.describe("Tên sản phẩm, từ khóa hoặc nhu cầu tìm kiếm"),
      category: optionalText.describe("Danh mục sản phẩm nếu có"),
      brand: optionalText.describe("Thương hiệu nếu có"),
      minPrice: optionalPrice.describe("Giá tối thiểu nếu có"),
      maxPrice: optionalPrice.describe("Giá tối đa nếu có"),
    }),
    execute: async ({ query, category, brand, minPrice, maxPrice }) => {
      const searchQuery = [query, brand, category].filter(Boolean).join(" ").trim()
      return runTool(createRoute("searchProducts", { query: searchQuery, category, minPrice, maxPrice }))
    },
  }),

  getProductDetail: tool({
    description:
      "Lấy thông tin chi tiết, mô tả, giá và thông số của một sản phẩm cụ thể. Dùng khi người dùng hỏi chi tiết sản phẩm.",
    inputSchema: z.object({
      productName: optionalText.describe("Tên sản phẩm cần xem chi tiết"),
      slug: optionalText.describe("Slug sản phẩm nếu có"),
    }),
    execute: async ({ productName, slug }) => {
      return runTool(createRoute("getProductDetail", { product: productName || slug || "" }))
    },
  }),

  recommendProducts: tool({
    description:
      "Gợi ý sản phẩm theo nhu cầu, ngân sách hoặc mục đích sử dụng như gaming, học tập, văn phòng, thiết kế, render.",
    inputSchema: z.object({
      query: optionalText.describe("Nội dung nhu cầu tư vấn của người dùng"),
      useCase: optionalText.describe("Mục đích sử dụng nếu có"),
      category: optionalText.describe("Danh mục mong muốn nếu có"),
      minPrice: optionalPrice.describe("Ngân sách tối thiểu nếu có"),
      maxPrice: optionalPrice.describe("Ngân sách tối đa nếu có"),
    }),
    execute: async ({ query, useCase, category, minPrice, maxPrice }) => {
      return runTool(createRoute("recommendProducts", { query: query ?? "", useCase, category, minPrice, maxPrice }))
    },
  }),

  checkInventory: tool({
    description:
      "Kiểm tra tình trạng tồn kho/còn hàng của sản phẩm hoặc biến thể sản phẩm.",
    inputSchema: z.object({
      productName: optionalText.describe("Tên sản phẩm cần kiểm tra tồn kho"),
      slug: optionalText.describe("Slug sản phẩm nếu có"),
      variant: optionalText.describe("Tên biến thể nếu người dùng có nhắc đến"),
    }),
    execute: async ({ productName, slug, variant }) => {
      const product = [productName, slug, variant].filter(Boolean).join(" ").trim()
      return runTool(createRoute("checkInventory", { product }))
    },
  }),

  checkOrderStatus: tool({
    description:
      "Kiểm tra trạng thái đơn hàng theo mã đơn hàng. Dùng khi người dùng hỏi đơn hàng đang ở đâu hoặc đã thanh toán chưa.",
    inputSchema: z.object({
      orderNumber: optionalText.describe("Mã đơn hàng người dùng cung cấp"),
    }),
    execute: async ({ orderNumber }) => {
      return runTool(createRoute("checkOrderStatus", { orderNumber: orderNumber ?? "" }))
    },
  }),
}
