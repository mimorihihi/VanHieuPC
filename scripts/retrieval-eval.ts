/**
 * Retrieval eval — soi tầng tìm sản phẩm (KHÔNG qua LLM).
 *
 * Khác với scripts/chatbot-eval.ts (đi qua HTTP, chỉ xem reply text), script này
 * gọi THẲNG searchProducts / recommendProducts / getProductDetail bằng các "intent"
 * tự dựng tay — tức là giả định LLM đã extract entity hoàn hảo. Nhờ vậy mọi lỗi
 * quan sát được là lỗi của RETRIEVAL (SQL LIKE + bảng điểm keyword), không lẫn lỗi NLU.
 *
 * Cách dùng (Node >= 22, đã có tsx + mysql2):
 *   node --env-file=.env --import tsx scripts/retrieval-eval.ts
 *   # hoặc:  npm run eval:retrieval
 *
 * Mỗi case in ra danh sách sản phẩm trả về + PASS/FAIL/WARN theo assertion.
 * FAIL = sai chắc chắn (rỗng khi đáng lẽ có, vượt ngân sách, lọt sai loại).
 * WARN = nghi ngờ recall/ranking, cần mắt người xác nhận với catalog thật.
 */

import { pool, query } from "@/lib/db"
import { recommendProducts, searchProducts } from "@/lib/chatbot/products/product-recommendation"
import { getProductDetail, checkInventory } from "@/lib/chatbot/products/product-store"
import { getCategoryIdsBySlug } from "@/lib/chatbot/stores/category-store"
import type { ProductRecommendationIntent } from "@/lib/chatbot/shared/types"
import { extractBudgetRange } from "@/lib/chatbot/shared/text-utils"

// ── Helpers ────────────────────────────────────────────────────────────────

type ReturnedProduct = Awaited<ReturnType<typeof searchProducts>>[number]

/** Giá hiệu lực: ưu tiên sale_price > 0, không thì price. Khớp getEffectivePrice trong product-store. */
function effectivePrice(p: { price?: unknown; sale_price?: unknown }) {
  const sale = Number(p.sale_price ?? 0)
  const base = Number(p.price ?? 0)
  return sale > 0 ? sale : base
}

function vnd(value: number) {
  return value.toLocaleString("vi-VN") + "đ"
}

const norm = (v: string) =>
  v.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")

type Level = "fail" | "warn"
type Check = { ok: boolean; label: string; detail?: string; level?: Level }

const summary = { fail: 0, warn: 0, pass: 0 }

function printProducts(products: ReturnedProduct[]) {
  if (!products.length) {
    console.log("   └─ (rỗng)")
    return
  }
  products.forEach((p, i) => {
    const cat = p.category_name ?? "—"
    const brand = p.brand_name ?? "—"
    console.log(
      `   ${i + 1}. ${p.name}  ·  [${cat}] · ${brand} · ${vnd(effectivePrice(p))} · stock ${p.stock}`
    )
  })
}

function report(checks: Check[]) {
  for (const c of checks) {
    if (c.ok) {
      summary.pass++
      console.log(`   ✅ ${c.label}${c.detail ? ` — ${c.detail}` : ""}`)
    } else if (c.level === "warn") {
      summary.warn++
      console.log(`   ⚠️  ${c.label}${c.detail ? ` — ${c.detail}` : ""}`)
    } else {
      summary.fail++
      console.log(`   ❌ ${c.label}${c.detail ? ` — ${c.detail}` : ""}`)
    }
  }
}

// Assertion builders ----------------------------------------------------------

function nonEmpty(products: ReturnedProduct[], level: Level = "fail"): Check {
  return { ok: products.length > 0, label: "Trả về ít nhất 1 sản phẩm", detail: `nhận ${products.length}`, level }
}

function withinBudget(products: ReturnedProduct[], maxPrice: number): Check {
  const over = products.filter((p) => effectivePrice(p) > maxPrice)
  return {
    ok: over.length === 0,
    label: `Mọi kết quả <= ngân sách ${vnd(maxPrice)}`,
    detail: over.length ? `${over.length} SP vượt giá: ${over.map((p) => p.name).join(", ")}` : undefined,
  }
}

