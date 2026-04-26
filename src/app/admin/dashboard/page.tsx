"use client"

import { useEffect, useState } from "react"
import {
  ShoppingBag, ShoppingCart, Users, Clock,
  TrendingUp, ArrowUpRight, Package, Tag,
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
  { href: "/admin/products/new", label: "Add Product", icon: ShoppingBag, color: "#6366f1" },
  { href: "/admin/orders", label: "View Orders", icon: ShoppingCart, color: "#06b6d4" },
  { href: "/admin/users", label: "Manage Users", icon: Users, color: "#10b981" },
  { href: "/admin/categories", label: "Categories", icon: Tag, color: "#f59e0b" },
]

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/admin/stats")
      .then(r => r.json())
      .then(setStats)
      .finally(() => setLoading(false))
  }, [])

  const cards = [
    {
      label: "Total Products",
      value: stats?.totalProducts ?? 0,
      icon: ShoppingBag,
      color: "#6366f1",
      bg: "rgba(99,102,241,0.1)",
      border: "rgba(99,102,241,0.3)",
      href: "/admin/products",
    },
    {
      label: "Total Orders",
      value: stats?.totalOrders ?? 0,
      icon: ShoppingCart,
      color: "#06b6d4",
      bg: "rgba(6,182,212,0.1)",
      border: "rgba(6,182,212,0.3)",
      href: "/admin/orders",
    },
    {
      label: "Total Users",
      value: stats?.totalUsers ?? 0,
      icon: Users,
      color: "#10b981",
      bg: "rgba(16,185,129,0.1)",
      border: "rgba(16,185,129,0.3)",
      href: "/admin/users",
    },
    {
      label: "Pending Orders",
      value: stats?.pendingOrders ?? 0,
      icon: Clock,
      color: "#f59e0b",
      bg: "rgba(245,158,11,0.1)",
      border: "rgba(245,158,11,0.3)",
      href: "/admin/orders?status=PENDING",
    },
  ]

  return (
    <div>
      <div className="dash-greeting">
        <h1 className="dash-title">Welcome back, Admin 👋</h1>
        <p className="dash-sub">Here's what's happening in your store today.</p>
      </div>

      {/* Revenue hero */}
      <div className="revenue-card">
        <div className="revenue-left">
          <TrendingUp size={28} color="#6366f1" />
          <div>
            <div className="revenue-label">Total Revenue</div>
            <div className="revenue-value">
              {loading ? "—" : `₫ ${fmt(stats?.revenue ?? 0)}`}
            </div>
          </div>
        </div>
        <div className="revenue-badge">
          <ArrowUpRight size={16} /> Paid Orders
        </div>
      </div>

      {/* Stat cards */}
      <div className="stats-grid">
        {cards.map(({ label, value, icon: Icon, color, bg, border, href }) => (
          <Link
            key={label}
            href={href ?? "#"}
            className="stat-card-link"
          >
            <div
              className="stat-card"
              style={{ borderColor: border, background: bg }}
            >
              <div className="stat-icon" style={{ background: `${color}20`, color }}>
                <Icon size={22} />
              </div>
              <div className="stat-info">
                <div className="stat-value" style={{ color }}>
                  {loading ? "—" : fmt(value)}
                </div>
                <div className="stat-label">{label}</div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick links */}
      <h2 className="section-title">Quick Actions</h2>
      <div className="quick-grid">
        {quickLinks.map(({ href, label, icon: Icon, color }) => (
          <Link key={href} href={href} className="quick-card">
            <div className="quick-icon" style={{ color, background: `${color}20` }}>
              <Icon size={24} />
            </div>
            <span className="quick-label">{label}</span>
            <ArrowUpRight size={14} className="quick-arrow" />
          </Link>
        ))}
      </div>

      <style>{`
        .dash-greeting { margin-bottom: 28px; }
        .dash-title { font-size: 26px; font-weight: 700; color: #f1f5f9; margin-bottom: 4px; }
        .dash-sub { color: #6b7280; font-size: 14px; }

        .revenue-card {
          background: linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.15));
          border: 1px solid rgba(99,102,241,0.3);
          border-radius: 16px; padding: 24px 28px;
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 24px; gap: 16px;
        }
        .revenue-left { display: flex; align-items: center; gap: 16px; }
        .revenue-label { font-size: 13px; color: #9ca3af; margin-bottom: 4px; }
        .revenue-value { font-size: 32px; font-weight: 700; color: #a5b4fc; letter-spacing: -1px; }
        .revenue-badge {
          display: flex; align-items: center; gap: 4px;
          background: rgba(99,102,241,0.2); color: #a5b4fc;
          padding: 8px 16px; border-radius: 20px; font-size: 13px; font-weight: 500;
          white-space: nowrap;
        }

        .stats-grid {
          display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px;
          margin-bottom: 32px;
        }
        @media (max-width: 900px) { .stats-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 520px) { .stats-grid { grid-template-columns: 1fr; } }

        .stat-card-link { text-decoration: none; display: block; }
        .stat-card {
          border-radius: 12px; padding: 20px; border: 1px solid;
          display: flex; align-items: center; gap: 16px;
          transition: transform 0.15s;
        }
        .stat-card:hover { transform: translateY(-2px); }
        .stat-icon {
          width: 48px; height: 48px; border-radius: 12px;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .stat-value { font-size: 28px; font-weight: 700; line-height: 1; }
        .stat-label { font-size: 13px; color: #6b7280; margin-top: 4px; }

        .section-title { font-size: 16px; font-weight: 600; color: #f1f5f9; margin-bottom: 16px; }

        .quick-grid {
          display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px;
        }
        @media (max-width: 900px) { .quick-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 520px) { .quick-grid { grid-template-columns: 1fr; } }

        .quick-card {
          background: #111827; border: 1px solid #1f2937; border-radius: 12px;
          padding: 20px; display: flex; align-items: center; gap: 12px;
          text-decoration: none; color: #e2e8f0;
          transition: background 0.15s, border-color 0.15s, transform 0.15s;
        }
        .quick-card:hover {
          background: #1f2937; border-color: #374151;
          transform: translateY(-2px);
        }
        .quick-icon {
          width: 44px; height: 44px; border-radius: 10px;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .quick-label { flex: 1; font-size: 14px; font-weight: 500; }
        .quick-arrow { color: #6b7280; flex-shrink: 0; }
      `}</style>
    </div>
  )
}
