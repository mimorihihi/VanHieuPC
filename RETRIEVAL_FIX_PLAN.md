# Kế hoạch khắc phục tầng Retrieval (Chatbot)

> Mục tiêu: sửa các lỗi ở tầng tìm/tư vấn sản phẩm (`product-recommendation.ts`, `product-store.ts`)
> mà bộ test `scripts/retrieval-eval.ts` đã phát hiện. **Không dùng embedding** — catalog nhỏ (128 SP),
> taxonomy sạch, lỗi chủ yếu là logic filter/scoring.

## Bối cảnh — vì sao sửa

Chạy `npm run eval:retrieval` (gọi thẳng retrieval, bỏ qua LLM) phát hiện **3 FAIL + 1 WARN**:

| Mã | Triệu chứng | Nguyên nhân gốc |
|----|-------------|-----------------|
| R3 | "máy thiết kế đồ hoạ" → lọt **SSD + RAM** vào top | Không filter lớp sản phẩm khi `productType` trống |
| R6a | "máy chơi game" → lọt **RAM** vào top | Phụ kiện có chữ "Gaming" trong tên ăn điểm |
| R6b | "máy chơi game" (bỏ useCase) → **5/5 là RAM/VGA/chuột**, 0 cỗ máy | `shouldFilterByTerms` đảo ngược + thiếu phân lớp |
| S2/R4 | laptop ≤15tr / laptop văn phòng ≤12tr → **rỗng** | Catalog gap (thiếu data), không phải bug retrieval |
| S3 | query "may" → trả về **Chuột Maya** | `LIKE %may%` dính substring "Maya" |
| R8 | category bịa "Gaming Gear RGB" → **rỗng** | Free-text category đưa vào hard WHERE `LIKE` |
| R5 | 2 dòng "ASUS TUF Gaming 32 4K" giá khác nhau | Trùng data seed (không phải bug code) |

## Nguyên tắc xuyên suốt

1. Tách bạch **"chọn ứng viên" (SQL)** khỏi **"xếp hạng" (scoring JS)**.
2. Đưa vào khái niệm còn thiếu: **lớp sản phẩm — cỗ máy (machine) vs linh kiện/phụ kiện (part)**.
3. Free-text từ LLM (category) → chỉ làm **scoring boost**, không bao giờ khoá cứng truy vấn.
4. Mọi thay đổi ở tầng filter/scoring deterministic — không đụng schema DB, dễ rollback.

---

## Phase 1 — Thêm khái niệm "lớp sản phẩm" (machine vs part)
**Chữa: R3, R6a, R6b (3 FAIL nặng nhất)**

- [ ] **1.1** `shared/constants.ts` — khai báo phân loại danh mục:
  ```ts
  export const MACHINE_CATEGORIES = ["pc gaming", "pc do hoa", "lam viec", "laptop", "monitor", "man hinh"]
  export const PART_CATEGORIES   = ["vga", "ram", "components", "linh kien", "phu kien"]
  export const COMPONENT_LEXICON = ["ram", "vga", "card man hinh", "card do hoa", "ssd", "hdd",
    "chuot", "ban phim", "keyboard", "mouse", "tai nghe", "headset", "nguon", "psu", "mainboard", "cpu", "tan nhiet"]
  ```
  (So khớp bằng `normalizeText`, không phân biệt dấu.)
- [ ] **1.2** `products/product-recommendation.ts` — thêm helper:
  - [ ] `classifyProductClass(product)` → `"machine" | "part"` dựa trên `category_name`.
  - [ ] `intentTargetsComponent(intent)` → `true` nếu `query`/`category` chứa từ trong `COMPONENT_LEXICON`.
  - [ ] `intentWantsMachine(intent)` → `true` khi **không** targetsComponent **và** (có `productType` ∈ {PC,Laptop,Monitor} **hoặc** có `usage` **hoặc** `query` chứa "may/pc/laptop/man hinh/desktop").
