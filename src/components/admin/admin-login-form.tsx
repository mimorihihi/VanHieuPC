"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { type FormEvent, useState } from "react"
import { ShieldCheck } from "lucide-react"
import { AdminBtn } from "@/components/ui/button"

type LoginValues = {
  email: string
  password: string
}

type LoginErrors = Partial<Record<keyof LoginValues, string>>

export function AdminLoginForm() {
  const router = useRouter()
  const [values, setValues] = useState<LoginValues>({ email: "", password: "" })
  const [errors, setErrors] = useState<LoginErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState("")

  const handleChange = (field: keyof LoginValues, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }))
    }
  }

  const validate = () => {
    const nextErrors: LoginErrors = {}

    if (!values.email.trim()) {
      nextErrors.email = "Email is required."
    } else if (!/\S+@\S+\.\S+/.test(values.email)) {
      nextErrors.email = "Email format is invalid."
    }

    if (!values.password.trim()) {
      nextErrors.password = "Password is required."
    }

    return nextErrors
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextErrors = validate()
    setErrors(nextErrors)
    setFormError("")

    if (Object.keys(nextErrors).length > 0) {
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: values.email.trim(),
          password: values.password,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        setFormError(data.error ?? "Login failed")
        return
      }

      if (!data.user || data.user.role !== "ADMIN") {
        setFormError("This account does not have admin access.")
        return
      }

      window.localStorage.setItem("auth_user", JSON.stringify(data.user))
      router.push("/admin/dashboard")
    } catch {
      setFormError("Cannot connect to server")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <section className="rounded bg-zinc-100 p-6">
        <div className="mb-5 flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-white">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">Admin Sign In</h2>
            <p className="mt-2 text-xs text-zinc-600">Use your administrator account to access the dashboard.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {formError ? (
            <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">{formError}</p>
          ) : null}

          <div className="space-y-1.5">
            <label htmlFor="admin-email" className="text-xs font-semibold text-zinc-900">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              id="admin-email"
              type="email"
              placeholder="Your admin email"
              value={values.email}
              onChange={(event) => handleChange("email", event.target.value)}
              className="h-11 w-full rounded border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-900"
            />
            {errors.email ? <p className="text-xs text-red-500">{errors.email}</p> : null}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="admin-password" className="text-xs font-semibold text-zinc-900">
              Password <span className="text-red-500">*</span>
            </label>
            <input
              id="admin-password"
              type="password"
              placeholder="Your password"
              value={values.password}
              onChange={(event) => handleChange("password", event.target.value)}
              className="h-11 w-full rounded border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-900"
            />
            {errors.password ? <p className="text-xs text-red-500">{errors.password}</p> : null}
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-1">
            <AdminBtn id="admin-login-submit" type="submit" loading={isSubmitting} className="rounded-full px-8">
              {isSubmitting ? "Signing in..." : "Sign In"}
            </AdminBtn>
            <Link href="/login" className="text-xs font-medium text-zinc-900 hover:underline">
              Customer login
            </Link>
          </div>
        </form>
      </section>

      <section className="rounded bg-zinc-100 p-6">
        <h2 className="text-lg font-semibold text-zinc-900">Admin Access Only</h2>
        <p className="mt-3 text-xs text-zinc-600">This area is reserved for store administrators and staff members with admin permissions.</p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-zinc-700">
          <li>Manage products, categories, and brands</li>
          <li>Review orders and customer activity</li>
          <li>Update store settings and promotional content</li>
        </ul>

        <Link
          href="/"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-zinc-900 px-8 text-sm font-semibold text-white transition-colors hover:bg-zinc-800"
        >
          Back To Store
        </Link>
      </section>
    </div>
  )
}
