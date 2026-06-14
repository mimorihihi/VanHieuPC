"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import {
  ChevronRight,
  Heart,
  LayoutDashboard,
  Loader2,
  LogOut,
  MapPinned,
  Package,
  PencilLine,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  UserRound,
  Star,
} from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { SupportFeature } from "@/components/home/support-features"
import { SiteFooter } from "@/components/site-footer"

type AuthUser = {
  id: string
  name: string
  email: string
  role?: string
  phone?: string | null
  avatar_url?: string | null
  is_active?: boolean
  created_at?: string
}

type DashboardTab = "overview" | "profile" | "orders" | "wishlist" | "addresses"

type OrderSummary = {
  id: string
  order_number: string
  status: string
  payment_status: string
  payment_method: string
  checkout_option?: string | null
  subtotal: string
  shipping_fee: string
  discount: string
  total: string
  created_at: string
  item_count: number
}

type OrderDetail = OrderSummary & {
  note?: string | null
  shipping_address?: {
    full_name?: string
    phone?: string
    province?: string
    district?: string
    ward?: string
    address_line?: string
  } | null
  items: Array<{
    id: string
    product_id: string
    product_name: string
    variant_name?: string | null
    unit_price: string
    quantity: number
    subtotal: string
    product?: { name: string; thumbnail_url: string | null }
    review?: {
      id: string
      rating: number
      comment: string
      status: string
    } | null
  }>
}

type WishlistItem = {
  id: string
  product_id: string
  product_name: string
  product_slug: string
  thumbnail_url: string | null
  price: string
  sale_price: string | null
  category_name?: string | null
  brand_name?: string | null
}

type AddressItem = {
  id: string
  user_id: string
  full_name: string
  phone: string
  province: string
  district: string
  ward: string
  address_line: string
  is_default: boolean
}

type ProfileForm = {
  name: string
  phone: string
  avatar_url: string
}

type AddressForm = {
  full_name: string
  phone: string
  province: string
  district: string
  ward: string
  address_line: string
  is_default: boolean
}

const tabs: Array<{ id: DashboardTab; labelKey: string; icon: typeof LayoutDashboard }> = [
  { id: "overview", labelKey: "overview", icon: LayoutDashboard },
  { id: "profile", labelKey: "profile", icon: UserRound },
  { id: "orders", labelKey: "orders", icon: Package },
  { id: "wishlist", labelKey: "wishlist", icon: Heart },
  { id: "addresses", labelKey: "addresses", icon: MapPinned },
]

function formatMoney(value: string | number) {
  return Number(value ?? 0).toLocaleString("vi-VN")
}

function formatDate(value?: string) {
  if (!value) return "-"
  return new Date(value).toLocaleDateString("vi-VN")
}

function getStatusClass(status: string) {
  const normalized = status.toUpperCase()
  if (normalized === "COMPLETED") return "bg-emerald-50 text-emerald-700 border-emerald-200"
  if (normalized === "SHIPPED" || normalized === "PROCESSING") return "bg-blue-50 text-blue-700 border-blue-200"
  if (normalized === "CANCELLED") return "bg-red-50 text-red-700 border-red-200"
  return "bg-zinc-100 text-zinc-700 border-zinc-200"
}

function canReviewOrder(status: string, paymentStatus: string) {
  const normalizedStatus = status.toUpperCase()
  const normalizedPayment = paymentStatus.toUpperCase()

  if (["COMPLETED", "DELIVERED"].includes(normalizedStatus)) return true
  return normalizedStatus === "CONFIRMED" && normalizedPayment === "PAID"
}

async function loadAuthUser() {
  try {
    const response = await fetch("/api/me", { cache: "no-store" })
    if (!response.ok) {
      return null
    }

    const data = (await response.json()) as { user?: AuthUser }
    return data.user ?? null
  } catch {
    return null
  }
}

