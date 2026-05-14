"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { Check } from "lucide-react"
import { useTranslations } from "next-intl"
import { SiteHeader } from "@/components/site-header"
import { SupportFeature } from "@/components/home/support-features"
import { SiteFooter } from "@/components/site-footer"

type AuthUser = {
  id: string
  name: string
  email: string
}

type GuestCartItem = {
  product_id: string
  variant_id?: string | null
  variant_name?: string | null
  quantity: number
  product_name: string
  product_slug: string
  thumbnail_url: string | null
  price: string
  sale_price: string | null
  in_stock?: boolean
}

type CartItem = {
  id: string
  product_id: string
  variant_id?: string | null
  variant_name?: string | null
  quantity: number
  product_name: string
  product_slug: string
  thumbnail_url: string | null
  price: string
  sale_price: string | null
  in_stock: boolean
}

type AppliedCoupon = {
  id: string
  code: string
  type: "PERCENT" | "FIXED"
  value: number
  min_order: number | null
  max_discount: number | null
}

type ShippingForm = {
  email: string
  fullName: string
  phone: string
  province: string
  district: string
  ward: string
  address: string
  note: string
}

function formatMoney(value: number) {
  return `${value.toLocaleString("vi-VN")} đ`
}

function calculateDiscount(subtotal: number, coupon: AppliedCoupon | null) {
  if (!coupon || subtotal <= 0) return 0
  if (coupon.min_order && subtotal < coupon.min_order) return 0

  if (coupon.type === "FIXED") {
    return Math.min(subtotal, coupon.value)
  }

  const rawDiscount = subtotal * (coupon.value / 100)
  if (coupon.max_discount) {
    return Math.min(rawDiscount, coupon.max_discount)
  }

  return rawDiscount
}

function checkoutItemKey(item: CartItem | GuestCartItem) {
  return "id" in item ? item.id : `${item.product_id}:${item.variant_id ?? ""}`
}

