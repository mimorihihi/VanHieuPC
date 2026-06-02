"use client"

import { useCallback, useEffect, useState } from "react"
import { Eye } from "lucide-react"
import { Modal } from "@/components/ui/modal"
import { AdminBtn } from "@/components/ui/button"
import { FormSelect } from "@/components/ui/form-fields"

interface Order {
  id: string
  order_number: string
  status: string
  payment_status: string
  payment_method: string
  checkout_option: string | null
  total: string
  created_at: string
  user: { name: string; email: string } | null
  items: { product: { name: string; thumbnail_url: string | null }; quantity: number; unit_price: string }[]
}

function formatPaymentMethod(value: string) {
  if (value === "PAY_AT_STORE") return "Thanh toán tại cửa hàng"
  if (value === "VNPAY") return "VNPAY"
  return value
}

function formatCheckoutOption(value: string | null) {
  if (value === "pickup_store") return "Nhận tại cửa hàng · Thanh toán tại quầy"
  if (value === "pickup_online") return "Nhận tại cửa hàng · Thanh toán online"
  if (value === "delivery_online") return "Giao tận nơi · Thanh toán online"
  return "-"
}


const STATUS_OPTS = [
  { value: "PENDING", label: "Pending" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "SHIPPING", label: "Shipping" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "CANCELLED", label: "Cancelled" },
]

const PAYMENT_OPTS = [
  { value: "PENDING", label: "Pending" },
  { value: "PAID", label: "Paid" },
  { value: "FAILED", label: "Failed" },
]

const STATUS_COLOR: Record<string, string> = {
  PENDING: "bg-zinc-100 text-zinc-700",
  CONFIRMED: "bg-zinc-200 text-zinc-700",
  SHIPPING: "bg-zinc-100 text-zinc-600",
  DELIVERED: "bg-zinc-200 text-zinc-800",
  CANCELLED: "bg-zinc-100 text-zinc-500",
}