- [ ] **1.3** Áp vào `recommendProducts` và `findMatchingProducts`:
  - [ ] Filter sau khi map: nếu `intentWantsMachine` → **loại** mọi product `class === "part"`.
  - [ ] Trong `scoreRecommendedProduct`: nếu `wantsMachine && class === "part"` → `score -= 100` (chốt chặn kép).
  - [ ] **Chỉ** kích hoạt khi `wantsMachine`. User hỏi "VGA nào ngon" (`targetsComponent`) → KHÔNG lọc.

**Nghiệm thu**: R3/R6a/R6b ❌ → ✅; thêm case "tư vấn VGA gaming" vẫn ra VGA.

---

## Phase 2 — Bỏ logic `shouldFilterByTerms` đảo ngược
**Chữa: bất ổn R6a vs R6b (cùng ý định, kết quả khác hẳn)**

Hiện tại:
```ts
const shouldFilterByTerms = terms.length && !intent.category && !intent.useCase && !intent.minPrice && !intent.maxPrice
```
→ có `useCase`/`budget` là **tắt** lọc term, tập ứng viên nhảy vọt.

- [ ] **2.1** Đổi điều kiện dựa trên *đã có hard filter hay chưa*, không dựa useCase/budget:
  ```ts
  const shouldFilterByTerms = terms.length && !categoryIds.length && !intent.productType
  ```
- [ ] **2.2** Term filter chỉ là lớp khoanh vùng khi **chưa** có hard filter; có `categoryIds`/`productType` rồi thì thôi.

**Nghiệm thu**: R6a và R6b cho tập ứng viên tương đương (chênh lệch chỉ do scoring useCase).

---

## Phase 3 — Category "ảo" không được nuke kết quả
**Chữa: R8 (category bịa → rỗng)**

Hiện tại nhánh `else if (intent.category ...)` đưa free-text vào hard WHERE `LIKE %category%`.

- [ ] **3.1** Hard filter chỉ dùng `categoryIds` (đã validate qua `categorySlug` ở `llm-router`).
- [ ] **3.2** `intent.category` free-text → chỉ dùng trong `scoreRecommendedProduct` (boost `+18/-12` đã có), **gỡ khỏi WHERE**.
- [ ] **3.3** Không `categoryIds` và không `productType` → để term filter (Phase 2) lo, không để chuỗi free-text khoá cứng truy vấn.

**Nghiệm thu**: R8 hết rỗng vô lý; thêm case "categorySlug hợp lệ" để chắc hard filter qua slug còn chạy.

---

## Phase 4 — Giảm nhiễu substring LIKE
**Chữa: S3 ("may" dính "Maya")**

- [ ] **4.1** `shared/text-utils.ts` — `getMeaningfulTokens`: thêm stopwords từ thiết bị quá chung khi dùng làm term LIKE: `"may"`, `"maytinh"`, `"do"`, `"cho"`… (GIỮ `pc/laptop/monitor` vì có giá trị lọc). "máy" được hiểu là *tín hiệu muốn-một-cỗ-máy* (Phase 1), không phải term `%may%`.
- [ ] **4.2** *(tuỳ chọn)* Term ≤ 3 ký tự dùng word-boundary `REGEXP '[[:<:]]term[[:>:]]'` thay substring. Chỉ làm nếu 4.1 chưa đủ.

**Nghiệm thu**: S3 query "may" không còn ra Chuột Maya; trả về PC/Laptop qua machine signal.

---

## Phase 5 — Bỏ "cap-before-scoring" (recall)
**Chữa: rủi ro recall ẩn khi catalog lớn dần**

`findMatchingProducts` `LIMIT 30` và `recommendProducts` `LIMIT 40` cắt ứng viên **trước khi** scoring JS.

- [ ] **5.1** Nâng `LIMIT` candidate lên **200** (phủ toàn catalog 128 SP); scoring ở JS nên chi phí không đáng.
- [ ] **5.2** Ghi chú rõ: `LIMIT` này là "trần ứng viên", không phải "số kết quả" (vẫn `.slice(0, limit)` sau scoring).

**Nghiệm thu**: kết quả demo không đổi, loại bỏ bug tiềm ẩn — ghi vào phần "đã xử lý".

---

## Phase 6 — Xử lý "không có hàng" tử tế hơn *(tuỳ chọn)*
**Liên quan: S2, R4 (catalog gap + rỗng cụt)**

