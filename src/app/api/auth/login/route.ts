import { createSession, setSessionCookie } from "@/lib/auth"
import { query } from "@/lib/db"
import { verifyPassword } from "@/lib/password"
import { NextRequest } from "next/server"
import type { RowDataPacket } from "mysql2/promise"

type LoginBody = {
  email?: string
  password?: string
}

type LoginUserRow = RowDataPacket & {
  id: string
  name: string
  email: string
  role: string
  phone: string | null
  avatar_url: string | null
  is_active: number | boolean
  created_at: string
  password_hash: string
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Failed"
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

    const [rows] = await query<LoginUserRow[]>(
      `SELECT id, name, email, role, phone, avatar_url, is_active, created_at, password_hash
       FROM users
       WHERE email = ?
       LIMIT 1`,
      [email]
    )

    const user = rows[0]
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

    const { sessionToken, expiresAt } = await createSession(user.id)
    await setSessionCookie(sessionToken, expiresAt)

    return Response.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        avatar_url: user.avatar_url,
        is_active: Boolean(user.is_active),
        created_at: user.created_at,
      },
    })
  } catch (error: unknown) {
    return Response.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