const PAY_COLOR: Record<string, string> = {
  PENDING: "bg-zinc-100 text-zinc-700",
  PAID: "bg-zinc-200 text-zinc-700",
  FAILED: "bg-zinc-100 text-zinc-500",
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState("")
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Order | null>(null)
  const [newStatus, setNewStatus] = useState("")
  const [newPayStatus, setNewPayStatus] = useState("")
  const [saving, setSaving] = useState(false)
  const limit = 15

  const fetchOrders = useCallback(() => {
    setLoading(true)
    fetch(`/api/admin/orders?page=${page}&limit=${limit}&status=${statusFilter}`)
      .then((response) => response.json())
      .then((data) => {
        setOrders(data.orders ?? [])
        setTotal(data.total ?? 0)
      })
      .finally(() => setLoading(false))
  }, [page, statusFilter])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchOrders()
    }, 0)

    return () => clearTimeout(timer)
  }, [fetchOrders])

  const openDetail = (order: Order) => {
    setSelected(order)
    setNewStatus(order.status)
    setNewPayStatus(order.payment_status)
  }

  const updateOrder = async () => {
    if (!selected) return
    setSaving(true)
    await fetch(`/api/admin/orders/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus, payment_status: newPayStatus }),
    })
    setSaving(false)
    setSelected(null)
    fetchOrders()
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-zinc-900">Orders</h2>
        <p className="mt-1 text-sm text-zinc-500">{total} total orders</p>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {["", "PENDING", "CONFIRMED", "SHIPPING", "DELIVERED", "CANCELLED"].map((status) => (
            <button
              key={status}
              id={`admin-orders-filter-${status || "all"}`}
              type="button"
              className={statusFilter === status
                ? "rounded-full border border-zinc-300 bg-zinc-200 px-3.5 py-1.5 text-xs font-medium text-zinc-800 transition-colors"
                : "rounded-full border border-zinc-200 bg-zinc-50 px-3.5 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900"}
              onClick={() => {
                setStatusFilter(status)
                setPage(1)
              }}
            >
              {status || "All"}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-zinc-200 text-sm">
            <thead className="bg-zinc-100">
              <tr>
                {["Order #", "Customer", "Items", "Total", "Payment", "Status", "Date", "Actions"].map((head) => (
                  <th key={head} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-zinc-500">
                    Loading...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-zinc-500">
                    No orders found
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="transition-colors hover:bg-zinc-50">
                    <td className="px-4 py-4 font-mono text-xs text-zinc-600">{order.order_number}</td>
                    <td className="px-4 py-4">
                      <p className="font-medium text-zinc-900">{order.user?.name ?? "Guest"}</p>
                      <p className="mt-1 text-xs text-zinc-500">{order.user?.email ?? ""}</p>
                    </td>
                    <td className="px-4 py-4 text-zinc-600">{order.items?.length ?? 0} items</td>
                    <td className="px-4 py-4 font-semibold text-zinc-900">₫{Number(order.total || 0).toLocaleString()}</td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${PAY_COLOR[order.payment_status] ?? "bg-zinc-100 text-zinc-600"}`}>
                        {order.payment_status}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLOR[order.status] ?? "bg-zinc-100 text-zinc-600"}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-xs text-zinc-500">
                      {order.created_at ? new Date(order.created_at).toLocaleDateString("vi-VN") : "-"}
                    </td>
                    <td className="px-4 py-4">
                      <button
                        id={`admin-order-view-${order.id}`}
                        type="button"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-100 text-zinc-700 transition-colors hover:bg-zinc-200"
                        onClick={() => openDetail(order)}
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center justify-center gap-4">
          <AdminBtn variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage((prev) => prev - 1)}>
            Previous
          </AdminBtn>
          <span className="text-sm text-zinc-500">Page {page} of {totalPages}</span>
          <AdminBtn variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage((prev) => prev + 1)}>
            Next
          </AdminBtn>
        </div>
      ) : null}

      <Modal open={!!selected} onClose={() => setSelected(null)} title={`Order ${selected?.order_number ?? ""}`} size="lg">
        {selected ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-3 rounded-2xl bg-zinc-50 p-4 md:grid-cols-2">
              <div className="space-y-1">
                <span className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">Customer</span>
                <p className="text-sm font-medium text-zinc-900">{selected.user?.name ?? "Guest"}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">Email</span>
                <p className="text-sm font-medium text-zinc-900">{selected.user?.email ?? "-"}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">Checkout Option</span>
                <p className="text-sm font-medium text-zinc-900">{formatCheckoutOption(selected.checkout_option)}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">Payment Method</span>
                <p className="text-sm font-medium text-zinc-900">{formatPaymentMethod(selected.payment_method)}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">Total</span>
                <p className="text-base font-semibold text-zinc-900">₫{Number(selected.total || 0).toLocaleString()}</p>
              </div>
            </div>

            <div>
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Items</h4>
              <div className="flex flex-col gap-2">
                {selected.items?.map((item, index) => (
                  <div key={index} className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-3">
                    {item.product?.thumbnail_url ? (
                      <img src={item.product.thumbnail_url} alt={item.product?.name || "Item"} className="h-10 w-10 rounded-lg border border-zinc-200 object-cover" />
                    ) : (
                      <div className="h-10 w-10 shrink-0 rounded-lg border border-zinc-200 bg-white" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-zinc-900">{item.product?.name}</p>
                      <p className="mt-1 text-xs text-zinc-500">
                        x {item.quantity || 1} - ₫{Number(item.unit_price || 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-zinc-50 p-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormSelect label="Order Status" options={STATUS_OPTS} value={newStatus} onChange={(event) => setNewStatus(event.target.value)} />
                <FormSelect label="Payment Status" options={PAYMENT_OPTS} value={newPayStatus} onChange={(event) => setNewPayStatus(event.target.value)} />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <AdminBtn variant="secondary" onClick={() => setSelected(null)}>
                Close
              </AdminBtn>
              <AdminBtn loading={saving} onClick={updateOrder}>
                Update Order
              </AdminBtn>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
