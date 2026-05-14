"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { CircleX, Minus, Plus } from "lucide-react"
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
  user_id: string
  product_id: string
  variant_id: string | null
  variant_name?: string | null
  quantity: number
  product_name: string
  product_slug: string
  thumbnail_url: string | null
  price: string
  sale_price: string | null
  stock: number
  is_active: boolean
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

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message
  return fallback
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

export default function CartPage() {
  const router = useRouter()
  const t = useTranslations("Cart")
  const [authUser, setAuthUser] = useState<AuthUser | null>(null)
  const [items, setItems] = useState<CartItem[]>([])
  const [guestItems, setGuestItems] = useState<GuestCartItem[]>([])
  const [qtyDraft, setQtyDraft] = useState<Record<string, number>>({})
  const [couponCode, setCouponCode] = useState("")
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null)
  const [couponError, setCouponError] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [isUpdating, setIsUpdating] = useState(false)
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false)

  useEffect(() => {
    let mounted = true

    const load = async () => {
      try {
        const rawCoupon = window.localStorage.getItem("checkout_coupon_v1")
        if (rawCoupon && mounted) {
          const coupon = JSON.parse(rawCoupon) as AppliedCoupon
          setAppliedCoupon(coupon)
          setCouponCode(coupon.code)
        }

        const raw = window.localStorage.getItem("auth_user")
        if (!raw) {
          if (mounted) {
            setAuthUser(null)
            const rawGuest = window.localStorage.getItem("cart_guest_v1")
            const localGuest = rawGuest ? (JSON.parse(rawGuest) as GuestCartItem[]) : []
            setGuestItems(localGuest)
            setLoading(false)
          }
          return
        }

        const user = JSON.parse(raw) as AuthUser
        if (!user?.id) {
          if (mounted) {
            setAuthUser(null)
            const rawGuest = window.localStorage.getItem("cart_guest_v1")
            const localGuest = rawGuest ? (JSON.parse(rawGuest) as GuestCartItem[]) : []
            setGuestItems(localGuest)
            setLoading(false)
          }
          return
        }

        if (mounted) setAuthUser(user)

        const response = await fetch(`/api/cart?user_id=${encodeURIComponent(user.id)}`)
        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.error ?? "Failed to load cart")
        }

        if (mounted) {
          const nextItems = (data.items ?? []) as CartItem[]
          setItems(nextItems)
          setQtyDraft(
            nextItems.reduce<Record<string, number>>((acc, item) => {
              acc[item.id] = Number(item.quantity ?? 1)
              return acc
            }, {})
          )
        }
      } catch (e: unknown) {
        if (mounted) {
          setError(getErrorMessage(e, "Failed to load cart"))
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    void load()
    return () => {
      mounted = false
    }
  }, [])

  const subtotal = useMemo(() => {
    if (!authUser) {
      return guestItems.reduce((sum, item) => {
        const unit = Number(item.sale_price ?? item.price ?? 0)
        const qty = Number(qtyDraft[item.product_id] ?? item.quantity ?? 1)
        return sum + unit * qty
      }, 0)
    }

    return items.reduce((sum, item) => {
      const unit = Number(item.sale_price ?? item.price ?? 0)
      const qty = Number(qtyDraft[item.id] ?? item.quantity ?? 1)
      return sum + unit * qty
    }, 0)
  }, [authUser, guestItems, items, qtyDraft])

  const shipping = subtotal > 0 ? 30000 : 0
  const vat = subtotal * 0.1
  const discountAmount = Math.floor(calculateDiscount(subtotal, appliedCoupon))
  const orderTotal = subtotal + shipping + vat - discountAmount
  const hasInvalidItems = authUser
    ? items.some((item) => item.in_stock === false)
    : guestItems.some((item) => item.in_stock === false)
  const hasItems = authUser ? items.length > 0 : guestItems.length > 0
  const canCheckout = !loading && hasItems && !hasInvalidItems

  const handleQtyChange = (id: string, value: number) => {
    const safeValue = Number.isFinite(value) ? Math.max(1, Math.floor(value)) : 1
    setQtyDraft((prev) => ({ ...prev, [id]: safeValue }))
  }

  const increaseQty = (id: string, currentQty: number) => {
    handleQtyChange(id, currentQty + 1)
  }

  const decreaseQty = (id: string, currentQty: number) => {
    handleQtyChange(id, Math.max(1, currentQty - 1))
  }

  const updateCart = async () => {
    if (!authUser) {
      const normalized = guestItems.map((item) => ({
        ...item,
        quantity: Number(qtyDraft[item.product_id] ?? item.quantity ?? 1),
      }))
      setGuestItems(normalized)
      window.localStorage.setItem("cart_guest_v1", JSON.stringify(normalized))
      return
    }
    if (items.length === 0) return
    setIsUpdating(true)
    setError("")

    try {
      await Promise.all(
        items.map((item) =>
          fetch("/api/cart/item", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              user_id: authUser.id,
              item_id: item.id,
              quantity: qtyDraft[item.id] ?? item.quantity,
            }),
          })
        )
      )

      const response = await fetch(`/api/cart?user_id=${encodeURIComponent(authUser.id)}`)
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? "Failed to refresh cart")

      const nextItems = (data.items ?? []) as CartItem[]
      setItems(nextItems)
      setQtyDraft(
        nextItems.reduce<Record<string, number>>((acc, item) => {
          acc[item.id] = Number(item.quantity ?? 1)
          return acc
        }, {})
      )
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Failed to update cart"))
    } finally {
      setIsUpdating(false)
    }
  }

  const applyCoupon = async () => {
    const normalizedCode = couponCode.trim().toUpperCase()
    if (!normalizedCode) {
      setCouponError(t("couponRequired"))
      return
    }

    if (subtotal <= 0) {
      setCouponError(t("couponEmptyCart"))
      return
    }

    setCouponError("")
    setIsApplyingCoupon(true)

    try {
      const response = await fetch("/api/checkout/apply-coupon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: normalizedCode, subtotal }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error ?? t("couponFailed"))
      }

      const nextCoupon = data.coupon as AppliedCoupon
      setAppliedCoupon(nextCoupon)
      setCouponCode(nextCoupon.code)
      window.localStorage.setItem("checkout_coupon_v1", JSON.stringify(nextCoupon))
    } catch (e: unknown) {
      setAppliedCoupon(null)
      window.localStorage.removeItem("checkout_coupon_v1")
      setCouponError(getErrorMessage(e, t("couponFailed")))
    } finally {
      setIsApplyingCoupon(false)
    }
  }

  const removeCoupon = () => {
    setAppliedCoupon(null)
    setCouponCode("")
    setCouponError("")
    window.localStorage.removeItem("checkout_coupon_v1")
  }

  const goToCheckout = () => {
    if (!canCheckout) return
    router.push("/checkout")
  }

  const removeItem = async (itemId: string) => {
    if (!authUser) {
      const nextGuest = guestItems.filter((item) => `${item.product_id}:${item.variant_id ?? ""}` !== itemId)
      setGuestItems(nextGuest)
      window.localStorage.setItem("cart_guest_v1", JSON.stringify(nextGuest))
      setQtyDraft((prev) => {
        const next = { ...prev }
        delete next[itemId]
        return next
      })
      return
    }
    setError("")
    try {
      const response = await fetch("/api/cart/item", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: authUser.id,
          item_id: itemId,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? "Failed to remove item")

      setItems((prev) => prev.filter((item) => item.id !== itemId))
      setQtyDraft((prev) => {
        const next = { ...prev }
        delete next[itemId]
        return next
      })
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Failed to remove item"))
    }
  }

  const clearCart = async () => {
    if (!authUser) {
      setGuestItems([])
      setQtyDraft({})
      window.localStorage.removeItem("cart_guest_v1")
      window.localStorage.removeItem("checkout_coupon_v1")
      setAppliedCoupon(null)
      setCouponCode("")
      return
    }
    if (items.length === 0) return
    setIsUpdating(true)
    setError("")

    try {
      await Promise.all(
        items.map((item) =>
          fetch("/api/cart/item", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              user_id: authUser.id,
              item_id: item.id,
            }),
          })
        )
      )
      setItems([])
      setQtyDraft({})
      window.localStorage.removeItem("checkout_coupon_v1")
      setAppliedCoupon(null)
      setCouponCode("")
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Failed to clear cart"))
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <SiteHeader />

      <main className="flex-1 bg-zinc-50">
        <section className="container mx-auto px-4 py-10">
          <div className="mb-4 flex items-center gap-2 text-[11px] text-zinc-500">
            <Link href="/" className="hover:text-blue-600">
              {t("breadcrumbHome")}
            </Link>
            <span>&bull;</span>
            <span className="text-zinc-700">{t("title")}</span>
          </div>

          <h1 className="mb-6 text-4xl font-semibold tracking-tight text-zinc-900">{t("title")}</h1>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
            <section>
              <div className="grid grid-cols-[1.6fr_0.5fr_0.4fr_0.6fr] border-b border-zinc-300 pb-3 text-xs font-semibold text-zinc-700">
                <span>{t("columns.item")}</span>
                <span>{t("columns.price")}</span>
                <span>{t("columns.qty")}</span>
                <span>{t("columns.subtotal")}</span>
              </div>

              {loading ? (
                <div className="py-8 text-sm text-zinc-500">{t("loading")}</div>
              ) : authUser && items.length === 0 ? (
                <div className="py-8 text-sm text-zinc-500">{t("empty")}</div>
              ) : !authUser && guestItems.length === 0 ? (
                <div className="py-8 text-sm text-zinc-500">
                  {t("empty")}{" "}
                  <Link href="/login" className="font-semibold text-blue-600 hover:underline">
                    {t("signInSync")}
                  </Link>{" "}
                  {t("syncHint")}
                </div>
              ) : (
                (authUser ? items : guestItems).map((item) => {
                  const unitPrice = Number(item.sale_price ?? item.price ?? 0)
                  const rowId = authUser
                    ? (item as CartItem).id
                    : `${(item as GuestCartItem).product_id}:${(item as GuestCartItem).variant_id ?? ""}`
                  const productSlug = item.product_slug
                  const qty = Number(qtyDraft[rowId] ?? item.quantity ?? 1)
                  const rowSubtotal = unitPrice * qty

                  return (
                    <div
                      key={rowId}
                      className="grid grid-cols-[1.6fr_0.5fr_0.4fr_0.6fr] items-start gap-3 border-b border-zinc-200 py-5"
                    >
                      <div className="flex gap-3">
                        <img
                          src={item.thumbnail_url ?? "/images/placeholder.png"}
                          alt={item.product_name}
                          className="h-20 w-20 rounded border border-zinc-200 object-cover"
                        />
                        <div>
                          <Link href={`/products/${productSlug}`} className="text-xs font-semibold text-zinc-900 hover:text-blue-600">
                            {item.product_name}
                          </Link>
                          {"variant_name" in item && item.variant_name ? (
                            <p className="mt-1 text-[11px] text-zinc-500">{item.variant_name}</p>
                          ) : null}
                          {"in_stock" in item && item.in_stock === false ? (
                            <p className="mt-1 text-[11px] text-red-500">{t("outOfStock")}</p>
                          ) : null}
                        </div>
                      </div>

                      <div className="pt-1 text-sm font-semibold text-zinc-900">{formatMoney(unitPrice)}</div>

                      <div className="pt-0.5">
                        <div className="inline-flex h-9 items-center rounded border border-zinc-300 bg-white">
                          <button
                            type="button"
                            onClick={() => decreaseQty(rowId, qty)}
                            className="inline-flex h-9 w-8 items-center justify-center text-zinc-600 transition-colors hover:bg-zinc-100"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <input
                            type="number"
                            min={1}
                            value={qty}
                            onChange={(event) => handleQtyChange(rowId, Number(event.target.value))}
                            className="h-9 w-12 border-x border-zinc-300 bg-white px-1 text-center text-sm text-zinc-900 outline-none focus:border-blue-600"
                          />
                          <button
                            type="button"
                            onClick={() => increaseQty(rowId, qty)}
                            className="inline-flex h-9 w-8 items-center justify-center text-zinc-600 transition-colors hover:bg-zinc-100"
                            aria-label="Increase quantity"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-start justify-between gap-2">
                        <span className="pt-1 text-sm font-semibold text-zinc-900">{formatMoney(rowSubtotal)}</span>
                        <div className="flex flex-col gap-1">
                          <button
                            type="button"
                            onClick={() => removeItem(rowId)}
                            className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-zinc-300 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
                            aria-label="Remove item"
                          >
                            <CircleX className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href="/products"
                  className="inline-flex h-10 items-center justify-center rounded-full border border-zinc-300 px-6 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-100"
                >
                  {t("continue")}
                </Link>
                <button
                  type="button"
                  onClick={clearCart}
                  disabled={isUpdating || !hasItems}
                  className="inline-flex h-10 items-center justify-center rounded-full bg-black px-6 text-xs font-semibold text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {t("clear")}
                </button>
                <button
                  type="button"
                  onClick={updateCart}
                  disabled={isUpdating || !hasItems}
                  className="inline-flex h-10 items-center justify-center rounded-full bg-black px-6 text-xs font-semibold text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 lg:ml-auto"
                >
                  {isUpdating ? t("updating") : t("update")}
                </button>
              </div>

              {error ? <p className="mt-3 text-xs text-red-500">{error}</p> : null}
            </section>

            <aside className="h-fit rounded bg-zinc-100 p-4">
              <h2 className="text-2xl font-semibold text-zinc-900">{t("summary")}</h2>

              <div className="mt-4 space-y-3 border-b border-zinc-300 pb-4">
                <div className="flex items-center justify-between text-sm text-zinc-800">
                  <span>{t("estimate")}</span>
                  <span>+</span>
                </div>
                <p className="text-xs text-zinc-500">{t("estimateHint")}</p>
              </div>

              <div className="mt-4 space-y-3 border-b border-zinc-300 pb-4">
                <div className="flex items-center justify-between text-sm text-zinc-800">
                  <span>{t("discount")}</span>
                  {appliedCoupon ? (
                    <button
                      type="button"
                      onClick={removeCoupon}
                      className="text-xs font-semibold text-red-500 hover:text-red-600"
                    >
                      {t("couponRemove")}
                    </button>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(event) => setCouponCode(event.target.value.toUpperCase())}
                    placeholder={t("couponPlaceholder")}
                    className="h-10 flex-1 rounded-full border border-zinc-300 bg-white px-4 text-sm text-zinc-900 outline-none transition-colors placeholder:text-zinc-400 focus:border-blue-600"
                  />
                  <button
                    type="button"
                    onClick={applyCoupon}
                    disabled={isApplyingCoupon}
                    className="inline-flex h-10 items-center justify-center rounded-full bg-black px-4 text-xs font-semibold text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isApplyingCoupon ? t("couponApplying") : t("couponApply")}
                  </button>
                </div>
                {appliedCoupon ? (
                  <p className="text-xs text-emerald-600">
                    {t("couponApplied")} <span className="font-semibold">{appliedCoupon.code}</span>
                  </p>
                ) : null}
                {couponError ? <p className="text-xs text-red-500">{couponError}</p> : null}
              </div>

              <div className="mt-4 space-y-2 text-xs text-zinc-700">
                <div className="flex justify-between">
                  <span>Subtotal</span>
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
                  <span>{t("discountValue")}</span>
                  <span className="font-semibold">
                    {discountAmount > 0 ? `- ${formatMoney(discountAmount)}` : formatMoney(0)}
                  </span>
                </div>
              </div>

              {hasInvalidItems ? (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
                  {t("checkoutBlocked")}
                </div>
              ) : null}

              <div className="mt-4 border-t border-zinc-300 pt-4">
                <div className="mb-3 flex items-center justify-between text-sm font-semibold text-zinc-900">
                  <span>{t("orderTotal")}</span>
                  <span>{formatMoney(orderTotal)}</span>
                </div>
                <button
                  type="button"
                  onClick={goToCheckout}
                  disabled={!canCheckout}
                  className="inline-flex h-11 w-full items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-zinc-300"
                >
                  {t("checkout")}
                </button>
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
