"use client"

import { useEffect, useState } from "react"
import {
  ShoppingBag,
  ShoppingCart,
  Users,
  Clock,
  TrendingUp,
  ArrowUpRight,
  Tag,
} from "lucide-react"
import Link from "next/link"

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
  {
    href: "/admin/products/new",
    label: "Add Product",
    icon: ShoppingBag,
    iconClass: "text-indigo-400 bg-indigo-400/20",
  },
  {
    href: "/admin/orders",
    label: "View Orders",
    icon: ShoppingCart,
    iconClass: "text-cyan-400 bg-cyan-400/20",
  },
  {
    href: "/admin/users",
    label: "Manage Users",
    icon: Users,
    iconClass: "text-emerald-400 bg-emerald-400/20",
  },
  {
    href: "/admin/categories",
    label: "Categories",
    icon: Tag,
    iconClass: "text-amber-400 bg-amber-400/20",
  },
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
    {
      label: "Total Products",
      value: stats?.totalProducts ?? 0,
      icon: ShoppingBag,
      valueClass: "text-indigo-400",
      cardClass: "border-indigo-400/30 bg-indigo-400/10",
      iconClass: "text-indigo-400 bg-indigo-400/20",
      href: "/admin/products",
    },
    {
      label: "Total Orders",
      value: stats?.totalOrders ?? 0,
      icon: ShoppingCart,
      valueClass: "text-cyan-400",
      cardClass: "border-cyan-400/30 bg-cyan-400/10",
      iconClass: "text-cyan-400 bg-cyan-400/20",
      href: "/admin/orders",
    },
    {
      label: "Total Users",
      value: stats?.totalUsers ?? 0,
      icon: Users,
      valueClass: "text-emerald-400",
      cardClass: "border-emerald-400/30 bg-emerald-400/10",
      iconClass: "text-emerald-400 bg-emerald-400/20",
      href: "/admin/users",
    },
    {
      label: "Pending Orders",
      value: stats?.pendingOrders ?? 0,
      icon: Clock,
      valueClass: "text-amber-400",
      cardClass: "border-amber-400/30 bg-amber-400/10",
      iconClass: "text-amber-400 bg-amber-400/20",
      href: "/admin/orders?status=PENDING",
    },
  ]

  return (
    <div>
      <div className="mb-7">
        <h1 className="mb-1 text-2xl font-bold text-slate-100 md:text-[26px]">
          Welcome back, Admin
        </h1>
        <p className="text-sm text-zinc-500">
          Here&apos;s what&apos;s happening in your store today.
        </p>
      </div>

      <div className="mb-6 flex flex-col justify-between gap-4 rounded-2xl border border-indigo-400/30 bg-gradient-to-br from-indigo-400/15 to-violet-400/15 p-6 md:flex-row md:items-center md:px-7">
        <div className="flex items-center gap-4">
          <TrendingUp className="h-6 w-6 text-indigo-400 md:h-7 md:w-7" />
          <div>
            <div className="mb-1 text-xs text-zinc-400">Total Revenue</div>
            <div className="text-3xl font-bold tracking-tight text-indigo-300 md:text-4xl">
              {loading ? "-" : `? ${fmt(stats?.revenue ?? 0)}`}
            </div>
          </div>
        </div>
        <div className="inline-flex w-fit items-center gap-1 rounded-full bg-indigo-400/20 px-4 py-2 text-xs font-medium text-indigo-300">
          <ArrowUpRight className="h-4 w-4" /> Paid Orders
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, icon: Icon, valueClass, cardClass, iconClass, href }) => (
          <Link key={label} href={href ?? "#"} className="block no-underline">
            <div className={`flex items-center gap-4 rounded-xl border p-5 transition-transform hover:-translate-y-0.5 ${cardClass}`}>
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${iconClass}`}>
                <Icon className="h-6 w-6" />
              </div>
              <div>
                <div className={`text-[28px] leading-none font-bold ${valueClass}`}>
                  {loading ? "-" : fmt(value)}
                </div>
                <div className="mt-1 text-xs text-zinc-500">{label}</div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <h2 className="mb-4 text-base font-semibold text-slate-100">Quick Actions</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {quickLinks.map(({ href, label, icon: Icon, iconClass }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-5 text-slate-200 no-underline transition-all hover:-translate-y-0.5 hover:border-zinc-700 hover:bg-zinc-800"
          >
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${iconClass}`}>
              <Icon className="h-6 w-6" />
            </div>
            <span className="flex-1 text-sm font-medium">{label}</span>
            <ArrowUpRight className="h-4 w-4 shrink-0 text-zinc-500" />
          </Link>
        ))}
      </div>
    </div>
  )
}
