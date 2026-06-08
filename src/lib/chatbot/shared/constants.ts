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
