import React from "react"

export function PromoBanner() {
  return (
    <div className="w-full border-y border-zinc-200 bg-[linear-gradient(90deg,#f8fafc_0%,#eef4ff_45%,#f8fafc_100%)]">
      <div className="container mx-auto flex flex-col items-center justify-between gap-3 px-4 py-4 text-center sm:flex-row sm:text-left">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-zinc-950 px-3 py-1 text-[10px] font-black uppercase tracking-[0.25em] text-white">
            Zip
          </div>
          <div>
            <p className="text-sm font-semibold tracking-tight text-zinc-900">
              Own it now, pay later for up to 6 months.
            </p>
            <p className="text-xs text-zinc-500">
              Flexible checkout for monitors, laptops and custom build orders.
            </p>
          </div>
        </div>
        <a
          href="#"
          className="inline-flex rounded-full border border-blue-200 bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-blue-700 transition-colors hover:border-blue-300 hover:bg-blue-50"
        >
          Learn more
        </a>
      </div>
    </div>
  )
}