Một phần là **thiếu data** (không có laptop < 15tr), không phải bug retrieval thuần.

- [ ] **6.(a)** *(khuyến nghị cho đồ án)* Để nguyên, ghi chú là giới hạn dữ liệu demo.
- [ ] **6.(b)** *(future work)* Khi rỗng do budget → trả "SP gần ngân sách nhất" (bỏ `isWithinBudget`, sort theo `getBudgetDistance`, gắn cờ `nearBudget`) để chatbot gợi ý "gần nhất là…".

---

## Phase 7 — Dữ liệu trùng *(ghi nhận, không sửa code)*
**R5: 2 dòng "ASUS TUF Gaming 32 4K" giá khác nhau**

- [ ] **7.1** Kiểm tra `scripts/seed-demo-products.mjs` / bảng `products`: trùng seed hay variant bị tách thành product?
- [ ] **7.2** Nếu là variant → gộp. Ngoài scope retrieval, chỉ flag.

---

## Phase 8 — Khoá regression bằng eval
**Sau khi sửa, mở rộng `scripts/retrieval-eval.ts`**

- [ ] **8.1** Thêm case "tư vấn VGA/RAM" (`targetsComponent`) → assert **vẫn ra linh kiện** (chống lọc nhầm Phase 1).
- [ ] **8.2** Thêm case "categorySlug hợp lệ" → assert hard filter còn hoạt động (Phase 3).
- [ ] **8.3** Giữ R3/R6a/R6b làm gác cổng (phải ✅).
- [ ] **8.4** Mục tiêu cuối: **0 FAIL**; WARN còn lại chỉ là catalog gap đã ghi chú.

---

## Bảng tổng hợp file đụng tới

| File | Thay đổi | Phase |
|------|----------|-------|
| `shared/constants.ts` | MACHINE/PART categories, COMPONENT_LEXICON | 1 |
| `products/product-recommendation.ts` | classifyProductClass, intentWantsMachine, filter+penalty, bỏ toggle term, hạ category xuống scoring, nâng LIMIT | 1, 2, 3, 5 |
| `shared/text-utils.ts` | thêm stopwords thiết bị | 4 |
| `core/tools.ts` | *(nếu cần)* truyền cờ wantsMachine cho searchProducts | 1 |
| `scripts/retrieval-eval.ts` | thêm case chống regression | 8 |

## Thứ tự thực thi

`Phase 1 → 2 → 3 → 4 → 5` (chạy `npm run eval:retrieval` sau mỗi phase) `→ 8` → ghi chú `6/7`.
Phase 1 đơn lẻ đã dập 3 FAIL chính.

## Rủi ro chính

- **Phase 1 lọc nhầm** khi user thật sự muốn linh kiện → BẮT BUỘC có case "tư vấn VGA" ở Phase 8 để chặn.
- Mọi thay đổi ở tầng filter/scoring deterministic, không đụng schema DB → dễ rollback.

## Lệnh kiểm thử

```bash
npm run eval:retrieval
```

---

# ROUND 2 — Sau khi chạy lại eval (Phase 1–5 đã xong)

## Kết quả Round 1
`npm run eval:retrieval` → **30 pass · 3 warn · 0 FAIL**.

## Kết quả Round 2
`npm run eval:retrieval` → **35 pass · 2 warn · 0 FAIL**.

- ✅ **Đã hết FAIL**: R3, R6a (phụ kiện lọt cỗ máy), R8 (category bịa nuke kết quả).
- ✅ **Guard chống lọc nhầm** đều xanh: S4/S5 (hỏi VGA/RAM vẫn ra linh kiện), R9 (recommend VGA), C1 (categorySlug → categoryIds hard-filter).
- ✅ **R6b đã hết WARN**: "máy chơi game" chỉ có `usage` vẫn ra PC Gaming/machine, không lẫn linh kiện.
- ✅ **R6c đã thêm gác cổng**: "máy làm việc render" chỉ có `usage: workstation` vẫn ra PC Đồ hoạ/workstation.
- ⚠️ Còn **2 WARN chấp nhận được**: R4 là catalog gap, S3 là query 1 từ quá mơ hồ.