export function UserDashboardClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const commonT = useTranslations("Dashboard.common")
  const tabsT = useTranslations("Dashboard.tabs")
  const summaryT = useTranslations("Dashboard.summary")
  const profileT = useTranslations("Dashboard.profile")
  const ordersT = useTranslations("Dashboard.orders")
  const wishlistT = useTranslations("Dashboard.wishlist")
  const addressesT = useTranslations("Dashboard.addresses")
  const errorsT = useTranslations("Dashboard.errors")
  const [user, setUser] = useState<AuthUser | null>(null)
  const [ready, setReady] = useState(false)
  const [loading, setLoading] = useState(true)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingAddress, setSavingAddress] = useState(false)
  const [removingWishlistId, setRemovingWishlistId] = useState("")
  const [loadingOrderId, setLoadingOrderId] = useState("")
  const [savingReviewKey, setSavingReviewKey] = useState("")
  const [retryingPaymentId, setRetryingPaymentId] = useState("")
  const [reviewForms, setReviewForms] = useState<Record<string, { rating: number; comment: string }>>({})
  const initialTab = searchParams.get("tab")
  const [activeTab, setActiveTab] = useState<DashboardTab>(
    tabs.some((item) => item.id === initialTab) ? (initialTab as DashboardTab) : "overview"
  )
  const [error, setError] = useState("")

  const [profileForm, setProfileForm] = useState<ProfileForm>({
    name: "",
    phone: "",
    avatar_url: "",
  })
  const [orders, setOrders] = useState<OrderSummary[]>([])
  const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null)
  const [wishlist, setWishlist] = useState<WishlistItem[]>([])
  const [addresses, setAddresses] = useState<AddressItem[]>([])
  const [addressForm, setAddressForm] = useState<AddressForm>({
    full_name: "",
    phone: "",
    province: "",
    district: "",
    ward: "",
    address_line: "",
    is_default: false,
  })
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null)

  const summary = useMemo(
    () => ({
      orders: orders.length,
      wishlist: wishlist.length,
      addresses: addresses.length,
    }),
    [orders.length, wishlist.length, addresses.length]
  )

  const syncUser = useCallback((nextUser: AuthUser) => {
    setUser(nextUser)
  }, [])

  const loadDashboard = useCallback(async (userId: string) => {
    setLoading(true)
    setError("")

    const [profileRes, ordersRes, wishlistRes, addressesRes] = await Promise.all([
      fetch(`/api/me?user_id=${encodeURIComponent(userId)}`).catch(() => null),
      fetch(`/api/me/orders?user_id=${encodeURIComponent(userId)}`).catch(() => null),
      fetch(`/api/me/wishlist?user_id=${encodeURIComponent(userId)}`).catch(() => null),
      fetch(`/api/me/addresses?user_id=${encodeURIComponent(userId)}`).catch(() => null),
    ])

    try {
      if (profileRes?.ok) {
        const data = (await profileRes.json()) as { user?: AuthUser }
        if (data.user) {
          syncUser(data.user)
          setProfileForm({
            name: data.user.name ?? "",
            phone: data.user.phone ?? "",
            avatar_url: data.user.avatar_url ?? "",
          })
        }
      }

      if (ordersRes?.ok) {
        const data = (await ordersRes.json()) as { orders?: OrderSummary[] }
        setOrders(data.orders ?? [])
      }

      if (wishlistRes?.ok) {
        const data = (await wishlistRes.json()) as { items?: WishlistItem[] }
        setWishlist(data.items ?? [])
      }

      if (addressesRes?.ok) {
        const data = (await addressesRes.json()) as { addresses?: AddressItem[] }
        setAddresses(data.addresses ?? [])
      }
    } catch {
      setError(errorsT("loadDashboard"))
    } finally {
      setLoading(false)
    }
  }, [errorsT, syncUser])

  useEffect(() => {
    void (async () => {
      const auth = await loadAuthUser()
      if (!auth) {
        router.replace("/login")
        return
      }

      setUser(auth)
      setProfileForm({
        name: auth.name ?? "",
        phone: auth.phone ?? "",
        avatar_url: auth.avatar_url ?? "",
      })
      setReady(true)
      await loadDashboard(auth.id)
    })()
  }, [router, loadDashboard])
  useEffect(() => {
    const tab = searchParams.get("tab")
    if (tabs.some((item) => item.id === tab)) {
      setActiveTab(tab as DashboardTab)
    }
  }, [searchParams])



  const handleLogout = () => {
    void (async () => {
      try {
        await fetch("/api/auth/logout", { method: "POST" })
      } finally {
        router.push("/login")
      }
    })()
  }

  const handleProfileSave = async () => {
    if (!user) return
    setSavingProfile(true)
    setError("")

    try {
      const response = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profileForm.name,
          phone: profileForm.phone || null,
          avatar_url: profileForm.avatar_url || null,
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data.error ?? errorsT("saveProfile"))
        return
      }

      if (data.user) {
        syncUser({ ...user, ...data.user })
      }
    } finally {
      setSavingProfile(false)
    }
  }

  const handleOpenOrder = async (orderId: string) => {
    if (!user) return
    setLoadingOrderId(orderId)
    setError("")

    try {
      const response = await fetch(`/api/me/orders/${orderId}?user_id=${encodeURIComponent(user.id)}`)
      const data = await response.json()
      if (!response.ok) {
        setError(data.error ?? errorsT("loadOrder"))
        return
      }
      const order = data.order ?? null
      setSelectedOrder(order)
      if (order?.items) {
        const nextForms: Record<string, { rating: number; comment: string }> = {}
        order.items.forEach((item: OrderDetail["items"][number]) => {
          nextForms[item.product_id] = {
            rating: item.review?.rating || 5,
            comment: item.review?.comment || "",
          }
        })
        setReviewForms(nextForms)
      }
    } finally {
      setLoadingOrderId("")
    }
  }

  const handleRetryPayment = async (orderId: string) => {
    setRetryingPaymentId(orderId)
    setError("")

    try {
      const response = await fetch("/api/payment/retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: orderId }),
      })
      const data = await response.json()

      if (!response.ok) {
        setError(data.error ?? errorsT("retryPayment"))
        return
      }

      if (typeof data.paymentUrl === "string" && data.paymentUrl.trim()) {
        window.location.href = data.paymentUrl
      }
    } finally {
      setRetryingPaymentId("")
    }
  }

  const handleReviewFormChange = (
    productId: string,
    field: "rating" | "comment",
    value: number | string
  ) => {
    setReviewForms((prev) => ({
      ...prev,
      [productId]: {
        rating: field === "rating" ? Number(value) : prev[productId]?.rating || 5,
        comment: field === "comment" ? String(value) : prev[productId]?.comment || "",
      },
    }))
  }

  const handleSubmitOrderReview = async (productId: string) => {
    if (!selectedOrder) return
    const form = reviewForms[productId] ?? { rating: 5, comment: "" }
    const key = `${selectedOrder.id}-${productId}`
    setSavingReviewKey(key)
    setError("")

    try {
      const response = await fetch(`/api/me/orders/${selectedOrder.id}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: productId,
          rating: form.rating,
          comment: form.comment,
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data.error ?? errorsT("saveReview"))
        return
      }
      await handleOpenOrder(selectedOrder.id)
    } finally {
      setSavingReviewKey("")
    }
  }

  const handleWishlistRemove = async (productId: string) => {
    if (!user) return
    setRemovingWishlistId(productId)
    try {
      const response = await fetch("/api/me/wishlist", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: productId }),
      })
      if (response.ok) {
        setWishlist((prev) => prev.filter((item) => item.product_id !== productId))
      }
    } finally {
      setRemovingWishlistId("")
    }
  }

  const resetAddressForm = () => {
    setAddressForm({
      full_name: user?.name ?? "",
      phone: user?.phone ?? "",
      province: "",
      district: "",
      ward: "",
      address_line: "",
      is_default: false,
    })
    setEditingAddressId(null)
  }

  const handleEditAddress = (address: AddressItem) => {
    setEditingAddressId(address.id)
    setAddressForm({
      full_name: address.full_name,
      phone: address.phone,
      province: address.province,
      district: address.district,
      ward: address.ward,
      address_line: address.address_line,
      is_default: address.is_default,
    })
    setActiveTab("addresses")
  }

  const handleAddressSave = async () => {
    if (!user) return
    setSavingAddress(true)
    setError("")

    const payload = {
      user_id: user.id,
      full_name: addressForm.full_name,
      phone: addressForm.phone,
      province: addressForm.province,
      district: addressForm.district,
      ward: addressForm.ward,
      address_line: addressForm.address_line,
      is_default: addressForm.is_default,
    }

    try {
      const response = await fetch(
        editingAddressId ? `/api/me/addresses/${editingAddressId}` : "/api/me/addresses",
        {
          method: editingAddressId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      )
      const data = await response.json()
      if (!response.ok) {
        setError(data.error ?? errorsT("saveAddress"))
        return
      }

      const refreshed = await fetch(`/api/me/addresses?user_id=${encodeURIComponent(user.id)}`)
      const refreshedData = await refreshed.json()
      if (refreshed.ok) {
        setAddresses(refreshedData.addresses ?? [])
      }
      resetAddressForm()
    } finally {
      setSavingAddress(false)
    }
  }

  const handleDeleteAddress = async (addressId: string) => {
    if (!user) return
    const response = await fetch(`/api/me/addresses/${addressId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: user.id }),
    })
    if (response.ok) {
      setAddresses((prev) => prev.filter((item) => item.id !== addressId))
    }
  }

  if (!ready || !user) {
    return null
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <SiteHeader />

      <main className="flex-1 bg-zinc-50">
        <section className="container mx-auto px-4 py-10">
          <div className="mb-4 flex items-center gap-2 text-[11px] text-zinc-500">
            <Link href="/" className="hover:text-blue-600">
              {commonT("home")}
            </Link>
            <span>&bull;</span>
            <span className="text-zinc-700">{commonT("title")}</span>
          </div>

          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-4xl font-semibold tracking-tight text-zinc-900">{commonT("title")}</h1>
              <p className="mt-2 text-sm text-zinc-500">{commonT("subtitle")}</p>
            </div>
            <button
              onClick={handleLogout}
              className="inline-flex h-10 items-center justify-center rounded-full border border-zinc-300 px-5 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-100"
            >
              <LogOut className="mr-2 h-4 w-4" />
              {commonT("signOut")}
            </button>
          </div>

          {error ? (
            <div className="mb-5 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[260px_minmax(0,1fr)]">
            <aside className="space-y-1">
              <div className="rounded bg-zinc-100 p-2">
                {tabs.map((item) => {
                  const Icon = item.icon
                  const active = activeTab === item.id

                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`flex w-full items-center gap-3 border-l-2 px-3 py-2 text-left text-xs transition-colors ${
                        active
                          ? "border-blue-600 bg-white font-semibold text-zinc-900"
                          : "border-transparent text-zinc-600 hover:bg-white hover:text-zinc-900"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {tabsT(item.labelKey)}
                    </button>
                  )
                })}
              </div>

              <div className="rounded bg-zinc-100 p-4 text-center">
                <h3 className="text-sm font-semibold text-zinc-900">{tabsT("wishlist")}</h3>
                <p className="mt-3 text-xs text-zinc-500">{summaryT("savedItems", { count: summary.wishlist })}</p>
              </div>

              <div className="rounded bg-zinc-100 p-4 text-center">
                <h3 className="text-sm font-semibold text-zinc-900">{tabsT("orders")}</h3>
                <p className="mt-3 text-xs text-zinc-500">{summaryT("ordersPlaced", { count: summary.orders })}</p>
              </div>
            </aside>

            <section className="space-y-6">
              <div className="rounded border border-zinc-200 bg-white p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold text-zinc-900">
                      {tabsT(tabs.find((item) => item.id === activeTab)?.labelKey ?? "overview")}
                    </h2>
                    <p className="mt-1 text-sm text-zinc-500">{user.name} · {user.email}</p>
                  </div>
                  <button
                    onClick={() => loadDashboard(user.id)}
                    className="inline-flex h-9 items-center rounded-full border border-zinc-300 px-4 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-100"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    {commonT("refresh")}
                  </button>
                </div>

                {loading ? (
                  <div className="mt-6 flex items-center gap-2 text-sm text-zinc-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {commonT("loading")}
                  </div>
                ) : null}

                {activeTab === "overview" && !loading ? (
                  <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="rounded border border-zinc-200 bg-zinc-50 p-4">
                      <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{summaryT("account")}</div>
                      <div className="mt-2 text-lg font-semibold text-zinc-900">{user.name}</div>
                      <div className="mt-1 text-sm text-zinc-500">{user.phone || summaryT("noPhone")}</div>
                    </div>
                    <div className="rounded border border-zinc-200 bg-zinc-50 p-4">
                      <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{tabsT("orders")}</div>
                      <div className="mt-2 text-lg font-semibold text-zinc-900">{summary.orders}</div>
                      <div className="mt-1 text-sm text-zinc-500">{summaryT("recentPurchaseHistory")}</div>
                    </div>
                    <div className="rounded border border-zinc-200 bg-zinc-50 p-4">
                      <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{tabsT("addresses")}</div>
                      <div className="mt-2 text-lg font-semibold text-zinc-900">{summary.addresses}</div>
                      <div className="mt-1 text-sm text-zinc-500">{summaryT("savedDeliveryLocations")}</div>
                    </div>
                  </div>
                ) : null}

                {activeTab === "profile" ? (
                  <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                    <label className="space-y-1.5">
                      <span className="text-xs font-semibold text-zinc-700">{profileT("name")}</span>
                      <input
                        value={profileForm.name}
                        onChange={(event) => setProfileForm((prev) => ({ ...prev, name: event.target.value }))}
                        className="h-11 w-full rounded border border-zinc-300 px-3 text-sm text-zinc-900 outline-none focus:border-blue-600"
                      />
                    </label>
                    <label className="space-y-1.5">
                      <span className="text-xs font-semibold text-zinc-700">{profileT("phone")}</span>
                      <input
                        value={profileForm.phone}
                        onChange={(event) => setProfileForm((prev) => ({ ...prev, phone: event.target.value }))}
                        className="h-11 w-full rounded border border-zinc-300 px-3 text-sm text-zinc-900 outline-none focus:border-blue-600"
                      />
                    </label>
                    <label className="space-y-1.5 md:col-span-2">
                      <span className="text-xs font-semibold text-zinc-700">{profileT("avatarUrl")}</span>
                      <input
                        value={profileForm.avatar_url}
                        onChange={(event) => setProfileForm((prev) => ({ ...prev, avatar_url: event.target.value }))}
                        className="h-11 w-full rounded border border-zinc-300 px-3 text-sm text-zinc-900 outline-none focus:border-blue-600"
                      />
                    </label>
                    <div className="md:col-span-2 flex justify-end">
                      <button
                        onClick={handleProfileSave}
                        disabled={savingProfile}
                        className="inline-flex h-10 items-center rounded-full bg-blue-600 px-5 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {savingProfile ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        {profileT("saveProfile")}
                      </button>
                    </div>
                  </div>
                ) : null}

                {activeTab === "orders" ? (
                  <div className="mt-6 space-y-4">
                    {orders.length === 0 ? (
                      <p className="text-sm text-zinc-500">{ordersT("empty")}</p>
                    ) : (
                      orders.map((order) => (
                        <div key={order.id} className="rounded border border-zinc-200 bg-zinc-50 p-4">
                          <div className="flex flex-wrap items-start justify-between gap-4">
                            <div>
                              <div className="text-sm font-semibold text-zinc-900">{order.order_number}</div>
                              <div className="mt-1 text-xs text-zinc-500">
                                {formatDate(order.created_at)} · {order.item_count} {commonT("items")}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${getStatusClass(order.status)}`}>
                                {order.status}
                              </span>
                              <span className="text-sm font-semibold text-zinc-900">{formatMoney(order.total)} đ</span>
                            </div>
                          </div>
                           <div className="mt-4 flex flex-col gap-3 text-xs text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
                             <span>{commonT("payment")}: {order.payment_status}</span>
                             <div className="flex flex-wrap items-center gap-3">
                               {order.payment_method === "VNPAY" && order.payment_status !== "PAID" ? (
                                 <button
                                   type="button"
                                   onClick={() => void handleRetryPayment(order.id)}
                                   disabled={retryingPaymentId === order.id}
                                   className="inline-flex items-center gap-1 font-semibold text-emerald-700 hover:underline disabled:cursor-not-allowed disabled:opacity-60"
                                 >
                                   {retryingPaymentId === order.id ? ordersT("openingPayment") : ordersT("retryPayment")}
                                 </button>
                               ) : null}
                               <button
                                 onClick={() => void handleOpenOrder(order.id)}
                                 className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:underline"
                               >
                                 {loadingOrderId === order.id ? commonT("loadingShort") : ordersT("viewDetails")}
                                 <ChevronRight className="h-3 w-3" />
                               </button>
                             </div>
                           </div>
                        </div>
                      ))
                    )}

                    {selectedOrder ? (
                      <div className="rounded border border-zinc-200 bg-white p-5">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <h3 className="text-sm font-semibold text-zinc-900">{ordersT("detailsTitle")}</h3>
                          <span className="text-xs text-zinc-500">{selectedOrder.order_number}</span>
                        </div>
                          <div className="mt-4 space-y-4">
                            {selectedOrder.items.map((item) => {
                              const reviewEnabled = canReviewOrder(selectedOrder.status, selectedOrder.payment_status)
                              const form = reviewForms[item.product_id] ?? {
                                rating: item.review?.rating || 5,
                                comment: item.review?.comment || "",
                              }
                              const savingKey = `${selectedOrder.id}-${item.product_id}`

                              return (
                                <div key={item.id} className="border-b border-zinc-100 pb-4 last:border-b-0 last:pb-0">
                                  <div className="flex gap-3">
                                    <img
                                      src={item.product?.thumbnail_url ?? "/images/placeholder.png"}
                                      alt={item.product?.name ?? item.product_name}
                                      className="h-14 w-14 rounded border border-zinc-200 object-cover"
                                    />
                                    <div className="min-w-0 flex-1">
                                      <div className="text-sm font-medium text-zinc-900">{item.product_name}</div>
                                      <div className="mt-1 text-xs text-zinc-500">
                                        {ordersT("qty")} {item.quantity} · {formatMoney(item.unit_price)} đ
                                      </div>
                                      {item.review ? (
                                        <div className="mt-1 text-[11px] font-semibold text-emerald-700">
                                          {ordersT("reviewed")} · {item.review.status}
                                        </div>
                                      ) : null}
                                    </div>
                                  </div>

                                  {reviewEnabled ? (
                                    <div className="mt-3 rounded border border-zinc-200 bg-zinc-50 p-3">
                                      <div className="mb-2 flex items-center justify-between gap-3">
                                        <span className="text-xs font-semibold text-zinc-700">
                                          {item.review ? ordersT("updateReview") : ordersT("reviewProduct")}
                                        </span>
                                        <div className="flex items-center gap-1">
                                          {[1, 2, 3, 4, 5].map((value) => (
                                            <button
                                              key={value}
                                              type="button"
                                              onClick={() => handleReviewFormChange(item.product_id, "rating", value)}
                                              className="rounded-full p-0.5 hover:bg-white"
                                              aria-label={ordersT("chooseStars", { count: value })}
                                            >
                                              <Star
                                                className={`h-4 w-4 ${
                                                  value <= form.rating ? "fill-yellow-400 text-yellow-400" : "fill-zinc-300 text-zinc-300"
                                                }`}
                                              />
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                      <textarea
                                        value={form.comment}
                                        onChange={(event) => handleReviewFormChange(item.product_id, "comment", event.target.value)}
                                        rows={3}
                                        placeholder={ordersT("reviewPlaceholder")}
                                        className="w-full resize-none rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-600"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => void handleSubmitOrderReview(item.product_id)}
                                        disabled={savingReviewKey === savingKey}
                                        className="mt-2 inline-flex h-9 items-center rounded-full bg-blue-600 px-4 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                                      >
                                        {savingReviewKey === savingKey ? ordersT("saving") : item.review ? ordersT("updateReview") : ordersT("submitReview")}
                                      </button>
                                    </div>
                                  ) : (
                                    <p className="mt-2 text-xs text-zinc-500">
                                      {ordersT("canReviewAfterComplete")}
                                    </p>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {activeTab === "wishlist" ? (
                  <div className="mt-6 space-y-4">
                    {wishlist.length === 0 ? (
                      <p className="text-sm text-zinc-500">{wishlistT("empty")}</p>
                    ) : (
                      wishlist.map((item) => (
                        <div key={item.id} className="flex items-center gap-4 rounded border border-zinc-200 bg-zinc-50 p-4">
                          <Link href={`/products/${item.product_slug}`} className="shrink-0">
                            <img
                              src={item.thumbnail_url ?? "/images/placeholder.png"}
                              alt={item.product_name}
                              className="h-16 w-16 rounded border border-zinc-200 object-cover"
                            />
                          </Link>
                          <div className="min-w-0 flex-1">
                            <Link href={`/products/${item.product_slug}`} className="text-sm font-semibold text-zinc-900 hover:text-blue-600">
                              {item.product_name}
                            </Link>
                            <div className="mt-1 text-xs text-zinc-500">
                              {item.brand_name || commonT("brandFallback")} · {item.category_name || commonT("categoryFallback")}
                            </div>
                            <div className="mt-1 text-sm font-semibold text-zinc-900">
                              {formatMoney(item.sale_price ?? item.price)} đ
                            </div>
                          </div>
                          <button
                            onClick={() => void handleWishlistRemove(item.product_id)}
                            disabled={removingWishlistId === item.product_id}
                            className="inline-flex h-9 items-center rounded-full border border-zinc-300 px-4 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            {commonT("remove")}
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                ) : null}

                {activeTab === "addresses" ? (
                  <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
                    <div className="space-y-4">
                      {addresses.length === 0 ? (
                        <p className="text-sm text-zinc-500">{addressesT("empty")}</p>
                      ) : (
                        addresses.map((address) => (
                          <div key={address.id} className="rounded border border-zinc-200 bg-zinc-50 p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="flex items-center gap-2">
                                  <h3 className="text-sm font-semibold text-zinc-900">{address.full_name}</h3>
                                  {address.is_default ? (
                                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                                      {commonT("default")}
                                    </span>
                                  ) : null}
                                </div>
                                <p className="mt-1 text-xs text-zinc-500">{address.phone}</p>
                                <p className="mt-2 text-sm text-zinc-700">
                                  {address.address_line}, {address.ward}, {address.district}, {address.province}
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleEditAddress(address)}
                                  className="inline-flex h-9 items-center rounded-full border border-zinc-300 px-4 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
                                >
                                  <PencilLine className="mr-2 h-4 w-4" />
                                  {commonT("edit")}
                                </button>
                                <button
                                  onClick={() => void handleDeleteAddress(address.id)}
                                  className="inline-flex h-9 items-center rounded-full border border-zinc-300 px-4 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  {commonT("delete")}
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="rounded border border-zinc-200 bg-white p-5">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-sm font-semibold text-zinc-900">
                          {editingAddressId ? addressesT("editTitle") : addressesT("addTitle")}
                        </h3>
                        {editingAddressId ? (
                          <button
                            onClick={resetAddressForm}
                            className="text-xs font-semibold text-blue-600 hover:underline"
                          >
                            {commonT("cancel")}
                          </button>
                        ) : null}
                      </div>

                      <div className="mt-4 space-y-3">
                        <input
                          value={addressForm.full_name}
                          onChange={(event) => setAddressForm((prev) => ({ ...prev, full_name: event.target.value }))}
                          placeholder={addressesT("fullName")}
                          className="h-11 w-full rounded border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                        />
                        <input
                          value={addressForm.phone}
                          onChange={(event) => setAddressForm((prev) => ({ ...prev, phone: event.target.value }))}
                          placeholder={addressesT("phone")}
                          className="h-11 w-full rounded border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                        />
                        <input
                          value={addressForm.province}
                          onChange={(event) => setAddressForm((prev) => ({ ...prev, province: event.target.value }))}
                          placeholder={addressesT("province")}
                          className="h-11 w-full rounded border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                        />
                        <input
                          value={addressForm.district}
                          onChange={(event) => setAddressForm((prev) => ({ ...prev, district: event.target.value }))}
                          placeholder={addressesT("district")}
                          className="h-11 w-full rounded border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                        />
                        <input
                          value={addressForm.ward}
                          onChange={(event) => setAddressForm((prev) => ({ ...prev, ward: event.target.value }))}
                          placeholder={addressesT("ward")}
                          className="h-11 w-full rounded border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                        />
                        <input
                          value={addressForm.address_line}
                          onChange={(event) => setAddressForm((prev) => ({ ...prev, address_line: event.target.value }))}
                          placeholder={addressesT("addressLine")}
                          className="h-11 w-full rounded border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                        />
                        <label className="flex items-center gap-2 text-xs font-semibold text-zinc-700">
                          <input
                            type="checkbox"
                            checked={addressForm.is_default}
                            onChange={(event) => setAddressForm((prev) => ({ ...prev, is_default: event.target.checked }))}
                            className="h-4 w-4 accent-blue-600"
                          />
                          {addressesT("setDefault")}
                        </label>
                        <button
                          onClick={handleAddressSave}
                          disabled={savingAddress}
                          className="inline-flex h-10 w-full items-center justify-center rounded-full bg-blue-600 px-5 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {savingAddress ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                          {editingAddressId ? addressesT("update") : addressesT("save")}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              {activeTab === "overview" ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="rounded border border-zinc-200 bg-white p-5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-zinc-900">{ordersT("recentOrders")}</h3>
                      <button onClick={() => setActiveTab("orders")} className="text-xs font-semibold text-blue-600 hover:underline">
                        {commonT("viewAll")}
                      </button>
                    </div>
                    <div className="mt-4 space-y-3">
                      {orders.slice(0, 3).map((order) => (
                        <div key={order.id} className="flex items-center justify-between gap-3 border-b border-zinc-100 pb-3 last:border-b-0 last:pb-0">
                          <div>
                            <div className="text-sm font-medium text-zinc-900">{order.order_number}</div>
                            <div className="mt-1 text-xs text-zinc-500">{formatDate(order.created_at)}</div>
                          </div>
                          <div className="text-sm font-semibold text-zinc-900">{formatMoney(order.total)} đ</div>
                        </div>
                      ))}
                      {orders.length === 0 ? <p className="text-sm text-zinc-500">{ordersT("noRecentOrders")}</p> : null}
                    </div>
                  </div>

                  <div className="rounded border border-zinc-200 bg-white p-5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-zinc-900">{wishlistT("preview")}</h3>
                      <button onClick={() => setActiveTab("wishlist")} className="text-xs font-semibold text-blue-600 hover:underline">
                        {commonT("viewAll")}
                      </button>
                    </div>
                    <div className="mt-4 space-y-3">
                      {wishlist.slice(0, 3).map((item) => (
                        <div key={item.id} className="flex items-center justify-between gap-3 border-b border-zinc-100 pb-3 last:border-b-0 last:pb-0">
                          <div className="min-w-0">
                            <div className="line-clamp-1 text-sm font-medium text-zinc-900">{item.product_name}</div>
                            <div className="mt-1 text-xs text-zinc-500">{item.brand_name || commonT("brandFallback")}</div>
                          </div>
                          <div className="text-sm font-semibold text-zinc-900">{formatMoney(item.sale_price ?? item.price)} đ</div>
                        </div>
                      ))}
                      {wishlist.length === 0 ? <p className="text-sm text-zinc-500">{wishlistT("noItems")}</p> : null}
                    </div>
                  </div>
                </div>
              ) : null}
            </section>
          </div>
        </section>
      </main>

      <SupportFeature />
      <SiteFooter />
    </div>
  )
}
