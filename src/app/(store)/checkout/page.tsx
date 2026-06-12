"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState, type FormEvent } from "react"
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

type AddressItem = {
  id: string
  full_name: string
  phone: string
  province: string
  district: string
  ward: string
  address_line: string
  is_default: boolean
}

type CheckoutOption = "pickup_store" | "pickup_online" | "delivery_online"

type FormErrors = Partial<Record<keyof ShippingForm, string>>

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_PATTERN = /^(0|\+84)(\d[\s.-]?){8,10}$/
const REQUIRED_ADDRESS_FIELDS: Array<keyof ShippingForm> = ["address", "province", "district", "ward"]

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
  const router = useRouter()
  const [authUser, setAuthUser] = useState<AuthUser | null>(null)
  const [items, setItems] = useState<Array<CartItem | GuestCartItem>>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState("")
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({})
  const [coupon, setCoupon] = useState<AppliedCoupon | null>(null)
  const [checkoutOption, setCheckoutOption] = useState<CheckoutOption>("pickup_store")
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

        const [cartResponse, addressesResponse] = await Promise.all([
          fetch(`/api/cart?user_id=${encodeURIComponent(user.id)}`),
          fetch("/api/me/addresses"),
        ])

        const cartData = await cartResponse.json()
        if (cartResponse.ok && mounted) {
          setItems((cartData.items ?? []) as CartItem[])
        }

        if (addressesResponse.ok && mounted) {
          const addressData = (await addressesResponse.json()) as { addresses?: AddressItem[] }
          const defaultAddress = addressData.addresses?.find((address) => address.is_default) ?? addressData.addresses?.[0]

          if (defaultAddress) {
            setForm((prev) => ({
              ...prev,
              fullName: defaultAddress.full_name || prev.fullName,
              phone: defaultAddress.phone || prev.phone,
              province: defaultAddress.province || prev.province,
              district: defaultAddress.district || prev.district,
              ward: defaultAddress.ward || prev.ward,
              address: defaultAddress.address_line || prev.address,
            }))
          }
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

  const shipping = subtotal > 0 && checkoutOption === "delivery_online" ? 30000 : 0
  const vat = subtotal * 0.1
  const discount = Math.floor(calculateDiscount(subtotal, coupon))
  const total = subtotal + shipping + vat - discount
  const hasInvalidItems = items.some((item) => "in_stock" in item && item.in_stock === false)

  const updateField = (field: keyof ShippingForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setFieldErrors((prev) => {
      if (!prev[field]) return prev
      const next = { ...prev }
      delete next[field]
      return next
    })
    if (submitError) setSubmitError("")
  }

  const validateForm = () => {
    const nextErrors: FormErrors = {}
    const trimmed = {
      email: form.email.trim(),
      fullName: form.fullName.trim(),
      phone: form.phone.trim(),
      province: form.province.trim(),
      district: form.district.trim(),
      ward: form.ward.trim(),
      address: form.address.trim(),
      note: form.note.trim(),
    }

    if (!trimmed.email) {
      nextErrors.email = t("errors.emailRequired")
    } else if (!EMAIL_PATTERN.test(trimmed.email)) {
      nextErrors.email = t("errors.emailInvalid")
    }

    if (!trimmed.fullName) {
      nextErrors.fullName = t("errors.fullNameRequired")
    } else if (trimmed.fullName.length < 2) {
      nextErrors.fullName = t("errors.fullNameInvalid")
    }

    if (!trimmed.phone) {
      nextErrors.phone = t("errors.phoneRequired")
    } else if (!PHONE_PATTERN.test(trimmed.phone)) {
      nextErrors.phone = t("errors.phoneInvalid")
    }

    if (checkoutOption === "delivery_online") {
      REQUIRED_ADDRESS_FIELDS.forEach((field) => {
        if (!trimmed[field]) {
          nextErrors[field] = t(`errors.${field}Required`)
        }
      })
    }

    setFieldErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handlePlaceOrder = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault()
    if (items.length === 0 || hasInvalidItems || submitting) return

    if (!validateForm()) {
      setSubmitError(t("errors.reviewFields"))
      return
    }

    setSubmitting(true)
    setSubmitError("")

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: authUser?.id ?? null,
          items: authUser
            ? undefined
            : items.map((item) => ({
                product_id: item.product_id,
                variant_id: item.variant_id ?? null,
                quantity: item.quantity,
              })),
          coupon_id: coupon?.id ?? null,
          checkout_option: checkoutOption,
          shipping_address: {
            email: form.email,
            fullName: form.fullName,
            phone: form.phone,
            province: form.province,
            district: form.district,
            ward: form.ward,
            address: form.address,
          },
          note: form.note,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setSubmitError(data.error ?? t("errors.placeOrder"))
        return
      }

      if (!authUser) {
        window.localStorage.removeItem("cart_guest_v1")
      }
      window.localStorage.removeItem("checkout_coupon_v1")

      if (typeof data.paymentUrl === "string" && data.paymentUrl.trim()) {
        window.location.href = data.paymentUrl
        return
      }

      router.push(`/payment/success?order=${encodeURIComponent(data.order?.order_number ?? "")}`)
    } catch {
      setSubmitError(t("errors.placeOrder"))
    } finally {
      setSubmitting(false)
    }
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

              <form id="checkout-form" className="space-y-4" onSubmit={handlePlaceOrder} noValidate>
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold text-zinc-700">
                    {t("fields.email")} *
                  </label>
                  <input
                    id="checkout-email"
                    type="email"
                    value={form.email}
                    onChange={(event) => updateField("email", event.target.value)}
                    aria-invalid={Boolean(fieldErrors.email)}
                    aria-describedby={fieldErrors.email ? "checkout-email-error" : undefined}
                    className={`h-11 w-full rounded-none border px-3 text-sm text-zinc-900 outline-none transition-colors placeholder:text-zinc-400 focus:border-blue-600 ${fieldErrors.email ? "border-red-400 bg-red-50/40" : "border-zinc-300"}`}
                    placeholder={t("fields.email")}
                  />
                  {fieldErrors.email ? (
                    <p id="checkout-email-error" className="mt-1.5 text-[11px] font-medium text-red-600">
                      {fieldErrors.email}
                    </p>
                  ) : (
                    <p className="mt-1.5 text-[11px] text-zinc-500">{t("emailHint")}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-[11px] font-semibold text-zinc-700">
                      {t("fields.fullName")} *
                    </label>
                    <input
                      id="checkout-full-name"
                      value={form.fullName}
                      onChange={(event) => updateField("fullName", event.target.value)}
                      aria-invalid={Boolean(fieldErrors.fullName)}
                      aria-describedby={fieldErrors.fullName ? "checkout-full-name-error" : undefined}
                      className={`h-11 w-full rounded-none border px-3 text-sm text-zinc-900 outline-none transition-colors placeholder:text-zinc-400 focus:border-blue-600 ${fieldErrors.fullName ? "border-red-400 bg-red-50/40" : "border-zinc-300"}`}
                      placeholder={t("fields.fullName")}
                    />
                    {fieldErrors.fullName ? (
                      <p id="checkout-full-name-error" className="mt-1.5 text-[11px] font-medium text-red-600">
                        {fieldErrors.fullName}
                      </p>
                    ) : null}
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[11px] font-semibold text-zinc-700">
                      {t("fields.phone")} *
                    </label>
                    <input
                      id="checkout-phone"
                      inputMode="tel"
                      value={form.phone}
                      onChange={(event) => updateField("phone", event.target.value)}
                      aria-invalid={Boolean(fieldErrors.phone)}
                      aria-describedby={fieldErrors.phone ? "checkout-phone-error" : undefined}
                      className={`h-11 w-full rounded-none border px-3 text-sm text-zinc-900 outline-none transition-colors placeholder:text-zinc-400 focus:border-blue-600 ${fieldErrors.phone ? "border-red-400 bg-red-50/40" : "border-zinc-300"}`}
                      placeholder={t("fields.phone")}
                    />
                    {fieldErrors.phone ? (
                      <p id="checkout-phone-error" className="mt-1.5 text-[11px] font-medium text-red-600">
                        {fieldErrors.phone}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold text-zinc-700">
                    {t("fields.address")} *
                  </label>
                  <input
                    id="checkout-address"
                    value={form.address}
                    onChange={(event) => updateField("address", event.target.value)}
                    aria-invalid={Boolean(fieldErrors.address)}
                    aria-describedby={fieldErrors.address ? "checkout-address-error" : undefined}
                    className={`h-11 w-full rounded-none border px-3 text-sm text-zinc-900 outline-none transition-colors placeholder:text-zinc-400 focus:border-blue-600 ${fieldErrors.address ? "border-red-400 bg-red-50/40" : "border-zinc-300"}`}
                    placeholder={t("fields.address")}
                  />
                  {fieldErrors.address ? (
                    <p id="checkout-address-error" className="mt-1.5 text-[11px] font-medium text-red-600">
                      {fieldErrors.address}
                    </p>
                  ) : null}
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-[11px] font-semibold text-zinc-700">
                      {t("fields.province")} *
                    </label>
                    <input
                      id="checkout-province"
                      value={form.province}
                      onChange={(event) => updateField("province", event.target.value)}
                      aria-invalid={Boolean(fieldErrors.province)}
                      aria-describedby={fieldErrors.province ? "checkout-province-error" : undefined}
                      className={`h-11 w-full rounded-none border px-3 text-sm text-zinc-900 outline-none transition-colors placeholder:text-zinc-400 focus:border-blue-600 ${fieldErrors.province ? "border-red-400 bg-red-50/40" : "border-zinc-300"}`}
                      placeholder={t("fields.province")}
                    />
                    {fieldErrors.province ? (
                      <p id="checkout-province-error" className="mt-1.5 text-[11px] font-medium text-red-600">
                        {fieldErrors.province}
                      </p>
                    ) : null}
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[11px] font-semibold text-zinc-700">
                      {t("fields.district")} *
                    </label>
                    <input
                      id="checkout-district"
                      value={form.district}
                      onChange={(event) => updateField("district", event.target.value)}
                      aria-invalid={Boolean(fieldErrors.district)}
                      aria-describedby={fieldErrors.district ? "checkout-district-error" : undefined}
                      className={`h-11 w-full rounded-none border px-3 text-sm text-zinc-900 outline-none transition-colors placeholder:text-zinc-400 focus:border-blue-600 ${fieldErrors.district ? "border-red-400 bg-red-50/40" : "border-zinc-300"}`}
                      placeholder={t("fields.district")}
                    />
                    {fieldErrors.district ? (
                      <p id="checkout-district-error" className="mt-1.5 text-[11px] font-medium text-red-600">
                        {fieldErrors.district}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold text-zinc-700">
                    {t("fields.ward")} *
                  </label>
                  <input
                    id="checkout-ward"
                    value={form.ward}
                    onChange={(event) => updateField("ward", event.target.value)}
                    aria-invalid={Boolean(fieldErrors.ward)}
                    aria-describedby={fieldErrors.ward ? "checkout-ward-error" : undefined}
                    className={`h-11 w-full rounded-none border px-3 text-sm text-zinc-900 outline-none transition-colors placeholder:text-zinc-400 focus:border-blue-600 ${fieldErrors.ward ? "border-red-400 bg-red-50/40" : "border-zinc-300"}`}
                    placeholder={t("fields.ward")}
                  />
                  {fieldErrors.ward ? (
                    <p id="checkout-ward-error" className="mt-1.5 text-[11px] font-medium text-red-600">
                      {fieldErrors.ward}
                    </p>
                  ) : null}
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
              </form>

              <div className="mt-10 border-t border-zinc-200 pt-6">
                <div className="mb-4 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                  {t("checkoutMethod")}
                </div>

                <label className="flex cursor-pointer items-start justify-between gap-4 border border-zinc-300 px-4 py-3">
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="checkout-option"
                      checked={checkoutOption === "pickup_store"}
                      onChange={() => setCheckoutOption("pickup_store")}
                      className="mt-1 h-4 w-4 accent-blue-600"
                    />
                    <div>
                      <div className="text-sm font-medium text-zinc-900">{t("options.pickupStoreTitle")}</div>
                      <p className="mt-1 text-xs leading-5 text-zinc-500">
                        {t("options.pickupStoreDesc")}
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-zinc-900">{formatMoney(0)}</span>
                </label>

                <label className="mt-3 flex cursor-pointer items-start justify-between gap-4 border border-zinc-300 px-4 py-3">
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="checkout-option"
                      checked={checkoutOption === "pickup_online"}
                      onChange={() => setCheckoutOption("pickup_online")}
                      className="mt-1 h-4 w-4 accent-blue-600"
                    />
                    <div>
                      <div className="text-sm font-medium text-zinc-900">{t("options.pickupOnlineTitle")}</div>
                      <p className="mt-1 text-xs leading-5 text-zinc-500">
                        {t("options.pickupOnlineDesc")}
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-zinc-900">{formatMoney(0)}</span>
                </label>

                <label className="mt-3 flex cursor-pointer items-start justify-between gap-4 border border-zinc-300 px-4 py-3">
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="checkout-option"
                      checked={checkoutOption === "delivery_online"}
                      onChange={() => setCheckoutOption("delivery_online")}
                      className="mt-1 h-4 w-4 accent-blue-600"
                    />
                    <div>
                      <div className="text-sm font-medium text-zinc-900">{t("options.deliveryOnlineTitle")}</div>
                      <p className="mt-1 text-xs leading-5 text-zinc-500">
                        {t("options.deliveryOnlineDesc")}
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-zinc-900">{formatMoney(30000)}</span>
                </label>
              </div>

              <div className="mt-8">
                {submitError ? (
                  <div className="mb-4 border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-600">
                    {submitError}
                  </div>
                ) : null}

                <button
                  type="submit"
                  form="checkout-form"
                  disabled={items.length === 0 || hasInvalidItems || submitting}
                  className="inline-flex h-10 min-w-[122px] items-center justify-center rounded-full bg-blue-600 px-8 text-xs font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-zinc-300"
                >
                  {submitting ? t("submitting") : t("next")}
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
                            <span>{t("quantityShort")}: {item.quantity}</span>
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
