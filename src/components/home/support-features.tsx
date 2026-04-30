"use client"

import React from 'react'
import { useTranslations } from "next-intl"

export function SupportFeature() {
  const t = useTranslations("Support")
  const features = [
    {
      title: t("productSupportTitle"),
      description: t("productSupportDesc"),
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
      )
    },
    {
      title: t("personalAccountTitle"),
      description: t("personalAccountDesc"),
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
      )
    },
    {
      title: t("savingsTitle"),
      description: t("savingsDesc"),
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
      )
    }
  ]

  return (
    <section className="py-10 bg-white border-t border-zinc-100">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div key={index} className="flex flex-col items-center text-center px-4">
              <div className="w-14 h-14 rounded-full border-2 border-zinc-200 text-zinc-400 flex items-center justify-center mb-4">
                {feature.icon}
              </div>
              <h3 className="text-sm font-bold text-zinc-900 mb-1">{feature.title}</h3>
              <p className="text-xs text-zinc-400 leading-relaxed max-w-[220px]">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