## Phân loại 3 WARN (số liệu probe thật)

```
name LIKE %game%   : 2      ← term "game" gần như không match
name LIKE %gaming% : 38
category "Gaming"  : 30     ← catalog CÓ 30 PC gaming
```

| Case | Nguyên nhân | Hành động |
|------|-------------|-----------|
| **R4** office laptop ≤12tr → 0 | Catalog không có laptop < 16.99tr | ✅ Phase 11: ghi chú catalog gap, không sửa retrieval |
| **S3** "may" trơ trọi → 0 | 1 từ mơ hồ; trước trả sai (Chuột Maya), giờ rỗng | ✅ Phase 11: chấp nhận, flow thật LLM sẽ clarify |
| **R6b** "máy chơi game" (chỉ `usage`, không `productType`) → 0 | **Lỗi recall thật** | ✅ Phase 9 + 10: đã sửa và khóa regression |

---

## Phase 9 — Vá recall gap cho machine query chỉ có `usage`
**Chữa: R6b (catalog có 30 PC gaming nhưng query "máy chơi game" trả 0)**

### Nguyên nhân gốc
Khi intent là "cỗ máy" nhưng **không** có `productType`/`categoryIds`:
1. Không vào nhánh hard-filter PC/Laptop/Monitor.
2. `shouldFilterByTerms` vẫn **bật** → khoá truy vấn theo term LIKE.
3. Term "game"/"choi" **không** là substring của "Gaming" → chỉ match 2 SP → bị threshold + machine-filter loại sạch.

→ Đây là phần bất đối xứng Phase 2 **chưa dẹp hết**: R6a "may được" chỉ vì useCase tình cờ có token "ultra" khớp tên SP. Kết quả vẫn phụ thuộc may rủi của term.

### Cách sửa
- [ ] **9.1** `products/product-recommendation.ts` — khi `wantsMachine` thì **tắt** term hard-filter, để machine/part filter + scoring theo `usage` lo xếp hạng:
  ```ts
  const shouldFilterByTerms = Boolean(
    terms.length && !categoryIds.length && !intent.productType && !wantsMachine
  )
  ```
- [ ] **9.2** Logic hệ quả (không cần code thêm, chỉ xác nhận):
  - Machine query (gaming/workstation/office) → lấy full ứng viên (LIMIT 200) → rank theo `gamingSignal`/`workstationSignal`/budget → 30 PC gaming nổi lên, phụ kiện bị `-100`.
  - Component query (R9 VGA, `wantsMachine=false`) → term filter **giữ nguyên** độ chính xác.

### Vì sao an toàn (không phá guard đã xanh)
- **S4/S5** dùng `searchProducts` → `findMatchingProducts` có WHERE term *always-on* riêng, không đụng `shouldFilterByTerms`.
- **R9** (`wantsMachine=false`) → điều kiện mới `!wantsMachine` = true → term filter vẫn bật → VGA vẫn chính xác.
- **C1** đã có `categoryIds` → nhánh hard-filter, không vào term filter.

### Nghiệm thu
- [x] R6b: ❌0 → ra ≥1 PC gaming, **không** lẫn linh kiện.
- [x] R6a vẫn xanh và kết quả **ổn định** (không còn phụ thuộc token "ultra" tình cờ).
- [x] S4/S5/R9/C1 **giữ nguyên** xanh (chạy lại full eval xác nhận).

---

## Phase 10 — Siết assertion R6b thành gác cổng cứng
**Biến recall gap thành regression test (không để tái phát)**

- [x] **10.1** `scripts/retrieval-eval.ts` — đổi assertion `nonEmpty` của R6b từ `"warn"` → `"fail"`, và thêm check "có ≥1 SP thuộc PC Gaming".
- [x] **10.2** Thêm case đối chứng **R6c**: "máy làm việc render" (chỉ `usage: workstation`, không productType) → assert ra PC Đồ hoạ, không rỗng (chống lặp lại lỗi cho nhánh workstation).

---

## Phase 11 — Chốt 2 WARN còn lại (ghi chú, không sửa code)
**R4 (catalog gap) + S3 (query mơ hồ)**

