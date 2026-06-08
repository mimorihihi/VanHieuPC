"use client"

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
  const fallbackSectionImage = CLOUDINARY_IMAGES.fallbackSection

  return (
    <>
      {/* 1. New Products — horizontal scroll */}
      <CategorySection
        title="New Products"
        seeAllHref="/products?sort=newest"
        seeAllText="See All New Products"
        products={newProducts}
        maxItems={5}
        scrollable
        className="bg-white"
      />

      {/* 2. Promo/Payment Banner — between New Products and Custom Builds */}
      <PromoBanner />

      {/* 3. PC Gaming */}
      <CategorySection
        title="PC Gaming"
        products={gamingProducts}
        maxItems={4}
        featuredCard={{
          title: "PC\nGaming",
          image: categoryImages.gaming ?? gamingProducts[0]?.thumbnail_url ?? fallbackSectionImage,
          href: `/products?category=${gamingCategorySlug}`,
          buttonText: "Shop Gaming PCs",
        }}
        className="bg-white"
      />

      {/* 4. PC Đồ hoạ - Làm việc */}
      <CategorySection
        title="PC Workstation"
        products={workstationProducts}
        maxItems={4}
        featuredCard={{
          title: "PC Workstation",
          image: categoryImages.workstation ?? workstationProducts[0]?.thumbnail_url ?? fallbackSectionImage,
          href: `/products?category=${workstationCategorySlug}`,
          buttonText: "Shop Workstations",
        }}
        className="bg-white"
      />

      {/* 5. Laptop */}
      <CategorySection
        title="Laptop"
        products={laptopProducts}
        maxItems={4}
        featuredCard={{
          title: "Laptop",
          image: categoryImages.laptops ?? laptopProducts[0]?.thumbnail_url ?? fallbackSectionImage,
          href: "/products?category=laptops",
          buttonText: "Shop Laptops",
        }}
        className="bg-white"
      />

      {/* 6. Monitor */}
      <CategorySection
        title="Monitor"
        products={monitorProducts}
        maxItems={4}
        featuredCard={{
          title: "Monitor",
          image: categoryImages.monitors ?? monitorProducts[0]?.thumbnail_url ?? fallbackSectionImage,
          href: "/products?category=monitors",
          buttonText: "Shop Monitors",
        }}
        className="bg-white"
      />
    </>
  )
}
