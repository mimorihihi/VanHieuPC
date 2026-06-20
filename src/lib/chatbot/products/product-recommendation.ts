import { query } from "@/lib/db"
import { COMPONENT_LEXICON, MACHINE_CATEGORIES, PART_CATEGORIES, PRODUCT_CATEGORY_HINTS } from "../shared/constants"
import { extractBudgetRange, extractProductKeyword, getMeaningfulTokens, normalizeText } from "../shared/text-utils"
import type { ProductRecommendationIntent, ProductRow } from "../shared/types"
import { detectProductType } from "../core/signal-detector"

/** @deprecated Main flow uses LLM intent extraction; kept for legacy/eval callers only. */
export function extractRecommendationIntent(message: string): ProductRecommendationIntent {
  const normalized = normalizeText(message)
  const matchedHint = PRODUCT_CATEGORY_HINTS.find((hint) =>
    hint.keywords.some((keyword) => normalized.includes(keyword))
  )
  const budget = extractBudgetRange(message)

  return {
    query: extractProductKeyword(message) || message,
    category: matchedHint?.category,
    useCase: matchedHint?.useCase,
    ...budget,
  }
}

/** @deprecated Main flow uses LLM intent extraction; kept for legacy/eval callers only. */
export function isRecommendationMessage(message: string) {
  const normalized = normalizeText(message)
  const hasBuyingIntent = [
    "tu van",
    "goi y",
    "de xuat",
    "nen mua",
    "chon",
    "phu hop",
    "cau hinh",
    "build",
    "combo",
    "can may",
    "mua may",
    "may de",
  ].some((keyword) => normalized.includes(keyword))
  const hasWorkloadIntent = [
    "choi game",
    "gaming",
    "render",
    "do hoa",
    "thiet ke",
    "dung phim",
    "blender",
    "photoshop",
    "premiere",
    "autocad",
    "lap trinh",
    "hoc tap",
    "van phong",
  ].some((keyword) => normalized.includes(keyword))
  const hasCategoryHint = PRODUCT_CATEGORY_HINTS.some((hint) => hint.keywords.some((keyword) => normalized.includes(keyword)))
  const hasBudget = Boolean(extractBudgetRange(message).minPrice || extractBudgetRange(message).maxPrice)

  return (hasBuyingIntent && (hasCategoryHint || hasBudget || hasWorkloadIntent)) || (hasWorkloadIntent && hasBudget)
}

export function buildProductSearchTerms(keyword: string) {
  const cleanedKeyword = extractProductKeyword(keyword) || keyword
  const normalizedKeyword = normalizeText(cleanedKeyword)
  const tokens = getMeaningfulTokens(cleanedKeyword)

  return Array.from(new Set([normalizedKeyword, ...tokens])).filter((term) => term.length >= 2)
}

const GENERIC_SEARCH_TERMS = new Set([
  "tim",
  "kiem",
  "san",
  "pham",
  "hang",
  "shop",
  "co",
  "khong",
  "gia",
  "ban",
  "mua",
  "xem",
  "them",
  "man",
  "hinh",
  "monitor",
  "laptop",
  "pc",
  "may",
  "tinh",
  "bo",
])

function getSpecificSearchTerms(keyword: string) {
  return buildProductSearchTerms(keyword).filter((term) => {
    if (term.includes(" ")) return false
    return !GENERIC_SEARCH_TERMS.has(term)
  })
}

function productMatchesSpecificTerm(product: ProductRow | ReturnType<typeof mapProductRow>, keyword: string) {
  const specificTerms = getSpecificSearchTerms(keyword)
  if (!specificTerms.length) return true

  const haystack = normalizeText(`${product.name} ${product.brand_name ?? ""} ${product.category_name ?? ""} ${product.short_description ?? ""}`)
  return specificTerms.some((term) => haystack.includes(term))
}

