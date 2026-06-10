"use client"

import Link from "next/link"
import { useCallback, useEffect, useState, type ChangeEvent } from "react"
import { Eye, EyeOff, MessageSquare, Search, Star } from "lucide-react"
import { AdminBtn } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type ReviewRow = {
  id: string
  product_id: string
  product_name: string
  product_slug: string
  user_id: string
  user_name: string
  user_email: string
  rating: number
  comment: string
  status: string
  created_at: string
}

const statusFilters = [
  { value: "", label: "Tất cả" },
  { value: "APPROVED", label: "Đang hiển thị" },
  { value: "HIDDEN", label: "Đã ẩn" },
]

function getStatusLabel(status: string) {
  return status === "HIDDEN" ? "Đã ẩn" : "Đang hiển thị"
}

function getStatusClass(status: string) {
  return status === "HIDDEN"
    ? "bg-amber-50 text-amber-700 border-amber-200"
    : "bg-emerald-50 text-emerald-700 border-emerald-200"
}

function formatDate(value?: string) {
  if (!value) return "—"
  return new Date(value).toLocaleDateString("vi-VN")
}

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<ReviewRow[]>([])
  const [total, setTotal] = useState(0)
  const [status, setStatus] = useState("")
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState("")
  const [error, setError] = useState("")

  const fetchReviews = useCallback(() => {
    setLoading(true)
    setError("")

    const params = new URLSearchParams()
    if (status) params.set("status", status)
    if (search.trim()) params.set("q", search.trim())

    fetch(`/api/admin/reviews?${params.toString()}`, { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.error ?? "Unable to load reviews")
        }
        setReviews(data.reviews ?? [])
        setTotal(Number(data.total ?? 0))
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Unable to load reviews")
        setReviews([])
        setTotal(0)
      })
      .finally(() => setLoading(false))
  }, [search, status])

  useEffect(() => {
    fetchReviews()
  }, [fetchReviews])

  const updateReviewStatus = async (review: ReviewRow) => {
    const nextStatus = review.status === "HIDDEN" ? "APPROVED" : "HIDDEN"
    setUpdatingId(review.id)
    setError("")

    try {
      const response = await fetch(`/api/admin/reviews/${review.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to update review")
      }
      fetchReviews()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unable to update review")
    } finally {
      setUpdatingId("")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">Review moderation</p>
          <h2 className="mt-2 text-2xl font-semibold text-zinc-900">Quản lý đánh giá sản phẩm</h2>
          <p className="mt-1 max-w-2xl text-sm text-zinc-500">
            Tạm ẩn các đánh giá không phù hợp mà không thay đổi luồng gửi đánh giá hiện tại.
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm shadow-sm">
          <span className="font-semibold text-zinc-900">{total}</span>
          <span className="ml-1 text-zinc-500">đánh giá đang tải</span>
        </div>
      </div>

      <div className="grid gap-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm lg:grid-cols-[minmax(0,1fr)_220px]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            id="admin-reviews-search"
            className="h-10 w-full rounded-xl border border-zinc-300 bg-zinc-50 py-2 pl-9 pr-3 text-sm text-zinc-900 outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-400"
            placeholder="Tìm theo sản phẩm, khách hàng, email hoặc nội dung..."
            value={search}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setSearch(event.target.value)}
          />
        </div>
        <select
          id="admin-reviews-status"
          value={status}
          onChange={(event: ChangeEvent<HTMLSelectElement>) => setStatus(event.target.value)}
          className="h-10 rounded-xl border border-zinc-300 bg-zinc-50 px-3 text-sm text-zinc-900 outline-none transition-colors focus:border-zinc-400"
        >
          {statusFilters.map((item) => (
            <option key={item.value || "all"} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-zinc-200 text-sm">
            <thead className="bg-zinc-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Đánh giá</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Sản phẩm</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Khách hàng</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Trạng thái</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Ngày tạo</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm text-zinc-500">
                    Đang tải đánh giá...
                  </td>
                </tr>
              ) : reviews.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm text-zinc-500">
                    Không tìm thấy đánh giá phù hợp.
                  </td>
                </tr>
              ) : (
                reviews.map((review) => (
                  <tr key={review.id} className="align-top transition-colors hover:bg-zinc-50">
                    <td className="max-w-md px-4 py-4">
                      <div className="mb-2 flex items-center gap-1 text-yellow-500">
                        {[1, 2, 3, 4, 5].map((value) => (
                          <Star
                            key={value}
                            className={cn(
                              "h-4 w-4",
                              value <= review.rating ? "fill-yellow-400 text-yellow-400" : "fill-zinc-200 text-zinc-200"
                            )}
                          />
                        ))}
                      </div>
                      <p className="line-clamp-3 text-sm leading-6 text-zinc-700">
                        {review.comment || "Khách hàng chưa để lại nhận xét chi tiết."}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <Link
                        href={`/products/${review.product_slug || review.product_id}`}
                        className="font-medium text-zinc-900 hover:text-blue-600"
                        target="_blank"
                      >
                        {review.product_name}
                      </Link>
                      <p className="mt-1 text-xs text-zinc-400">{review.product_id}</p>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-zinc-100 text-zinc-500">
                          <MessageSquare className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium text-zinc-900">{review.user_name}</p>
                          <p className="mt-1 text-xs text-zinc-500">{review.user_email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-xs font-medium", getStatusClass(review.status))}>
                        {getStatusLabel(review.status)}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-zinc-600">{formatDate(review.created_at)}</td>
                    <td className="px-4 py-4">
                      <AdminBtn
                        id={`admin-review-toggle-${review.id}`}
                        type="button"
                        size="sm"
                        variant={review.status === "HIDDEN" ? "secondary" : "danger"}
                        loading={updatingId === review.id}
                        onClick={() => void updateReviewStatus(review)}
                      >
                        {review.status === "HIDDEN" ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                        {review.status === "HIDDEN" ? "Hiện lại" : "Ẩn"}
                      </AdminBtn>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
