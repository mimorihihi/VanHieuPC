"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { useTranslations } from "next-intl"
import { ArrowLeft, Package, ShoppingCart, TriangleAlert } from "lucide-react"
import { PaymentStatusLayout } from "@/components/payment-status-layout"

export default function PaymentFailedPage() {
  const searchParams = useSearchParams()
  const t = useTranslations("Payment")
  const failedT = useTranslations("Payment.failed")
  const actionsT = useTranslations("Payment.actions")
  const orderNumber = searchParams.get("order")?.trim() || t("orderFallback")

  const reason = searchParams.get("reason")?.trim() || ""
  const code = searchParams.get("code")?.trim() || ""
  const [isAuthenticated, setIsAuthenticated] = useState(false)

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

  const reasonMap: Record<string, string> = {
    "invalid-signature": failedT("reasons.invalidSignature"),
    "missing-order": failedT("reasons.missingOrder"),
    "order-not-found": failedT("reasons.orderNotFound"),
    "invalid-payment-method": failedT("reasons.invalidPaymentMethod"),
    "invalid-amount": failedT("reasons.invalidAmount"),
  }

  const codeMap: Record<string, string> = {
    "07": failedT("codes.07"),
    "09": failedT("codes.09"),
    "10": failedT("codes.10"),
    "11": failedT("codes.11"),
    "12": failedT("codes.12"),
    "13": failedT("codes.13"),
    "24": failedT("codes.24"),
    "51": failedT("codes.51"),
    "65": failedT("codes.65"),
    "75": failedT("codes.75"),
    "79": failedT("codes.79"),
    "99": failedT("codes.99"),
  }

  const failureReason = reasonMap[reason] ?? codeMap[code] ?? failedT("defaultReason")

  return (
    <PaymentStatusLayout
      theme="failed"
      badgeLabel={failedT("badge")}
      badgeIcon={TriangleAlert}
      title={failedT("title")}
      description={
        <>
          {failedT("descriptionPrefix")} <span className="break-all font-semibold text-zinc-900">{orderNumber}</span>.
          {" "}{failureReason}
        </>
      }
      orderNumber={orderNumber}
      statusLabel={code ? failedT("statusWithCode", { code }) : failedT("pendingStatus")}
      timeline={[
        failureReason,
        isAuthenticated
          ? failedT("authenticatedHint")
          : failedT("guestHint"),
        failedT("supportHint"),
      ]}
      actions={
        isAuthenticated
          ? [
              {
                href: "/dashboard?tab=orders",
                label: actionsT("viewOrder"),
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
      panelTitle={failedT("panelTitle")}
      panelDescription={
        isAuthenticated
          ? failedT("authenticatedPanelDescription")
          : failedT("guestPanelDescription")
      }
      panelIcon={TriangleAlert}
    />
  )
}
