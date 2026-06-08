export function normalizeText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
}

export function tokenizeText(value: string) {
  return normalizeText(value)
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 2)
}

export function getMeaningfulTokens(message: string) {
  const stopwords = new Set([
    "la",
    "lao",
    "toi",
    "minh",
    "shop",
    "co",
    "cho",
    "xin",
    "voi",
    "ve",
    "va",
    "hay",
    "neu",
    "thi",
    "duoc",
    "khong",
    "nao",
    "the",
    "giup",
    "gi",
    "mot",
    "cac",
    "nhung",
    "nhe",
    "nha",
    "a",
    "ah",
    "ua",
  ])

  return tokenizeText(message).filter((token) => !stopwords.has(token))
}

export function extractProductKeyword(message: string) {
  return message
    .replace(/giá|bao nhiêu|sale|còn hàng không|còn hàng|hết hàng|tồn kho|stock|sản phẩm|tìm|xem|mua/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export function parseVietnameseAmount(rawValue: string, unit?: string) {
  const numeric = Number(rawValue.replace(/,/g, "."))
  if (!Number.isFinite(numeric)) return undefined

  const normalizedUnit = normalizeText(unit ?? "")
  if (["tr", "trieu", "m", "million"].includes(normalizedUnit)) return Math.round(numeric * 1_000_000)
  if (["k", "nghin"].includes(normalizedUnit)) return Math.round(numeric * 1_000)
  if (numeric < 1_000) return Math.round(numeric * 1_000_000)
  return Math.round(numeric)
}

export function extractBudgetRange(message: string) {
  const normalized = normalizeText(message)
  const budget: { minPrice?: number; maxPrice?: number } = {}
  const rangeMatch = normalized.match(/(?:tu|khoang)?\s*(\d+(?:[.,]\d+)?)\s*(tr|trieu|m|million)?\s*(?:-|den|toi)\s*(\d+(?:[.,]\d+)?)\s*(tr|trieu|m|million)?/)

  if (rangeMatch) {
    const firstUnit = rangeMatch[2] || rangeMatch[4]
    const secondUnit = rangeMatch[4] || rangeMatch[2]
    budget.minPrice = parseVietnameseAmount(rangeMatch[1], firstUnit)
    budget.maxPrice = parseVietnameseAmount(rangeMatch[3], secondUnit)
    return budget
  }

  const amountMatch = normalized.match(/(\d+(?:[.,]\d+)?)\s*(tr|trieu|m|million|k|nghin)?/)
  if (!amountMatch) return budget

  const amount = parseVietnameseAmount(amountMatch[1], amountMatch[2])
  if (!amount) return budget

  if (/(duoi|toi da|max|khong qua|nho hon|tam duoi)/.test(normalized)) {
    budget.maxPrice = amount
  } else if (/(tren|tu|toi thieu|min|lon hon)/.test(normalized)) {
    budget.minPrice = amount
  } else {
    budget.minPrice = Math.max(0, Math.round(amount * 0.85))
    budget.maxPrice = Math.round(amount * 1.15)
  }

  return budget
}

export function extractJsonObject(text: string) {
  const trimmed = text.trim()
  if (!trimmed) return ""

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim()
  }

  const firstBrace = trimmed.indexOf("{")
  const lastBrace = trimmed.lastIndexOf("}")

  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1)
  }

  return trimmed
}

export function extractOrderNumber(message: string) {
  const contextualMatch =
    message.match(/(?:mã đơn|ma don|đơn hàng|don hang|order)\s*[:#-]?\s*([A-Za-z]{1,5}\d{2,}|[A-Z]{2,}[0-9]{2,}|[A-Z0-9_-]{6,})/i) ??
    message.match(/#([A-Za-z]{1,5}\d{2,}|[A-Z]{2,}[0-9]{2,}|[A-Z0-9_-]{6,})/)

  if (contextualMatch) {
    return contextualMatch[1] ?? contextualMatch[0]?.replace(/^#/, "") ?? ""
  }

  const standaloneMatch = message.match(/\b([A-Z]{2,}[0-9]{2,}|[A-Z0-9_-]{8,})\b/)
  return standaloneMatch?.[1] ?? ""
}
