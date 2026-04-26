"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { FormEvent, useState } from "react"
import { SiteHeader } from "@/components/site-header"
import { SupportFeature } from "@/components/home/support-features"
import { SiteFooter } from "@/components/site-footer"

type RegisterValues = {
  name: string
  email: string
  password: string
  confirmPassword: string
  phone: string
}

type RegisterErrors = Partial<Record<keyof RegisterValues, string>>

export default function RegisterPage() {
  const router = useRouter()
  const [values, setValues] = useState<RegisterValues>({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
  })
  const [errors, setErrors] = useState<RegisterErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState("")
  const [formSuccess, setFormSuccess] = useState("")

  const handleChange = (field: keyof RegisterValues, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }))
    }
  }

  const validate = () => {
    const nextErrors: RegisterErrors = {}

    if (!values.name.trim()) {
      nextErrors.name = "Full name is required."
    }

    if (!values.email.trim()) {
      nextErrors.email = "Email is required."
    } else if (!/\S+@\S+\.\S+/.test(values.email)) {
      nextErrors.email = "Email format is invalid."
    }

    if (!values.password.trim()) {
      nextErrors.password = "Password is required."
    } else if (values.password.length < 6) {
      nextErrors.password = "Password must be at least 6 characters."
    }

    if (!values.confirmPassword.trim()) {
      nextErrors.confirmPassword = "Please confirm your password."
    } else if (values.confirmPassword !== values.password) {
      nextErrors.confirmPassword = "Confirm password does not match."
    }

    if (values.phone.trim() && !/^[0-9+\-\s()]{8,20}$/.test(values.phone)) {
      nextErrors.phone = "Phone number format is invalid."
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
        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: values.name.trim(),
            email: values.email.trim(),
            password: values.password,
            phone: values.phone.trim() || undefined,
          }),
        })

        const data = await response.json()
        if (!response.ok) {
          setFormError(data.error ?? "Register failed")
          return
        }

        setFormSuccess("Account created successfully. Redirecting to login...")
        setTimeout(() => router.push("/login"), 800)
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
            <span className="text-zinc-700">Register</span>
          </div>

          <h1 className="mb-6 text-4xl font-semibold tracking-tight text-zinc-900">Create Account</h1>

          <div className="mx-auto w-full max-w-3xl rounded bg-zinc-100 p-6 sm:p-8">
            <h2 className="text-lg font-semibold text-zinc-900">New Customer Registration</h2>
            <p className="mt-2 text-xs text-zinc-600">
              Fill in your information to create an account. Fields with <span className="text-red-500">*</span> are required.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
              {formError ? (
                <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">{formError}</p>
              ) : null}
              {formSuccess ? (
                <p className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{formSuccess}</p>
              ) : null}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label htmlFor="name" className="text-xs font-semibold text-zinc-900">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="name"
                    type="text"
                    placeholder="Your Full Name"
                    value={values.name}
                    onChange={(event) => handleChange("name", event.target.value)}
                    className="h-11 w-full rounded border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none transition-colors placeholder:text-zinc-400 focus:border-blue-600"
                  />
                  {errors.name ? <p className="text-xs text-red-500">{errors.name}</p> : null}
                </div>

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
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label htmlFor="password" className="text-xs font-semibold text-zinc-900">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="password"
                    type="password"
                    placeholder="Create Password"
                    value={values.password}
                    onChange={(event) => handleChange("password", event.target.value)}
                    className="h-11 w-full rounded border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none transition-colors placeholder:text-zinc-400 focus:border-blue-600"
                  />
                  {errors.password ? <p className="text-xs text-red-500">{errors.password}</p> : null}
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="confirmPassword" className="text-xs font-semibold text-zinc-900">
                    Confirm Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm Password"
                    value={values.confirmPassword}
                    onChange={(event) => handleChange("confirmPassword", event.target.value)}
                    className="h-11 w-full rounded border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none transition-colors placeholder:text-zinc-400 focus:border-blue-600"
                  />
                  {errors.confirmPassword ? <p className="text-xs text-red-500">{errors.confirmPassword}</p> : null}
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="phone" className="text-xs font-semibold text-zinc-900">
                  Phone Number
                </label>
                <input
                  id="phone"
                  type="text"
                  placeholder="Your Phone Number"
                  value={values.phone}
                  onChange={(event) => handleChange("phone", event.target.value)}
                  className="h-11 w-full rounded border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none transition-colors placeholder:text-zinc-400 focus:border-blue-600"
                />
                {errors.phone ? <p className="text-xs text-red-500">{errors.phone}</p> : null}
              </div>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex h-11 items-center justify-center rounded-full bg-blue-600 px-8 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                >
                  {isSubmitting ? "Creating..." : "Create Account"}
                </button>

                <p className="text-xs text-zinc-600">
                  Already have an account?{" "}
                  <Link href="/login" className="font-semibold text-blue-600 hover:underline">
                    Sign In
                  </Link>
                </p>
              </div>
            </form>
          </div>
        </section>
      </main>

      <SupportFeature />
      <SiteFooter />
    </div>
  )
}
