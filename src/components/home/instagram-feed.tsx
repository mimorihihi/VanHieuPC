"use client"

import React from 'react'

export function InstagramFeed() {
  const images = [
    "/images/instagram/1.jpg",
    "/images/instagram/2.jpg",
    "/images/instagram/3.jpg",
    "/images/instagram/4.jpg",
    "/images/instagram/5.jpg",
    "/images/instagram/6.jpg",
  ]

  return (
    <section className="py-8 bg-white">
      <div className="container mx-auto px-4">
        <h2 className="text-sm font-bold text-zinc-900 mb-6">Follow us on Instagram for News, Offers & More</h2>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {images.map((img, i) => (
            <div key={i} className="aspect-square relative overflow-hidden group cursor-pointer rounded bg-zinc-200">
              <img
                src={img}
                alt={`Instagram ${i + 1}`}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
              />
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
