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
    <div className="admin-shell">
      {/* Sidebar */}
      <aside className={`admin-sidebar ${sidebarOpen ? "open" : "collapsed"}`}>
        <div className="sidebar-header">
          <Link href="/admin/dashboard" className="sidebar-logo">
            <div className="logo-icon">A</div>
            {sidebarOpen && <span className="logo-text">AdminPanel</span>}
          </Link>
          <button
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname ? (pathname === href || pathname.startsWith(href + "/")) : false
            return (
              <Link
                key={href}
                href={href}
                className={`nav-item ${active ? "active" : ""}`}
                title={!sidebarOpen ? label : undefined}
              >
                <Icon size={20} className="nav-icon" />
                {sidebarOpen && <span className="nav-label">{label}</span>}
                {sidebarOpen && active && <ChevronRight size={14} className="nav-chevron" />}
              </Link>
            )
          })}
        </nav>

        <div className="sidebar-footer">
          <Link href="/" className={`nav-item nav-item-secondary ${!sidebarOpen ? "justify-center" : ""}`}>
            <LogOut size={20} className="nav-icon" />
            {sidebarOpen && <span className="nav-label">Back to Store</span>}
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <div className="admin-main">
        {/* Top bar */}
        <header className="admin-topbar">
          <div className="topbar-left">
            <h2 className="topbar-title">
              {navItems.find(n => pathname && pathname.startsWith(n.href))?.label ?? "Admin"}
            </h2>
          </div>
          <div className="topbar-right">
            <button className="topbar-btn" aria-label="Notifications">
              <Bell size={18} />
              <span className="notif-dot" />
            </button>
            <div className="topbar-avatar">AD</div>
          </div>
        </header>

        <main className="admin-content">
          {children}
        </main>
      </div>

      <style>{`
        /* ── Reset & base ── */
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .admin-shell {
          display: flex;
          min-height: 100vh;
          background: #0f1117;
          color: #e2e8f0;
          font-family: 'Inter', system-ui, sans-serif;
        }

        /* ── Sidebar ── */
        .admin-sidebar {
          display: flex;
          flex-direction: column;
          background: #111827;
          border-right: 1px solid #1f2937;
          transition: width 0.25s ease;
          flex-shrink: 0;
          position: sticky;
          top: 0;
          height: 100vh;
          overflow: hidden;
          z-index: 50;
        }
        .admin-sidebar.open { width: 240px; }
        .admin-sidebar.collapsed { width: 64px; }

        .sidebar-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 16px 16px;
          border-bottom: 1px solid #1f2937;
          min-height: 64px;
          gap: 8px;
        }
        .sidebar-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
          overflow: hidden;
        }
        .logo-icon {
          width: 32px;
          height: 32px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 16px;
          color: #fff;
          flex-shrink: 0;
        }
        .logo-text {
          font-size: 16px;
          font-weight: 700;
          color: #f1f5f9;
          white-space: nowrap;
        }
        .sidebar-toggle {
          background: none;
          border: none;
          color: #6b7280;
          cursor: pointer;
          padding: 4px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          transition: color 0.15s, background 0.15s;
          flex-shrink: 0;
        }
        .sidebar-toggle:hover { color: #e2e8f0; background: #1f2937; }

        .sidebar-nav {
          flex: 1;
          padding: 12px 8px;
          display: flex;
          flex-direction: column;
          gap: 2px;
          overflow-y: auto;
        }
        .sidebar-footer {
          padding: 12px 8px;
          border-top: 1px solid #1f2937;
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          border-radius: 8px;
          text-decoration: none;
          color: #9ca3af;
          font-size: 14px;
          font-weight: 500;
          transition: background 0.15s, color 0.15s;
          position: relative;
          white-space: nowrap;
        }
        .nav-item:hover { background: #1f2937; color: #e2e8f0; }
        .nav-item.active {
          background: linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.2));
          color: #a5b4fc;
          border: 1px solid rgba(99,102,241,0.3);
        }
        .nav-item.active .nav-icon { color: #818cf8; }
        .nav-icon { flex-shrink: 0; }
        .nav-label { flex: 1; overflow: hidden; text-overflow: ellipsis; }
        .nav-chevron { margin-left: auto; flex-shrink: 0; }
        .nav-item-secondary { color: #6b7280; }
        .nav-item-secondary:hover { color: #f87171; background: rgba(239,68,68,0.1); }

        /* ── Main ── */
        .admin-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        .admin-topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 24px;
          height: 64px;
          background: #111827;
          border-bottom: 1px solid #1f2937;
          position: sticky;
          top: 0;
          z-index: 10;
        }
        .topbar-title {
          font-size: 18px;
          font-weight: 600;
          color: #f1f5f9;
        }
        .topbar-right { display: flex; align-items: center; gap: 12px; }
        .topbar-btn {
          position: relative;
          background: none;
          border: none;
          color: #9ca3af;
          cursor: pointer;
          padding: 8px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          transition: background 0.15s, color 0.15s;
        }
        .topbar-btn:hover { background: #1f2937; color: #e2e8f0; }
        .notif-dot {
          position: absolute;
          top: 6px; right: 6px;
          width: 6px; height: 6px;
          background: #f87171;
          border-radius: 50%;
        }
        .topbar-avatar {
          width: 36px; height: 36px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 700;
          color: #fff;
        }

        .admin-content {
          flex: 1;
          padding: 28px 28px;
          overflow-y: auto;
        }

        /* ── Global Admin Card ── */
        .admin-card {
          background: #111827;
          border: 1px solid #1f2937;
          border-radius: 12px;
          padding: 24px;
        }

        /* ── Responsive ── */
        @media (max-width: 768px) {
          .admin-sidebar.open { width: 100%; position: fixed; z-index: 50; }
          .admin-content { padding: 16px; }
        }
      `}</style>
    </div>
  )
}