export function scoreProductMatch(product: ProductRow, keyword: string) {
  const terms = buildProductSearchTerms(keyword)
  if (!terms.length) return 0

  const name = normalizeText(product.name)
  const brand = normalizeText(product.brand_name ?? "")
  const category = normalizeText(product.category_name ?? "")
  const description = normalizeText(product.short_description ?? "")
  const haystack = `${name} ${brand} ${category} ${description}`
  const phrase = normalizeText(keyword)

  let score = 0

  if (phrase && name.includes(phrase)) score += 12
  if (phrase && haystack.includes(phrase)) score += 8

  const wantsGaming = phrase.includes("gaming") || phrase.includes("choi game") || phrase.includes("game")
  const wantsWorkstation = ["render", "do hoa", "thiet ke", "workstation", "dung phim"].some((term) => phrase.includes(term))

  if (wantsGaming && (name.includes("gaming") || category.includes("gaming"))) score += 14
  if (wantsGaming && (category.includes("do hoa") || category.includes("workstation"))) score -= 8
  if (wantsWorkstation && (category.includes("do hoa") || category.includes("workstation") || description.includes("render"))) score += 14

  for (const term of terms) {
    if (name.includes(term)) score += 5
    else if (brand.includes(term)) score += 4
    else if (category.includes(term)) score += 3
    else if (description.includes(term)) score += 2
  }

  return score
}

export function mapProductRow(product: ProductRow) {
  return {
    ...product,
    price: product.price?.toString?.() ?? "0",
    sale_price: product.sale_price?.toString?.() ?? null,
    stock: Number(product.stock ?? 0),
  }
}

type ProductClass = "machine" | "part"

type ProductSearchLookup = {
  query: string
  productType?: ProductRecommendationIntent["productType"]
  categoryIds?: string[]
  minPrice?: number
  maxPrice?: number
}

function includesAnyNormalized(value: string, terms: readonly string[]) {
  const normalized = normalizeText(value)
  return terms.some((term) => normalized.includes(normalizeText(term)))
}

function matchesAnyToken(value: string, terms: readonly string[]) {
  const normalized = normalizeText(value)
  const tokens = new Set(normalized.split(/[^a-z0-9]+/).filter(Boolean))

  return terms.some((term) => {
    const normalizedTerm = normalizeText(term)
    if (!normalizedTerm) return false
    return normalizedTerm.includes(" ") ? normalized.includes(normalizedTerm) : tokens.has(normalizedTerm)
  })
}

function classifyProductClass(product: ProductRow | ReturnType<typeof mapProductRow>): ProductClass {
  const category = product.category_name ?? ""
  const name = product.name ?? ""
  const haystack = `${category} ${name}`

  if (includesAnyNormalized(category, PART_CATEGORIES)) return "part"
  if (includesAnyNormalized(category, MACHINE_CATEGORIES)) return "machine"

  if (includesAnyNormalized(haystack, ["laptop", "may tinh xach tay", "monitor", "man hinh"])) return "machine"
  if (/\bpc\b|may bo|bo may|desktop|workstation|do hoa/.test(normalizeText(haystack))) return "machine"
  if (matchesAnyToken(haystack, COMPONENT_LEXICON)) return "part"

  return "machine"
}

function intentTargetsComponent(intent: Pick<ProductRecommendationIntent, "query" | "category" | "productType">) {
  const haystack = `${intent.query ?? ""} ${intent.category ?? ""} ${intent.productType ?? ""}`
  return matchesAnyToken(haystack, COMPONENT_LEXICON)
}

function intentWantsMachine(intent: ProductRecommendationIntent | ProductSearchLookup) {
  if (intentTargetsComponent(intent)) return false
  if (["PC", "Laptop", "Monitor"].includes(intent.productType ?? "")) return true

  const usage = "usage" in intent ? intent.usage : undefined
  const useCase = "useCase" in intent ? intent.useCase : undefined
  if (usage || useCase) return true

  return includesAnyNormalized(intent.query ?? "", ["may", "may tinh", "pc", "desktop", "laptop", "man hinh", "monitor"])
}

function inferMachineProductType(intent: ProductRecommendationIntent | ProductSearchLookup): ProductRecommendationIntent["productType"] | undefined {
  return intent.productType ?? detectProductType(intent.query ?? "")
}

function dedupeByNormalizedName<T extends { name: string }>() {
  const seenNames = new Set<string>()

  return (product: T) => {
    const key = normalizeText(product.name)
    if (seenNames.has(key)) return false
    seenNames.add(key)
    return true
  }
}

