"use client"

import { useTranslations } from "next-intl"
import { CategorySection } from "@/components/home/category-section"
import { PromoBanner } from "@/components/home/promo-banner"
import { CLOUDINARY_IMAGES } from "@/lib/cloudinary-images"

interface Product {
  id: string
  slug?: string
  name: string
  price: string | number
  sale_price?: string | number | null
  stock: number
  thumbnail_url: string | null
  avg_rating: string | number
  review_count?: string | number
  category_name?: string
}

interface HomeClientProps {
  categoryImages: {
    gaming: string | null
    laptops: string | null
    workstation: string | null
    monitors: string | null
  }
  gamingCategorySlug: string
  workstationCategorySlug: string
  newProducts: Product[]
  gamingProducts: Product[]
  laptopProducts: Product[]
  workstationProducts: Product[]
  monitorProducts: Product[]
}

export function HomeClient({
  categoryImages,
  gamingCategorySlug,
  workstationCategorySlug,
  newProducts,
  gamingProducts,
  laptopProducts,
  workstationProducts,
  monitorProducts,
}: HomeClientProps) {
  const t = useTranslations("Home")
  const fallbackSectionImage = CLOUDINARY_IMAGES.fallbackSection

  return (
    <>
      {/* 1. New Products — horizontal scroll */}
      <CategorySection
        title={t("newProducts")}
        seeAllHref="/products?sort=newest"
        seeAllText={t("seeAllNewProducts")}
        products={newProducts}
        maxItems={5}
        scrollable
        className="bg-white"
      />

      {/* 2. Promo/Payment Banner — between New Products and Custom Builds */}
      <PromoBanner />

      {/* 3. PC Gaming */}
      <CategorySection
        title={t("pcGaming")}
        products={gamingProducts}
        maxItems={4}
        featuredCard={{
          title: t("pcGaming"),
          image: categoryImages.gaming ?? gamingProducts[0]?.thumbnail_url ?? fallbackSectionImage,
          href: `/products?category=${gamingCategorySlug}`,
          buttonText: t("shopGamingPcs"),
        }}
        className="bg-white"
      />

      {/* 4. PC Đồ hoạ - Làm việc */}
      <CategorySection
        title={t("pcWorkstation")}
        products={workstationProducts}
        maxItems={4}
        featuredCard={{
          title: t("pcWorkstation"),
          image: categoryImages.workstation ?? workstationProducts[0]?.thumbnail_url ?? fallbackSectionImage,
          href: `/products?category=${workstationCategorySlug}`,
          buttonText: t("shopWorkstations"),
        }}
        className="bg-white"
      />

      {/* 5. Laptop */}
      <CategorySection
        title={t("laptop")}
        products={laptopProducts}
        maxItems={4}
        featuredCard={{
          title: t("laptop"),
          image: categoryImages.laptops ?? laptopProducts[0]?.thumbnail_url ?? fallbackSectionImage,
          href: "/products?category=laptops",
          buttonText: t("shopLaptops"),
        }}
        className="bg-white"
      />

      {/* 6. Monitor */}
      <CategorySection
        title={t("monitor")}
        products={monitorProducts}
        maxItems={4}
        featuredCard={{
          title: t("monitor"),
          image: categoryImages.monitors ?? monitorProducts[0]?.thumbnail_url ?? fallbackSectionImage,
          href: "/products?category=monitors",
          buttonText: t("shopMonitors"),
        }}
        className="bg-white"
      />
    </>
  )
}
