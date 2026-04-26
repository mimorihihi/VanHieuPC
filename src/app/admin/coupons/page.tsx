"use client"

import { useEffect, useState, useCallback, FormEvent } from "react"
import { Plus, Pencil, Trash2 } from "lucide-react"
import { Modal } from "@/components/ui/modal"
import { AdminBtn } from "@/components/ui/button"
import { FormInput, FormSelect, FormToggle } from "@/components/ui/form-fields"

interface Coupon {
  id: string; code: string; type: string; value: string
  min_order: string | null; max_discount: string | null
  usage_limit: number | null; used_count: number
  expires_at: string | null; is_active: boolean
}

const EMPTY = {
  code: "", type: "PERCENT", value: "", min_order: "",
  max_discount: "", usage_limit: "", expires_at: "", is_active: true,
}

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<"create" | "edit" | "delete" | null>(null)
  const [selected, setSelected] = useState<Coupon | null>(null)
  const [form, setForm] = useState<typeof EMPTY & Record<string, any>>(EMPTY)
  const [saving, setSaving] = useState(false)

  const fetch_ = useCallback(() => {
    setLoading(true)
    fetch("/api/admin/coupons")
      .then(r => r.json())
      .then(d => setCoupons(d.coupons ?? []))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetch_() }, [fetch_])

  const save = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const url = modal === "edit" ? `/api/admin/coupons/${selected?.id}` : "/api/admin/coupons"
    const method = modal === "edit" ? "PUT" : "POST"
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        value: Number(form.value),
        min_order: form.min_order ? Number(form.min_order) : null,
        max_discount: form.max_discount ? Number(form.max_discount) : null,
        usage_limit: form.usage_limit ? Number(form.usage_limit) : null,
        expires_at: form.expires_at || null,
      }),
    })
    setSaving(false)
    if (res.ok) { setModal(null); fetch_() }
    else { const d = await res.json(); alert(d.error) }
  }

  const del = async () => {
    setSaving(true)
    await fetch(`/api/admin/coupons/${selected?.id}`, { method: "DELETE" })
    setSaving(false); setModal(null); fetch_()
  }

  const isExpired = (c: Coupon) => c?.expires_at && new Date(c.expires_at) < new Date()

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Coupons</h1>
          <p className="page-sub">{coupons.length} coupons</p>
        </div>
        <AdminBtn onClick={() => { setForm(EMPTY); setSelected(null); setModal("create") }}>
          <Plus size={16} /> Add Coupon
        </AdminBtn>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Type</th>
              <th>Value</th>
              <th>Min Order</th>
              <th>Usage</th>
              <th>Expires</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={8} className="table-empty">Loading…</td></tr>
              : coupons.length === 0 ? <tr><td colSpan={8} className="table-empty">No coupons</td></tr>
              : coupons.map((c, i) => (
                <tr key={c?.id || i}>
                  <td><span className="coupon-code">{c?.code}</span></td>
                  <td><span className={`badge ${c?.type === "PERCENT" ? "badge-blue" : "badge-purple"}`}>{c?.type}</span></td>
                  <td className="cell-bold">{c?.type === "PERCENT" ? `${c?.value}%` : `₫${Number(c?.value || 0).toLocaleString()}`}</td>
                  <td>{c?.min_order ? `₫${Number(c.min_order).toLocaleString()}` : "—"}</td>
                  <td>{c?.used_count ?? 0}{c?.usage_limit ? ` / ${c.usage_limit}` : " / ∞"}</td>
                  <td className={isExpired(c) ? "cell-expired" : "cell-sub"}>
                    {c?.expires_at ? new Date(c.expires_at).toLocaleDateString("vi-VN") : "Never"}
                  </td>
                  <td>
                    {isExpired(c)
                      ? <span className="badge badge-red">Expired</span>
                      : <span className={`badge ${c?.is_active ? "badge-green" : "badge-red"}`}>{c?.is_active ? "Active" : "Inactive"}</span>
                    }
                  </td>
                  <td>
                    <div className="action-btns">
                      <button className="action-btn edit" onClick={() => {
                        setForm({
                          ...c,
                          value: c.value,
                          min_order: c.min_order ?? "",
                          max_discount: c.max_discount ?? "",
                          usage_limit: c.usage_limit?.toString() ?? "",
                          expires_at: c.expires_at ? new Date(c.expires_at).toISOString().split("T")[0] : "",
                        } as any)
                        setSelected(c); setModal("edit")
                      }}>
                        <Pencil size={14} />
                      </button>
                      <button className="action-btn delete" onClick={() => { setSelected(c); setModal("delete") }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <Modal open={modal === "create" || modal === "edit"} onClose={() => setModal(null)} title={modal === "edit" ? "Edit Coupon" : "New Coupon"} size="md">
        <form onSubmit={save}>
          <div className="form-grid form-grid-2" style={{ marginBottom: 16 }}>
            <FormInput label="Code" required value={form.code} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} />
            <FormSelect label="Type" required options={[{ value: "PERCENT", label: "Percent (%)" }, { value: "FIXED", label: "Fixed (₫)" }]} value={form.type} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm(f => ({ ...f, type: e.target.value }))} />
            <FormInput label={form.type === "PERCENT" ? "Discount (%)" : "Discount (₫)"} required type="number" min="0" value={form.value} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, value: e.target.value }))} />
            <FormInput label="Min Order (₫)" type="number" min="0" value={form.min_order} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, min_order: e.target.value }))} />
            <FormInput label="Max Discount (₫)" type="number" min="0" value={form.max_discount} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, max_discount: e.target.value }))} />
            <FormInput label="Usage Limit" type="number" min="0" value={form.usage_limit} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, usage_limit: e.target.value }))} placeholder="∞ unlimited" />
            <FormInput label="Expires At" type="date" value={form.expires_at} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, expires_at: e.target.value }))} />
          </div>
          <div style={{ marginBottom: 24 }}>
            <FormToggle label="Active" checked={!!form.is_active} onChange={(v: boolean) => setForm(f => ({ ...f, is_active: v }))} />
          </div>
          <div className="form-actions">
            <AdminBtn type="button" variant="secondary" onClick={() => setModal(null)}>Cancel</AdminBtn>
            <AdminBtn type="submit" loading={saving}>Save</AdminBtn>
          </div>
        </form>
      </Modal>

      <Modal open={modal === "delete"} onClose={() => setModal(null)} title="Delete Coupon" size="sm">
        <p style={{ color: "#9ca3af", marginBottom: 24 }}>Delete coupon <strong style={{ color: "#f1f5f9" }}>{selected?.code}</strong>?</p>
        <div className="form-actions">
          <AdminBtn variant="secondary" onClick={() => setModal(null)}>Cancel</AdminBtn>
          <AdminBtn variant="danger" loading={saving} onClick={del}>Delete</AdminBtn>
        </div>
      </Modal>

      <style>{`
        .page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 24px; gap: 16px; }
        .page-title { font-size: 22px; font-weight: 700; color: #f1f5f9; }
        .page-sub { font-size: 13px; color: #6b7280; margin-top: 2px; }
        .admin-table-wrap { overflow-x: auto; border-radius: 12px; border: 1px solid #1f2937; }
        .admin-table { width: 100%; border-collapse: collapse; font-size: 14px; }
        .admin-table th { background: #0f1117; color: #6b7280; font-weight: 500; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; padding: 12px 16px; text-align: left; border-bottom: 1px solid #1f2937; }
        .admin-table td { padding: 14px 16px; border-bottom: 1px solid #1f2937; color: #e2e8f0; vertical-align: middle; }
        .admin-table tr:last-child td { border-bottom: none; }
        .admin-table tr:hover td { background: rgba(255,255,255,0.02); }
        .table-empty { text-align: center; color: #6b7280; padding: 40px 0 !important; }
        .coupon-code { font-family: monospace; font-size: 14px; font-weight: 700; color: #a5b4fc; background: rgba(99,102,241,0.1); padding: 4px 8px; border-radius: 6px; }
        .cell-bold { font-weight: 600; color: #f1f5f9; }
        .cell-sub { font-size: 13px; color: #6b7280; }
        .cell-expired { font-size: 13px; color: #f87171; }
        .badge { display: inline-flex; align-items: center; padding: 3px 8px; border-radius: 6px; font-size: 12px; font-weight: 500; }
        .badge-green { background: rgba(16,185,129,0.15); color: #34d399; }
        .badge-red { background: rgba(239,68,68,0.15); color: #f87171; }
        .badge-blue { background: rgba(59,130,246,0.15); color: #93c5fd; }
        .badge-purple { background: rgba(139,92,246,0.15); color: #c4b5fd; }
        .action-btns { display: flex; gap: 6px; }
        .action-btn { background: none; border: none; cursor: pointer; padding: 6px; border-radius: 6px; display: flex; transition: background 0.15s; }
        .action-btn.edit { color: #6366f1; }
        .action-btn.edit:hover { background: rgba(99,102,241,0.15); }
        .action-btn.delete { color: #ef4444; }
        .action-btn.delete:hover { background: rgba(239,68,68,0.15); }
        .form-grid { display: grid; gap: 16px; }
        .form-grid-2 { grid-template-columns: 1fr 1fr; }
        @media (max-width: 640px) { .form-grid-2 { grid-template-columns: 1fr; } }
        .form-actions { display: flex; gap: 12px; justify-content: flex-end; }
      `}</style>
    </div>
  )
}