export async function findMatchingProducts(keyword: string, limit = 5, lookup: Partial<ProductSearchLookup> = {}) {
  if (!keyword) return []

  const terms = buildProductSearchTerms(keyword)
  if (!terms.length) return []

  const categoryIds = lookup.categoryIds?.filter(Boolean) ?? []

  const params: Array<string | number> = terms.flatMap((term) => {
    const like = `%${term}%`
    return [like, like, like]
  })

  const whereClause = terms
    .map(
      () => `(
        p.name LIKE ?
        OR COALESCE(br.name, '') LIKE ?
        OR COALESCE(c.name, '') LIKE ?
      )`
    )
    .join(" OR ")

  const conditions = [`(${whereClause})`]

  if (categoryIds.length) {
    conditions.push(`p.category_id IN (${categoryIds.map(() => "?").join(", ")})`)
    params.push(...categoryIds)
  }

  const [rows] = await query<ProductRow[]>(
    `SELECT
       p.id,
       p.name,
       p.slug,
       p.short_description,
       p.price,
       p.sale_price,
       p.stock,
       p.thumbnail_url,
       br.name AS brand_name,
       c.name AS category_name
     FROM products p
     LEFT JOIN brands br ON br.id = p.brand_id
     LEFT JOIN categories c ON c.id = p.category_id
     WHERE p.is_active = true
       AND ${conditions.join(" AND ")}
     ORDER BY p.created_at DESC
     LIMIT 200`,
    params
  )

  const wantsMachine = intentWantsMachine({ query: keyword, ...lookup })
  const inferredProductType = inferMachineProductType({ query: keyword, ...lookup })

  return rows
    .map((product) => ({
      ...mapProductRow(product),
      matchScore: scoreProductMatch(product, keyword),
    }))
    .filter((product) => (wantsMachine ? classifyProductClass(product) !== "part" : true))
    .filter((product) => (categoryIds.length ? true : matchesProductType(product, inferredProductType)))
    .filter((product) => isWithinBudget(product, lookup))
    .filter((product) => productMatchesSpecificTerm(product, keyword))
    .filter((product) => product.matchScore >= 4)
    .sort((a, b) => b.matchScore - a.matchScore)
    .filter(dedupeByNormalizedName())
    .slice(0, limit)
    .map((product) => ({
      id: product.id,
      name: product.name,
      slug: product.slug,
      short_description: product.short_description,
      price: product.price,
      sale_price: product.sale_price,
      stock: product.stock,
      thumbnail_url: product.thumbnail_url,
      brand_name: product.brand_name,
      category_name: product.category_name,
    }))
}

export async function findProductByName(keyword: string) {
  const products = await findMatchingProducts(keyword, 1)
  return products[0] ?? null
}

export async function searchProducts(params: string | ProductSearchLookup) {
  const lookup = typeof params === "string" ? { query: params } : params
  return findMatchingProducts(lookup.query, 5, lookup)
}

function getEffectivePrice(product: ProductRow | ReturnType<typeof mapProductRow>) {
  const salePrice = Number(product.sale_price ?? 0)
  const basePrice = Number(product.price ?? 0)

  return salePrice > 0 ? salePrice : basePrice
}

function isWithinBudget(product: ProductRow | ReturnType<typeof mapProductRow>, intent: { minPrice?: number; maxPrice?: number }) {
  const effectivePrice = getEffectivePrice(product)

  if (intent.minPrice && effectivePrice < intent.minPrice) return false
  if (intent.maxPrice && effectivePrice > intent.maxPrice) return false

  return true
}

function getBudgetDistance(product: ProductRow | ReturnType<typeof mapProductRow>, intent: ProductRecommendationIntent) {
  const effectivePrice = getEffectivePrice(product)

  if (intent.maxPrice) return Math.abs(intent.maxPrice - effectivePrice)
  if (intent.minPrice) return Math.abs(effectivePrice - intent.minPrice)

  return effectivePrice
}