- [x] **11.1** R4: xác nhận đây là thiếu dữ liệu (catalog rẻ nhất 16.99tr). Ghi vào mục "giới hạn dữ liệu demo" của báo cáo; *(future work)* Phase 6(b) — gợi ý "SP gần ngân sách nhất".
- [x] **11.2** S3: giữ nguyên. Query 1 từ "máy" trơ trọi → flow thật `intent-confidence` sẽ `clarify`. Để assertion ở mức `warn`, không cần xanh.

### Ghi chú cuối Round 2
- **R4 không sửa code**: retrieval đã tôn trọng budget; dữ liệu demo hiện không có laptop văn phòng dưới 12tr nên kết quả rỗng là đúng theo catalog.
- **S3 không sửa code**: query đơn từ "máy" quá mơ hồ; sau Phase 4 không còn trả sai "Chuột Maya". Trong flow thật, lớp intent/confidence nên hỏi lại loại máy/ngân sách/mục đích.
- **Kết quả cuối**: `npm run eval:retrieval` → **35 pass · 2 warn · 0 FAIL**.

---

## Bảng file đụng tới — Round 2

| File | Thay đổi | Phase |
|------|----------|-------|
| `products/product-recommendation.ts` | thêm `&& !wantsMachine` vào `shouldFilterByTerms` | 9 |
| `scripts/retrieval-eval.ts` | R6b → fail-gate, thêm R6c | 10 |
| `RETRIEVAL_FIX_PLAN.md` | ghi chú R4/S3 | 11 |

## Thứ tự thực thi — Round 2
`Phase 9 (sửa 1 dòng) → chạy eval → Phase 10 (siết test) → chạy eval → Phase 11 (ghi chú)`.

✅ Đã hoàn thành. Mục tiêu cuối đạt: **0 FAIL**, WARN còn lại chỉ R4 + S3 và đã ghi chú là giới hạn dữ liệu / câu mơ hồ.

---

# ROUND 3 — Dọn sạch các lỗi tiềm ẩn (code review + probe sâu)

## Bối cảnh
Eval đã **0 FAIL**, nhưng review code + probe DB lộ thêm 4 vấn đề eval chưa phủ. Mục tiêu Round 3:
khoá nốt lỗ hổng logic, dọn dữ liệu, và đồng bộ comment/hành vi.

| # | Vấn đề | Loại | Mức |
|---|--------|------|-----|
| #2 | `intentTargetsComponent` substring false-positive (đặc biệt `"nguon"`) | **Logic** | Cao — tái mở lỗ hổng phụ kiện đã vá |
| #1 | 8 tên sản phẩm trùng trong DB (màn hình, có cái ×3) | **Data** | Trung bình — UX xấu (hiện 2 dòng y hệt) |
| #3 | `searchProducts` bỏ rơi `usage`/`useCase`/`category` | **Design** | Nhẹ — phụ thuộc mapper |
| #4 | Comment lệch hành vi budget trong `recommendProducts` | **Cosmetic** | Nhẹ |

---

## Phase 12 — Vá false-positive substring ở lexicon linh kiện (#2)
**Chữa: câu chứa "nguồn/cpu/ram…" như substring bị nhận nhầm là hỏi linh kiện → tắt filter machine/part → phụ kiện lọt lại**

### Nguyên nhân gốc
`includesAnyNormalized` dùng `String.includes()` (substring). `COMPONENT_LEXICON` có token ngắn/đa nghĩa:
`"nguon"` (nguồn gốc/nguồn hàng — từ thông dụng), `"cpu" "gpu" "ram" "ssd" "psu" "hdd"`.
Câu *"máy có **nguồn** gốc rõ ràng"* → `intentTargetsComponent=true` → `wantsMachine=false` → mở lại lỗi R3/R6.

### Cách sửa
- [ ] **12.1** `products/product-recommendation.ts` — thêm hàm so khớp **theo token (ranh giới từ)**, chỉ dùng cho lexicon linh kiện:
  ```ts
  function matchesAnyToken(value: string, terms: readonly string[]) {
    const tokens = new Set(normalizeText(value).split(/[^a-z0-9]+/).filter(Boolean))
    return terms.some((term) => {
      const t = normalizeText(term)
      return t.includes(" ") ? normalizeText(value).includes(t) : tokens.has(t)
    })
  }
  ```
  (Cụm nhiều từ như "card man hinh" vẫn so bằng substring; token đơn như "ram/nguon" so bằng **bằng đúng token**.)
