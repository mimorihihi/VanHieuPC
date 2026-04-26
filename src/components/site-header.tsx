"use client"

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { BrandLogo } from './brand-logos'

type AuthUser = {
  id: string
  name: string
  email: string
}

export function SiteHeader() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null)

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

  return (
    <header className="w-full bg-white sticky top-0 z-50">
      {/* Top utility bar */}
      <div className="border-b border-zinc-100 bg-zinc-50">
        <div className="container mx-auto px-4 flex items-center justify-between py-1.5 text-[11px] text-zinc-500">
          <div className="flex items-center gap-4">
            <span>Mon-Thu: <span className="text-zinc-800 font-medium">9:00 AM - 5:30 PM</span></span>
            <span className="hidden sm:inline text-zinc-400">|</span>
            <span className="hidden sm:inline">
              Visit our showroom in 1234 Street Adress City Address, 1234{" "}
              <Link href="/contact" className="font-semibold text-zinc-700 hover:text-blue-600">
                Contact Us
              </Link>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span>Call Us: (00) 1234 5678</span>
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
            <BrandLogo />
          </Link>

          {/* Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {[
              'Laptops',
              'Desktop PCs',
              'Networking',
              'Printers & Scanners',
              'PC Parts',
              'All Other Products',
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
              Our Deals
            </a>
          </nav>

          {/* Icons */}
          <div className="flex items-center gap-3">
            {/* Search */}
            <button className="p-2 hover:bg-zinc-100 rounded-full transition-colors" aria-label="Search">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </button>
            {/* Cart */}
            <Link href="/cart" className="p-2 hover:bg-zinc-100 rounded-full transition-colors relative" aria-label="Cart">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
              <span className="absolute -top-0.5 -right-0.5 bg-blue-600 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">2</span>
            </Link>
            {/* User */}
            <Link href={authUser ? "/dashboard" : "/login"} className="hidden sm:block p-1" aria-label="User account">
              <div className="w-7 h-7 rounded-full bg-zinc-200 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              </div>
            </Link>
            {/* Mobile menu */}
            <button className="lg:hidden p-2" aria-label="Menu">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
