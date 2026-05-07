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
  newProducts: Product[]
  customBuildProducts: Product[]
  laptopProducts: Product[]
  graphicCardProducts: Product[]
  monitorProducts: Product[]
}

export function HomeClient({
  newProducts,
  customBuildProducts,
  laptopProducts,
  graphicCardProducts,
  monitorProducts,
}: HomeClientProps) {
  const laptopTabs = [
    "MSI GS Series",
    "MSI GT Series",
    "MSI GL Series",
    "MSI GE Series",
  ]
  const gpuTabs = [
    "MSI Infinite Series",
    "MSI Trident",
    "MSI GL Series",
    "MSI Nightblade",
  ]

  const [activeLaptopTab, setActiveLaptopTab] = useState(laptopTabs[0])
  const [activeGpuTab, setActiveGpuTab] = useState(gpuTabs[0])

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
      "MSI Infinite Series": (name: string) => name.includes("RTX 4060") || name.includes("RTX 4070 SUPER"),
      "MSI Trident": (name: string) => name.includes("RTX 4080 SUPER"),
      "MSI GL Series GPU": (name: string) => name.includes("RX 7800 XT"),
      "MSI Nightblade": (name: string) => name.includes("RTX") || name.includes("Radeon"),
    } as const

    const matcherKey = tab === "MSI GL Series" && products === graphicCardProducts
      ? "MSI GL Series GPU"
      : tab
    const matcher = matchers[matcherKey as keyof typeof matchers]
    if (!matcher) return products

    const filtered = products.filter((product) => matcher(product.name))
    return filtered.length > 0 ? filtered : products
  }

  const visibleLaptopProducts = filterProductsByTab(laptopProducts, activeLaptopTab)
  const visibleGpuProducts = filterProductsByTab(graphicCardProducts, activeGpuTab)

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
        featuredCard={{
          title: "Custom\nBuilds",
          image: "/images/hero-banner.jpg",
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
        featuredCard={{
          title: "MSI\nLaptops",
          image: "/images/hero-banner.jpg",
          href: "/products?category=laptops",
          buttonText: "Shop Laptops",
        }}
        className="bg-white"
      />

      {/* 5. Graphic Cards section */}
      <CategorySection
        tabs={gpuTabs}
        activeTab={activeGpuTab}
        onTabChange={setActiveGpuTab}
        products={visibleGpuProducts.map(mapProduct)}
        featuredCard={{
          title: "Desktops",
          image: "/images/hero-banner.jpg",
          href: "/products?category=graphic-cards",
          buttonText: "Shop Desktops",
        }}
        className="bg-zinc-50"
      />

      {/* 6. Gaming Monitors section — featured card + grid, no header */}
      <CategorySection
        products={monitorProducts.map(mapProduct)}
        featuredCard={{
          title: "Gaming\nMonitors",
          image: "/images/hero-banner.jpg",
          href: "/products?category=monitors",
          buttonText: "Shop Monitors",
        }}
        className="bg-white"
      />
    </>
  )
}
