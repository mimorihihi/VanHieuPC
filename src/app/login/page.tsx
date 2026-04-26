"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { FormEvent, useState } from "react"
import { SiteHeader } from "@/components/site-header"
import { SupportFeature } from "@/components/home/support-features"
import { SiteFooter } from "@/components/site-footer"

type LoginValues = {
  email: string
  password: string
}

type LoginErrors = Partial<Record<keyof LoginValues, string>>

type GuestCartItem = {
  product_id: string
  quantity: number
}

export default function LoginPage() {
  const router = useRouter()
  const [values, setValues] = useState<LoginValues>({ email: "", password: "" })
  const [errors, setErrors] = useState<LoginErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState("")
  const [formSuccess, setFormSuccess] = useState("")

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

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextErrors = validate()
    setErrors(nextErrors)
    setFormError("")
    setFormSuccess("")

    if (Object.keys(nextErrors).length > 0) {
      return
    }

    setIsSubmitting(true)
    void (async () => {
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

        if (data.user) {
          window.localStorage.setItem("auth_user", JSON.stringify(data.user))

          // Merge guest cart into user cart after successful login.
          try {
            const rawGuest = window.localStorage.getItem("cart_guest_v1")
            const guestItems = rawGuest ? (JSON.parse(rawGuest) as GuestCartItem[]) : []

            if (Array.isArray(guestItems) && guestItems.length > 0) {
              const mergeResponses = await Promise.all(
                guestItems.map((item) =>
                  fetch("/api/cart", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      user_id: data.user.id,
                      product_id: item.product_id,
                      quantity: item.quantity,
                    }),
                  })
                )
              )

              const allMerged = mergeResponses.every((response) => response.ok)
              if (allMerged) {
                window.localStorage.removeItem("cart_guest_v1")
              }
            }
          } catch {
            // Keep login success flow even if merge fails.
          }
        }
        setFormSuccess(`Welcome ${data.user?.name ?? ""}`)
        setTimeout(() => router.push("/dashboard"), 600)
      } catch {
        setFormError("Cannot connect to server")
      } finally {
        setIsSubmitting(false)
      }
    })()
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
            <span className="text-zinc-700">Login</span>
          </div>

          <h1 className="mb-6 text-4xl font-semibold tracking-tight text-zinc-900">Customer Login</h1>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <section className="rounded bg-zinc-100 p-6">
              <h2 className="text-lg font-semibold text-zinc-900">Registered Customers</h2>
              <p className="mt-3 text-xs text-zinc-600">If you have an account, sign in with your email address.</p>

              <form onSubmit={handleSubmit} className="mt-5 space-y-4" noValidate>
                {formError ? (
                  <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">{formError}</p>
                ) : null}
                {formSuccess ? (
                  <p className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{formSuccess}</p>
                ) : null}
                <div className="space-y-1.5">
                  <label htmlFor="email" className="text-xs font-semibold text-zinc-900">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="email"
                    type="email"
                    placeholder="Your Email"
                    value={values.email}
                    onChange={(event) => handleChange("email", event.target.value)}
                    className="h-11 w-full rounded border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none transition-colors placeholder:text-zinc-400 focus:border-blue-600"
                  />
                  {errors.email ? <p className="text-xs text-red-500">{errors.email}</p> : null}
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="password" className="text-xs font-semibold text-zinc-900">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="password"
                    type="password"
                    placeholder="Your Password"
                    value={values.password}
                    onChange={(event) => handleChange("password", event.target.value)}
                    className="h-11 w-full rounded border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none transition-colors placeholder:text-zinc-400 focus:border-blue-600"
                  />
                  {errors.password ? <p className="text-xs text-red-500">{errors.password}</p> : null}
                </div>

                <div className="flex flex-wrap items-center gap-4 pt-1">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex h-11 items-center justify-center rounded-full bg-blue-600 px-8 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                  >
                    {isSubmitting ? "Signing in..." : "Sign In"}
                  </button>
                  <a href="#" className="text-xs font-medium text-blue-600 hover:underline">
                    Forgot Your Password?
                  </a>
                </div>
              </form>
            </section>

            <section className="rounded bg-zinc-100 p-6">
              <h2 className="text-lg font-semibold text-zinc-900">New Customer?</h2>
              <p className="mt-3 text-xs text-zinc-600">Creating an account has many benefits:</p>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-zinc-700">
                <li>Check out faster</li>
                <li>Keep more than one address</li>
                <li>Track orders and more</li>
              </ul>

              <Link
                href="/register"
                className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-blue-600 px-8 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
              >
                Create An Account
              </Link>
            </section>
          </div>
        </section>
      </main>

      <SupportFeature />
      <SiteFooter />
    </div>
  )
}