function matchesProductType(product: ProductRow | ReturnType<typeof mapProductRow>, productType?: ProductRecommendationIntent["productType"]) {
  if (!productType) return true

  const category = normalizeText(product.category_name ?? "")
  const name = normalizeText(product.name ?? "")
  const haystack = `${category} ${name}`

  if (productType === "Laptop") return /laptop|may tinh xach tay/.test(haystack)
  if (productType === "Monitor") return /man hinh|monitor/.test(haystack)

  if (productType === "PC") {
    const excludedCategories = [
      "laptop",
      "may tinh xach tay",
      "man hinh",
      "monitor",
      ...COMPONENT_LEXICON,
      "nguon",
      "case",
    ]
    const isExcluded = matchesAnyToken(category, excludedCategories)
    const looksLikePc = /\bpc\b|may bo|bo may|desktop|gaming|workstation|do hoa/.test(haystack)

    return looksLikePc && !isExcluded
  }

  return true
}

function getUseCaseTokens(useCase?: string) {
  if (!useCase) return []

  return getMeaningfulTokens(useCase).filter((token) => token.length >= 3)
}

function scoreRecommendedProduct(product: ProductRow, intent: ProductRecommendationIntent, wantsMachine = intentWantsMachine(intent)) {
  const baseScore = scoreProductMatch(product, intent.query)
  const category = normalizeText(product.category_name ?? "")
  const description = normalizeText(product.short_description ?? "")
  const name = normalizeText(product.name)
  const haystack = `${name} ${category} ${description}`
  const effectivePrice = getEffectivePrice(product)

  let score = baseScore

  if (wantsMachine && classifyProductClass(product) === "part") score -= 100

  if (intent.category && category.includes(normalizeText(intent.category))) score += 18
  if (intent.category && !category.includes(normalizeText(intent.category))) score -= 12

  const wantsGaming = intent.usage === "gaming"
  const wantsWorkstation = intent.usage === "workstation"
  const wantsOffice = intent.usage === "office"
  const gamingSignal = /gaming|rtx|geforce|rog|tuf|nitro|gtx|144hz|165hz|240hz/.test(haystack)
  const workstationSignal = /workstation|render|do hoa|thiet ke|quadro|rtx a|threadripper|xeon|creator|nvidia|premiere|autocad|blender/.test(haystack)
  const officeSignal = /van phong|hoc tap|mong nhe|office|inspiron|vivobook|ideapad|aspire|thinkpad/.test(haystack)

  if (wantsGaming) {
    if (gamingSignal) score += 16
    if (workstationSignal && !gamingSignal) score -= 6
    if (officeSignal && !gamingSignal) score -= 8
  }

  if (wantsWorkstation) {
    if (workstationSignal) score += 16
    if (gamingSignal && !workstationSignal) score -= 6
    if (officeSignal && !workstationSignal) score -= 8
  }

  if (wantsOffice) {
    if (officeSignal) score += 12
    if (gamingSignal) score -= 6
    if (workstationSignal) score -= 6
  }

  if (intent.useCase) {
    const useCaseTokens = getUseCaseTokens(intent.useCase)
    const matchedTokens = useCaseTokens.filter((token) => haystack.includes(token))
    if (matchedTokens.length) score += Math.min(12, matchedTokens.length * 4)
  }

  if (product.stock > 0) score += 6
  if (intent.maxPrice && effectivePrice <= intent.maxPrice) score += 10
  if (intent.maxPrice && effectivePrice > intent.maxPrice) score -= 100
  if (intent.minPrice && effectivePrice >= intent.minPrice) score += 4
  if (intent.minPrice && effectivePrice < intent.minPrice) score -= 40

  return score
}

function compareRecommendedProducts(
  a: ReturnType<typeof mapProductRow> & { matchScore: number },
  b: ReturnType<typeof mapProductRow> & { matchScore: number },
  intent: ProductRecommendationIntent
) {
  if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore
  if (b.stock !== a.stock) return b.stock - a.stock

  return getBudgetDistance(a, intent) - getBudgetDistance(b, intent)
}

