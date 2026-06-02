import Link from "next/link"
import { AdminLoginForm } from "@/components/admin/admin-login-form"

export default function AdminLoginPage() {
  return (
    <main className="min-h-screen bg-zinc-50">
      <section className="container mx-auto px-4 py-10">
        <div className="mb-4 flex items-center gap-2 text-[11px] text-zinc-500">
          <Link href="/" className="hover:text-zinc-900">
            Home
          </Link>
          <span>&bull;</span>
          <span className="text-zinc-700">Admin Login</span>
        </div>

        <h1 className="mb-6 text-4xl font-semibold tracking-tight text-zinc-900">Admin Login</h1>

        <AdminLoginForm />
      </section>
    </main>
  )
}
