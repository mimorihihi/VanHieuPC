import { extractOrderNumber, normalizeText } from "../shared/text-utils"

/**
 * Nhận ra intent kiểm tra trạng thái đơn hàng theo keyword hoặc mã đơn trong message.
 * Dùng làm signal bổ sung trong pipeline sau khi LLM extract intent.
 */
export function isOrderStatusMessage(message: string) {
  const normalized = normalizeText(message)
  const hasOrderStatusPhrase = ["trang thai don", "kiem tra don", "check order", "track order"].some((keyword) =>
    normalized.includes(keyword)
  )

  return Boolean(extractOrderNumber(message)) || hasOrderStatusPhrase
}
