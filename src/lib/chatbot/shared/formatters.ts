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
  const preview = products.slice(0, 3).map((product) => formatProductLabel(product)).join(", ")
  return products.length > 3
    ? `Mình tìm thấy ${products.length} sản phẩm phù hợp. Nổi bật gồm: ${preview}.`
    : `Mình tìm thấy ${products.length} sản phẩm phù hợp: ${preview}.`
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
  const displayBudget = intent.minPrice && intent.maxPrice
    ? Math.round((intent.minPrice + intent.maxPrice) / 2)
    : null
  const criteria = [
    intent.category ? `nhóm ${intent.category}` : null,
    displayBudget ? `ngân sách khoảng ${formatCurrency(displayBudget)}` : null,
    !intent.minPrice && intent.maxPrice ? `ngân sách tối đa ${formatCurrency(intent.maxPrice)}` : null,
    intent.minPrice && !intent.maxPrice ? `từ ${formatCurrency(intent.minPrice)}` : null,
  ].filter(Boolean)
  const intro = criteria.length
    ? `Dựa trên ${criteria.join(", ")}, mình gợi ý các lựa chọn còn phù hợp trong shop:`
    : "Mình gợi ý một số sản phẩm phù hợp trong shop:"
  const list = products
    .slice(0, 4)
    .map((product, index) => {
      const price = product.sale_price ?? product.price
      const stockText = product.stock > 0 ? "còn hàng" : "cần kiểm tra tồn kho"
      return `${index + 1}. ${formatProductLabel(product)} - ${formatCurrency(price)} (${stockText})`
    })
    .join("\n")

  return `${intro}\n${list}\nBạn muốn mình tư vấn kỹ hơn theo game/phần mềm sử dụng hoặc so sánh các mẫu này không?`
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
  const priceText = product.sale_price
    ? `${intro} hiện có giá ${formatCurrency(product.sale_price)}. Giá niêm yết là ${formatCurrency(product.price)}.`
    : `${intro} hiện có giá ${formatCurrency(product.price)}.`
  const descriptionText = product.short_description ? ` ${product.short_description}` : ""
  const activeVariants = Array.isArray(product.variants) ? product.variants.filter((variant) => variant.is_active) : []
  const variantText = activeVariants.length
    ? ` Hiện có ${activeVariants.length} biến thể đang hoạt động.`
    : ""

  return `${priceText}${descriptionText}${variantText}`
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
    ? `${intro} hiện còn hàng. Tồn kho tổng là ${inventory.stock}. Một số biến thể: ${topVariants}.`
    : `${intro} hiện còn hàng. Số lượng tồn kho hiện tại là ${inventory.stock}.`
}
