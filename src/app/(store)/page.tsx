import { SiteHeader } from "@/components/site-header"
import { HeroBanner } from "@/components/home/hero-banner"
import { SupportFeature } from "@/components/home/support-features"
import { Testimotion } from "@/components/home/testimonial-section"
import { SiteFooter } from "@/components/site-footer"
import { InstagramFeed } from "@/components/home/instagram-feed"
import { BrandLogosStrip } from "@/components/home/brand-logos-strip"
import { HomeClient } from "@/components/home/home-client"
import { query } from "@/lib/db"

type HomeCategoryRow = {
  slug: string
  name: string
  image_url: string | null
}

type HomeBrandRow = {
  id: string
  name: string
  slug: string
  logo_url: string | null
}

type HomeBannerRow = {
  id: string
  title: string
  image_url: string
  link_url?: string | null
}

type HomeProductRow = {
  id: string
  slug?: string
  name: string
  price: number | string | { toString?: () => string } | null
  sale_price?: number | string | { toString?: () => string } | null
  stock: number
  thumbnail_url: string | null
  avg_rating: number | string | { toString?: () => string } | null
  category_name?: string
}

function normalizeImageUrl(value: string | null | undefined) {
  if (typeof value !== "string") return null
  const trimmedValue = value.trim()
  return trimmedValue.length > 0 ? trimmedValue : null
}

async function getBanners() {
  try {
    const [result] = await query(
      "SELECT id, title, image_url, link_url, sort_order, is_active FROM banners WHERE is_active = true ORDER BY sort_order ASC"
    )

    return (result as HomeBannerRow[]).map((banner) => ({
      ...banner,
      image_url: normalizeImageUrl(banner.image_url) ?? "",
      link_url: banner.link_url ?? null,
    }))
  } catch (error) {
    console.error("Banner fetch error:", error)
    return []
  }
}

async function getProductsByCategory(categorySlug: string, limit = 10) {
  try {
    const [result] = await query(
      `SELECT p.id, p.slug, p.name, p.price, p.sale_price, p.stock, p.thumbnail_url, p.avg_rating, c.name as category_name
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.is_active = true AND c.slug = ?
       ORDER BY p.created_at DESC
       LIMIT ?`,
      [categorySlug, limit]
    )
    return result as HomeProductRow[]
  } catch {
    return []
  }
}

async function getProductsByCategorySlugs(categorySlugs: string[], limit = 10) {
  for (const slug of categorySlugs) {
    const products = await getProductsByCategory(slug, limit)
    if (products.length > 0) {
      return { slug, products }
    }
  }

  return { slug: categorySlugs[0], products: [] }
}

async function getAllProducts(limit = 10) {
  try {
    const [result] = await query(
      `SELECT p.id, p.slug, p.name, p.price, p.sale_price, p.stock, p.thumbnail_url, p.avg_rating, c.name as category_name
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.is_active = true
       ORDER BY p.created_at DESC
       LIMIT ?`,
      [limit]
    )
    return result as HomeProductRow[]
  } catch {
    return []
  }
}

async function getHomeCategories() {
  try {
    const [result] = await query(
      `SELECT slug, name, image_url
       FROM categories
       WHERE slug IN (?, ?, ?, ?)`,
      ["pc-gaming", "pc-do-hoa-lam-viec", "laptops", "monitors"]
    )

    const rows = result as HomeCategoryRow[]

    return rows.reduce<Record<string, HomeCategoryRow>>((acc, category) => {
      acc[category.slug] = {
        ...category,
        image_url: normalizeImageUrl(category.image_url),
      }
      return acc
    }, {})
  } catch {
    return {}
  }
}

async function getHomeBrands() {
  try {
    const [result] = await query(
      `SELECT id, name, slug, logo_url
       FROM brands
       WHERE is_active = true
       ORDER BY name ASC`
    )

    const rows = result as HomeBrandRow[]

    return rows.map((brand) => ({
      ...brand,
      logo_url: normalizeImageUrl(brand.logo_url),
    }))
  } catch {
    return []
  }
}

export default async function Home() {
  const [
    banners,
    brands,
    homeCategories,
    newProducts,
    gamingProducts,
    laptopProducts,
    workstationProducts,
    monitorProducts
  ] = await Promise.all([
    getBanners(),
    getHomeBrands(),
    getHomeCategories(),
    getAllProducts(10),
    getProductsByCategory("pc-gaming", 8),
    getProductsByCategory("laptops", 8),
    getProductsByCategory("pc-do-hoa-lam-viec", 8),
    getProductsByCategory("monitors", 8)
  ])

  const desktopCategoryImage =
    homeCategories["pc-do-hoa-lam-viec"]?.image_url
    ?? null

  // Chuyển Decimal → string để tránh lỗi serialization
  const serialize = (products: HomeProductRow[]) =>
    products.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      price: String(p.price ?? 0),
      sale_price: p.sale_price == null ? null : String(p.sale_price),
      stock: Number(p.stock ?? 0),
      thumbnail_url: normalizeImageUrl(p.thumbnail_url),
      avg_rating: String(p.avg_rating ?? 0),
      category_name: p.category_name,
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
          categoryImages={{
            gaming: homeCategories["pc-gaming"]?.image_url ?? null,
            laptops: homeCategories["laptops"]?.image_url ?? null,
            workstation: desktopCategoryImage,
            monitors: homeCategories["monitors"]?.image_url ?? null,
          }}
          gamingCategorySlug="pc-gaming"
          workstationCategorySlug="pc-do-hoa-lam-viec"
          newProducts={serialize(newProducts)}
          gamingProducts={serialize(gamingProducts)}
          laptopProducts={serialize(laptopProducts)}
          workstationProducts={serialize(workstationProducts)}
          monitorProducts={serialize(monitorProducts)}
        />



        {/* 3. Brand Logos */}
        <BrandLogosStrip brands={brands} />

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
