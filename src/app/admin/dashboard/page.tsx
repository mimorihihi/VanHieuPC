"use client"

import Link from "next/link"
import { ArrowUpRight, Clock, ShoppingBag, ShoppingCart, Tag, TrendingUp, UserCog, Users } from "lucide-react"
import { useEffect, useState } from "react"

interface Stats {
  totalProducts: number
  totalOrders: number
  totalUsers: number
  pendingOrders: number
  revenue: string
}

function fmt(n: string | number) {
  return Number(n).toLocaleString("vi-VN")
}

const quickLinks = [
  { href: "/admin/products/new", label: "Add Product", icon: ShoppingBag },
  { href: "/admin/orders", label: "View Orders", icon: ShoppingCart },
  { href: "/admin/users", label: "Manage Users", icon: UserCog },
  { href: "/admin/categories", label: "Categories", icon: Tag },
]

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then(setStats)
      .finally(() => setLoading(false))
  }, [])

  const cards = [
    { label: "Total Products", value: stats?.totalProducts ?? 0, icon: ShoppingBag, href: "/admin/products" },
    { label: "Total Orders", value: stats?.totalOrders ?? 0, icon: ShoppingCart, href: "/admin/orders" },
    { label: "Total Users", value: stats?.totalUsers ?? 0, icon: Users, href: "/admin/users" },
    { label: "Pending Orders", value: stats?.pendingOrders ?? 0, icon: Clock, href: "/admin/orders?status=PENDING" },
  ]

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm md:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">Overview</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900">Welcome back, Admin</h2>
            <p className="mt-2 text-sm text-zinc-500">Here&apos;s a quick snapshot of your store performance today.</p>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-200 text-zinc-700">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-zinc-400">Revenue</p>
                <p className="mt-1 text-2xl font-semibold text-zinc-900">{loading ? "-" : `${fmt(stats?.revenue ?? 0)} đ`}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, icon: Icon, href }) => (
          <Link key={label} href={href} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition-colors hover:border-zinc-300 hover:bg-zinc-50">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-zinc-500">{label}</p>
                <p className="mt-3 text-3xl font-semibold tracking-tight text-zinc-900">{loading ? "-" : fmt(value)}</p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-900">
                <Icon className="h-5 w-5" />
              </div>
            </div>
          </Link>
        ))}
      </section>

      <section>
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-zinc-900">Quick Actions</h3>
          <p className="mt-1 text-sm text-zinc-500">Open the most common admin flows from here.</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {quickLinks.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-5 text-zinc-900 shadow-sm transition-colors hover:border-zinc-300 hover:bg-zinc-50"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-900">
                <Icon className="h-5 w-5" />
              </div>
              <span className="flex-1 text-sm font-medium">{label}</span>
              <ArrowUpRight className="h-4 w-4 text-zinc-400" />
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
