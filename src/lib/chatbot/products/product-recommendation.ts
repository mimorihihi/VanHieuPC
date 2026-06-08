import { query } from "@/lib/db"
import { PRODUCT_CATEGORY_HINTS } from "../shared/constants"
import { extractBudgetRange, extractProductKeyword, getMeaningfulTokens, normalizeText } from "../shared/text-utils"
import type { ProductRecommendationIntent, ProductRow } from "../shared/types"

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
  const normalizedKeyword = normalizeText(keyword)
  const tokens = getMeaningfulTokens(keyword)

  return Array.from(new Set([normalizedKeyword, ...tokens])).filter((term) => term.length >= 2)
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

export async function findMatchingProducts(keyword: string, limit = 5) {
  if (!keyword) return []

  const terms = buildProductSearchTerms(keyword)
  if (!terms.length) return []

  const likeParams = terms.flatMap((term) => {
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
       AND (${whereClause})
     ORDER BY p.created_at DESC
     LIMIT 30`,
    likeParams
  )

  return rows
    .map((product) => ({
      ...mapProductRow(product),
      matchScore: scoreProductMatch(product, keyword),
    }))
    .filter((product) => product.matchScore > 0)
    .sort((a, b) => b.matchScore - a.matchScore)
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

export async function searchProducts(keyword: string) {
  return findMatchingProducts(keyword, 5)
}

function getEffectivePrice(product: ProductRow | ReturnType<typeof mapProductRow>) {
  return Number(product.sale_price ?? product.price ?? 0)
}

function scoreRecommendedProduct(product: ProductRow, intent: ProductRecommendationIntent) {
  const baseScore = scoreProductMatch(product, intent.query)
  const category = normalizeText(product.category_name ?? "")
  const description = normalizeText(product.short_description ?? "")
  const name = normalizeText(product.name)
  const haystack = `${name} ${category} ${description}`
  const effectivePrice = getEffectivePrice(product)

  let score = baseScore

  if (intent.category && category.includes(normalizeText(intent.category))) score += 18
  if (intent.useCase && haystack.includes(normalizeText(intent.useCase))) score += 8
  if (product.stock > 0) score += 6
  if (intent.maxPrice && effectivePrice <= intent.maxPrice) score += 10
  if (intent.minPrice && effectivePrice >= intent.minPrice) score += 4

  return score
}

export async function recommendProducts(intent: ProductRecommendationIntent, limit = 5) {
  const terms = buildProductSearchTerms(`${intent.query} ${intent.category ?? ""} ${intent.useCase ?? ""}`)
  const whereParts = ["p.is_active = true"]
  const params: Array<string | number> = []

  if (intent.maxPrice) {
    whereParts.push("COALESCE(p.sale_price, p.price) <= ?")
    params.push(intent.maxPrice)
  }

  if (intent.minPrice) {
    whereParts.push("COALESCE(p.sale_price, p.price) >= ?")
    params.push(intent.minPrice)
  }

  if (terms.length) {
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
     ORDER BY p.stock DESC, p.created_at DESC
     LIMIT 40`,
    params
  )

  return rows
    .map((product) => ({
      ...mapProductRow(product),
      matchScore: scoreRecommendedProduct(product, intent),
    }))
    .filter((product) => product.matchScore > 0)
    .sort((a, b) => b.matchScore - a.matchScore)
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
