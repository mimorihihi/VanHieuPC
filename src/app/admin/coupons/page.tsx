"use client"

import { type FormEvent, useCallback, useEffect, useState } from "react"
import { Pencil, Plus, TicketPercent, Trash2 } from "lucide-react"
import { Modal } from "@/components/ui/modal"
import { AdminBtn } from "@/components/ui/button"
import { FormInput, FormSelect, FormToggle } from "@/components/ui/form-fields"

interface Coupon {
  id: string
  code: string
  type: string
  value: string
  min_order: string | null
  max_discount: string | null
  usage_limit: number | null
  used_count: number
  expires_at: string | null
  is_active: boolean
}

interface CouponFormState {
  code: string
  type: string
  value: string
  min_order: string
  max_discount: string
  usage_limit: string
  expires_at: string
  is_active: boolean
}

const EMPTY: CouponFormState = {
  code: "",
  type: "PERCENT",
  value: "",
  min_order: "",
  max_discount: "",
  usage_limit: "",
  expires_at: "",
  is_active: true,
}

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<"create" | "edit" | "delete" | null>(null)
  const [selected, setSelected] = useState<Coupon | null>(null)
  const [form, setForm] = useState<CouponFormState>(EMPTY)
  const [saving, setSaving] = useState(false)

  const fetchCoupons = useCallback(() => {
    setLoading(true)
    fetch("/api/admin/coupons")
      .then((response) => response.json())
      .then((data) => setCoupons(data.coupons ?? []))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCoupons()
    }, 0)

    return () => clearTimeout(timer)
  }, [fetchCoupons])

  const openCreate = () => {
    setForm(EMPTY)
    setSelected(null)
    setModal("create")
  }

  const openEdit = (coupon: Coupon) => {
    setForm({
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      min_order: coupon.min_order ?? "",
      max_discount: coupon.max_discount ?? "",
      usage_limit: coupon.usage_limit?.toString() ?? "",
      expires_at: coupon.expires_at ? new Date(coupon.expires_at).toISOString().split("T")[0] : "",
      is_active: coupon.is_active,
    })
    setSelected(coupon)
    setModal("edit")
  }

  const save = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    const url = modal === "edit" ? `/api/admin/coupons/${selected?.id}` : "/api/admin/coupons"
    const method = modal === "edit" ? "PUT" : "POST"
    const response = await fetch(url, {
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

    if (response.ok) {
      setModal(null)
      fetchCoupons()
      return
    }

    const data = await response.json()
    alert(data.error)
  }

  const deleteCoupon = async () => {
    setSaving(true)
    await fetch(`/api/admin/coupons/${selected?.id}`, { method: "DELETE" })
    setSaving(false)
    setModal(null)
    fetchCoupons()
  }

  const isExpired = (coupon: Coupon) => Boolean(coupon.expires_at && new Date(coupon.expires_at) < new Date())

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-zinc-900">Coupons</h2>
          <p className="mt-1 text-sm text-zinc-500">{coupons.length} coupons</p>
        </div>
        <AdminBtn onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add Coupon
        </AdminBtn>
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-zinc-200 text-sm">
            <thead className="bg-zinc-100">
              <tr>
                {["Code", "Type", "Value", "Min Order", "Usage", "Expires", "Status", "Actions"].map((head) => (
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
              ) : coupons.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-zinc-500">
                    No coupons
                  </td>
                </tr>
              ) : (
                coupons.map((coupon) => (
                  <tr key={coupon.id} className="transition-colors hover:bg-zinc-50">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-100 text-zinc-600">
                          <TicketPercent className="h-5 w-5" />
                        </div>
                        <span className="rounded-full bg-zinc-100 px-3 py-1 font-mono text-xs font-semibold text-zinc-700">{coupon.code}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-flex rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700">{coupon.type}</span>
                    </td>
                    <td className="px-4 py-4 font-medium text-zinc-900">
                      {coupon.type === "PERCENT" ? `${coupon.value}%` : `₫${Number(coupon.value || 0).toLocaleString()}`}
                    </td>
                    <td className="px-4 py-4 text-zinc-600">{coupon.min_order ? `₫${Number(coupon.min_order).toLocaleString()}` : "—"}</td>
                    <td className="px-4 py-4 text-zinc-600">
                      {coupon.used_count ?? 0}
                      {coupon.usage_limit ? ` / ${coupon.usage_limit}` : " / ∞"}
                    </td>
                    <td className="px-4 py-4 text-zinc-600">
                      {coupon.expires_at ? new Date(coupon.expires_at).toLocaleDateString("vi-VN") : "Never"}
                    </td>
                    <td className="px-4 py-4">
                      {isExpired(coupon) ? (
                        <span className="inline-flex rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-500">Expired</span>
                      ) : (
                        <span className={coupon.is_active ? "inline-flex rounded-full bg-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-700" : "inline-flex rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-500"}>
                          {coupon.is_active ? "Active" : "Inactive"}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          id={`admin-coupon-edit-${coupon.id}`}
                          type="button"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-100 text-zinc-700 transition-colors hover:bg-zinc-200"
                          onClick={() => openEdit(coupon)}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          id={`admin-coupon-delete-${coupon.id}`}
                          type="button"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-100 text-zinc-700 transition-colors hover:bg-zinc-200"
                          onClick={() => {
                            setSelected(coupon)
                            setModal("delete")
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modal === "create" || modal === "edit"} onClose={() => setModal(null)} title={modal === "edit" ? "Edit Coupon" : "New Coupon"} size="md">
        <form onSubmit={save} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormInput label="Code" required value={form.code} onChange={(event) => setForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))} />
            <FormSelect
              label="Type"
              required
              options={[{ value: "PERCENT", label: "Percent (%)" }, { value: "FIXED", label: "Fixed (₫)" }]}
              value={form.type}
              onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))}
            />
            <FormInput
              label={form.type === "PERCENT" ? "Discount (%)" : "Discount (₫)"}
              required
              type="number"
              min="0"
              value={form.value}
              onChange={(event) => setForm((current) => ({ ...current, value: event.target.value }))}
            />
            <FormInput label="Min Order (₫)" type="number" min="0" value={form.min_order} onChange={(event) => setForm((current) => ({ ...current, min_order: event.target.value }))} />
            <FormInput label="Max Discount (₫)" type="number" min="0" value={form.max_discount} onChange={(event) => setForm((current) => ({ ...current, max_discount: event.target.value }))} />
            <FormInput label="Usage Limit" type="number" min="0" value={form.usage_limit} onChange={(event) => setForm((current) => ({ ...current, usage_limit: event.target.value }))} placeholder="∞ unlimited" />
            <FormInput label="Expires At" type="date" value={form.expires_at} onChange={(event) => setForm((current) => ({ ...current, expires_at: event.target.value }))} />
          </div>
          <div>
            <FormToggle label="Active" checked={!!form.is_active} onChange={(value) => setForm((current) => ({ ...current, is_active: value }))} />
          </div>
          <div className="flex justify-end gap-3">
            <AdminBtn type="button" variant="secondary" onClick={() => setModal(null)}>
              Cancel
            </AdminBtn>
            <AdminBtn type="submit" loading={saving}>
              Save
            </AdminBtn>
          </div>
        </form>
      </Modal>

      <Modal open={modal === "delete"} onClose={() => setModal(null)} title="Delete Coupon" size="sm">
        <p className="mb-6 text-sm text-zinc-600">
          Delete coupon <strong className="text-zinc-900">{selected?.code}</strong>?
        </p>
        <div className="flex justify-end gap-3">
          <AdminBtn variant="secondary" onClick={() => setModal(null)}>
            Cancel
          </AdminBtn>
          <AdminBtn variant="danger" loading={saving} onClick={deleteCoupon}>
            Delete
          </AdminBtn>
        </div>
      </Modal>
    </div>
  )
}
