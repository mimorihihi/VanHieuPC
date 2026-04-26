"use client"

import * as React from "react"
import { CategorySection } from "@/components/home/category-section"
import { PromoBanner } from "@/components/home/promo-banner"

interface Product {
  id: string
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
  laptopProducts: Product[]
  monitorProducts: Product[]
  desktopProducts: Product[]
  accessoryProducts: Product[]
}

export function HomeClient({
  newProducts,
  laptopProducts,
  monitorProducts,
  desktopProducts,
  accessoryProducts,
}: HomeClientProps) {
  const [activeLaptopTab, setActiveLaptopTab] = React.useState("MSI GS Series")
  const laptopTabs = ["MSI GS Series", "MSI GT Series", "MSI GL Series", "MSI GE Series"]

  const [activeDesktopTab, setActiveDesktopTab] = React.useState("MSI Infinite Series")
  const desktopTabs = ["MSI Infinite Series", "MSI Trident", "MSI GL Series", "MSI NightBlade"]

  const mapProduct = (p: Product) => ({
    id: p.id,
    name: p.name,
    image: p.thumbnail_url ?? "/images/placeholder.png",
    price: Number(p.sale_price ?? p.price),
    originalPrice: p.sale_price ? Number(p.price) : undefined,
    inStock: p.stock > 0,
    rating: Math.round(Number(p.avg_rating)),
  })

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
        products={laptopProducts.map(mapProduct)}
        featuredCard={{
          title: "Custom\nBuilds",
          image: "/images/hero-banner.jpg",
          href: "/products?category=custom-builds",
          buttonText: "See All New",
        }}
        className="bg-zinc-50"
      />

      {/* 4. MSI Laptops section — tabs + featured card */}
      <CategorySection
        tabs={laptopTabs}
        activeTab={activeLaptopTab}
        onTabChange={setActiveLaptopTab}
        products={laptopProducts.map(mapProduct)}
        featuredCard={{
          title: "MSI\nLaptops",
          image: "/images/hero-banner.jpg",
          href: "/products?category=laptops",
          buttonText: "See All New",
        }}
        className="bg-white"
      />

      {/* 5. Desktops section — tabs + featured card */}
      <CategorySection
        tabs={desktopTabs}
        activeTab={activeDesktopTab}
        onTabChange={setActiveDesktopTab}
        products={desktopProducts.length > 0 ? desktopProducts.map(mapProduct) : laptopProducts.slice(0, 5).map(mapProduct)}
        featuredCard={{
          title: "Desktops",
          image: "/images/hero-banner.jpg",
          href: "/products?category=desktops",
          buttonText: "See All New",
        }}
        className="bg-white"
      />

      {/* 6. Gaming Monitors section — featured card + grid, no header */}
      <CategorySection
        products={monitorProducts.length > 0 ? monitorProducts.map(mapProduct) : accessoryProducts.map(mapProduct)}
        featuredCard={{
          title: "Gaming\nMonitors",
          image: "/images/hero-banner.jpg",
          href: "/products?category=monitors",
          buttonText: "See All New",
        }}
        className="bg-zinc-50"
      />
    </>
  )
}
