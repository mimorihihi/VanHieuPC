import { query } from "@/lib/db"
import { verifyPassword } from "@/lib/password"
import { NextRequest } from "next/server"

type LoginBody = {
  email?: string
  password?: string
}

export async function POST(req: NextRequest) {
  try {
    const body: LoginBody = await req.json()
    const email = body.email?.trim().toLowerCase() ?? ""
    const password = body.password ?? ""

    if (!email || !password) {
      return Response.json(
        { error: "email and password are required" },
        { status: 400 }
      )
    }

    const [rows] = await query(
      `SELECT id, name, email, role, phone, avatar_url, is_active, created_at, password_hash
       FROM users
       WHERE email = ?
       LIMIT 1`,
      [email]
    )

    const user = rows[0] as any
    if (!user) {
      return Response.json({ error: "Invalid credentials" }, { status: 401 })
    }

    if (!user.is_active) {
      return Response.json({ error: "Account is inactive" }, { status: 403 })
    }

    const isValidPassword = verifyPassword(password, user.password_hash)
    if (!isValidPassword) {
      return Response.json({ error: "Invalid credentials" }, { status: 401 })
    }

    return Response.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        avatar_url: user.avatar_url,
        is_active: user.is_active,
        created_at: user.created_at,
      },
    })
  } catch (error: any) {
    return Response.json({ error: error.message ?? "Failed" }, { status: 500 })
  }
}
