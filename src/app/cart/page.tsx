"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { CircleX, PencilLine } from "lucide-react"
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

function formatMoney(value: number) {
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function CartPage() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null)
  const [items, setItems] = useState<CartItem[]>([])
  const [guestItems, setGuestItems] = useState<GuestCartItem[]>([])
  const [qtyDraft, setQtyDraft] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    let mounted = true

    const load = async () => {
      try {
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
      } catch (e: any) {
        if (mounted) {
          setError(e.message ?? "Failed to load cart")
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

  const shipping = subtotal > 0 ? 21 : 0
  const tax = subtotal * 0.000146
  const gst = subtotal * 0.000146
  const orderTotal = subtotal + shipping + tax + gst

  const handleQtyChange = (id: string, value: number) => {
    const safeValue = Number.isFinite(value) ? Math.max(1, Math.floor(value)) : 1
    setQtyDraft((prev) => ({ ...prev, [id]: safeValue }))
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
    } catch (e: any) {
      setError(e.message ?? "Failed to update cart")
    } finally {
      setIsUpdating(false)
    }
  }

  const removeItem = async (itemId: string) => {
    if (!authUser) {
      const nextGuest = guestItems.filter((item) => item.product_id !== itemId)
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
    } catch (e: any) {
      setError(e.message ?? "Failed to remove item")
    }
  }

  const clearCart = async () => {
    if (!authUser) {
      setGuestItems([])
      setQtyDraft({})
      window.localStorage.removeItem("cart_guest_v1")
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
    } catch (e: any) {
      setError(e.message ?? "Failed to clear cart")
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
              Home
            </Link>
            <span>&bull;</span>
            <span className="text-zinc-700">Shopping Cart</span>
          </div>

          <h1 className="mb-6 text-4xl font-semibold tracking-tight text-zinc-900">Shopping Cart</h1>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
              <section>
                <div className="grid grid-cols-[1.6fr_0.5fr_0.4fr_0.6fr] border-b border-zinc-300 pb-3 text-xs font-semibold text-zinc-700">
                  <span>Item</span>
                  <span>Price</span>
                  <span>Qty</span>
                  <span>Subtotal</span>
                </div>

                {loading ? (
                  <div className="py-8 text-sm text-zinc-500">Loading cart...</div>
                ) : authUser && items.length === 0 ? (
                  <div className="py-8 text-sm text-zinc-500">Your cart is empty.</div>
                ) : !authUser && guestItems.length === 0 ? (
                  <div className="py-8 text-sm text-zinc-500">
                    Your cart is empty.{" "}
                    <Link href="/login" className="font-semibold text-blue-600 hover:underline">
                      Sign in
                    </Link>{" "}
                    to sync cart across devices.
                  </div>
                ) : (
                  (authUser ? items : guestItems).map((item) => {
                    const unitPrice = Number(item.sale_price ?? item.price ?? 0)
                    const rowId = authUser ? (item as CartItem).id : (item as GuestCartItem).product_id
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
                            <p className="text-xs font-semibold text-zinc-900">{item.product_name}</p>
                            {"in_stock" in item && item.in_stock === false ? (
                              <p className="mt-1 text-[11px] text-red-500">Out of stock</p>
                            ) : null}
                          </div>
                        </div>

                        <div className="pt-1 text-sm font-semibold text-zinc-900">{formatMoney(unitPrice)}</div>

                        <div className="pt-0.5">
                          <input
                            type="number"
                            min={1}
                            value={qty}
                            onChange={(event) => handleQtyChange(rowId, Number(event.target.value))}
                            className="h-9 w-14 rounded border border-zinc-300 bg-white px-2 text-center text-sm text-zinc-900 outline-none focus:border-blue-600"
                          />
                        </div>

                        <div className="flex items-start justify-between gap-2">
                          <span className="pt-1 text-sm font-semibold text-zinc-900">{formatMoney(rowSubtotal)}</span>
                          <div className="flex flex-col gap-1">
                            <button
                              onClick={() => removeItem(rowId)}
                              className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-zinc-300 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
                              aria-label="Remove item"
                            >
                              <CircleX className="h-4 w-4" />
                            </button>
                            <button
                              className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-zinc-300 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
                              aria-label="Edit item"
                            >
                              <PencilLine className="h-3 w-3" />
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
                    Continue Shopping
                  </Link>
                  <button
                    onClick={clearCart}
                    disabled={isUpdating || (authUser ? items.length === 0 : guestItems.length === 0)}
                    className="inline-flex h-10 items-center justify-center rounded-full bg-black px-6 text-xs font-semibold text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Clear Shopping Cart
                  </button>
                  <button
                    onClick={updateCart}
                    disabled={isUpdating || (authUser ? items.length === 0 : guestItems.length === 0)}
                    className="inline-flex h-10 items-center justify-center rounded-full bg-black px-6 text-xs font-semibold text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 lg:ml-auto"
                  >
                    {isUpdating ? "Updating..." : "Update Shopping Cart"}
                  </button>
                </div>

                {error ? <p className="mt-3 text-xs text-red-500">{error}</p> : null}
              </section>

              <aside className="h-fit rounded bg-zinc-100 p-4">
                <h2 className="text-2xl font-semibold text-zinc-900">Summary</h2>

                <div className="mt-4 space-y-3 border-b border-zinc-300 pb-4">
                  <div className="flex items-center justify-between text-sm text-zinc-800">
                    <span>Estimate Shipping and Tax</span>
                    <span>+</span>
                  </div>
                  <p className="text-xs text-zinc-500">Enter your destination to get a shipping estimate.</p>
                </div>

                <div className="mt-4 space-y-3 border-b border-zinc-300 pb-4">
                  <div className="flex items-center justify-between text-sm text-zinc-800">
                    <span>Apply Discount Code</span>
                    <span>+</span>
                  </div>
                </div>

                <div className="mt-4 space-y-2 text-xs text-zinc-700">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="font-semibold">{formatMoney(subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Shipping</span>
                    <span className="font-semibold">{formatMoney(shipping)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax</span>
                    <span className="font-semibold">{formatMoney(tax)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>GST (10%)</span>
                    <span className="font-semibold">{formatMoney(gst)}</span>
                  </div>
                </div>

                <div className="mt-4 border-t border-zinc-300 pt-4">
                  <div className="mb-3 flex items-center justify-between text-sm font-semibold text-zinc-900">
                    <span>Order Total</span>
                    <span>{formatMoney(orderTotal)}</span>
                  </div>
                  <button className="inline-flex h-11 w-full items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white transition-colors hover:bg-blue-700">
                    Proceed to Checkout
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