export async function recommendProducts(intent: ProductRecommendationIntent, limit = 5) {
  const wantsMachine = intentWantsMachine(intent)
  const inferredProductType = inferMachineProductType(intent)
  const terms = buildProductSearchTerms(`${intent.query} ${intent.category ?? ""} ${intent.useCase ?? ""}`)
  const whereParts = ["p.is_active = true"]
  const params: Array<string | number> = []

  // Ngân sách KHÔNG khóa trong SQL (giữ ứng viên rộng cho scoring), được xử lý ở 2 bước JS:
  // - scoreRecommendedProduct: thưởng/phạt theo dải giá (ưu tiên SP đúng tầm tiền);
  // - isWithinBudget (bên dưới): lọc cứng, loại SP ngoài dải giá.
  // Hệ quả: nếu catalog không có SP đúng dải giá thì trả rỗng (đúng theo dữ liệu).
  // SCALE NOTE: LIMIT 200 an toàn cho catalog demo; khi mỗi loại vượt ~200 SP,
  // nên nâng cap hoặc đẩy pre-filter ngân sách nới rộng xuống SQL để tránh mất recall.

  const categoryIds = intent.categoryIds?.filter(Boolean) ?? []

  if (categoryIds.length) {
    whereParts.push(`p.category_id IN (${categoryIds.map(() => "?").join(", ")})`)
    params.push(...categoryIds)
  } else if (intent.productType === "Laptop") {
    whereParts.push("(COALESCE(c.name, '') LIKE ? OR p.name LIKE ?)")
    params.push("%Laptop%", "%Laptop%")
  } else if (intent.productType === "Monitor") {
    whereParts.push("(COALESCE(c.name, '') LIKE ? OR COALESCE(c.name, '') LIKE ? OR p.name LIKE ? OR p.name LIKE ?)")
    params.push("%Monitor%", "%Màn hình%", "%Monitor%", "%Màn hình%")
  } else if (intent.productType === "PC") {
    whereParts.push(`(
      COALESCE(c.name, '') LIKE ?
      OR COALESCE(c.name, '') LIKE ?
      OR p.name LIKE ?
      OR p.name LIKE ?
      OR p.name LIKE ?
    )`)
    params.push("%PC%", "%Workstation%", "%PC%", "%Desktop%", "%Máy bộ%")
    whereParts.push(`(
      COALESCE(c.name, '') NOT LIKE ?
      AND p.name NOT LIKE ?
      AND p.name NOT LIKE ?
      AND COALESCE(c.name, '') NOT LIKE ?
      AND p.name NOT LIKE ?
      AND p.name NOT LIKE ?
    )`)
    params.push("%Laptop%", "%Laptop%", "%SSD%", "%SSD%", "%Màn hình%", "%Monitor%")
  }

  const shouldFilterByTerms = Boolean(terms.length && !categoryIds.length && !intent.productType && !wantsMachine)

  if (shouldFilterByTerms) {
    whereParts.push(`(${terms
      .map(() => `(p.name LIKE ? OR COALESCE(br.name, '') LIKE ? OR COALESCE(c.name, '') LIKE ? OR COALESCE(p.short_description, '') LIKE ?)`)
      .join(" OR ")})`)
    params.push(...terms.flatMap((term) => {
      const like = `%${term}%`
      return [like, like, like, like]
    }))
  }

  const [rows] = await query<ProductRow[]>(
    `SELECT
       p.id,
       p.name,
       p.slug,
       p.short_description,
       p.price,
       p.sale_price,
       p.stock,
       p.thumbnail_url,
       br.name AS brand_name,
       c.name AS category_name
     FROM products p
     LEFT JOIN brands br ON br.id = p.brand_id
     LEFT JOIN categories c ON c.id = p.category_id
     WHERE ${whereParts.join(" AND ")}
     LIMIT 200`,
    params
  )

  return rows
    .map((product) => ({
      ...mapProductRow(product),
      matchScore: scoreRecommendedProduct(product, intent, wantsMachine),
    }))
    .filter((product) => (wantsMachine ? classifyProductClass(product) !== "part" : true))
    .filter((product) => (categoryIds.length ? true : matchesProductType(product, inferredProductType)))
    .filter((product) => isWithinBudget(product, intent))
    .filter((product) => product.matchScore >= 6)
    .sort((a, b) => compareRecommendedProducts(a, b, intent))
    .filter(dedupeByNormalizedName())
    .slice(0, limit)
    .map((product) => ({
      id: product.id,
      name: product.name,
      slug: product.slug,
      short_description: product.short_description,
      price: product.price,
      sale_price: product.sale_price,
      stock: product.stock,
      thumbnail_url: product.thumbnail_url,
      brand_name: product.brand_name,
      category_name: product.category_name,
    }))
}
