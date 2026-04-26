"use client"

import Link from "next/link"
import { FormEvent, useState } from "react"
import { Clock3, Mail, MapPin, Phone } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { SupportFeature } from "@/components/home/support-features"
import { SiteFooter } from "@/components/site-footer"

type ContactValues = {
  name: string
  email: string
  phone: string
  message: string
}

type ContactErrors = Partial<Record<keyof ContactValues, string>>

export default function ContactPage() {
  const [values, setValues] = useState<ContactValues>({
    name: "",
    email: "",
    phone: "",
    message: "",
  })
  const [errors, setErrors] = useState<ContactErrors>({})

  const handleChange = (field: keyof ContactValues, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }))
    }
  }

  const validate = () => {
    const nextErrors: ContactErrors = {}

    if (!values.name.trim()) {
      nextErrors.name = "Name is required."
    }

    if (!values.email.trim()) {
      nextErrors.email = "Email is required."
    } else if (!/\S+@\S+\.\S+/.test(values.email)) {
      nextErrors.email = "Email format is invalid."
    }

    if (values.phone.trim() && !/^[0-9+\-\s()]{8,20}$/.test(values.phone)) {
      nextErrors.phone = "Phone number format is invalid."
    }

    if (!values.message.trim()) {
      nextErrors.message = "Message is required."
    } else if (values.message.trim().length < 10) {
      nextErrors.message = "Message should be at least 10 characters."
    }

    return nextErrors
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrors(validate())
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
            <span className="text-zinc-700">Contact Us</span>
          </div>

          <h1 className="mb-4 text-4xl font-semibold tracking-tight text-zinc-900">Contact Us</h1>
          <p className="max-w-2xl text-sm leading-7 text-zinc-600">
            We love hearing from you, our shop customers.
            <br />
            Please contact us and we will make sure to get back to you as soon as we possibly can.
          </p>

          <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <form onSubmit={handleSubmit} className="space-y-4 rounded border border-zinc-200 bg-white p-4 sm:p-6" noValidate>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label htmlFor="name" className="text-xs font-semibold text-zinc-900">
                    Your Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="name"
                    type="text"
                    placeholder="Your Name"
                    value={values.name}
                    onChange={(event) => handleChange("name", event.target.value)}
                    className="h-11 w-full rounded border border-zinc-300 px-3 text-sm text-zinc-900 outline-none transition-colors placeholder:text-zinc-400 focus:border-blue-600"
                  />
                  {errors.name ? <p className="text-xs text-red-500">{errors.name}</p> : null}
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="email" className="text-xs font-semibold text-zinc-900">
                    Your Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="email"
                    type="email"
                    placeholder="Your Email"
                    value={values.email}
                    onChange={(event) => handleChange("email", event.target.value)}
                    className="h-11 w-full rounded border border-zinc-300 px-3 text-sm text-zinc-900 outline-none transition-colors placeholder:text-zinc-400 focus:border-blue-600"
                  />
                  {errors.email ? <p className="text-xs text-red-500">{errors.email}</p> : null}
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="phone" className="text-xs font-semibold text-zinc-900">
                  Your Phone Number
                </label>
                <input
                  id="phone"
                  type="text"
                  placeholder="Your Phone"
                  value={values.phone}
                  onChange={(event) => handleChange("phone", event.target.value)}
                  className="h-11 w-full rounded border border-zinc-300 px-3 text-sm text-zinc-900 outline-none transition-colors placeholder:text-zinc-400 focus:border-blue-600"
                />
                {errors.phone ? <p className="text-xs text-red-500">{errors.phone}</p> : null}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="message" className="text-xs font-semibold text-zinc-900">
                  What&apos;s on your mind? <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="message"
                  rows={8}
                  placeholder="Just us a note and we'll get back to you as quickly as possible"
                  value={values.message}
                  onChange={(event) => handleChange("message", event.target.value)}
                  className="w-full rounded border border-zinc-300 px-3 py-3 text-sm text-zinc-900 outline-none transition-colors placeholder:text-zinc-400 focus:border-blue-600"
                />
                {errors.message ? <p className="text-xs text-red-500">{errors.message}</p> : null}
              </div>

              <button
                type="submit"
                className="inline-flex h-11 items-center justify-center rounded-full bg-blue-600 px-8 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
              >
                Submit
              </button>
            </form>

            <aside className="h-fit rounded bg-zinc-100 p-5 sm:p-6">
              <div className="space-y-6">
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-5 w-5 text-zinc-900" />
                  <div>
                    <h2 className="text-sm font-semibold text-zinc-900">Address:</h2>
                    <p className="mt-1 text-xs leading-5 text-zinc-600">1234 Street Adress City Address, 1234</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Phone className="mt-0.5 h-5 w-5 text-zinc-900" />
                  <div>
                    <h2 className="text-sm font-semibold text-zinc-900">Phone:</h2>
                    <p className="mt-1 text-xs leading-5 text-zinc-600">(00) 1234 5678</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock3 className="mt-0.5 h-5 w-5 text-zinc-900" />
                  <div>
                    <h2 className="text-sm font-semibold text-zinc-900">We are open:</h2>
                    <p className="mt-1 text-xs leading-5 text-zinc-600">Monday - Thursday: 9:00 AM - 5:30 PM</p>
                    <p className="text-xs leading-5 text-zinc-600">Friday: 9:00 AM - 6:00 PM</p>
                    <p className="text-xs leading-5 text-zinc-600">Saturday: 11:00 AM - 5:00 PM</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Mail className="mt-0.5 h-5 w-5 text-zinc-900" />
                  <div>
                    <h2 className="text-sm font-semibold text-zinc-900">E-mail:</h2>
                    <a href="mailto:shop@email.com" className="mt-1 block text-xs text-blue-600 hover:underline">
                      shop@email.com
                    </a>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </section>
      </main>

      <SupportFeature />
      <SiteFooter />
    </div>
  )
}
