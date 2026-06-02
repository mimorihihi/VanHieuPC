"use client"

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useTranslations } from "next-intl"
import { Check, Search, Settings, ShoppingCart, UserRound } from "lucide-react"

type AuthUser = {
  id: string
  name: string
  email: string
}

export function SiteHeader() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null)
  const [isLocaleMenuOpen, setIsLocaleMenuOpen] = useState(false)
  const [locale, setLocale] = useState<"en" | "vi">(() => {
    if (typeof document === "undefined") return "vi"
    const localeMatch = document.cookie.match(/(?:^|; )locale=([^;]+)/)
    const cookieLocale = localeMatch?.[1]
    return cookieLocale === "en" || cookieLocale === "vi" ? cookieLocale : "vi"
  })
  const t = useTranslations("Header")
  const localeMenuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const loadAuthUser = () => {
      try {
        const raw = window.localStorage.getItem("auth_user")
        if (!raw) {
          setAuthUser(null)
          return
        }
        const parsed = JSON.parse(raw) as AuthUser
        if (parsed?.id && parsed?.email) {
          setAuthUser(parsed)
        } else {
          setAuthUser(null)
        }
      } catch {
        setAuthUser(null)
      }
    }

    loadAuthUser()
    window.addEventListener("storage", loadAuthUser)
    return () => window.removeEventListener("storage", loadAuthUser)
  }, [])

  useEffect(() => {
    if (!isLocaleMenuOpen) return

    const handleOutsideClick = (event: MouseEvent) => {
      if (!localeMenuRef.current) return
      if (!localeMenuRef.current.contains(event.target as Node)) {
        setIsLocaleMenuOpen(false)
      }
    }

    document.addEventListener("mousedown", handleOutsideClick)
    return () => document.removeEventListener("mousedown", handleOutsideClick)
  }, [isLocaleMenuOpen])

  const switchLocale = (nextLocale: "en" | "vi") => {
    document.cookie = `locale=${nextLocale}; path=/; max-age=31536000`
    setLocale(nextLocale)
    setIsLocaleMenuOpen(false)
    window.location.reload()
  }

  return (
    <header className="w-full bg-white sticky top-0 z-50">
      {/* Top utility bar */}
      <div className="border-b border-zinc-100 bg-zinc-50">
        <div className="container mx-auto px-4 flex items-center justify-between py-1.5 text-[11px] text-zinc-500">
          <div className="flex items-center gap-4">
            <span>
              Opening Hours: <span className="font-medium text-zinc-800">08:30 - 17:00</span>
            </span>
            <span className="hidden text-zinc-400 sm:inline">|</span>
            <span className="hidden sm:inline">
              Duong Z115, Phuong Quyet Thang, Tinh Thai Nguyen -{" "}
              <Link href="/contact" className="font-semibold text-zinc-700 hover:text-blue-600">
                Contact us
              </Link>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span>Call us 0867306789</span>
            <div className="flex gap-2 ml-2">
              <a href="#" className="hover:text-blue-600 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
              </a>
              <a href="#" className="hover:text-blue-600 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Main header */}
      <div className="border-b border-zinc-200">
        <div className="container mx-auto px-4 flex items-center justify-between py-3 gap-6">
          {/* Logo */}
          <Link href="/" className="shrink-0">
            <div className="flex items-center gap-1.5">
              <Image src="/logo.svg" alt="VH PC" width={132} height={34} className="h-9 w-auto" priority />
              <span className="text-sm font-black tracking-tight text-zinc-900">
                VH PC
              </span>
            </div>
          </Link>

          {/* Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {[
              t("nav.laptops"),
              t("nav.desktops"),
              t("nav.networking"),
              t("nav.printers"),
              t("nav.parts"),
              t("nav.other"),
            ].map((item) => (
              <a
                key={item}
                href="#"
                className="text-[13px] font-semibold text-zinc-700 hover:text-blue-600 transition-colors px-3 py-2 rounded-md hover:bg-zinc-50"
              >
                {item}
              </a>
            ))}
            <a
              href="#"
              className="text-[13px] font-bold text-blue-600 border border-blue-600 hover:bg-blue-600 hover:text-white px-4 py-1.5 rounded transition-colors ml-2"
            >
              {t("nav.deals")}
            </a>
          </nav>

          {/* Icons */}
          <div className="flex items-center gap-3">
            {/* Search */}
            <button
              className="rounded-full p-2 text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-950"
              aria-label={t("search")}
            >
              <Search className="h-5 w-5" />
            </button>
            {/* Cart */}
            <Link
              href="/cart"
              className="rounded-full p-2 text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-950"
              aria-label={t("cart")}
            >
              <ShoppingCart className="h-5 w-5" />
            </Link>
            {/* User */}
            <Link
              href={authUser ? "/dashboard" : "/login"}
              className="hidden sm:flex p-2 text-zinc-700 transition-colors hover:text-zinc-950"
              aria-label={t("account")}
            >
              <UserRound className="h-5 w-5" />
            </Link>
            <div className="relative" ref={localeMenuRef}>
              <button
                onClick={() => setIsLocaleMenuOpen((prev) => !prev)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-zinc-100"
                aria-label={t("settings")}
              >
                <Settings className="h-5 w-5 text-zinc-700" />
              </button>
              {isLocaleMenuOpen ? (
                <div className="absolute right-0 mt-2 w-32 rounded-lg border border-zinc-200 bg-white p-1 shadow-lg">
                  <button
                    onClick={() => switchLocale("vi")}
                    className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-100"
                  >
                    <span>VI</span>
                    {locale === "vi" ? <Check className="h-4 w-4 text-blue-600" /> : null}
                  </button>
                  <button
                    onClick={() => switchLocale("en")}
                    className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-100"
                  >
                    <span>EN</span>
                    {locale === "en" ? <Check className="h-4 w-4 text-blue-600" /> : null}
                  </button>
                </div>
              ) : null}
            </div>
            {/* Mobile menu */}
            <button className="lg:hidden p-2" aria-label={t("menu")}>
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
