import { PRODUCT_TYPE_SIGNALS, USAGE_SIGNALS } from "../shared/constants"
import { normalizeText } from "../shared/text-utils"
import type { IntentExtractionResult } from "../shared/types"

type ProductType = NonNullable<IntentExtractionResult["entities"]["productType"]>
type Usage = NonNullable<IntentExtractionResult["entities"]["usage"]>

function matchesAnySignal(value: string, terms: readonly string[]) {
  const normalized = normalizeText(value)
  const tokens = new Set(normalized.split(/[^a-z0-9]+/).filter(Boolean))

  return terms.some((term) => {
    const normalizedTerm = normalizeText(term)
    if (!normalizedTerm) return false

    return normalizedTerm.includes(" ") ? normalized.includes(normalizedTerm) : tokens.has(normalizedTerm)
  })
}

function joinAndNormalize(values: Array<string | undefined>) {
  return normalizeText(values.filter(Boolean).join(" "))
}

export function detectProductType(...values: Array<string | undefined>): ProductType | undefined {
  const normalized = joinAndNormalize(values)

  if (matchesAnySignal(normalized, PRODUCT_TYPE_SIGNALS.Laptop)) return "Laptop"
  if (matchesAnySignal(normalized, PRODUCT_TYPE_SIGNALS.Monitor)) return "Monitor"
  if (matchesAnySignal(normalized, PRODUCT_TYPE_SIGNALS.PC)) return "PC"

  return undefined
}

export function detectUsage(...values: Array<string | undefined>): Usage | undefined {
  const normalized = joinAndNormalize(values)

  if (matchesAnySignal(normalized, USAGE_SIGNALS.gaming)) return "gaming"
  if (matchesAnySignal(normalized, USAGE_SIGNALS.workstation)) return "workstation"
  if (matchesAnySignal(normalized, USAGE_SIGNALS.office)) return "office"

  return undefined
}

export function deriveCategory(productType?: ProductType, usage?: Usage, fallbackCategory?: string) {
  if (productType === "PC" && usage === "gaming") return "PC Gaming"
  if (productType === "PC" && usage === "workstation") return "PC Đồ họa"
  if (productType === "PC") return undefined
  if (productType === "Laptop") return "Laptop"
  if (productType === "Monitor") return "Monitor"

  return fallbackCategory
}

export function deriveUseCase(usage?: Usage, fallbackUseCase?: string) {
  if (usage === "gaming") return "gaming game"
  if (usage === "workstation") return "render do hoa thiet ke workstation"
  if (usage === "office") return "hoc tap van phong office"

  return fallbackUseCase
}

export function hasProductRequestSignal(text: string) {
  return Boolean(detectProductType(text) || detectUsage(text))
}
