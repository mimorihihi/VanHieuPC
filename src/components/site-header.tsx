"use client"

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useTranslations } from "next-intl"
import { Check, Menu, Search, Settings, ShoppingCart, UserRound, X } from "lucide-react"

type AuthUser = {
  id: string
  name: string
  email: string
}

export function SiteHeader() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null)
  const [isLocaleMenuOpen, setIsLocaleMenuOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
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

  const navItems = [
    { label: t("nav.pcGaming"), query: { category: "pc-gaming" } },
    { label: t("nav.pcWorkstation"), query: { category: "pc-do-hoa-lam-viec" } },
    { label: t("nav.laptops"), query: { category: "laptops" } },
    { label: t("nav.monitors"), query: { category: "monitors" } },
    { label: t("nav.other"), query: {} },
  ]

  return (
    <header className="w-full bg-white sticky top-0 z-50">
      {/* Top utility bar */}
      <div className="border-b border-zinc-100 bg-zinc-50">
        <div className="container mx-auto flex items-center justify-center px-4 py-1.5 text-[11px] text-zinc-500 sm:justify-between">
          <div className="hidden items-center gap-4 sm:flex">
            <span>
              {t("hoursLabel")} <span className="font-medium text-zinc-800">{t("hoursValue")}</span>
            </span>
            <span className="hidden text-zinc-400 md:inline">|</span>
            <span className="hidden md:inline">
              {t("showroomText")} -{" "}
              <Link href="/contact" className="font-semibold text-zinc-700 hover:text-blue-600">
                {t("contactUs")}
              </Link>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span>{t("callUs")} 0867306789</span>
            <div className="ml-2 hidden gap-2 sm:flex">
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
          <nav className="hidden items-center gap-1 lg:flex">
            {navItems.map((item) => (
              <Link
                key={`${item.label}-${JSON.stringify(item.query)}`}
                href={{ pathname: "/products", query: item.query }}
                className="rounded-md px-3 py-2 text-[13px] font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 hover:text-blue-600"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href={{ pathname: "/products", query: { sort: "newest" } }}
              className="ml-2 rounded border border-blue-600 px-4 py-1.5 text-[13px] font-bold text-blue-600 transition-colors hover:bg-blue-600 hover:text-white"
            >
              {t("nav.deals")}
            </Link>
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
            <button
              className="rounded-full p-2 text-zinc-700 transition-colors hover:bg-zinc-100 lg:hidden"
              aria-label={t("menu")}
              aria-expanded={isMobileMenuOpen}
              onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
        {isMobileMenuOpen ? (
          <div className="border-t border-zinc-100 bg-white px-4 py-3 shadow-sm lg:hidden">
            <nav className="mx-auto flex max-w-screen-sm flex-col gap-1">
              {navItems.map((item) => (
                <Link
                  key={`mobile-${item.label}-${JSON.stringify(item.query)}`}
                  href={{ pathname: "/products", query: item.query }}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 hover:text-blue-600"
                >
                  {item.label}
                </Link>
              ))}
              <Link
                href={{ pathname: "/products", query: { sort: "newest" } }}
                onClick={() => setIsMobileMenuOpen(false)}
                className="mt-1 rounded-lg bg-blue-600 px-3 py-2.5 text-sm font-bold text-white transition-colors hover:bg-blue-700"
              >
                {t("nav.deals")}
              </Link>
            </nav>
          </div>
        ) : null}
      </div>
    </header>
  )
}