- [ ] **12.2** Đổi `intentTargetsComponent` dùng `matchesAnyToken(haystack, COMPONENT_LEXICON)` thay `includesAnyNormalized`.
- [ ] **12.3** Rà `classifyProductClass`: phần đối chiếu `COMPONENT_LEXICON` (dòng "if includesAnyNormalized(haystack, COMPONENT_LEXICON)") cũng đổi sang `matchesAnyToken` để khỏi phân loại nhầm 1 cỗ máy có chữ "nguồn"/"CPU" trong mô tả thành "part".
- [ ] **12.4** *(tuỳ chọn)* Cân nhắc bỏ hẳn `"nguon"` khỏi `COMPONENT_LEXICON` nếu vẫn lo nhiễu (PSU ít khi là từ khoá tư vấn chính).

### Nghiệm thu
- [ ] Thêm case eval **N1**: intent `{ query: "máy chơi game nguồn gốc rõ ràng", usage: "gaming" }` → assert **không** lẫn linh kiện (phải vẫn lọc part).
- [ ] Thêm case **N2**: intent `{ query: "tư vấn nguồn 750W" }` (thật sự hỏi PSU) → assert vẫn ra linh kiện (không lọc nhầm) — nếu đã bỏ "nguon" ở 12.4 thì bỏ qua N2 hoặc đổi sang "tư vấn cpu".
- [ ] S4/S5/R9 (component) và R3/R6 (machine) giữ nguyên xanh.

---

## Phase 13 — Lưới che trùng tên ở code (#1) — KHÔNG động vào DB
**Chữa: 8 tên màn hình trùng (×2/×3) → kết quả hiện 2 dòng y hệt tên**

### Quyết định: chỉ làm lưới che ở code, KHÔNG xoá DB
Đã probe DB thực tế:
- FK tới `products`: `cart_items`/`order_items` = **ON DELETE RESTRICT** (đang 0 tham chiếu tới id trùng),
  `product_images` = **CASCADE** (78 ảnh trỏ tới id trùng), `product_variants`/`reviews`/`wishlists` = CASCADE (0).
- Các bản "trùng" có **giá chênh xa** (vd LG UltraGear 24″: 2.99 / 9.79 / 16.59tr) → thực chất là **seed đặt trùng TÊN cho các SKU khác nhau**, không phải insert dư.

→ Xoá sẽ mất sản phẩm thật + 78 ảnh, và **re-seed là trùng quay lại** → không bền.
**Chốt: không chạy DELETE, không sửa seed. Chỉ dedupe theo tên ở tầng retrieval (non-destructive, reversible).**

- [ ] **13.1** `products/product-recommendation.ts` — dedupe theo tên trong `recommendProducts` **và** `findMatchingProducts`, đặt **sau `.sort(...)` và trước `.slice(0, limit)`** để **giữ bản đứng đầu sau khi đã xếp hạng** (phù hợp truy vấn nhất, không ép giữ bản rẻ nhất):
  ```ts
  // Gộp các SKU trùng tên (seed đặt trùng tên), giữ bản đã xếp hạng cao nhất.
  const seenNames = new Set<string>()
  // ...
    .sort((a, b) => compareRecommendedProducts(a, b, intent))
    .filter((p) => {
      const key = normalizeText(p.name)
      if (seenNames.has(key)) return false
      seenNames.add(key)
      return true
    })
    .slice(0, limit)
  ```
  (Khai báo `seenNames` cục bộ trong mỗi hàm; với `findMatchingProducts` dùng `b.matchScore - a.matchScore` sẵn có.)
- [ ] **13.2** Đảm bảo mỗi hàm có `Set` riêng (không chia sẻ state giữa 2 lần gọi).

