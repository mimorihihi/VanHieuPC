export const FAQ_FALLBACK = [
  {
    id: "shipping-policy",
    title: "Chính sách giao hàng",
    content: "Shop hỗ trợ giao hàng toàn quốc. Thời gian nhận hàng thường từ 2-5 ngày làm việc tùy khu vực.",
    keywords: "giao hàng, ship, vận chuyển, bao lâu nhận",
  },
  {
    id: "payment-guide",
    title: "Hướng dẫn thanh toán",
    content: "Bạn có thể đặt hàng, kiểm tra giỏ hàng, nhập thông tin nhận hàng và chọn phương thức thanh toán phù hợp ở bước checkout.",
    keywords: "thanh toán, cod, checkout, trả tiền",
  },
  {
    id: "return-policy",
    title: "Chính sách đổi trả",
    content: "Nếu sản phẩm có lỗi hoặc không đúng mô tả, bạn có thể liên hệ chăm sóc khách hàng để được hỗ trợ đổi trả theo chính sách hiện hành.",
    keywords: "đổi trả, hoàn tiền, bảo hành",
  },
] as const

export const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "google/gemini-2.5-flash"
export const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY

/**
 * Bật/tắt response-composer: LLM viết lại kết quả tool thành câu trả lời tự nhiên.
 * Mặc định bật. Tắt bằng CHATBOT_COMPOSE_RESPONSE=false trong .env.
 */
export const ENABLE_RESPONSE_COMPOSER = process.env.CHATBOT_COMPOSE_RESPONSE !== "false"

export const MACHINE_CATEGORIES = ["pc gaming", "pc do hoa", "lam viec", "workstation", "laptop", "monitor", "man hinh"] as const

export const PART_CATEGORIES = ["vga", "ram", "components", "linh kien", "phu kien"] as const

export const PRODUCT_TYPE_SIGNALS = {
  Laptop: ["laptop", "may tinh xach tay", "lappy"],
  Monitor: ["man hinh", "monitor"],
  PC: ["pc", "desktop", "may bo", "bo may", "bo pc", "may choi game", "may gaming", "may render", "may lam viec", "may thiet ke"],
} as const

export const USAGE_SIGNALS = {
  gaming: ["gaming", "choi game", "game", "valorant", "lol", "lien minh", "pubg", "cs2", "fps", "esport", "esports"],
  workstation: ["workstation", "render", "do hoa", "thiet ke", "dung phim", "blender", "premiere", "photoshop", "autocad", "3d", "ai"],
  office: ["hoc tap", "van phong", "lap trinh", "code"],
} as const

export const COMPONENT_LEXICON = [
  "ram",
  "vga",
  "card man hinh",
  "card do hoa",
  "gpu",
  "ssd",
  "hdd",
  "chuot",
  "ban phim",
  "keyboard",
  "mouse",
  "tai nghe",
  "headset",
  "psu",
  "mainboard",
  "cpu",
  "tan nhiet",
] as const

export const PRODUCT_CATEGORY_HINTS = [
  {
    category: "PC Gaming",
    useCase: "gaming",
    keywords: ["gaming", "choi game", "game", "valorant", "lol", "lien minh", "cs2", "pubg", "fps", "esport", "esports"],
  },
  {
    category: "Workstation",
    useCase: "workstation",
    keywords: ["workstation", "render", "do hoa", "thiet ke", "premiere", "photoshop", "blender", "autocad", "3d", "ai", "lap trinh", "code"],
  },
  {
    category: "Laptop",
    useCase: "laptop",
    keywords: ["laptop", "may tinh xach tay", "mong nhe", "di dong", "hoc tap", "van phong"],
  },
  {
    category: "Monitor",
    useCase: "monitor",
    keywords: ["man hinh", "monitor", "144hz", "165hz", "240hz", "2k", "4k", "full hd", "qhd", "uhd"],
  },
] as const