export default function CheckoutPage() {
  const t = useTranslations("Checkout")
  const [authUser, setAuthUser] = useState<AuthUser | null>(null)
  const [items, setItems] = useState<Array<CartItem | GuestCartItem>>([])
  const [loading, setLoading] = useState(true)
  const [coupon, setCoupon] = useState<AppliedCoupon | null>(null)
  const [form, setForm] = useState<ShippingForm>({
    email: "",
    fullName: "",
    phone: "",
    province: "",
    district: "",
    ward: "",
    address: "",
    note: "",
  })

  useEffect(() => {
    let mounted = true

    const loadCheckout = async () => {
      try {
        const rawUser = window.localStorage.getItem("auth_user")
        const rawCoupon = window.localStorage.getItem("checkout_coupon_v1")

        if (rawCoupon && mounted) {
          setCoupon(JSON.parse(rawCoupon) as AppliedCoupon)
        }

        if (!rawUser) {
          const rawGuest = window.localStorage.getItem("cart_guest_v1")
          const guestItems = rawGuest ? (JSON.parse(rawGuest) as GuestCartItem[]) : []
          if (mounted) {
            setAuthUser(null)
            setItems(guestItems)
          }
          return
        }

        const user = JSON.parse(rawUser) as AuthUser
        if (mounted) {
          setAuthUser(user)
          setForm((prev) => ({
            ...prev,
            email: user.email ?? "",
            fullName: user.name ?? "",
          }))
        }

        const response = await fetch(`/api/cart?user_id=${encodeURIComponent(user.id)}`)
        const data = await response.json()
        if (response.ok && mounted) {
          setItems((data.items ?? []) as CartItem[])
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    void loadCheckout()

    return () => {
      mounted = false
    }
  }, [])

  const subtotal = useMemo(
    () =>
      items.reduce((sum, item) => {
        const unit = Number(item.sale_price ?? item.price ?? 0)
        return sum + unit * Number(item.quantity ?? 1)
      }, 0),
    [items]
  )

  const itemCount = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.quantity ?? 1), 0),
    [items]
  )

  const shipping = subtotal > 0 ? 30000 : 0
  const vat = subtotal * 0.1
  const discount = Math.floor(calculateDiscount(subtotal, coupon))
  const total = subtotal + shipping + vat - discount
  const hasInvalidItems = items.some((item) => "in_stock" in item && item.in_stock === false)

  const updateField = (field: keyof ShippingForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <SiteHeader />

      <main className="flex-1 bg-white">
        <section className="container mx-auto px-4 py-8 lg:py-10">
          <div className="mb-4 flex items-center gap-2 text-[11px] text-zinc-500">
            <Link href="/" className="hover:text-blue-600">
              {t("breadcrumbHome")}
            </Link>
            <span>&bull;</span>
            <Link href="/cart" className="hover:text-blue-600">
              {t("breadcrumbCart")}
            </Link>
            <span>&bull;</span>
            <span className="text-zinc-700">{t("title")}</span>
          </div>

          <div className="mb-8 flex flex-col gap-4 border-b border-zinc-200 pb-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-[30px] font-semibold leading-none tracking-tight text-zinc-950">
                {t("title")}
              </h1>
              {!authUser ? (
                <Link
                  href="/login"
                  className="inline-flex h-9 items-center justify-center rounded-full border border-blue-600 px-5 text-xs font-semibold text-blue-600 transition-colors hover:bg-blue-50"
                >
                  {t("signIn")}
                </Link>
              ) : null}
            </div>

            <div className="flex items-center gap-3 text-[11px] font-medium text-zinc-400">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-blue-600 bg-blue-600 text-white">
                  <Check className="h-3.5 w-3.5" />
                </span>
                <span className="text-zinc-900">{t("steps.shipping")}</span>
              </div>
              <span className="h-px w-10 bg-blue-600" />
              <div className="flex items-center gap-2">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-zinc-300 bg-white text-zinc-700">
                  2
                </span>
                <span>{t("steps.review")}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-10">
            <section className="max-w-[640px]">
              <div className="mb-6">
                <h2 className="text-sm font-semibold text-zinc-950">{t("shippingTitle")}</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold text-zinc-700">
                    {t("fields.email")} *
                  </label>
                  <input
                    value={form.email}
                    onChange={(event) => updateField("email", event.target.value)}
                    className="h-11 w-full rounded-none border border-zinc-300 px-3 text-sm text-zinc-900 outline-none transition-colors placeholder:text-zinc-400 focus:border-blue-600"
                    placeholder={t("fields.email")}
                  />
                  <p className="mt-1.5 text-[11px] text-zinc-500">{t("emailHint")}</p>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-[11px] font-semibold text-zinc-700">
                      {t("fields.fullName")} *
                    </label>
                    <input
                      value={form.fullName}
                      onChange={(event) => updateField("fullName", event.target.value)}
                      className="h-11 w-full rounded-none border border-zinc-300 px-3 text-sm text-zinc-900 outline-none transition-colors placeholder:text-zinc-400 focus:border-blue-600"
                      placeholder={t("fields.fullName")}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[11px] font-semibold text-zinc-700">
                      {t("fields.phone")} *
                    </label>
                    <input
                      value={form.phone}
                      onChange={(event) => updateField("phone", event.target.value)}
                      className="h-11 w-full rounded-none border border-zinc-300 px-3 text-sm text-zinc-900 outline-none transition-colors placeholder:text-zinc-400 focus:border-blue-600"
                      placeholder={t("fields.phone")}
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold text-zinc-700">
                    {t("fields.address")} *
                  </label>
                  <input
                    value={form.address}
                    onChange={(event) => updateField("address", event.target.value)}
                    className="h-11 w-full rounded-none border border-zinc-300 px-3 text-sm text-zinc-900 outline-none transition-colors placeholder:text-zinc-400 focus:border-blue-600"
                    placeholder={t("fields.address")}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-[11px] font-semibold text-zinc-700">
                      {t("fields.province")} *
                    </label>
                    <input
                      value={form.province}
                      onChange={(event) => updateField("province", event.target.value)}
                      className="h-11 w-full rounded-none border border-zinc-300 px-3 text-sm text-zinc-900 outline-none transition-colors placeholder:text-zinc-400 focus:border-blue-600"
                      placeholder={t("fields.province")}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[11px] font-semibold text-zinc-700">
                      {t("fields.district")} *
                    </label>
                    <input
                      value={form.district}
                      onChange={(event) => updateField("district", event.target.value)}
                      className="h-11 w-full rounded-none border border-zinc-300 px-3 text-sm text-zinc-900 outline-none transition-colors placeholder:text-zinc-400 focus:border-blue-600"
                      placeholder={t("fields.district")}
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold text-zinc-700">
                    {t("fields.ward")} *
                  </label>
                  <input
                    value={form.ward}
                    onChange={(event) => updateField("ward", event.target.value)}
                    className="h-11 w-full rounded-none border border-zinc-300 px-3 text-sm text-zinc-900 outline-none transition-colors placeholder:text-zinc-400 focus:border-blue-600"
                    placeholder={t("fields.ward")}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold text-zinc-700">
                    {t("fields.note")}
                  </label>
                  <textarea
                    value={form.note}
                    onChange={(event) => updateField("note", event.target.value)}
                    rows={4}
                    className="w-full rounded-none border border-zinc-300 px-3 py-3 text-sm text-zinc-900 outline-none transition-colors placeholder:text-zinc-400 focus:border-blue-600"
                    placeholder={t("fields.note")}
                  />
                </div>
              </div>

              <div className="mt-10 border-t border-zinc-200 pt-6">
                <div className="mb-4 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                  {t("shippingMethod")}
                </div>

                <label className="flex cursor-pointer items-start justify-between gap-4 border border-zinc-300 px-4 py-3">
                  <div className="flex items-start gap-3">
                    <input type="radio" name="shipping-method" defaultChecked className="mt-1 h-4 w-4 accent-blue-600" />
                    <div>
                      <div className="text-sm font-medium text-zinc-900">{t("standardShipping")}</div>
                      <p className="mt-1 text-xs leading-5 text-zinc-500">{t("standardShippingHint")}</p>
                    </div>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-zinc-900">{formatMoney(shipping)}</span>
                </label>

                <label className="mt-3 flex cursor-pointer items-start justify-between gap-4 border border-zinc-300 px-4 py-3">
                  <div className="flex items-start gap-3">
                    <input type="radio" name="shipping-method" className="mt-1 h-4 w-4 accent-blue-600" />
                    <div>
                      <div className="text-sm font-medium text-zinc-900">{t("pickupTitle")}</div>
                      <p className="mt-1 text-xs leading-5 text-zinc-500">{t("pickupHint")}</p>
                    </div>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-zinc-900">{formatMoney(0)}</span>
                </label>
              </div>

              <div className="mt-8">
                <button
                  type="button"
                  disabled={items.length === 0 || hasInvalidItems}
                  className="inline-flex h-10 min-w-[122px] items-center justify-center rounded-full bg-blue-600 px-8 text-xs font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-zinc-300"
                >
                  {t("next")}
                </button>
              </div>
            </section>

            <aside className="lg:pt-16">
              <div className="bg-zinc-50 p-5 lg:sticky lg:top-24">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-zinc-950">{t("summaryTitle")}</h2>
                    <p className="mt-1 text-[11px] text-zinc-500">
                      {loading ? t("loading") : t("itemCount", { count: itemCount })}
                    </p>
                  </div>
                </div>

                <div className="space-y-3 border-b border-zinc-200 pb-4">
                  {loading ? (
                    <p className="text-sm text-zinc-500">{t("loading")}</p>
                  ) : items.length === 0 ? (
                    <p className="text-sm text-zinc-500">{t("empty")}</p>
                  ) : (
                    items.map((item) => (
                      <div key={checkoutItemKey(item)} className="flex gap-3">
                        <img
                          src={item.thumbnail_url ?? "/images/placeholder.png"}
                          alt={item.product_name}
                          className="h-14 w-14 shrink-0 border border-zinc-200 object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <Link
                            href={`/products/${item.product_slug}`}
                            className="line-clamp-2 text-xs font-medium leading-5 text-zinc-900 hover:text-blue-600"
                          >
                            {item.product_name}
                          </Link>
                          {"variant_name" in item && item.variant_name ? (
                            <p className="mt-1 text-[11px] text-zinc-500">{item.variant_name}</p>
                          ) : null}
                          <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-zinc-500">
                            <span>QTY: {item.quantity}</span>
                            <span className="font-semibold text-zinc-900">
                              {formatMoney(Number(item.sale_price ?? item.price ?? 0) * Number(item.quantity ?? 1))}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="mt-4 space-y-2 text-xs text-zinc-700">
                  <div className="flex justify-between">
                    <span>{t("subtotal")}</span>
                    <span className="font-semibold">{formatMoney(subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t("shipping")}</span>
                    <span className="font-semibold">{formatMoney(shipping)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t("vat")}</span>
                    <span className="font-semibold">{formatMoney(vat)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t("discount")}</span>
                    <span className="font-semibold">
                      {discount > 0 ? `- ${formatMoney(discount)}` : formatMoney(0)}
                    </span>
                  </div>
                </div>

                {coupon ? (
                  <div className="mt-4 border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] text-emerald-700">
                    {t("couponApplied")} <span className="font-semibold">{coupon.code}</span>
                  </div>
                ) : null}

                {hasInvalidItems ? (
                  <div className="mt-4 border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-600">
                    {t("invalidItems")}
                  </div>
                ) : null}

                <div className="mt-4 border-t border-zinc-200 pt-4">
                  <div className="flex items-center justify-between text-sm font-semibold text-zinc-950">
                    <span>{t("total")}</span>
                    <span>{formatMoney(total)}</span>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </section>
      </main>

      <SupportFeature />
      <SiteFooter />
    </div>
  )
}
