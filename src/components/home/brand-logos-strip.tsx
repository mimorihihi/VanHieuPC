interface HomeBrand {
  id: string
  name: string
  slug: string
  logo_url: string | null
}

interface BrandLogosStripProps {
  brands: HomeBrand[]
}

export function BrandLogosStrip({ brands }: BrandLogosStripProps) {
  const visibleBrands = brands.filter((brand) => brand.logo_url?.trim())

  if (visibleBrands.length === 0) {
    return null
  }

  return (
    <section className="border-t border-zinc-100 bg-white py-8">
      <div className="container mx-auto px-4">
        <div className="flex flex-wrap items-center justify-center gap-4 lg:justify-between">
          {visibleBrands.map((brand) => {
            const brandLogoUrl = brand.logo_url?.trim()

            return (
              <div
                key={brand.id}
                className="group flex h-20 min-w-[170px] items-center justify-center rounded-3xl border border-zinc-200 bg-white px-6 shadow-[0_1px_2px_rgba(24,24,27,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:border-zinc-300 hover:bg-white hover:shadow-[0_16px_40px_rgba(24,24,27,0.08)]"
              >
                <img
                  src={brandLogoUrl}
                  alt={brand.name}
                  className="h-10 w-auto max-w-[96px] object-contain opacity-60 grayscale transition-all duration-300 group-hover:opacity-100 group-hover:grayscale-0"
                />
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
