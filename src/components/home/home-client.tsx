"use client"

import { useState } from "react"
import { CategorySection } from "@/components/home/category-section"
import { PromoBanner } from "@/components/home/promo-banner"

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
    customBuild: string | null
    laptops: string | null
    desktops: string | null
    monitors: string | null
  }
  desktopCategorySlug: string
  newProducts: Product[]
  customBuildProducts: Product[]
  laptopProducts: Product[]
  desktopProducts: Product[]
  monitorProducts: Product[]
}

export function HomeClient({
  categoryImages,
  desktopCategorySlug,
  newProducts,
  customBuildProducts,
  laptopProducts,
  desktopProducts,
  monitorProducts,
}: HomeClientProps) {
  const fallbackSectionImage = "/images/hero-banner.jpg"
  const laptopTabs = [
    "MSI GS Series",
    "MSI GT Series",
    "MSI GL Series",
    "MSI GE Series",
  ]
  const desktopTabs = [
    "MSI Infinite Series",
    "MSI Trident",
    "MSI GL Series",
    "MSI Nightblade",
  ]

  const [activeLaptopTab, setActiveLaptopTab] = useState(laptopTabs[0])
  const [activeDesktopTab, setActiveDesktopTab] = useState(desktopTabs[0])

  const mapProduct = (p: Product) => ({
    id: p.id,
    href: p.slug ? `/products/${p.slug}` : undefined,
    name: p.name,
    image: p.thumbnail_url ?? "/images/placeholder.png",
    price: Number(p.sale_price ?? p.price),
    originalPrice: p.sale_price ? Number(p.price) : undefined,
    inStock: p.stock > 0,
    rating: Math.round(Number(p.avg_rating)),
  })

  const filterProductsByTab = (products: Product[], tab: string) => {
    const matchers = {
      "MSI GS Series": (name: string) => name.includes("ROG Strix") || name.includes("Titan"),
      "MSI GT Series": (name: string) => name.includes("XPS") || name.includes("Inspiron"),
      "MSI GL Series": (name: string) => name.includes("Vivobook"),
      "MSI GE Series": (name: string) => name.includes("Modern") || name.includes("AORUS"),
      "MSI Infinite Series": (name: string) => name.includes("Infinite"),
      "MSI Trident": (name: string) => name.includes("Trident"),
      "MSI Nightblade": (name: string) => name.includes("Nightblade"),
    } as const

    const matcher = matchers[tab as keyof typeof matchers]
    if (!matcher) return products

    const filtered = products.filter((product) => matcher(product.name))
    return filtered.length > 0 ? filtered : products
  }

  const visibleLaptopProducts = filterProductsByTab(laptopProducts, activeLaptopTab)
  const visibleDesktopProducts = filterProductsByTab(desktopProducts, activeDesktopTab)

  return (
    <>
      {/* 1. New Products — horizontal scroll */}
      <CategorySection
        title="New Products"
        seeAllHref="/products?sort=newest"
        seeAllText="See All New Products"
        products={newProducts.map(mapProduct)}
        scrollable
        className="bg-white"
      />

      {/* 2. Promo/Payment Banner — between New Products and Custom Builds */}
      <PromoBanner />

      {/* 3. Custom Builds section — featured card + grid, no header */}
      <CategorySection
        products={customBuildProducts.map(mapProduct)}
        maxItems={5}
        featuredCard={{
          title: "Custom\nBuilds",
          image: categoryImages.customBuild ?? customBuildProducts[0]?.thumbnail_url ?? fallbackSectionImage,
          href: "/products?category=custome-build",
          buttonText: "Explore Builds",
        }}
        className="bg-zinc-50"
      />

      {/* 4. Laptops section */}
      <CategorySection
        tabs={laptopTabs}
        activeTab={activeLaptopTab}
        onTabChange={setActiveLaptopTab}
        products={visibleLaptopProducts.map(mapProduct)}
        maxItems={5}
        featuredCard={{
          title: "MSI\nLaptops",
          image: categoryImages.laptops ?? visibleLaptopProducts[0]?.thumbnail_url ?? fallbackSectionImage,
          href: "/products?category=laptops",
          buttonText: "Shop Laptops",
        }}
        className="bg-white"
      />

      {/* 5. Desktops section */}
      <CategorySection
        tabs={desktopTabs}
        activeTab={activeDesktopTab}
        onTabChange={setActiveDesktopTab}
        products={visibleDesktopProducts.map(mapProduct)}
        maxItems={5}
        featuredCard={{
          title: "Desktops",
          image: categoryImages.desktops ?? visibleDesktopProducts[0]?.thumbnail_url ?? fallbackSectionImage,
          href: `/products?category=${desktopCategorySlug}`,
          buttonText: "Shop Desktops",
        }}
        className="bg-zinc-50"
      />

      {/* 6. Gaming Monitors section — featured card + grid, no header */}
      <CategorySection
        products={monitorProducts.map(mapProduct)}
        maxItems={5}
        featuredCard={{
          title: "Gaming\nMonitors",
          image: categoryImages.monitors ?? monitorProducts[0]?.thumbnail_url ?? fallbackSectionImage,
          href: "/products?category=monitors",
          buttonText: "Shop Monitors",
        }}
        className="bg-white"
      />
    </>
  )
}
