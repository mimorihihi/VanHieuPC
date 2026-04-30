"use client"

import React from "react"
import Link from "next/link"
import { useTranslations } from "next-intl"

export function SiteFooter() {
  const t = useTranslations("Footer")

  const infoLinks = [
    t("information.aboutUs"),
    t("information.privacy"),
    t("information.search"),
    t("information.terms"),
    t("information.ordersReturns"),
    t("information.advancedSearch"),
    t("information.newsletter"),
  ]

  const partLinks = [
    t("parts.cpus"),
    t("parts.addonCards"),
    t("parts.hdd"),
    t("parts.graphicCards"),
    t("parts.keyboardMouse"),
    t("parts.ram"),
    t("parts.software"),
    t("parts.motherboards"),
  ]

  const desktopLinks = [
    t("desktop.custom"),
    t("desktop.servers"),
    t("desktop.msi"),
    t("desktop.hp"),
    t("desktop.asus"),
  ]

  const laptopLinks = [
    t("laptops.everyday"),
    t("laptops.msi"),
    t("laptops.hp"),
    t("laptops.asus"),
    t("laptops.workstation"),
  ]

  return (
    <footer>
      <div className="bg-zinc-900 py-10">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div>
              <h3 className="mb-1 text-lg font-bold text-white">{t("newsletter.title")}</h3>
              <p className="text-xs text-zinc-400">{t("newsletter.subtitle")}</p>
            </div>
            <form className="flex w-full max-w-md gap-2">
              <input
                type="email"
                placeholder={t("newsletter.placeholder")}
                className="w-full rounded border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-white outline-none placeholder:text-zinc-500 focus:ring-1 focus:ring-blue-600"
              />
              <button className="whitespace-nowrap rounded bg-blue-600 px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-blue-700">
                {t("newsletter.subscribe")}
              </button>
            </form>
          </div>
        </div>
      </div>

      <div className="bg-zinc-950 py-10">
        <div className="container mx-auto px-4">
          <div className="mb-10 grid grid-cols-2 gap-8 md:grid-cols-4 lg:grid-cols-5">
            <div>
              <h4 className="mb-3 text-[10px] font-bold tracking-wider text-zinc-500 uppercase">{t("titles.information")}</h4>
              <ul className="space-y-2 text-xs text-zinc-400">
                {infoLinks.map((item) => (
                  <li key={item}><a href="#" className="transition-colors hover:text-white">{item}</a></li>
                ))}
                <li><Link href="/contact" className="transition-colors hover:text-white">{t("information.contactUs")}</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="mb-3 text-[10px] font-bold tracking-wider text-zinc-500 uppercase">{t("titles.parts")}</h4>
              <ul className="space-y-2 text-xs text-zinc-400">
                {partLinks.map((item) => (
                  <li key={item}><a href="#" className="transition-colors hover:text-white">{item}</a></li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="mb-3 text-[10px] font-bold tracking-wider text-zinc-500 uppercase">{t("titles.desktop")}</h4>
              <ul className="space-y-2 text-xs text-zinc-400">
                {desktopLinks.map((item) => (
                  <li key={item}><a href="#" className="transition-colors hover:text-white">{item}</a></li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="mb-3 text-[10px] font-bold tracking-wider text-zinc-500 uppercase">{t("titles.laptops")}</h4>
              <ul className="space-y-2 text-xs text-zinc-400">
                {laptopLinks.map((item) => (
                  <li key={item}><a href="#" className="transition-colors hover:text-white">{item}</a></li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="mb-3 text-[10px] font-bold tracking-wider text-zinc-500 uppercase">{t("titles.address")}</h4>
              <ul className="space-y-2 text-xs text-zinc-400">
                <li>{t("address.street")}</li>
                <li>{t("address.phone")}: (00) 1234 5678</li>
                <li>Email: shop@email.com</li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col items-center justify-between gap-4 border-t border-zinc-800 pt-6 text-[10px] text-zinc-500 md:flex-row">
            <p>{t("copyright")}</p>
            <div className="flex items-center gap-3 text-zinc-600">
              <span className="rounded border border-zinc-700 px-2 py-1 text-[9px] font-bold">VISA</span>
              <span className="rounded border border-zinc-700 px-2 py-1 text-[9px] font-bold">MC</span>
              <span className="rounded border border-zinc-700 px-2 py-1 text-[9px] font-bold">PayPal</span>
              <span className="rounded border border-zinc-700 px-2 py-1 text-[9px] font-bold">Zip</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
