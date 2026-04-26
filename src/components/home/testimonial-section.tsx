"use client"

import { useState, useEffect } from "react"

export interface Testimonial {
  id: string
  quote: string
  author: string
}

interface TestimonialSectionProps {
  testimonials: Testimonial[]
  reviewHref?: string
  className?: string
}

export function Testimotion({
  testimonials,
  reviewHref = "#",
  className = "",
}: TestimonialSectionProps) {
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    if (testimonials.length <= 1) return
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % testimonials.length)
    }, 6000)
    return () => clearInterval(interval)
  }, [testimonials.length])

  const currentTestimonial = testimonials[activeIndex]
  if (!currentTestimonial) return null

  return (
    <section className={`bg-zinc-50 py-14 ${className}`}>
      <div className="mx-auto max-w-3xl px-4 text-center">
        {/* Quote Icon */}
        <div className="mb-5 flex justify-center">
          <svg className="h-8 w-8 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
            <path d="M4.583 17.321C3.553 16.227 3 15 3 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179zm10 0C13.553 16.227 13 15 13 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179z" />
          </svg>
        </div>

        {/* Quote Text */}
        <blockquote className="mb-4 text-sm leading-relaxed text-zinc-700 md:text-base italic">
          &ldquo;{currentTestimonial.quote}&rdquo;
        </blockquote>

        {/* Author */}
        <p className="mb-6 text-xs font-medium text-zinc-400">— {currentTestimonial.author}</p>

        {/* Review Buttons */}
        <div className="flex items-center justify-center gap-3">
          <a
            href={reviewHref}
            className="inline-block rounded border border-zinc-300 px-5 py-2 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100"
          >
            Leave Us A Review
          </a>
          <a
            href={reviewHref}
            className="inline-block rounded border border-zinc-300 px-5 py-2 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100"
          >
            Read All Reviews
          </a>
        </div>

        {/* Dot Navigation */}
        {testimonials.length > 1 && (
          <div className="mt-6 flex justify-center gap-2">
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => setActiveIndex(index)}
                className={`h-2 w-2 rounded-full transition-colors ${
                  index === activeIndex ? "bg-blue-600" : "bg-zinc-300 hover:bg-zinc-400"
                }`}
                aria-label={`Go to testimonial ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
