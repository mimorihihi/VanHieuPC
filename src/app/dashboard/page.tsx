"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { SiteHeader } from "@/components/site-header"
import { SupportFeature } from "@/components/home/support-features"
import { SiteFooter } from "@/components/site-footer"

type AuthUser = {
  id: string
  name: string
  email: string
  role?: string
  phone?: string | null
  avatar_url?: string | null
  is_active?: boolean
  created_at?: string
}

const accountLinks = [
  "Account Dashboard",
  "Account Information",
  "Address Book",
  "My Orders",
  "My Downloadable Products",
  "Stored Payment Methods",
  "Billing Agreements",
  "My Wish List",
  "My Product Reviews",
  "Newsletter Subscriptions",
]

export default function UserDashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("auth_user")
      if (!raw) {
        router.replace("/login")
        return
      }

      const parsed = JSON.parse(raw) as AuthUser
      if (!parsed?.id || !parsed?.email) {
        window.localStorage.removeItem("auth_user")
        router.replace("/login")
        return
      }

      setUser(parsed)
      setReady(true)
    } catch {
      window.localStorage.removeItem("auth_user")
      router.replace("/login")
    }
  }, [router])

  const handleLogout = () => {
    window.localStorage.removeItem("auth_user")
    router.push("/login")
  }

  if (!ready || !user) {
    return null
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <SiteHeader />

      <main className="flex-1 bg-zinc-50">
        <section className="container mx-auto px-4 py-10">
          <div className="mb-4 flex items-center gap-2 text-[11px] text-zinc-500">
            <Link href="/" className="hover:text-blue-600">
              Home
            </Link>
            <span>&bull;</span>
            <span className="text-zinc-700">My Dashboard</span>
          </div>

          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-4xl font-semibold tracking-tight text-zinc-900">My Dashboard</h1>
            <button
              onClick={handleLogout}
              className="inline-flex h-10 items-center justify-center rounded-full border border-zinc-300 px-5 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-100"
            >
              Sign Out
            </button>
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[260px_minmax(0,1fr)]">
            <aside className="space-y-1">
              <div className="rounded bg-zinc-100 p-2">
                {accountLinks.map((item, idx) => (
                  <a
                    key={item}
                    href="#"
                    className={`block border-l-2 px-3 py-2 text-xs transition-colors ${
                      idx === 0
                        ? "border-blue-600 bg-white font-semibold text-zinc-900"
                        : "border-transparent text-zinc-600 hover:bg-white hover:text-zinc-900"
                    }`}
                  >
                    {item}
                  </a>
                ))}
              </div>

              <div className="rounded bg-zinc-100 p-4 text-center">
                <h3 className="text-sm font-semibold text-zinc-900">Compare Products</h3>
                <p className="mt-3 text-xs text-zinc-500">You have no items to compare.</p>
              </div>

              <div className="rounded bg-zinc-100 p-4 text-center">
                <h3 className="text-sm font-semibold text-zinc-900">My Wish List</h3>
                <p className="mt-3 text-xs text-zinc-500">You have no items in your wish list.</p>
              </div>
            </aside>

            <section>
              <h2 className="text-xl font-semibold text-zinc-900">Account Information</h2>

              <div className="mt-4 rounded border border-zinc-200 bg-white p-5">
                <div className="grid grid-cols-1 gap-6 border-b border-zinc-200 pb-6 md:grid-cols-2">
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-900">Contact Information</h3>
                    <p className="mt-3 text-xs leading-5 text-zinc-600">{user.name}</p>
                    <p className="text-xs leading-5 text-zinc-600">{user.email}</p>
                    <p className="text-xs leading-5 text-zinc-600">{user.phone || "No phone number"}</p>
                    <div className="mt-4 flex items-center gap-4">
                      <a href="#" className="text-[11px] text-blue-600 hover:underline">
                        Edit
                      </a>
                      <a href="#" className="text-[11px] text-blue-600 hover:underline">
                        Change Password
                      </a>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-zinc-900">Newsletters</h3>
                    <p className="mt-3 text-xs leading-5 text-zinc-600">You don&apos;t subscribe to our newsletter.</p>
                    <div className="mt-4">
                      <a href="#" className="text-[11px] text-blue-600 hover:underline">
                        Edit
                      </a>
                    </div>
                  </div>
                </div>

                <div className="pt-6">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-zinc-900">Address Book</h3>
                    <a href="#" className="text-[11px] text-blue-600 hover:underline">
                      Manage Addresses
                    </a>
                  </div>

                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div>
                      <h4 className="text-xs font-semibold text-zinc-900">Default Billing Address</h4>
                      <p className="mt-3 text-xs leading-5 text-zinc-600">You have not set a default billing address.</p>
                      <a href="#" className="mt-4 inline-block text-[11px] text-blue-600 hover:underline">
                        Edit Address
                      </a>
                    </div>

                    <div>
                      <h4 className="text-xs font-semibold text-zinc-900">Default Shipping Address</h4>
                      <p className="mt-3 text-xs leading-5 text-zinc-600">You have not set a default shipping address.</p>
                      <a href="#" className="mt-4 inline-block text-[11px] text-blue-600 hover:underline">
                        Edit Address
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </section>
      </main>

      <SupportFeature />
      <SiteFooter />
    </div>
  )
}
