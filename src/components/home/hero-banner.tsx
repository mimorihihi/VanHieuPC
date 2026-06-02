"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

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
  const slides = banners ?? []
  const hasSlides = slides.length > 0
  const [current, setCurrent] = React.useState(0)

  const nextSlide = () => setCurrent((prev) => (prev + 1) % slides.length)
  const prevSlide = () => setCurrent((prev) => (prev - 1 + slides.length) % slides.length)

  React.useEffect(() => {
    if (slides.length <= 1) return
    const interval = setInterval(nextSlide, 5000)
    return () => clearInterval(interval)
  }, [slides.length])

  if (!hasSlides) {
    return (
      <section className="mx-auto max-w-[1600px] px-4 py-3 sm:py-5 lg:py-7">
        <div className="overflow-hidden bg-zinc-100">
          <div className="flex h-[150px] items-center justify-center bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 sm:h-[190px] md:h-[250px] lg:h-[320px] xl:h-[360px]">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
              No banner found
            </p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="w-full">
      <div className="relative overflow-hidden">
        <div
          className="flex transition-transform duration-500 ease-in-out"
          style={{ transform: `translateX(-${current * 100}%)` }}
        >
          {slides.map((slide) => (
            <div key={slide.id} className="min-w-full">
              <div className="relative overflow-hidden bg-zinc-100">
                {slide.image_url.trim() ? (
                  <img
                    src={slide.image_url.trim()}
                    alt={slide.title}
                    className="h-[180px] w-full bg-black object-contain object-center sm:h-[240px] md:h-[320px] lg:h-[420px] xl:h-[520px]"
                    onError={(e) => {
                      const target = e.currentTarget
                      target.style.display = "none"
                      const parent = target.parentElement
                      if (parent) parent.style.background = "linear-gradient(135deg, #1e293b, #0f172a)"
                    }}
                  />
                ) : null}
              </div>
            </div>
          ))}
        </div>

        {slides.length > 1 && (
          <>
            <button
              onClick={prevSlide}
              className="absolute top-1/2 left-2 -translate-y-1/2 rounded-full bg-black/30 p-2 text-white transition-colors hover:bg-black/50 sm:left-3"
              aria-label="Previous banner"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={nextSlide}
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full bg-black/30 p-2 text-white transition-colors hover:bg-black/50 sm:right-3"
              aria-label="Next banner"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}

        {slides.length > 1 && (
          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`h-2.5 w-2.5 rounded-full transition-colors ${
                  i === current ? "bg-white" : "bg-white/40 hover:bg-white/60"
                }`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
