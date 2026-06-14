"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { useTranslations } from "next-intl"
import { ArrowLeft, Package, ShoppingCart, Sparkles } from "lucide-react"
import { PaymentStatusLayout } from "@/components/payment-status-layout"
import successCheckmark from "@/components/dashboard/success-checkmark.json"

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams()
  const t = useTranslations("Payment")
  const successT = useTranslations("Payment.success")
  const actionsT = useTranslations("Payment.actions")
  const orderNumber = searchParams.get("order")?.trim() || t("orderFallback")
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  const isPaymentSuccess = searchParams.get("code") === "00"

  useEffect(() => {
    let mounted = true

    void (async () => {
      try {
        const response = await fetch("/api/me", { cache: "no-store" })
        if (mounted) {
          setIsAuthenticated(response.ok)
        }
      } catch {
        if (mounted) {
          setIsAuthenticated(false)
        }
      }
    })()

    return () => {
      mounted = false
    }
  }, [])

  return (
    <PaymentStatusLayout
      theme="success"
      badgeLabel={isPaymentSuccess ? successT("paymentBadge") : successT("orderBadge")}
      badgeIcon={Sparkles}
      title={isPaymentSuccess ? successT("paymentTitle") : successT("orderTitle")}
      description={
        isPaymentSuccess ? (
          <>
            {successT("paymentDescriptionPrefix")} <span className="break-all font-semibold text-zinc-900">{orderNumber}</span>{" "}
            {successT("paymentDescriptionSuffix")}
          </>
        ) : (
          <>
            {successT("orderDescriptionPrefix")} <span className="break-all font-semibold text-zinc-900">{orderNumber}</span>{" "}
            {successT("orderDescriptionSuffix")}
          </>
        )
      }
      orderNumber={orderNumber}
      statusLabel={isPaymentSuccess ? successT("paidStatus") : successT("createdStatus")}
      timeline={
        isPaymentSuccess
          ? [
              successT("paidTimeline1"),
              successT("paidTimeline2"),
              successT("paidTimeline3"),
            ]
          : [
              successT("orderTimeline1"),
              successT("orderTimeline2"),
              successT("orderTimeline3"),
            ]
      }
      actions={
        isAuthenticated
          ? [
              {
                href: "/dashboard",
                label: actionsT("viewMyOrders"),
                icon: Package,
                variant: "primary",
              },
              {
                href: "/products",
                label: actionsT("continueShopping"),
                icon: ShoppingCart,
                variant: "secondary",
              },
            ]
          : [
              {
                href: "/",
                label: actionsT("home"),
                icon: ArrowLeft,
                variant: "primary",
              },
              {
                href: "/products",
                label: actionsT("continueShopping"),
                icon: ShoppingCart,
                variant: "secondary",
              },
            ]
      }
      panelTitle={isPaymentSuccess ? successT("paidPanelTitle") : successT("orderPanelTitle")}
      panelDescription={
        isPaymentSuccess
          ? successT("paidPanelDescription")
          : successT("orderPanelDescription")
      }
      animationData={successCheckmark}
    />
  )
}
