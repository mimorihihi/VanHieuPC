"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  Bell,
  ChevronRight,
  Image,
  Layers,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  ShoppingBag,
  ShoppingCart,
  Tag,
  Users,
  X,
} from "lucide-react"
import { useEffect, useState, type ReactNode } from "react"
import { AdminBtn } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/products", label: "Products", icon: ShoppingBag },
  { href: "/admin/categories", label: "Categories", icon: Layers },
  { href: "/admin/brands", label: "Brands", icon: Tag },
  { href: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/coupons", label: "Coupons", icon: Tag },
  { href: "/admin/banners", label: "Banners", icon: Image },
  { href: "/admin/settings", label: "Settings", icon: Settings },
]

type StoredUser = {
  id: string
  name: string
  email: string
  role: string
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [authChecked, setAuthChecked] = useState(false)
  const [currentUser, setCurrentUser] = useState<StoredUser | null>(null)

  const isLoginPage = pathname === "/admin/login"

  useEffect(() => {
    if (typeof window === "undefined") return

    const rawUser = window.localStorage.getItem("auth_user")
    const parsedUser = rawUser ? (JSON.parse(rawUser) as StoredUser) : null

    if (isLoginPage) {
      if (parsedUser?.role === "ADMIN") {
        router.replace("/admin/dashboard")
        return
      }
      setAuthChecked(true)
      return
    }

    if (!parsedUser || parsedUser.role !== "ADMIN") {
      router.replace("/admin/login")
      return
    }

    setCurrentUser(parsedUser)
    setAuthChecked(true)
  }, [isLoginPage, router])

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("auth_user")
    }
    router.push("/admin/login")
  }

  if (!authChecked) {
    return <div className="flex min-h-screen items-center justify-center bg-zinc-100 text-sm text-zinc-500">Loading admin...</div>
  }

  if (isLoginPage) {
    return <>{children}</>
  }

  return (
    <div className="flex min-h-screen bg-zinc-100 text-zinc-900">
      <aside
        className={cn(
          "sticky top-0 z-40 flex h-screen shrink-0 flex-col overflow-hidden border-r border-zinc-200 bg-white transition-all duration-200",
          sidebarOpen ? "w-64" : "w-18"
        )}
      >
        <div className="flex min-h-16 items-center justify-between gap-2 border-b border-zinc-200 px-4 py-4">
          <Link href="/admin/dashboard" className="flex items-center gap-3 overflow-hidden no-underline">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-zinc-300 bg-zinc-100 text-sm font-semibold text-zinc-900">
              AD
            </div>
            {sidebarOpen ? <span className="truncate text-base font-semibold text-zinc-900">Admin Panel</span> : null}
          </Link>
          <button
            id="admin-sidebar-toggle"
            type="button"
            className="rounded-lg border border-zinc-200 p-2 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
            onClick={() => setSidebarOpen((prev) => !prev)}
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-1 p-3">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname ? pathname === href || pathname.startsWith(`${href}/`) : false

            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "border-zinc-900 bg-zinc-900 text-white"
                    : "border-transparent text-zinc-600 hover:border-zinc-200 hover:bg-zinc-100 hover:text-zinc-900",
                  !sidebarOpen && "justify-center px-2"
                )}
                title={!sidebarOpen ? label : undefined}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {sidebarOpen ? <span className="flex-1 truncate">{label}</span> : null}
                {sidebarOpen && active ? <ChevronRight className="h-4 w-4 shrink-0" /> : null}
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-zinc-200 p-3">
          <div className={cn("mb-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3", !sidebarOpen && "hidden")}>
            <p className="text-xs font-medium text-zinc-500">Signed in as</p>
            <p className="mt-1 truncate text-sm font-semibold text-zinc-900">{currentUser?.name ?? "Admin"}</p>
            <p className="truncate text-xs text-zinc-500">{currentUser?.email}</p>
          </div>
          <div className="flex flex-col gap-2">
            <Link
              href="/"
              className={cn(
                "flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-900",
                !sidebarOpen && "justify-center px-2"
              )}
            >
              <ShoppingBag className="h-5 w-5 shrink-0" />
              {sidebarOpen ? <span>Back to Store</span> : null}
            </Link>
            <AdminBtn
              id="admin-logout-button"
              type="button"
              variant="ghost"
              className={cn("justify-start rounded-xl border border-zinc-200 px-3 py-2.5 text-sm", !sidebarOpen && "justify-center px-2")}
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              {sidebarOpen ? "Log out" : null}
            </AdminBtn>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-zinc-200 bg-white px-6">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">Administration</p>
            <h1 className="text-lg font-semibold text-zinc-900">
              {navItems.find((item) => pathname && pathname.startsWith(item.href))?.label ?? "Admin"}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              id="admin-notifications-button"
              type="button"
              className="relative rounded-xl border border-zinc-200 bg-white p-2 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-zinc-900" />
            </button>
            <div className="hidden rounded-xl border border-zinc-200 bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-700 sm:block">
              {currentUser?.role ?? "ADMIN"}
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 md:p-8">{children}</main>
      </div>
    </div>
  )
}
