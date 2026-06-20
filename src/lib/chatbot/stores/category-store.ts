import { query } from "@/lib/db"
import { normalizeText } from "../shared/text-utils"
import type { RowDataPacket } from "mysql2/promise"

type CategoryRow = RowDataPacket & {
  id: string
  name: string
  slug: string
  parent_id: string | null
}

export type ChatCategory = {
  id: string
  name: string
  slug: string
  parentId: string | null
}

const CACHE_TTL_MS = 5 * 60 * 1000

let cache: { categories: ChatCategory[]; expiresAt: number } | null = null

async function loadCategories(): Promise<ChatCategory[]> {
  const [rows] = await query<CategoryRow[]>(
    `SELECT id, name, slug, parent_id
     FROM categories
     WHERE is_active = true
     ORDER BY sort_order ASC, name ASC`
  )

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    parentId: row.parent_id ?? null,
  }))
}

export async function getCategories(): Promise<ChatCategory[]> {
  const now = Date.now()
  if (cache && cache.expiresAt > now) return cache.categories

  try {
    const categories = await loadCategories()
    cache = { categories, expiresAt: now + CACHE_TTL_MS }
    return categories
  } catch {
    // Khi DB lỗi, trả cache cũ nếu có để chatbot vẫn hoạt động tối thiểu.
    return cache?.categories ?? []
  }
}

export function clearCategoryCache() {
  cache = null
}

export async function findCategoryBySlugOrName(value: string | undefined): Promise<ChatCategory | null> {
  const target = value?.trim()
  if (!target) return null

  const categories = await getCategories()
  const bySlug = categories.find((category) => category.slug === target)
  if (bySlug) return bySlug

  const normalizedTarget = normalizeText(target)
  return (
    categories.find((category) => category.slug === normalizedTarget) ??
    categories.find((category) => normalizeText(category.name) === normalizedTarget) ??
    null
  )
}

export async function getCategoryIdsBySlug(slug: string | undefined): Promise<string[]> {
  const category = await findCategoryBySlugOrName(slug)
  if (!category) return []

  const categories = await getCategories()
  const childIds = categories
    .filter((item) => item.parentId === category.id)
    .map((item) => item.id)

  return [category.id, ...childIds]
}

export async function getValidCategorySlugs(): Promise<Set<string>> {
  const categories = await getCategories()
  return new Set(categories.map((category) => category.slug))
}

export async function formatTaxonomyForPrompt(): Promise<string> {
  const categories = await getCategories()
  if (!categories.length) return "Không có danh mục nào."

  const byId = new Map(categories.map((category) => [category.id, category]))
  const roots = categories.filter((category) => !category.parentId || !byId.has(category.parentId))
  const children = (parentId: string) => categories.filter((category) => category.parentId === parentId)

  const lines: string[] = []
  for (const root of roots) {
    const kids = children(root.id)
    const childText = kids.length ? ` (con: ${kids.map((kid) => kid.slug).join(", ")})` : ""
    lines.push(`- ${root.name} [slug: ${root.slug}]${childText}`)
  }

  return lines.join("\n")
}
