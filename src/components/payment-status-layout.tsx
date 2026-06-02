"use client"

import Link from "next/link"
import Lottie from "lottie-react"
import type { LucideIcon } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { SupportFeature } from "@/components/home/support-features"
import { SiteFooter } from "@/components/site-footer"
import { cn } from "@/lib/utils"

type PaymentStatusAction = {
  href: string
  label: string
  icon: LucideIcon
  variant?: "primary" | "secondary"
}

type PaymentStatusLayoutProps = {
  badgeLabel: string
  badgeIcon: LucideIcon
  title: string
  description: React.ReactNode
  orderNumber: string
  statusLabel: string
  timeline: string[]
  actions: PaymentStatusAction[]
  panelTitle: string
  panelDescription: string
  theme: "success" | "failed"
  animationData?: object
  panelIcon?: LucideIcon
}

const themeMap = {
  success: {
    pageBackground: "bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.16),_transparent_32%),linear-gradient(180deg,_#f8fffc_0%,_#ecfdf5_45%,_#ffffff_100%)]",
    cardBorder: "border-emerald-100",
    cardShadow: "shadow-[0_25px_90px_rgba(16,185,129,0.12)]",
    contentDivider: "lg:border-r lg:border-emerald-100",
    badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
    orderCard: "border-emerald-100 bg-emerald-50/70",
    timelineDot: "bg-emerald-500",
    panelBackground: "bg-[linear-gradient(180deg,rgba(236,253,245,0.92)_0%,rgba(255,255,255,0.96)_100%)]",
    panelCard: "border-white/80 bg-white/80 shadow-[0_18px_50px_rgba(16,185,129,0.12)]",
    panelVisual: "bg-emerald-50 shadow-inner text-emerald-600",
  },
  failed: {
    pageBackground: "bg-[radial-gradient(circle_at_top,_rgba(244,63,94,0.16),_transparent_30%),linear-gradient(180deg,_#fff8f8_0%,_#fff1f2_45%,_#ffffff_100%)]",
    cardBorder: "border-rose-100",
    cardShadow: "shadow-[0_25px_90px_rgba(244,63,94,0.12)]",
    contentDivider: "lg:border-r lg:border-rose-100",
    badge: "border-rose-200 bg-rose-50 text-rose-700",
    orderCard: "border-rose-100 bg-rose-50/70",
    timelineDot: "bg-rose-500",
    panelBackground: "bg-[linear-gradient(180deg,rgba(255,241,242,0.92)_0%,rgba(255,255,255,0.98)_100%)]",
    panelCard: "border-white/80 bg-white/90 shadow-[0_18px_50px_rgba(244,63,94,0.12)]",
    panelVisual: "bg-rose-50 shadow-inner text-rose-600",
  },
} as const

export function PaymentStatusLayout({
  badgeLabel,
  badgeIcon: BadgeIcon,
  title,
  description,
  orderNumber,
  statusLabel,
  timeline,
  actions,
  panelTitle,
  panelDescription,
  theme,
  animationData,
  panelIcon: PanelIcon,
}: PaymentStatusLayoutProps) {
  const styles = themeMap[theme]

  return (
    <div className={cn("flex min-h-screen flex-col", styles.pageBackground)}>
      <SiteHeader />

      <main className="flex-1">
        <section className="container mx-auto px-4 py-10 lg:py-16">
          <div
            className={cn(
              "mx-auto max-w-4xl overflow-hidden rounded-[32px] border bg-white/95 backdrop-blur",
              styles.cardBorder,
              styles.cardShadow
            )}
          >
            <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
              <div className={cn("border-b p-8 lg:border-b-0 lg:p-12", styles.cardBorder, styles.contentDivider)}>
                <div className={cn("inline-flex items-center rounded-full border px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em]", styles.badge)}>
                  <BadgeIcon className="mr-2 h-4 w-4" />
                  {badgeLabel}
                </div>

                <h1 className="mt-6 text-4xl font-semibold tracking-tight text-zinc-950 lg:text-5xl">{title}</h1>

                <div className="mt-4 max-w-2xl text-base leading-8 text-zinc-600">{description}</div>

                <div className="mt-8 grid gap-4 sm:grid-cols-2">
                  <div className={cn("rounded-2xl border p-4", styles.orderCard)}>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-700">Mã đơn hàng</p>
                    <p className="mt-2 text-lg font-semibold text-zinc-900">{orderNumber}</p>
                  </div>
                  <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Trạng thái hiện tại</p>
                    <p className="mt-2 text-lg font-semibold text-zinc-900">{statusLabel}</p>
                  </div>
                </div>

                <div className="mt-8 space-y-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
                  {timeline.map((item) => (
                    <div key={item} className="flex items-start gap-3">
                      <div className={cn("mt-1 h-2.5 w-2.5 rounded-full", styles.timelineDot)} />
                      <p className="text-sm leading-6 text-zinc-600">{item}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  {actions.map((action) => {
                    const ActionIcon = action.icon
                    const isPrimary = action.variant !== "secondary"

                    return (
                      <Link
                        key={`${action.href}-${action.label}`}
                        href={action.href}
                        className={cn(
                          "inline-flex h-12 items-center justify-center rounded-full px-6 text-sm font-semibold transition-all duration-200",
                          isPrimary
                            ? "bg-zinc-950 text-white hover:-translate-y-0.5 hover:bg-zinc-800"
                            : "border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
                        )}
                      >
                        <ActionIcon className="mr-2 h-4 w-4" />
                        {action.label}
                      </Link>
                    )
                  })}
                </div>
              </div>

              <div className={cn("flex items-center justify-center p-8 lg:p-12", styles.panelBackground)}>
                <div className={cn("w-full max-w-sm rounded-[28px] border p-6 text-center backdrop-blur", styles.panelCard)}>
                  <div className={cn("mx-auto flex h-36 w-36 items-center justify-center rounded-full", styles.panelVisual)}>
                    {animationData ? (
                      <Lottie animationData={animationData} loop={false} className="h-32 w-32" />
                    ) : PanelIcon ? (
                      <PanelIcon className="h-16 w-16" />
                    ) : null}
                  </div>
                  <h2 className="mt-5 text-2xl font-semibold text-zinc-900">{panelTitle}</h2>
                  <p className="mt-3 text-sm leading-7 text-zinc-600">{panelDescription}</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SupportFeature />
      <SiteFooter />
    </div>
  )
}