function noneMatchesCategory(products: ReturnedProduct[], badRegex: RegExp, what: string): Check {
  const leaked = products.filter((p) => badRegex.test(norm(`${p.category_name ?? ""} ${p.name}`)))
  return {
    ok: leaked.length === 0,
    label: `Không lọt ${what}`,
    detail: leaked.length ? `lọt: ${leaked.map((p) => p.name).join(", ")}` : undefined,
  }
}

/** Khi user xin một CỖ MÁY (PC/laptop/màn hình) thì RAM/SSD/VGA/chuột lọt vào là sai. */
const PART_CATEGORY_RE = /components|^ram$|^vga$/
const PART_NAME_RE = /^(ram|ssd|hdd|chuot|ban phim|keyboard|mouse|card man hinh|vga|tai nghe|headset|nguon|psu|mainboard|cpu)\b/
function noAccessoryPollution(products: ReturnedProduct[]): Check {
  const parts = products.filter(
    (p) => PART_CATEGORY_RE.test(norm(p.category_name ?? "")) || PART_NAME_RE.test(norm(p.name))
  )
  return {
    ok: parts.length === 0,
    label: "Không lẫn linh kiện/phụ kiện vào tư vấn 'cỗ máy'",
    detail: parts.length ? `lọt ${parts.length}: ${parts.map((p) => p.name).join(", ")}` : undefined,
  }
}

function hasAnyCategory(products: ReturnedProduct[], wantRegex: RegExp, what: string): Check {
  const matched = products.filter((p) => wantRegex.test(norm(`${p.category_name ?? ""} ${p.name}`)))
  return {
    ok: matched.length > 0,
    label: `Có kết quả thuộc ${what}`,
    detail: matched.length ? `${matched.length}/${products.length} khớp` : "không có kết quả phù hợp",
  }
}

function noDuplicateNames(products: ReturnedProduct[]): Check {
  const seen = new Set<string>()
  const duplicates = new Set<string>()

  for (const product of products) {
    const key = norm(product.name)
    if (seen.has(key)) duplicates.add(product.name)
    seen.add(key)
  }

  return {
    ok: duplicates.size === 0,
    label: "Không có sản phẩm trùng tên trong kết quả",
    detail: duplicates.size ? Array.from(duplicates).join(", ") : undefined,
  }
}

function mostlyCategory(products: ReturnedProduct[], wantRegex: RegExp, what: string): Check {
  if (!products.length) return { ok: false, label: `Đa số là ${what}`, detail: "rỗng", level: "warn" }
  const hit = products.filter((p) => wantRegex.test(norm(`${p.category_name ?? ""} ${p.name}`)))
  const ratio = hit.length / products.length
  return {
    ok: ratio >= 0.5,
    label: `Đa số là ${what}`,
    detail: `${hit.length}/${products.length} khớp`,
    level: "warn",
  }
}

// ── Catalog probe — để diễn giải kết quả theo dữ liệu THẬT ───────────────────

async function probeCatalog() {
  console.log(`\n${"═".repeat(70)}\n📦 CATALOG PROBE\n${"═".repeat(70)}`)

  const [counts] = await query<any[]>(
    `SELECT COALESCE(c.name,'(no category)') AS category, COUNT(*) AS cnt
     FROM products p LEFT JOIN categories c ON c.id = p.category_id
     WHERE p.is_active = true GROUP BY c.name ORDER BY cnt DESC`
  )
  const total = counts.reduce((s, r) => s + Number(r.cnt), 0)
  console.log(`\nTổng sản phẩm active: ${total}`)
  console.log("Phân bố theo danh mục:")
  counts.forEach((r) => console.log(`   • ${r.category}: ${r.cnt}`))

  const [price] = await query<any[]>(
    `SELECT MIN(price) AS minP, MAX(price) AS maxP FROM products p WHERE p.is_active = true`
  )
  console.log(`\nDải giá (price gốc): ${vnd(Number(price[0]?.minP ?? 0))} → ${vnd(Number(price[0]?.maxP ?? 0))}`)

  const [brands] = await query<any[]>(`SELECT name FROM brands ORDER BY name LIMIT 30`)
  console.log(`\nThương hiệu (tối đa 30): ${brands.map((b) => b.name).join(", ") || "(không có bảng brands)"}`)

  // Lấy 1 sản phẩm thật để dựng case detail/inventory động.
  const [sample] = await query<any[]>(
    `SELECT p.name, p.slug FROM products p WHERE p.is_active = true ORDER BY p.created_at DESC LIMIT 1`
  )
  return sample[0] as { name: string; slug: string } | undefined
}

