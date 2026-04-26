"use client"

import * as React from "react"

interface BannerSlide {
  id: string
  title: string
  image_url: string
  link_url?: string | null
}

interface HeroBannerProps {
  banners?: BannerSlide[]
}

export function HeroBanner({ banners }: HeroBannerProps) {
  // Nếu DB chưa có banner → hiển thị placeholder đẹp thay vì broken image
  const hasRealBanners = banners && banners.length > 0
  const slides = hasRealBanners ? banners : []
  const [current, setCurrent] = React.useState(0)

  const nextSlide = () => setCurrent((prev) => (prev + 1) % slides.length)
  const prevSlide = () => setCurrent((prev) => (prev - 1 + slides.length) % slides.length)

  React.useEffect(() => {
    if (slides.length <= 1) return
    const interval = setInterval(nextSlide, 5000)
    return () => clearInterval(interval)
  }, [slides.length])

  // Placeholder khi chưa có banner nào trong DB
  if (!hasRealBanners) {
    return (
      <section className="relative w-full h-[200px] sm:h-[280px] md:h-[350px] lg:h-[400px] flex items-center bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: "radial-gradient(circle at 25% 50%, #6366f1 0%, transparent 50%), radial-gradient(circle at 75% 50%, #3b82f6 0%, transparent 50%)"
          }}
        />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-2xl">
            <p className="text-blue-400 text-xs font-semibold uppercase tracking-widest mb-3">
              🖼 Chưa có banner
            </p>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black uppercase text-white leading-tight mb-4">
              Thêm banner qua trang<br />
              <span className="text-blue-400">/admin/banners</span>
            </h2>
            <a
              href="/admin/banners"
              className="inline-block bg-blue-600 hover:bg-blue-500 text-white font-bold uppercase text-xs sm:text-sm px-6 py-2.5 rounded transition-colors"
            >
              Quản lý Banner →
            </a>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="relative w-full overflow-hidden">
      <div
        className="flex transition-transform duration-500 ease-in-out"
        style={{ transform: `translateX(-${current * 100}%)` }}
      >
        {slides.map((slide) => (
          <div key={slide.id} className="min-w-full relative h-[200px] sm:h-[280px] md:h-[350px] lg:h-[400px]">
            <img
              src={slide.image_url}
              alt={slide.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback nếu ảnh lỗi: hiển thị gradient
                const target = e.currentTarget
                target.style.display = "none"
                const parent = target.parentElement
                if (parent) parent.style.background = "linear-gradient(135deg, #1e293b, #0f172a)"
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-zinc-900/80 via-zinc-900/40 to-transparent" />

            <div className="absolute inset-0 flex items-center">
              <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="max-w-2xl">
                  <h2 className="mb-2 sm:mb-4 text-lg sm:text-2xl md:text-3xl lg:text-4xl font-black uppercase text-white leading-tight">
                    {slide.title}
                  </h2>
                  {slide.link_url && (
                    <a
                      href={slide.link_url}
                      className="inline-block bg-white text-zinc-900 hover:bg-zinc-100 font-bold uppercase text-xs sm:text-sm px-4 sm:px-6 py-2 rounded transition-colors"
                    >
                      SHOP NOW
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Dot indicators */}
      {slides.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`w-2.5 h-2.5 rounded-full transition-colors ${
                i === current ? "bg-white" : "bg-white/40 hover:bg-white/60"
              }`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      )}

      {/* Arrow Controls */}
      {slides.length > 1 && (
        <>
          <button
            onClick={prevSlide}
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/30 p-2 rounded-full text-white hover:bg-black/50 transition-colors"
            aria-label="Previous banner"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <button
            onClick={nextSlide}
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/30 p-2 rounded-full text-white hover:bg-black/50 transition-colors"
            aria-label="Next banner"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
          </button>
        </>
      )}
    </section>
  )
}