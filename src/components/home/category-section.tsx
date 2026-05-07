import Link from "next/link"
import { ProductCard } from "@/components/product-card"

interface Product {
  id: string | number
  href?: string
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
  seeAllHref = "#",
  seeAllText = "See All Products",
  scrollable = false,
}: CategorySectionProps) {
  return (
    <section className={`w-full py-8 lg:py-10 ${className || ""}`}>
      <div className="container mx-auto px-4">
        {!featuredCard && (
          <div className="mb-5 flex items-center justify-between border-b border-zinc-200 pb-3">
            <div className="flex items-center gap-6 overflow-x-auto">
              {title && (
                <h2 className="shrink-0 whitespace-nowrap text-xl font-bold tracking-tight text-zinc-900">
                  {title}
                </h2>
              )}
            </div>
            <a
              href={seeAllHref}
              className="ml-4 shrink-0 whitespace-nowrap text-[13px] font-semibold text-blue-600 transition-colors hover:text-blue-700"
            >
              {seeAllText}
            </a>
          </div>
        )}

        {featuredCard && tabs && (
          <div className="mb-5 flex items-center gap-3 overflow-x-auto border-b border-zinc-200 pb-3">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => onTabChange?.(tab)}
                className={`whitespace-nowrap rounded-full px-3 py-1.5 text-[13px] font-semibold transition-colors ${
                  activeTab === tab
                    ? "bg-zinc-900 text-white"
                    : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-4 lg:flex-row lg:gap-5">
          {featuredCard && (
            <div className="relative min-h-[280px] overflow-hidden rounded-2xl bg-zinc-950 p-6 text-white lg:w-[260px] lg:shrink-0 lg:p-7">
              <div className="absolute inset-0 bg-gradient-to-br from-black/20 via-black/45 to-black/75" />
              <div className="absolute inset-0 opacity-25">
                <img src={featuredCard.image} alt={featuredCard.title} className="h-full w-full object-cover" />
              </div>
              <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/10 to-transparent" />
              <div className="relative z-10 flex h-full flex-col justify-end">
                <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.28em] text-white/70">
                  Featured Collection
                </div>
                <h3 className="mb-5 whitespace-pre-line text-[28px] font-black uppercase leading-[0.95] tracking-tight">
                  {featuredCard.title}
                </h3>
                <a
                  href={featuredCard.href}
                  className="inline-flex w-fit items-center rounded-full border border-white/30 bg-white px-5 py-2 text-xs font-bold uppercase tracking-[0.18em] text-zinc-950 transition-transform transition-colors hover:-translate-y-0.5 hover:bg-zinc-100"
                >
                  {featuredCard.buttonText}
                </a>
              </div>
            </div>
          )}

          {scrollable ? (
            <div className="flex-1 overflow-x-auto">
              <div className="flex min-w-max gap-4 pb-1">
                {products.map((product) => (
                  <div key={product.id} className="w-[188px] shrink-0">
                    {product.href ? (
                      <Link href={product.href} className="block h-full">
                        <ProductCard
                          name={product.name}
                          image={product.image}
                          price={product.price}
                          originalPrice={product.originalPrice}
                          rating={product.rating}
                          inStock={product.inStock}
                        />
                      </Link>
                    ) : (
                      <ProductCard
                        name={product.name}
                        image={product.image}
                        price={product.price}
                        originalPrice={product.originalPrice}
                        rating={product.rating}
                        inStock={product.inStock}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className={`grid flex-1 grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 ${featuredCard ? "xl:grid-cols-5" : "xl:grid-cols-6"}`}>
              {products.map((product) => (
                product.href ? (
                  <Link key={product.id} href={product.href} className="block h-full">
                    <ProductCard
                      name={product.name}
                      image={product.image}
                      price={product.price}
                      originalPrice={product.originalPrice}
                      rating={product.rating}
                      inStock={product.inStock}
                    />
                  </Link>
                ) : (
                  <ProductCard
                    key={product.id}
                    name={product.name}
                    image={product.image}
                    price={product.price}
                    originalPrice={product.originalPrice}
                    rating={product.rating}
                    inStock={product.inStock}
                  />
                )
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