### Nghiệm thu
- [ ] R5: 5 kết quả **không** còn 2 dòng cùng tên.
- [ ] Thêm assertion eval: "không có 2 sản phẩm trùng `name` trong tập kết quả" (áp cho R1/R3/R5).
- [ ] S4/S5/R9 (component) vẫn đủ kết quả (dedupe không cắt nhầm SP khác tên).
- [ ] **Không** có thay đổi nào tới DB / seed.

### Đánh đổi (chấp nhận cho demo)
- Mỗi tên chỉ hiện 1 lần → các SKU cùng tên khác giá còn lại bị ẩn khỏi kết quả chatbot. Với demo điều này **tốt hơn** (tránh hiện 1 màn hình 3 giá khó hiểu). Trang catalog/website vẫn hiển thị đầy đủ vì không đụng DB.

---

## Phase 14 — Đồng bộ `searchProducts` với entity (#3)
**Chữa: câu có usage bị route sang search_product sẽ mất lọc usage**

- [ ] **14.1** Kiểm tra `core/intent-tool-mapper.ts`: xác nhận intent có `usage`/`useCase` luôn map về `recommend_product` (recommendProducts), không rơi vào `searchProducts`.
- [ ] **14.2** Nếu mapper đã đảm bảo điều đó → **chỉ ghi chú**, không sửa code (search lo "đã biết rõ tên/brand", recommend lo "theo nhu cầu").
- [ ] **14.3** *(chỉ làm nếu 14.1 thấy có rò rỉ)* Mở rộng `ProductSearchLookup` nhận `usage`/`useCase` và truyền vào scoring, để search không "mù" usage.

### Nghiệm thu
- [ ] Bảng map intent→tool được xác nhận: mọi nhánh có usage/useCase đều dẫn tới recommend.

---

## Phase 15 — Đồng bộ comment & xử lý rỗng do budget (#4)
**Chữa: comment nói budget không khoá cứng, nhưng `isWithinBudget` vẫn hard-filter → R4/R7 rỗng**

Chọn 1 trong 2:
- [x] **15.(a) (đơn giản)** Sửa comment dòng ~365 cho khớp hành vi thật: "ngân sách được lọc cứng ở JS (`isWithinBudget`); SQL không khoá để giữ ứng viên cho scoring".
- [ ] **15.(b) (nâng cao — Phase 6b cũ, chưa làm)** Khi rỗng **do budget**: chạy lại không `isWithinBudget`, sort theo `getBudgetDistance`, gắn cờ `nearBudget=true`, trả tối đa 2–3 SP để chatbot gợi ý "chưa có đúng tầm giá, gần nhất là…". `index.ts` đọc cờ để soạn câu phù hợp.

### Nghiệm thu
- [ ] Nếu (b): R4/R7 trả "gần ngân sách" thay vì rỗng tuyệt đối; thêm assertion kiểm cờ `nearBudget`.
- [x] Nếu (a): comment khớp code, không đổi hành vi.

---

## Bảng file đụng tới — Round 3

| File | Thay đổi | Phase |
|------|----------|-------|
| `products/product-recommendation.ts` | `matchesAnyToken`, sửa `intentTargetsComponent`/`classifyProductClass`, dedupe theo tên, (15b) near-budget | 12, 13, 15 |
| `core/intent-tool-mapper.ts` | xác nhận usage→recommend (sửa nếu rò) | 14 |
| `scripts/retrieval-eval.ts` | thêm N1/N2, assertion chống trùng, (15b) cờ nearBudget | 12, 13, 15 |
| `shared/constants.ts` | *(tuỳ chọn 12.4)* bỏ `"nguon"` khỏi lexicon | 12 |

## Thứ tự thực thi — Round 3
`Phase 12 (logic, ưu tiên cao) → eval → Phase 13 (data + dedupe) → probe + eval → Phase 14 (xác nhận mapper) → Phase 15 (comment/near-budget) → eval`.

## Mục tiêu cuối Round 3
- **0 FAIL**, không còn lỗ hổng logic (filter machine/part không thể bị tắt nhầm).
- Kết quả không còn sản phẩm trùng tên.
- WARN còn lại tối đa: R4 (nếu chọn 15a) và S3 — đều là giới hạn dữ liệu / câu mơ hồ đã ghi chú.
