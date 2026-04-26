import React from 'react'

const brands = [
  { name: 'DELL', style: 'font-black text-xl tracking-tight' },
  { name: 'MSI', style: 'font-black text-xl italic' },
  { name: 'RAZER', style: 'font-bold text-lg tracking-widest uppercase' },
  { name: 'Tt', style: 'font-black text-2xl' },
  { name: 'ADATA', style: 'font-bold text-lg tracking-wide' },
  { name: 'GIGABYTE', style: 'font-bold text-lg tracking-wider' },
]

export function BrandLogosStrip() {
  return (
    <section className="py-8 bg-white border-t border-zinc-100">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between gap-8 flex-wrap">
          {brands.map((brand) => (
            <div
              key={brand.name}
              className="flex items-center justify-center opacity-40 hover:opacity-100 transition-opacity cursor-pointer"
            >
              <span className={`text-zinc-900 select-none ${brand.style}`}>{brand.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
