import React from 'react'
import { ProductCard } from '@/components/product-card'

interface Product {
  id: string | number
  name: string
  image: string
  price: string | number
  originalPrice?: string | number
  inStock?: boolean
  rating?: number
}

interface CategorySectionProps {
  title?: string
  products: Product[]
  featuredCard?: {
    title: string
    image: string
    href: string
    buttonText: string
  }
  tabs?: string[]
  activeTab?: string
  onTabChange?: (tab: string) => void
  className?: string
  seeAllHref?: string
  seeAllText?: string
  scrollable?: boolean
}

export function CategorySection({
  title,
  products,
  featuredCard,
  tabs,
  activeTab,
  onTabChange,
  className,
  seeAllHref = '#',
  seeAllText = 'See All Products',
  scrollable = false,
}: CategorySectionProps) {
  return (
    <section className={`py-6 w-full ${className || ''}`}>
      <div className="container mx-auto px-4">
        {/* Section Header — only shown when there is NO featured card */}
        {!featuredCard && (
          <div className="flex items-center justify-between mb-4 border-b border-zinc-200 pb-2">
            <div className="flex items-center gap-6 overflow-x-auto">
              {title && (
                <h2 className="text-lg font-bold text-zinc-900 whitespace-nowrap shrink-0">{title}</h2>
              )}
            </div>
            <a href={seeAllHref} className="text-[13px] font-medium text-blue-600 hover:underline whitespace-nowrap shrink-0 ml-4">
              {seeAllText}
            </a>
          </div>
        )}

        {/* Standalone Tabs — shown above products when featured card is present */}
        {featuredCard && tabs && (
          <div className="flex items-center gap-5 mb-4 border-b border-zinc-200 pb-2">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => onTabChange?.(tab)}
                className={`whitespace-nowrap pb-1 text-[13px] font-medium transition-colors relative ${
                  activeTab === tab
                    ? 'text-zinc-900 after:absolute after:bottom-[-9px] after:left-0 after:w-full after:h-0.5 after:bg-zinc-900'
                    : 'text-zinc-400 hover:text-zinc-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-4">
          {/* Featured Card */}
          {featuredCard && (
            <div className="lg:w-[220px] lg:shrink-0 bg-zinc-900 rounded overflow-hidden flex flex-col items-center justify-center p-6 text-center text-white relative min-h-[280px]">
              <div className="z-10 relative">
                <h3 className="text-xl font-black mb-4 uppercase leading-tight whitespace-pre-line">{featuredCard.title}</h3>
                <a
                  href={featuredCard.href}
                  className="inline-block border-2 border-white text-white hover:bg-white hover:text-zinc-900 font-bold text-xs px-5 py-2 rounded transition-colors"
                >
                  {featuredCard.buttonText}
                </a>
              </div>
              {featuredCard.image && (
                <div className="absolute inset-0 opacity-30">
                  <img src={featuredCard.image} alt={featuredCard.title} className="w-full h-full object-cover" />
                </div>
              )}
            </div>
          )}

          {/* Products */}
          {scrollable ? (
            <div className="flex-1 overflow-x-auto">
              <div className="flex gap-3" style={{ minWidth: 'max-content' }}>
                {products.map((product) => (
                  <div key={product.id} className="w-[180px] shrink-0">
                    <ProductCard
                      name={product.name}
                      image={product.image}
                      price={product.price}
                      originalPrice={product.originalPrice}
                      rating={product.rating}
                      inStock={product.inStock}
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className={`flex-1 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 ${featuredCard ? 'xl:grid-cols-5' : 'xl:grid-cols-6'} gap-3`}>
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  name={product.name}
                  image={product.image}
                  price={product.price}
                  originalPrice={product.originalPrice}
                  rating={product.rating}
                  inStock={product.inStock}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
