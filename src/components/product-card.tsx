
interface ProductCardProps {
  name: string
  image: string
  price: string | number
  originalPrice?: string | number
  rating?: number
  reviewCount?: number
  inStock?: boolean
}

export function ProductCard({
  name,
  image,
  price,
  originalPrice,
  rating = 0,
  reviewCount = 0,
  inStock = true,
}: ProductCardProps) {
  const formatPrice = (val: string | number) => {
    const num = Number(val)
    return `${num.toLocaleString("vi-VN", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })} đ`
  }

  return (
    <div className="group flex h-full min-h-[300px] cursor-pointer flex-col rounded-2xl border border-zinc-200 bg-white p-3 shadow-[0_1px_0_rgba(0,0,0,0.02)] transition-all duration-200 hover:-translate-y-1 hover:border-zinc-300 hover:shadow-md">
      <div className="mb-2 flex items-center justify-between">
        {inStock ? (
          <div className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            In stock
          </div>
        ) : (
          <div className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-semibold text-red-600">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
            Check availability
          </div>
        )}
      </div>

      <div
        className="relative mb-3 flex aspect-[4/3] items-center justify-center overflow-hidden rounded-xl bg-zinc-50"
      >
        <img
          src={image.trim() || "/images/placeholder.png"}
          alt={name}
          className="max-h-full max-w-full object-contain p-2 transition-transform duration-300 group-hover:scale-105"
        />
      </div>

      <div className="flex flex-1 flex-col">
        <div className="mb-1.5 flex items-center gap-1.5">
          <div className="flex">
            {[...Array(5)].map((_, i) => (
              <svg
                key={i}
                className={`h-3 w-3 ${i < rating ? "fill-current text-amber-400" : "fill-current text-zinc-200"}`}
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
          </div>
          <span className="text-[10px] text-zinc-400">Reviews ({reviewCount})</span>
        </div>

        <h4 className="line-clamp-2 text-sm font-semibold leading-snug text-zinc-800 transition-colors group-hover:text-blue-600">
          {name}
        </h4>

        <div className="mt-auto pt-2">
          {originalPrice && Number(originalPrice) > Number(price) ? (
            <div className="mb-0.5 text-xs text-zinc-400 line-through">{formatPrice(originalPrice)}</div>
          ) : null}
          <div className="text-lg font-bold tracking-tight text-zinc-950">{formatPrice(price)}</div>
        </div>
      </div>
    </div>
  )
}
