import React from 'react'

export function PromoBanner() {
  return (
    <div className="w-full bg-zinc-100 border-y border-zinc-200">
      <div className="container mx-auto px-4 py-3 flex items-center justify-center gap-3">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded">zip</div>
          <p className="text-xs text-zinc-600">
            <span className="font-semibold text-zinc-900">own</span> it now, up to 6 months interest free.{' '}
            <a href="#" className="text-blue-600 hover:underline font-medium">learn more</a>
          </p>
        </div>
      </div>
    </div>
  )
}
