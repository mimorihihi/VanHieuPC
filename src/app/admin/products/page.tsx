"use client"

import Link from "next/link"
import { useCallback, useEffect, useState, type ChangeEvent } from "react"
import { Pencil, Plus, Search, Star, Trash2 } from "lucide-react"
import { Modal } from "@/components/ui/modal"
import { AdminBtn } from "@/components/ui/button"

interface Category {
  id: string
  name: string
}

interface Brand {
  id: string
  name: string
}

interface Product {
  id: string
  name: string
  price: string
  sale_price: string | null
  stock: number
  thumbnail_url: string | null
  avg_rating: string
  is_active: boolean
  is_featured: boolean
  slug: string
  category: Category | null
  brand: Brand | null
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<"delete" | null>(null)
  const [selected, setSelected] = useState<Product | null>(null)
  const [saving, setSaving] = useState(false)

  const limit = 15

  const fetchProducts = useCallback(() => {
    setLoading(true)
    fetch(`/api/admin/products?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`)
      .then((response) => response.json())
      .then((data) => {
        setProducts(data.products ?? [])
        setTotal(data.total ?? 0)
      })
      .finally(() => setLoading(false))
  }, [page, search])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts()
    }, 0)

    return () => clearTimeout(timer)
  }, [fetchProducts])

  const openDelete = (product: Product) => {
    setSelected(product)
    setModal("delete")
  }

  const deleteProduct = async () => {
    setSaving(true)
    await fetch(`/api/admin/products/${selected?.id}`, { method: "DELETE" })
    setSaving(false)
    setModal(null)
    fetchProducts()
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-zinc-900">Products</h2>
          <p className="mt-1 text-sm text-zinc-500">{total} total products</p>
        </div>
        <Link href="/admin/products/new">
          <AdminBtn>
            <Plus className="mr-2 h-4 w-4" />
            Add Product
          </AdminBtn>
        </Link>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="relative w-full max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            id="admin-products-search"
            className="h-10 w-full rounded-xl border border-zinc-300 bg-zinc-50 py-2 pl-9 pr-3 text-sm text-zinc-900 outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-400"
            placeholder="Search products..."
            value={search}
            onChange={(event: ChangeEvent<HTMLInputElement>) => {
              setSearch(event.target.value)
              setPage(1)
            }}
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-zinc-200 text-sm">
            <thead className="bg-zinc-100">
              <tr>
                {["Product", "Category", "Price", "Stock", "Rating", "Status", "Actions"].map((head) => (
                  <th key={head} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-zinc-500">
                    Loading...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-zinc-500">
                    No products found
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr key={product.id} className="transition-colors hover:bg-zinc-50">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        {product.thumbnail_url ? (
                          <img src={product.thumbnail_url} alt={product.name || "Product"} className="h-10 w-10 rounded-lg border border-zinc-200 bg-zinc-100 object-cover" />
                        ) : (
                          <div className="h-10 w-10 shrink-0 rounded-lg border border-zinc-200 bg-zinc-100" />
                        )}
                        <div>
                          <p className="max-w-[220px] truncate font-medium text-zinc-900">{product.name}</p>
                          <p className="text-xs text-zinc-500">{product.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-flex rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700">{product.category?.name ?? "-"}</span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-semibold text-zinc-900">₫{Number(product.price || 0).toLocaleString()}</span>
                        {product.sale_price ? <span className="text-xs text-zinc-500">₫{Number(product.sale_price).toLocaleString()}</span> : null}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={Number(product.stock || 0) > 0 ? "inline-flex rounded-full bg-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-700" : "inline-flex rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-500"}>
                        {product.stock || 0}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1 text-zinc-700">
                        <Star className="h-3.5 w-3.5 fill-zinc-400 text-zinc-400" />
                        <span>{product.avg_rating || "0"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={product.is_active ? "inline-flex rounded-full bg-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-700" : "inline-flex rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-500"}>
                          {product.is_active ? "Active" : "Inactive"}
                        </span>
                        {product.is_featured ? <span className="inline-flex rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600">Featured</span> : null}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/admin/products/${product.id}`}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-100 text-zinc-700 transition-colors hover:bg-zinc-200"
                        >
                          <Pencil className="h-4 w-4" />
                        </Link>
                        <button
                          id={`admin-product-delete-${product.id}`}
                          type="button"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-100 text-zinc-700 transition-colors hover:bg-zinc-200"
                          onClick={() => openDelete(product)}
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

      <Modal open={modal === "delete"} onClose={() => setModal(null)} title="Delete Product" size="sm">
        <p className="mb-6 text-sm text-zinc-600">
          Are you sure you want to delete <strong className="text-zinc-900">{selected?.name}</strong>? This action cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <AdminBtn variant="secondary" onClick={() => setModal(null)}>
            Cancel
          </AdminBtn>
          <AdminBtn variant="danger" loading={saving} onClick={deleteProduct}>
            Delete
          </AdminBtn>
        </div>
      </Modal>
    </div>
  )
}
