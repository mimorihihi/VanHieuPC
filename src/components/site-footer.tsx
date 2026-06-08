"use client"

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
    <footer className="bg-black text-white">
      <div className="mx-auto max-w-[1500px] px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-9 flex flex-col justify-between gap-6 lg:flex-row lg:items-start">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight text-white md:text-[34px]">
              {t("newsletter.title")}
            </h2>
            <p className="mt-2 text-sm text-zinc-400">{t("newsletter.subtitle")}</p>
          </div>
          <form className="flex w-full max-w-[520px] flex-col gap-3 sm:flex-row sm:gap-5">
            <input
              type="email"
              placeholder={t("newsletter.placeholder")}
              className="h-11 flex-1 rounded-none border border-white/80 bg-transparent px-4 text-xs text-white outline-none placeholder:text-zinc-500 focus:border-blue-500"
            />
            <button className="h-11 rounded-full bg-blue-600 px-9 text-xs font-bold text-white transition-colors hover:bg-blue-500 sm:w-auto">
              {t("newsletter.subscribe")}
            </button>
          </form>
        </div>

        <div className="grid grid-cols-2 gap-x-10 gap-y-8 md:grid-cols-3 lg:grid-cols-5">
          <div>
            <h4 className="mb-4 text-xs font-bold text-zinc-500">{t("titles.information")}</h4>
            <ul className="space-y-1.5 text-xs leading-tight text-zinc-300">
              {infoLinks.map((item) => (
                <li key={item}><a href="#" className="transition-colors hover:text-white">{item}</a></li>
              ))}
              <li><Link href="/contact" className="transition-colors hover:text-white">{t("information.contactUs")}</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-xs font-bold text-zinc-500">{t("titles.parts")}</h4>
            <ul className="space-y-1.5 text-xs leading-tight text-zinc-300">
              {partLinks.map((item) => (
                <li key={item}><a href="#" className="transition-colors hover:text-white">{item}</a></li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-xs font-bold text-zinc-500">{t("titles.desktop")}</h4>
            <ul className="space-y-1.5 text-xs leading-tight text-zinc-300">
              {desktopLinks.map((item) => (
                <li key={item}><a href="#" className="transition-colors hover:text-white">{item}</a></li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-xs font-bold text-zinc-500">{t("titles.laptops")}</h4>
            <ul className="space-y-1.5 text-xs leading-tight text-zinc-300">
              {laptopLinks.map((item) => (
                <li key={item}><a href="#" className="transition-colors hover:text-white">{item}</a></li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-xs font-bold text-zinc-500">{t("titles.address")}</h4>
            <ul className="space-y-1.5 text-xs leading-tight text-zinc-300">
              <li>{t("address.street")}</li>
              <li>{t("address.phone")}: <a href="tel:0012345678" className="text-blue-500 hover:text-blue-400">(00) 1234 5678</a></li>
              <li>We are open: Monday–Thursday: 9:00 AM – 5:30 PM</li>
              <li>Friday: 9:00 AM – 6:00 PM</li>
              <li>Saturday: 11:00 AM – 5:00 PM</li>
              <li>E-mail: <a href="mailto:shop@email.com" className="text-blue-500 hover:text-blue-400">shop@email.com</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-11 flex flex-col items-center justify-between gap-4 border-t border-white/20 pt-4 text-[11px] text-zinc-500 md:flex-row">
          <div className="flex items-center gap-3">
            <a href="#" aria-label="Facebook" className="text-zinc-500 transition-colors hover:text-white">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M13.5 21v-7.7h2.6l.4-3h-3V8.4c0-.9.2-1.5 1.5-1.5h1.6V4.2c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.2H7.8v3h2.6V21h3.1Z" /></svg>
            </a>
            <a href="#" aria-label="Instagram" className="text-zinc-500 transition-colors hover:text-white">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>
            </a>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="rounded bg-white px-2 py-1 text-[9px] font-black text-blue-700">PayPal</span>
            <span className="rounded bg-white px-2 py-1 text-[9px] font-black text-blue-700">VISA</span>
            <span className="rounded bg-white px-2 py-1 text-[9px] font-black text-red-500">MC</span>
            <span className="rounded bg-white px-2 py-1 text-[9px] font-black text-orange-500">DISC</span>
            <span className="rounded bg-white px-2 py-1 text-[9px] font-black text-blue-500">AMEX</span>
          </div>

          <p>{t("copyright")}</p>
        </div>
      </div>
    </footer>
  )
}
