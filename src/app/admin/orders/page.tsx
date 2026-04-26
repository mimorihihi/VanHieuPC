"use client"

import { useEffect, useState, useCallback } from "react"
import { Search, Eye, ChevronDown } from "lucide-react"
import { Modal } from "@/components/ui/modal"
import { AdminBtn } from "@/components/ui/button"
import { FormSelect } from "@/components/ui/form-fields"

interface Order {
  id: string; order_number: string; status: string; payment_status: string
  payment_method: string; total: string; created_at: string
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
  PENDING: "badge-yellow", CONFIRMED: "badge-blue",
  SHIPPING: "badge-purple", DELIVERED: "badge-green", CANCELLED: "badge-red",
}
const PAY_COLOR: Record<string, string> = {
  PENDING: "badge-yellow", PAID: "badge-green", FAILED: "badge-red",
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
      .then(r => r.json())
      .then(d => { setOrders(d.orders ?? []); setTotal(d.total ?? 0) })
      .finally(() => setLoading(false))
  }, [page, statusFilter])

  useEffect(() => { fetch_() }, [fetch_])

  const openDetail = (o: Order) => {
    setSelected(o)
    setNewStatus(o.status)
    setNewPayStatus(o.payment_status)
  }

  const updateOrder = async () => {
    if (!selected) return
    setSaving(true)
    await fetch(`/api/admin/orders/${selected?.id}`, {
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
      <div className="page-header">
        <div>
          <h1 className="page-title">Orders</h1>
          <p className="page-sub">{total} total orders</p>
        </div>
      </div>

      <div className="table-toolbar">
        <div className="filter-chips">
          {["", "PENDING", "CONFIRMED", "SHIPPING", "DELIVERED", "CANCELLED"].map(s => (
            <button
              key={s}
              className={`filter-chip ${statusFilter === s ? "active" : ""}`}
              onClick={() => { setStatusFilter(s); setPage(1) }}
            >
              {s || "All"}
            </button>
          ))}
        </div>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Order #</th>
              <th>Customer</th>
              <th>Items</th>
              <th>Total</th>
              <th>Payment</th>
              <th>Status</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={8} className="table-empty">Loading…</td></tr>
              : orders.length === 0 ? <tr><td colSpan={8} className="table-empty">No orders found</td></tr>
              : orders.map((o, i) => (
                <tr key={o?.id || i}>
                  <td className="cell-mono">{o?.order_number}</td>
                  <td>
                    <div className="cell-bold">{o?.user?.name ?? "Guest"}</div>
                    <div className="cell-sub">{o?.user?.email ?? ""}</div>
                  </td>
                  <td>{o?.items?.length ?? 0} items</td>
                  <td className="cell-bold">₫{Number(o?.total || 0).toLocaleString()}</td>
                  <td>
                    <span className={`badge ${PAY_COLOR[o?.payment_status ?? ""] ?? "badge-gray"}`}>
                      {o?.payment_status}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${STATUS_COLOR[o?.status ?? ""] ?? "badge-gray"}`}>
                      {o?.status}
                    </span>
                  </td>
                  <td className="cell-sub">{o?.created_at ? new Date(o.created_at).toLocaleDateString("vi-VN") : "—"}</td>
                  <td>
                    <button className="action-btn edit" onClick={() => openDetail(o)}><Eye size={14} /></button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <AdminBtn variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</AdminBtn>
          <span className="page-info">Page {page} of {totalPages}</span>
          <AdminBtn variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</AdminBtn>
        </div>
      )}

      {/* Order Detail Modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title={`Order ${selected?.order_number ?? ""}`} size="lg">
        {selected && (
          <div>
            <div className="order-meta">
              <div className="order-meta-item">
                <span className="meta-label">Customer</span>
                <span className="meta-value">{selected.user?.name ?? "Guest"}</span>
              </div>
              <div className="order-meta-item">
                <span className="meta-label">Email</span>
                <span className="meta-value">{selected.user?.email ?? "—"}</span>
              </div>
              <div className="order-meta-item">
                <span className="meta-label">Payment Method</span>
                <span className="meta-value">{selected?.payment_method}</span>
              </div>
              <div className="order-meta-item">
                <span className="meta-label">Total</span>
                <span className="meta-value price">₫{Number(selected?.total || 0).toLocaleString()}</span>
              </div>
            </div>

            <h4 className="items-title">Items</h4>
            <div className="order-items">
              {selected?.items?.map((item, i) => (
                <div key={i} className="order-item">
                  {item?.product?.thumbnail_url
                    ? <img src={item.product.thumbnail_url} alt={item?.product?.name || "Item"} className="item-thumb" />
                    : <div className="item-thumb-ph" />
                  }
                  <div className="item-info">
                    <div className="item-name">{item?.product?.name}</div>
                    <div className="item-qty">× {item?.quantity || 1} — ₫{Number(item?.unit_price || 0).toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="order-update-form">
              <div className="form-grid form-grid-2">
                <FormSelect label="Order Status" options={STATUS_OPTS} value={newStatus} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNewStatus(e.target.value)} />
                <FormSelect label="Payment Status" options={PAYMENT_OPTS} value={newPayStatus} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNewPayStatus(e.target.value)} />
              </div>
            </div>

            <div className="form-actions" style={{ marginTop: 24 }}>
              <AdminBtn variant="secondary" onClick={() => setSelected(null)}>Close</AdminBtn>
              <AdminBtn loading={saving} onClick={updateOrder}>Update Order</AdminBtn>
            </div>
          </div>
        )}
      </Modal>

      <style>{`
        .page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 24px; gap: 16px; }
        .page-title { font-size: 22px; font-weight: 700; color: #f1f5f9; }
        .page-sub { font-size: 13px; color: #6b7280; margin-top: 2px; }
        .table-toolbar { margin-bottom: 16px; }
        .filter-chips { display: flex; gap: 8px; flex-wrap: wrap; }
        .filter-chip { background: #111827; border: 1px solid #1f2937; color: #9ca3af; padding: 6px 14px; border-radius: 20px; font-size: 13px; cursor: pointer; transition: all 0.15s; }
        .filter-chip:hover, .filter-chip.active { background: rgba(99,102,241,0.15); border-color: rgba(99,102,241,0.4); color: #a5b4fc; }
        .admin-table-wrap { overflow-x: auto; border-radius: 12px; border: 1px solid #1f2937; }
        .admin-table { width: 100%; border-collapse: collapse; font-size: 14px; }
        .admin-table th { background: #0f1117; color: #6b7280; font-weight: 500; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; padding: 12px 16px; text-align: left; border-bottom: 1px solid #1f2937; }
        .admin-table td { padding: 14px 16px; border-bottom: 1px solid #1f2937; color: #e2e8f0; vertical-align: middle; }
        .admin-table tr:last-child td { border-bottom: none; }
        .admin-table tr:hover td { background: rgba(255,255,255,0.02); }
        .table-empty { text-align: center; color: #6b7280; padding: 40px 0 !important; }
        .cell-bold { font-weight: 600; color: #f1f5f9; }
        .cell-sub { font-size: 12px; color: #6b7280; margin-top: 2px; }
        .cell-mono { font-family: monospace; font-size: 13px; }
        .badge { display: inline-flex; align-items: center; padding: 3px 8px; border-radius: 6px; font-size: 12px; font-weight: 500; }
        .badge-green { background: rgba(16,185,129,0.15); color: #34d399; }
        .badge-red { background: rgba(239,68,68,0.15); color: #f87171; }
        .badge-yellow { background: rgba(245,158,11,0.15); color: #fbbf24; }
        .badge-blue { background: rgba(59,130,246,0.15); color: #93c5fd; }
        .badge-purple { background: rgba(139,92,246,0.15); color: #c4b5fd; }
        .badge-gray { background: #1f2937; color: #9ca3af; }
        .action-btn { background: none; border: none; cursor: pointer; padding: 6px; border-radius: 6px; display: flex; transition: background 0.15s, color 0.15s; }
        .action-btn.edit { color: #6366f1; }
        .action-btn.edit:hover { background: rgba(99,102,241,0.15); }
        .pagination { display: flex; align-items: center; justify-content: center; gap: 16px; margin-top: 20px; }
        .page-info { font-size: 14px; color: #6b7280; }
        .order-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; background: #0f1117; border-radius: 10px; padding: 16px; margin-bottom: 20px; }
        .order-meta-item { display: flex; flex-direction: column; gap: 4px; }
        .meta-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; }
        .meta-value { font-size: 14px; font-weight: 500; color: #e2e8f0; }
        .meta-value.price { color: #a5b4fc; font-size: 16px; font-weight: 700; }
        .items-title { font-size: 13px; font-weight: 600; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px; }
        .order-items { display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px; }
        .order-item { display: flex; align-items: center; gap: 12px; background: #0f1117; border-radius: 8px; padding: 10px 14px; }
        .item-thumb { width: 40px; height: 40px; object-fit: cover; border-radius: 6px; }
        .item-thumb-ph { width: 40px; height: 40px; border-radius: 6px; background: #1f2937; flex-shrink: 0; }
        .item-name { font-size: 14px; font-weight: 500; color: #f1f5f9; }
        .item-qty { font-size: 12px; color: #6b7280; margin-top: 2px; }
        .order-update-form { background: #0f1117; border-radius: 10px; padding: 16px; }
        .form-grid { display: grid; gap: 16px; }
        .form-grid-2 { grid-template-columns: 1fr 1fr; }
        .form-actions { display: flex; gap: 12px; justify-content: flex-end; }
      `}</style>
    </div>
  )
}
