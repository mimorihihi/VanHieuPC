"use client"

import { useEffect, useState, useCallback } from "react"
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
  total: string
  created_at: string
  user: { name: string; email: string } | null
  items: { product: { name: string; thumbnail_url: string | null }; quantity: number; unit_price: string }[]
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
  PENDING: "bg-amber-400/15 text-amber-300",
  CONFIRMED: "bg-blue-400/15 text-blue-300",
  SHIPPING: "bg-violet-400/15 text-violet-300",
  DELIVERED: "bg-emerald-400/15 text-emerald-300",
  CANCELLED: "bg-red-400/15 text-red-300",
}

const PAY_COLOR: Record<string, string> = {
  PENDING: "bg-amber-400/15 text-amber-300",
  PAID: "bg-emerald-400/15 text-emerald-300",
  FAILED: "bg-red-400/15 text-red-300",
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

  const fetch_ = useCallback(() => {
    setLoading(true)
    fetch(`/api/admin/orders?page=${page}&limit=${limit}&status=${statusFilter}`)
      .then((r) => r.json())
      .then((d) => {
        setOrders(d.orders ?? [])
        setTotal(d.total ?? 0)
      })
      .finally(() => setLoading(false))
  }, [page, statusFilter])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetch_()
    }, 0)
    return () => clearTimeout(timer)
  }, [fetch_])

  const openDetail = (o: Order) => {
    setSelected(o)
    setNewStatus(o.status)
    setNewPayStatus(o.payment_status)
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
    fetch_()
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold text-slate-100">Orders</h1>
          <p className="mt-0.5 text-xs text-zinc-500">{total} total orders</p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {["", "PENDING", "CONFIRMED", "SHIPPING", "DELIVERED", "CANCELLED"].map((s) => (
          <button
            key={s}
            className={`rounded-full border px-3.5 py-1.5 text-xs transition-colors ${statusFilter === s ? "border-indigo-400/40 bg-indigo-500/15 text-indigo-300" : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-slate-200"}`}
            onClick={() => {
              setStatusFilter(s)
              setPage(1)
            }}
          >
            {s || "All"}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-800">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              {[
                "Order #",
                "Customer",
                "Items",
                "Total",
                "Payment",
                "Status",
                "Date",
                "Actions",
              ].map((head) => (
                <th
                  key={head}
                  className="border-b border-zinc-800 bg-zinc-950 px-4 py-3 text-left text-xs font-medium tracking-wider text-zinc-500 uppercase"
                >
                  {head}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-zinc-500">
                  Loading...
                </td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-zinc-500">
                  No orders found
                </td>
              </tr>
            ) : (
              orders.map((o, i) => (
                <tr key={o.id || i} className="border-b border-zinc-800 last:border-b-0 hover:bg-white/[0.02]">
                  <td className="px-4 py-3 font-mono text-xs text-slate-300">{o.order_number}</td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-100">{o.user?.name ?? "Guest"}</div>
                    <div className="mt-0.5 text-xs text-zinc-500">{o.user?.email ?? ""}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-200">{o.items?.length ?? 0} items</td>
                  <td className="px-4 py-3 font-semibold text-slate-100">₫{Number(o.total || 0).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${PAY_COLOR[o.payment_status] ?? "bg-zinc-800 text-zinc-400"}`}>
                      {o.payment_status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[o.status] ?? "bg-zinc-800 text-zinc-400"}`}>
                      {o.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-500">
                    {o.created_at ? new Date(o.created_at).toLocaleDateString("vi-VN") : "-"}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      className="rounded-md p-1.5 text-indigo-400 transition-colors hover:bg-indigo-500/15"
                      onClick={() => openDetail(o)}
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

      {totalPages > 1 && (
        <div className="mt-5 flex items-center justify-center gap-4">
          <AdminBtn variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </AdminBtn>
          <span className="text-sm text-zinc-500">Page {page} of {totalPages}</span>
          <AdminBtn variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Next
          </AdminBtn>
        </div>
      )}

      <Modal open={!!selected} onClose={() => setSelected(null)} title={`Order ${selected?.order_number ?? ""}`} size="lg">
        {selected && (
          <div>
            <div className="mb-5 grid grid-cols-1 gap-3 rounded-lg bg-zinc-950 p-4 md:grid-cols-2">
              <div className="flex flex-col gap-1">
                <span className="text-[11px] tracking-wider text-zinc-500 uppercase">Customer</span>
                <span className="text-sm font-medium text-slate-200">{selected.user?.name ?? "Guest"}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[11px] tracking-wider text-zinc-500 uppercase">Email</span>
                <span className="text-sm font-medium text-slate-200">{selected.user?.email ?? "-"}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[11px] tracking-wider text-zinc-500 uppercase">Payment Method</span>
                <span className="text-sm font-medium text-slate-200">{selected.payment_method}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[11px] tracking-wider text-zinc-500 uppercase">Total</span>
                <span className="text-base font-bold text-indigo-300">₫{Number(selected.total || 0).toLocaleString()}</span>
              </div>
            </div>

            <h4 className="mb-3 text-xs font-semibold tracking-wider text-zinc-500 uppercase">Items</h4>
            <div className="mb-5 flex flex-col gap-2">
              {selected.items?.map((item, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg bg-zinc-950 px-3 py-2.5">
                  {item.product?.thumbnail_url ? (
                    <img src={item.product.thumbnail_url} alt={item.product?.name || "Item"} className="h-10 w-10 rounded-md object-cover" />
                  ) : (
                    <div className="h-10 w-10 shrink-0 rounded-md bg-zinc-800" />
                  )}
                  <div>
                    <div className="text-sm font-medium text-slate-100">{item.product?.name}</div>
                    <div className="mt-0.5 text-xs text-zinc-500">x {item.quantity || 1} - ₫{Number(item.unit_price || 0).toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-lg bg-zinc-950 p-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormSelect label="Order Status" options={STATUS_OPTS} value={newStatus} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNewStatus(e.target.value)} />
                <FormSelect label="Payment Status" options={PAYMENT_OPTS} value={newPayStatus} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNewPayStatus(e.target.value)} />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <AdminBtn variant="secondary" onClick={() => setSelected(null)}>
                Close
              </AdminBtn>
              <AdminBtn loading={saving} onClick={updateOrder}>
                Update Order
              </AdminBtn>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
