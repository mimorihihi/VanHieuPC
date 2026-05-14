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
  if (brands.length === 0) {
    return null
  }

  return (
    <section className="border-t border-zinc-100 bg-white py-8">
      <div className="container mx-auto px-4">
        <div className="flex flex-wrap items-center justify-center gap-6 lg:justify-between">
          {brands.map((brand) => (
            <div
              key={brand.id}
              className="flex h-16 min-w-[120px] items-center justify-center rounded-xl border border-zinc-100 bg-zinc-50 px-5 transition-opacity hover:opacity-100"
            >
              {brand.logo_url ? (
                <img
                  src={brand.logo_url}
                  alt={brand.name}
                  className="h-10 w-auto max-w-[120px] object-contain opacity-60"
                />
              ) : (
                <span className="select-none text-sm font-semibold uppercase tracking-[0.24em] text-zinc-500">
                  {brand.name}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