// ── Test cases (crafted intents) ─────────────────────────────────────────────

type SearchCase = {
  label: string
  why: string
  lookup: Parameters<typeof searchProducts>[0]
  assert: (r: ReturnedProduct[]) => Check[]
}

type RecommendCase = {
  label: string
  why: string
  intent: ProductRecommendationIntent
  assert: (r: ReturnedProduct[]) => Check[]
}

const LAPTOP_RE = /laptop|may tinh xach tay/
const MONITOR_RE = /man hinh|monitor/
const PC_GAMING_RE = /pc gaming|\bpc\b.*gaming|gaming.*\bpc\b/
const WORKSTATION_MACHINE_RE = /pc do hoa|do hoa|lam viec|workstation|creator|studio/
const VGA_RE = /\bvga\b|card man hinh|geforce|radeon|rtx|rx\b/
const RAM_RE = /\bram\b|ddr4|ddr5/
const ACCESSORY_RE = /ssd|hdd|ram|chuot|ban phim|keyboard|mouse|tai nghe|headset|gpu|vga|cpu|mainboard|nguon|psu|case/

const SEARCH_CASES: SearchCase[] = [
  {
    label: "S1 · baseline 'laptop'",
    why: "Sanity: query phổ biến phải ra hàng. Nếu rỗng → ngưỡng matchScore>=4 hoặc cap LIMIT 30 quá chặt.",
    lookup: { query: "laptop" },
    assert: (r) => [nonEmpty(r)],
  },
  {
    label: "S2 · budget respect (laptop <= 15tr)",
    why: "isWithinBudget phải loại sạch SP > 15tr.",
    lookup: { query: "laptop", maxPrice: 15_000_000 },
    assert: (r) => [withinBudget(r, 15_000_000)],
  },
  {
    label: "S3 · cap-before-scoring (query rộng 'may')",
    why: "Query mơ hồ: chỉ 30 dòng MỚI NHẤT được chấm điểm → SP khớp nhưng cũ bị bỏ. Quan sát recall.",
    lookup: { query: "may" },
    assert: (r) => [nonEmpty(r, "warn")],
  },
  {
    label: "S4 · component query VGA vẫn ra linh kiện",
    why: "Regression Phase 1: machine filter không được lọc nhầm khi user thật sự hỏi VGA/card màn hình.",
    lookup: { query: "tu van VGA gaming" },
    assert: (r) => [nonEmpty(r), hasAnyCategory(r, VGA_RE, "VGA/card màn hình")],
  },
  {
    label: "S5 · component query RAM vẫn ra linh kiện",
    why: "Regression Phase 1: COMPONENT_LEXICON phải nhận diện RAM là linh kiện, không áp machine-only filter.",
    lookup: { query: "ram 16gb nao ngon" },
    assert: (r) => [nonEmpty(r), hasAnyCategory(r, RAM_RE, "RAM")],
  },
]

