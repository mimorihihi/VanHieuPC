"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  ShoppingBag,
  Tag,
  Layers,
  Users,
  ShoppingCart,
  Ticket,
  Image,
  Settings,
  ChevronRight,
  Menu,
  X,
  Bell,
  LogOut,
} from "lucide-react"
import { useState } from "react"

const navItems = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/products", label: "Products", icon: ShoppingBag },
  { href: "/admin/categories", label: "Categories", icon: Layers },
  { href: "/admin/brands", label: "Brands", icon: Tag },
  { href: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/coupons", label: "Coupons", icon: Ticket },
  { href: "/admin/banners", label: "Banners", icon: Image },
  { href: "/admin/settings", label: "Settings", icon: Settings },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <div className="flex min-h-screen bg-zinc-950 text-slate-200">
      <aside className={`sticky top-0 z-50 flex h-screen shrink-0 flex-col overflow-hidden border-r border-zinc-800 bg-zinc-900 transition-all duration-200 ${sidebarOpen ? "w-60" : "w-16"}`}>
        <div className="flex min-h-16 items-center justify-between gap-2 border-b border-zinc-800 px-4 py-4">
          <Link href="/admin/dashboard" className="flex items-center gap-2 overflow-hidden no-underline">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 text-sm font-bold text-white">
              A
            </div>
            {sidebarOpen && <span className="truncate text-base font-bold text-slate-100">AdminPanel</span>}
          </Link>
          <button
            className="rounded-md p-1 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-slate-200"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-2">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname ? pathname === href || pathname.startsWith(`${href}/`) : false
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium no-underline transition-colors ${active ? "border-indigo-400/40 bg-indigo-500/15 text-indigo-300" : "border-transparent text-zinc-400 hover:bg-zinc-800 hover:text-slate-200"}`}
                title={!sidebarOpen ? label : undefined}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {sidebarOpen && <span className="flex-1 truncate">{label}</span>}
                {sidebarOpen && active && <ChevronRight className="h-4 w-4 shrink-0" />}
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-zinc-800 p-2">
          <Link
            href="/"
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-zinc-500 no-underline transition-colors hover:bg-red-500/10 hover:text-red-300 ${!sidebarOpen ? "justify-center" : ""}`}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {sidebarOpen && <span className="truncate">Back to Store</span>}
          </Link>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-zinc-800 bg-zinc-900 px-6">
          <h2 className="text-lg font-semibold text-slate-100">
            {navItems.find((n) => pathname && pathname.startsWith(n.href))?.label ?? "Admin"}
          </h2>
          <div className="flex items-center gap-3">
            <button className="relative rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-slate-200" aria-label="Notifications">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-red-400" />
            </button>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-xs font-bold text-white">
              AD
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-7 max-md:p-4">{children}</main>
      </div>
    </div>
  )
}
