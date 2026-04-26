import React from 'react'

interface ProductCardProps {
  name: string
  image: string
  price: string | number
  originalPrice?: string | number
  rating?: number
  reviewCount?: number
  inStock?: boolean
}

export function ProductCard({ name, image, price, originalPrice, rating = 0, reviewCount = 0, inStock = true }: ProductCardProps) {
  const formatPrice = (val: string | number) => {
    const num = Number(val)
    return num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
  }

  return (
    <div className="group flex flex-col bg-white border border-zinc-100 rounded p-3 hover:shadow-md transition-all duration-200 h-full cursor-pointer">
      {/* Stock status */}
      <div className="mb-1.5">
        {inStock ? (
          <div className="flex items-center gap-1 text-[10px] text-green-600 font-medium">
            <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            <span>in stock</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-[10px] text-red-500 font-medium">
            <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            <span>check availability</span>
          </div>
        )}
      </div>

      {/* Product Image */}
      <div className="relative aspect-square mb-3 flex items-center justify-center">
        <img
          src={image}
          alt={name}
          className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform duration-300"
        />
      </div>

      {/* Product Info */}
      <div className="flex flex-col flex-1">
        {/* Rating */}
        <div className="flex items-center gap-1 mb-1.5">
          <div className="flex">
            {[...Array(5)].map((_, i) => (
              <svg key={i} className={`w-3 h-3 ${i < rating ? 'text-yellow-400 fill-current' : 'text-zinc-200 fill-current'}`} viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
          </div>
          <span className="text-[10px] text-zinc-400">Reviews ({reviewCount})</span>
        </div>

        {/* Name */}
        <h4 className="text-xs font-medium text-zinc-800 mb-2 line-clamp-2 leading-snug group-hover:text-blue-600 transition-colors">
          {name}
        </h4>

        {/* Price */}
        <div className="mt-auto">
          {originalPrice && Number(originalPrice) > Number(price) && (
            <div className="text-[10px] text-zinc-400 line-through">${formatPrice(originalPrice)}</div>
          )}
          <div className="text-sm font-bold text-zinc-900">${formatPrice(price)}</div>
        </div>
      </div>
    </div>
  )
}