const RECOMMEND_CASES: RecommendCase[] = [
  {
    label: "R1 · gaming laptop <= 20tr",
    why: "Happy path tư vấn. Phải ra hàng, đúng ngân sách, đa số là laptop.",
    intent: { query: "laptop gaming", productType: "Laptop", usage: "gaming", maxPrice: 20_000_000 },
    assert: (r) => [nonEmpty(r), withinBudget(r, 20_000_000), mostlyCategory(r, LAPTOP_RE, "laptop"), noDuplicateNames(r)],
  },
  {
    label: "R2 · PC exclusion list",
    why: "productType=PC dùng regex loại trừ cứng. Không được lọt laptop/màn hình/linh kiện.",
    intent: { query: "pc gaming", productType: "PC", usage: "gaming" },
    assert: (r) => [
      noneMatchesCategory(r, LAPTOP_RE, "laptop"),
      noneMatchesCategory(r, MONITOR_RE, "màn hình"),
      noneMatchesCategory(r, ACCESSORY_RE, "linh kiện/phụ kiện"),
    ],
  },
  {
    label: "R3 · workstation brand lạ (signal-table miss)",
    why: "scoreRecommendedProduct chỉ boost khi text chứa quadro/xeon/render... SP đồ hoạ tên lạ (ProArt, Creator) dễ bị bỏ. Nếu rỗng → đúng điểm yếu bảng regex.",
    intent: { query: "may thiet ke do hoa", usage: "workstation", useCase: "render video 4k" },
    assert: (r) => [nonEmpty(r, "warn"), noAccessoryPollution(r), noDuplicateNames(r)],
  },
  {
    label: "R4 · office laptop <= 12tr",
    why: "usage=office. Kiểm tra ngân sách + có hàng.",
    intent: { query: "laptop hoc tap van phong", productType: "Laptop", usage: "office", maxPrice: 12_000_000 },
    assert: (r) => [nonEmpty(r, "warn"), withinBudget(r, 12_000_000)],
  },
  {
    label: "R5 · monitor gaming",
    why: "productType=Monitor. Đa số kết quả phải là màn hình.",
    intent: { query: "man hinh gaming", productType: "Monitor", usage: "gaming" },
    assert: (r) => [nonEmpty(r, "warn"), mostlyCategory(r, MONITOR_RE, "màn hình"), noDuplicateNames(r)],
  },
  {
    label: "R6a · useCase token lạ ('cyberpunk 2077')",
    why: "useCase tokens phải xuất hiện literal trong tên/mô tả mới được cộng điểm. So với R6b để lộ độ nhạy token.",
    intent: { query: "may choi game", usage: "gaming", useCase: "cyberpunk 2077 ultra 2k" },
    assert: (r) => [nonEmpty(r, "warn"), noAccessoryPollution(r)],
  },
  {
    label: "R6b · cùng intent nhưng BỎ useCase lạ",
    why: "Đối chứng R6a. Không productType → vẫn phải recall được PC Gaming, không phụ thuộc token useCase tình cờ.",
    intent: { query: "may choi game", usage: "gaming" },
    assert: (r) => [nonEmpty(r), hasAnyCategory(r, PC_GAMING_RE, "PC Gaming"), noAccessoryPollution(r), noneMatchesCategory(r, MONITOR_RE, "màn hình")],
  },
  {
    label: "R6c · machine workstation không productType",
    why: "Đối chứng nhánh workstation: query máy làm việc/render chỉ có usage vẫn phải ra PC đồ hoạ/workstation, không rỗng.",
    intent: { query: "may lam viec render", usage: "workstation" },
    assert: (r) => [nonEmpty(r), hasAnyCategory(r, WORKSTATION_MACHINE_RE, "PC đồ hoạ/workstation"), noAccessoryPollution(r), noneMatchesCategory(r, MONITOR_RE, "màn hình")],
  },
  {
    label: "R7 · ngân sách phi lý (<= 3tr)",
    why: "Ép rỗng để xem hệ thống xử lý 'không có hàng' (lẽ ra nên gợi ý nới budget, không chỉ trả rỗng).",
    intent: { query: "laptop gaming", productType: "Laptop", usage: "gaming", maxPrice: 3_000_000 },
    assert: (r) => [{ ok: r.length === 0, label: "Đúng kỳ vọng rỗng (budget phi lý)", detail: `nhận ${r.length}`, level: "warn" }],
  },
  {
    label: "R8 · category 'hallucinated' (free-text không tồn tại)",
    why: "LLM có thể bịa category. Free-text category không được hard WHERE làm rỗng toàn bộ nếu query vẫn match catalog.",
    intent: { query: "gaming", category: "Gaming Gear RGB" },
    assert: (r) => [nonEmpty(r, "warn")],
  },
  {
    label: "R9 · component recommendation VGA không bị lọc nhầm",
    why: "Regression Phase 1: recommendProducts cũng phải giữ linh kiện khi intent nhắm tới component.",
    intent: { query: "tu van VGA gaming" },
    assert: (r) => [nonEmpty(r), hasAnyCategory(r, VGA_RE, "VGA/card màn hình")],
  },
  {
    label: "R10 · câu tư vấn PC gaming tầm 25tr parse budget đúng",
    why: "Regression: chữ 'tư' trong 'tư vấn' không được làm 'tầm 25 triệu' thành minPrice; phải là maxPrice và vẫn ra PC Gaming.",
    intent: {
      query: "Tư vấn cho mình một bộ PC chơi game tầm 25 triệu",
      productType: "PC",
      usage: "gaming",
      ...extractBudgetRange("Tư vấn cho mình một bộ PC chơi game tầm 25 triệu"),
    },
    assert: (r) => [nonEmpty(r), withinBudget(r, 25_000_000), hasAnyCategory(r, PC_GAMING_RE, "PC Gaming"), noneMatchesCategory(r, MONITOR_RE, "màn hình")],
  },
  {
    label: "R11 · workstation render 4K không bị parse 4K thành budget",
    why: "Regression: 4K là độ phân giải/use-case, không phải ngân sách 4.000đ; query workstation phải trả PC đồ hoạ.",
    intent: {
      query: "Mình cần máy làm việc render video 4K",
      usage: "workstation",
      useCase: "render video 4K",
      ...extractBudgetRange("Mình cần máy làm việc render video 4K"),
    },
    assert: (r) => [nonEmpty(r), hasAnyCategory(r, WORKSTATION_MACHINE_RE, "PC đồ hoạ/workstation"), noAccessoryPollution(r), noneMatchesCategory(r, MONITOR_RE, "màn hình")],
  },
  {
    label: "N1 · machine query chứa 'nguồn gốc' không bị hiểu là PSU",
    why: "Regression Phase 12: token 'nguon' trong cụm đời thường không được tắt machine filter và làm phụ kiện lọt lại.",
    intent: { query: "may choi game nguon goc ro rang", usage: "gaming" },
    assert: (r) => [nonEmpty(r), hasAnyCategory(r, PC_GAMING_RE, "PC Gaming"), noAccessoryPollution(r), noneMatchesCategory(r, MONITOR_RE, "màn hình")],
  },
  {
    label: "N2 · component query CPU vẫn ra linh kiện",
    why: "Regression Phase 12: đổi sang token matching không được làm mất khả năng nhận diện component query thật.",
    intent: { query: "tu van cpu gaming" },
    assert: (r) => [nonEmpty(r), hasAnyCategory(r, /\bcpu\b|core i[3579]|ryzen [3579]/, "CPU")],
  },
]

