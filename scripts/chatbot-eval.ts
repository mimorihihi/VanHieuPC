/**
 * Chatbot intent eval — chạy qua API route để test không cần mock.
 *
 * Cách dùng:
 *   1. Khởi động Next.js dev server: npm run dev
 *   2. Chạy script:   npx ts-node --project tsconfig.json scripts/chatbot-eval.ts
 *
 * Script gọi POST /api/chatbot với từng test case, in intent/reply ngắn gọn ra console.
 * CHATBOT_BASE_URL mặc định là http://localhost:3000.
 */

const BASE_URL = process.env.CHATBOT_BASE_URL ?? "http://localhost:3000"

type EvalCase = {
  label: string
  message: string
  expectedIntent?: string // optional — chỉ để tham chiếu, không tự fail
}

const TEST_CASES: EvalCase[] = [
  // ── Tìm sản phẩm (search_product) ──────────────────────────────────────────
  { label: "search: tên cụ thể",       message: "tim laptop lenovo ideapad",         expectedIntent: "search_product" },
  { label: "search: brand teencode",   message: "co may asus gaming khong",           expectedIntent: "search_product" },
  { label: "search: không dấu brand",  message: "ban may tinh dell khong",            expectedIntent: "search_product" },

  // ── Tư vấn / gợi ý (recommend_product) ────────────────────────────────────
  { label: "recommend: gaming PC",     message: "can may de choi game lol valorant tam 20cu", expectedIntent: "recommend_product" },
  { label: "recommend: workstation",   message: "co may nao chay blender render duoc khong", expectedIntent: "recommend_product" },
  { label: "recommend: laptop teen",   message: "co lap nao cho sv hoc tap van phong re re ko", expectedIntent: "recommend_product" },
  { label: "recommend: monitor 4K",    message: "man hinh 4k de thiet ke do hoa thi mua gi", expectedIntent: "recommend_product" },
  { label: "recommend: no diacritic",  message: "may de choi game tu 15 den 25 trieu", expectedIntent: "recommend_product" },
  { label: "recommend: budget + type", message: "can may workstation dung premiere tam 30cu", expectedIntent: "recommend_product" },

  // ── Chi tiết sản phẩm / giá (ask_product_detail / ask_product_price) ───────
  { label: "price: tên đầy đủ",        message: "asus rog strix g16 bao nhieu tien", expectedIntent: "ask_product_price" },
  { label: "detail: follow-up 'con nay'", message: "con nay thong so the nao",       expectedIntent: "ask_product_detail" },
  { label: "price: teen 'bn'",          message: "dell xps 15 gia bn z",             expectedIntent: "ask_product_price" },

  // ── Tồn kho (check_inventory) ───────────────────────────────────────────────
  { label: "inventory: còn hàng?",     message: "lenovo loq 15 con hang ko shop",    expectedIntent: "check_inventory" },
  { label: "inventory: 'con nay'",     message: "con nay con hang khong shop",       expectedIntent: "check_inventory" },

  // ── Chính sách FAQ (ask_faq_policy) ────────────────────────────────────────
  { label: "faq: giao hàng",           message: "shop ship toan quoc khong",         expectedIntent: "ask_faq_policy" },
  { label: "faq: đổi trả",             message: "chinh sach doi tra nhu the nao",    expectedIntent: "ask_faq_policy" },
  { label: "faq: COD",                 message: "mua xong tra tien sau duoc k",      expectedIntent: "ask_faq_policy" },

  // ── Khuyến mãi (ask_promotion) ─────────────────────────────────────────────
  { label: "promotion: voucher",        message: "shop co ma giam gia khong",         expectedIntent: "ask_promotion" },
  { label: "promotion: teen khuyen mai",message: "hom nay co deal gi hot k shop",    expectedIntent: "ask_promotion" },

  // ── Đơn hàng (check_order_status) ──────────────────────────────────────────
  { label: "order: mã đơn",            message: "kiem tra don hang VHPC20240101",    expectedIntent: "check_order_status" },
]

async function runCase(tc: EvalCase, sessionId: string) {
  const res = await fetch(`${BASE_URL}/api/chatbot`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, message: tc.message }),
  })

  if (!res.ok) {
    return { label: tc.label, error: `HTTP ${res.status}` }
  }

  const reply = await res.text()
  const nextSession = res.headers.get("x-chat-session-id") ?? sessionId

  return {
    label: tc.label,
    message: tc.message,
    expected: tc.expectedIntent ?? "—",
    reply: reply.slice(0, 120) + (reply.length > 120 ? "…" : ""),
    nextSession,
  }
}

async function main() {
  console.log(`\n🤖 Chatbot eval — ${TEST_CASES.length} test cases\n${"─".repeat(60)}`)

  let sessionId = ""
  let passed = 0

  for (const tc of TEST_CASES) {
    try {
      const result = await runCase(tc, sessionId)
      if ("error" in result) {
        console.log(`❌ [${result.label}] ${result.error}`)
        continue
      }

      sessionId = result.nextSession
      passed++
      console.log(`✅ [${result.label}]`)
      console.log(`   input : ${tc.message}`)
      console.log(`   expect: ${result.expected}`)
      console.log(`   reply : ${result.reply}`)
      console.log()
    } catch (err) {
      console.log(`❌ [${tc.label}] ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  console.log(`${"─".repeat(60)}\n${passed}/${TEST_CASES.length} cases chạy thành công\n`)
}

main().catch(console.error)
