import { execute, query } from "@/lib/db"
import { NextRequest } from "next/server"
import type { RowDataPacket } from "mysql2/promise"

type UserRow = RowDataPacket & {
  id: string
  name: string
  email: string
  phone: string | null
  avatar_url: string | null
  role: string
  is_active: number | boolean
  created_at: string
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Failed"
}

function serializeUser(user: UserRow) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    avatar_url: user.avatar_url,
    role: user.role,
    is_active: Boolean(user.is_active),
    created_at: user.created_at,
  }
}

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get("user_id")?.trim() ?? ""
    if (!userId) {
      return Response.json({ error: "user_id is required" }, { status: 400 })
    }

    const [rows] = await query<UserRow[]>(
      `SELECT id, name, email, phone, avatar_url, role, is_active, created_at
       FROM users
       WHERE id = ?
       LIMIT 1`,
      [userId]
    )
    const user = rows[0]
    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 })
    }

    return Response.json({ user: serializeUser(user) })
  } catch (error: unknown) {
    return Response.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const userId = body.user_id?.trim() ?? ""
    const name = body.name?.trim() ?? ""
    const phone = body.phone?.trim() ?? null
    const avatarUrl = body.avatar_url?.trim() ?? null

    if (!userId || !name) {
      return Response.json({ error: "user_id and name are required" }, { status: 400 })
    }

    await execute(
      `UPDATE users
       SET name = ?, phone = ?, avatar_url = ?
       WHERE id = ?`,
      [name, phone, avatarUrl, userId]
    )

    const [rows] = await query<UserRow[]>(
      `SELECT id, name, email, phone, avatar_url, role, is_active, created_at
       FROM users
       WHERE id = ?
       LIMIT 1`,
      [userId]
    )

    return Response.json({ user: serializeUser(rows[0]) })
  } catch (error: unknown) {
    return Response.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