// ── Runners ──────────────────────────────────────────────────────────────────

async function runSearch(cases: SearchCase[]) {
  console.log(`\n${"═".repeat(70)}\n🔎 searchProducts (intent → SQL LIKE + scoreProductMatch)\n${"═".repeat(70)}`)
  for (const c of cases) {
    console.log(`\n▶ ${c.label}`)
    console.log(`  ${c.why}`)
    console.log(`  intent: ${JSON.stringify(c.lookup)}`)
    const r = await searchProducts(c.lookup)
    printProducts(r)
    report(c.assert(r))
  }
}

async function runRecommend(cases: RecommendCase[]) {
  console.log(`\n${"═".repeat(70)}\n🎯 recommendProducts (intent → SQL LIKE + scoreRecommendedProduct)\n${"═".repeat(70)}`)
  for (const c of cases) {
    console.log(`\n▶ ${c.label}`)
    console.log(`  ${c.why}`)
    console.log(`  intent: ${JSON.stringify(c.intent)}`)
    const r = await recommendProducts(c.intent)
    printProducts(r)
    report(c.assert(r))
  }
}

async function runCategorySlugRegression() {
  console.log(`\n${"═".repeat(70)}\n🏷️ categorySlug/categoryIds hard filter regression\n${"═".repeat(70)}`)
  const categoryIds = await getCategoryIdsBySlug("monitor")
  const intent: ProductRecommendationIntent = {
    query: "gaming",
    productType: "Monitor",
    usage: "gaming",
    categoryIds,
  }

  console.log(`\n▶ C1 · categorySlug hợp lệ 'monitor' vẫn hard filter`)
  console.log("  Sau Phase 3, chỉ free-text category bị gỡ khỏi WHERE; categoryIds đã validate vẫn phải lọc cứng.")
  console.log(`  intent: ${JSON.stringify(intent)}`)
  const r = await recommendProducts(intent)
  printProducts(r)
  report([
    nonEmpty(r),
    { ok: categoryIds.length > 0, label: "Resolve được categoryIds từ slug monitor", detail: `${categoryIds.length} id` },
    mostlyCategory(r, MONITOR_RE, "màn hình"),
  ])
}

