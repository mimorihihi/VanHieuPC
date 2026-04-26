import { execute, query } from "@/lib/db"
import { hashPassword } from "@/lib/password"
import { NextRequest } from "next/server"

type RegisterBody = {
  name?: string
  email?: string
  password?: string
  phone?: string
}

export async function POST(req: NextRequest) {
  try {
    const body: RegisterBody = await req.json()
    const name = body.name?.trim() ?? ""
    const email = body.email?.trim().toLowerCase() ?? ""
    const password = body.password ?? ""
    const phone = body.phone?.trim() ?? null

    if (!name || !email || !password) {
      return Response.json(
        { error: "name, email, password are required" },
        { status: 400 }
      )
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      return Response.json({ error: "Email format is invalid" }, { status: 400 })
    }

    if (password.length < 6) {
      return Response.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      )
    }

    const [existingRows] = await query(
      "SELECT id FROM users WHERE email = ? LIMIT 1",
      [email]
    )

    if (existingRows.length > 0) {
      return Response.json({ error: "Email already exists" }, { status: 409 })
    }

    const id = crypto.randomUUID()
    const passwordHash = hashPassword(password)

    await execute(
      `INSERT INTO users (id, name, email, password_hash, role, phone, is_active)
       VALUES (?, ?, ?, ?, 'USER', ?, 1)`,
      [id, name, email, passwordHash, phone]
    )

    const [userRows] = await query(
      `SELECT id, name, email, role, phone, avatar_url, is_active, created_at
       FROM users WHERE id = ? LIMIT 1`,
      [id]
    )

    return Response.json(
      { success: true, user: userRows[0] ?? null },
      { status: 201 }
    )
  } catch (error: any) {
    return Response.json({ error: error.message ?? "Failed" }, { status: 500 })
  }
}
