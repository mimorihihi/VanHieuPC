import type { ProductRecommendationIntent } from "./types"

export function formatCurrency(value: string | number | null | undefined) {
  const amount = Number(value ?? 0)
  if (!Number.isFinite(amount)) return "0đ"

  return `${amount.toLocaleString("vi-VN")}đ`
}

export function formatProductLabel(product: {
  name: string
  brand_name?: string | null
  category_name?: string | null
}) {
  const extras = [product.brand_name, product.category_name].filter(Boolean).join(" • ")
  return extras ? `${product.name} (${extras})` : product.name
}

export function formatProductSearchReply(products: Array<{
  name: string
  brand_name?: string | null
  category_name?: string | null
}>) {
  const list = products
    .slice(0, 5)
    .map((product, index) => `${index + 1}. ${formatProductLabel(product)}`)
    .join("\n")

  return [
    `Mình tìm thấy ${products.length} sản phẩm phù hợp:`,
    "",
    list,
    "",
    "Bạn muốn xem giá, tồn kho hoặc lọc thêm theo ngân sách không?",
  ].join("\n")
}

function formatBudgetCriterion(intent: ProductRecommendationIntent) {
  if (intent.minPrice && intent.maxPrice) {
    return `khoảng ${formatCurrency(intent.minPrice)} - ${formatCurrency(intent.maxPrice)}`
  }

  if (intent.maxPrice) {
    return intent.budgetMode === "approx"
      ? `ngân sách khoảng ${formatCurrency(intent.maxPrice)}`
      : `ngân sách tối đa ${formatCurrency(intent.maxPrice)}`
  }

  if (intent.minPrice) return `từ ${formatCurrency(intent.minPrice)}`

  return null
}

export function formatRecommendationReply(
  products: Array<{
    name: string
    price: string | number
    sale_price?: string | number | null
    stock: number
    brand_name?: string | null
    category_name?: string | null
  }>,
  intent: ProductRecommendationIntent
) {
  const criteria = [
    intent.category ? `nhóm ${intent.category}` : null,
    formatBudgetCriterion(intent),
  ].filter(Boolean)
  const intro = criteria.length
    ? `Dựa trên ${criteria.join(", ")}, mình gợi ý các lựa chọn còn phù hợp trong shop:`
    : "Mình gợi ý một số sản phẩm phù hợp trong shop:"
  const list = products
    .slice(0, 4)
    .map((product, index) => {
      const price = product.sale_price ?? product.price
      const stockText = product.stock > 0 ? "còn hàng" : "cần kiểm tra tồn kho"
      return [
        `${index + 1}. ${formatProductLabel(product)}`,
        `   Giá: ${formatCurrency(price)}`,
        `   Tình trạng: ${stockText}`,
      ].join("\n")
    })
    .join("\n\n")

  return [
    intro,
    "",
    list,
    "",
    "Bạn muốn mình tư vấn kỹ hơn theo game/phần mềm sử dụng hoặc so sánh các mẫu này không?",
  ].join("\n")
}

export function formatProductDetailReply(product: {
  name: string
  price: string | number
  sale_price?: string | number | null
  short_description?: string | null
  brand_name?: string | null
  category_name?: string | null
  variants?: Array<{ name: string; stock: number; is_active: boolean }>
}) {
  const intro = formatProductLabel(product)
  const activeVariants = Array.isArray(product.variants) ? product.variants.filter((variant) => variant.is_active) : []

  return [
    intro,
    `Giá: ${product.sale_price ? formatCurrency(product.sale_price) : formatCurrency(product.price)}`,
    product.sale_price ? `Giá niêm yết: ${formatCurrency(product.price)}` : null,
    product.short_description ? `Mô tả: ${product.short_description}` : null,
    activeVariants.length ? `Biến thể đang hoạt động: ${activeVariants.length}` : null,
  ].filter(Boolean).join("\n")
}

export function formatInventoryReply(inventory: {
  name: string
  brand_name?: string | null
  category_name?: string | null
  stock: number
  variants?: Array<{ name: string; stock: number }>
}) {
  const intro = formatProductLabel(inventory)
  if (inventory.stock <= 0) {
    return `${intro} hiện đang hết hàng.`
  }

  const topVariants = Array.isArray(inventory.variants)
    ? inventory.variants
        .slice(0, 2)
        .map((variant) => `${variant.name}: ${variant.stock}`)
        .join(", ")
    : ""

  return topVariants
    ? [
        intro,
        `Tình trạng: còn hàng`,
        `Tồn kho tổng: ${inventory.stock}`,
        `Một số biến thể: ${topVariants}`,
      ].join("\n")
    : [
        intro,
        `Tình trạng: còn hàng`,
        `Tồn kho hiện tại: ${inventory.stock}`,
      ].join("\n")
}
