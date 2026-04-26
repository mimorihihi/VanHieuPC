import { SiteHeader } from "@/components/site-header"
import { HeroBanner } from "@/components/home/hero-banner"
import { SupportFeature } from "@/components/home/support-features"
import { Testimotion } from "@/components/home/testimonial-section"
import { SiteFooter } from "@/components/site-footer"
import { InstagramFeed } from "@/components/home/instagram-feed"
import { BrandLogosStrip } from "@/components/home/brand-logos-strip"
import { HomeClient } from "@/components/home/home-client"
import { query } from "@/lib/db"

async function getBanners() {
  try {
    const [banners] = await query(
      "SELECT id, title, image_url, link_url, sort_order, is_active FROM banners WHERE is_active = true ORDER BY sort_order ASC"
    )
    return banners
  } catch (error) {
    console.error("Banner fetch error:", error)
    return []
  }
}

async function getProductsByCategory(categorySlug: string, limit = 10) {
  try {
    const [products] = await query(
      `SELECT p.id, p.name, p.price, p.sale_price, p.stock, p.thumbnail_url, p.avg_rating, c.name as category_name
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.is_active = true AND c.slug = ?
       ORDER BY p.created_at DESC
       LIMIT ?`,
      [categorySlug, limit]
    )
    return products
  } catch {
    return []
  }
}

async function getAllProducts(limit = 10) {
  try {
    const [products] = await query(
      `SELECT id, name, price, sale_price, stock, thumbnail_url, avg_rating
       FROM products
       WHERE is_active = true
       ORDER BY created_at DESC
       LIMIT ?`,
      [limit]
    )
    return products
  } catch {
    return []
  }
}

export default async function Home() {
  const [
    banners,
    newProducts,
    laptopProducts,
    monitorProducts,
    desktopProducts,
    accessoryProducts,
  ] = await Promise.all([
    getBanners(),
    getAllProducts(10),
    getProductsByCategory("laptops", 8),
    getProductsByCategory("monitors", 8),
    getProductsByCategory("motherboards", 8),
    getProductsByCategory("mice-keyboards", 8),
  ])

  // Chuyển Decimal → string để tránh lỗi serialization
  const serialize = (products: any[]) =>
    products.map((p: any) => ({
      ...p,
      price: p.price?.toString() ?? "0",
      sale_price: p.sale_price?.toString() ?? null,
      avg_rating: p.avg_rating?.toString() ?? "0",
    }))

  const testimonials = [
    {
      id: "1",
      quote:
        "My first order arrived today in perfect condition. From the time I sent a question about the product to making the decision to buy, to the arrival, this has been the best online shopping experience I've had. Such great service. I look forward to shopping with you in the future and hope my experience becomes a more regular occurrence.",
      author: "Nguyễn Văn A",
    },
    {
      id: "2",
      quote:
        "Website dễ sử dụng, tìm thấy đúng thứ mình cần. Giao hàng nhanh và sản phẩm chất lượng. Tôi sẽ tiếp tục mua hàng ở đây.",
      author: "Trần Thị B",
    },
  ]

  return (
    <div className="flex flex-col min-h-screen bg-white font-sans">
      <SiteHeader />

      <main className="flex-1">
        {/* 1. Hero Banner */}
        <HeroBanner banners={banners} />

        {/* 2. New Products → Promo → Custom Builds → Laptops → Desktops → Monitors */}
        <HomeClient
          newProducts={serialize(newProducts)}
          laptopProducts={serialize(laptopProducts)}
          monitorProducts={serialize(monitorProducts)}
          desktopProducts={serialize(desktopProducts)}
          accessoryProducts={serialize(accessoryProducts)}
        />

        {/* 3. Brand Logos */}
        <BrandLogosStrip />

        {/* 4. Instagram Feed */}
        <InstagramFeed />

        {/* 5. Testimonials */}
        <Testimotion testimonials={testimonials} />

        {/* 6. Support Features */}
        <SupportFeature />
      </main>

      <SiteFooter />
    </div>
  )
}