async function runDetail(sample?: { name: string; slug: string }) {
  console.log(`\n${"═".repeat(70)}\n📄 getProductDetail / checkInventory (exact → fuzzy fallback)\n${"═".repeat(70)}`)
  if (!sample) {
    console.log("   (bỏ qua: catalog rỗng, không có sản phẩm mẫu)")
    return
  }

  // D1 · tên chính xác → exact match
  console.log(`\n▶ D1 · exact name: "${sample.name}"`)
  const d1 = await getProductDetail(sample.name)
  report([{ ok: Boolean(d1), label: "Khớp đúng sản phẩm theo tên chính xác", detail: d1?.name }])

  // D2 · tên mangle (bỏ từ cuối + thêm typo) → buộc fuzzy fallback
  const words = sample.name.split(/\s+/)
  const mangled = words.slice(0, Math.max(1, words.length - 1)).join(" ")
  console.log(`\n▶ D2 · fuzzy fallback: "${mangled}" (cắt bớt tên gốc)`)
  console.log(`  Nếu rỗng → findProductByName quá khắt khe với tên một phần.`)
  const d2 = await getProductDetail(mangled)
  report([{ ok: Boolean(d2), label: "Fuzzy fallback vẫn tìm ra sản phẩm", detail: d2?.name, level: "warn" }])

  // D3 · inventory theo tên thật
  console.log(`\n▶ D3 · checkInventory: "${sample.name}"`)
  const d3 = await checkInventory(sample.name)
  report([{ ok: Boolean(d3), label: "Trả tồn kho", detail: d3 ? `stock ${d3.stock}, ${d3.variants.length} variant` : undefined }])
}

async function main() {
  console.log(`\n🧪 RETRIEVAL EVAL — soi tầng tìm sản phẩm, KHÔNG qua LLM`)
  const sample = await probeCatalog()
  await runSearch(SEARCH_CASES)
  await runRecommend(RECOMMEND_CASES)
  await runCategorySlugRegression()
  await runDetail(sample)

  console.log(`\n${"═".repeat(70)}`)
  console.log(`TỔNG KẾT:  ✅ ${summary.pass} pass   ⚠️  ${summary.warn} warn   ❌ ${summary.fail} fail`)
  console.log(
    `Lưu ý: hàm retrieval đã STRIP matchScore khỏi kết quả trả về, nên script không in được điểm.\n` +
    `Muốn xem điểm để debug ranking → tạm export scoreRecommendedProduct/scoreProductMatch rồi in thêm.`
  )
  console.log(`${"═".repeat(70)}\n`)

  await pool.end()
}

main().catch(async (err) => {
  console.error("Lỗi khi chạy retrieval-eval:", err)
  await pool.end().catch(() => {})
  process.exit(1)
})
