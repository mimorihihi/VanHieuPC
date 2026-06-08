import { cookies } from "next/headers"
import type { RowDataPacket } from "mysql2/promise"
import { execute, query } from "@/lib/db"

const SESSION_COOKIE_NAME = "session_token"
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 7

type SessionRow = RowDataPacket & {
  id: string
  sessionToken: string
  userId: string
  expires: Date | string
}

type AuthUserRow = RowDataPacket & {
  id: string
  name: string
  email: string
  role: string
  phone: string | null
  avatar_url: string | null
  is_active: number | boolean
  created_at: string
}

export type SessionUser = {
  id: string
  name: string
  email: string
  role: string
  phone: string | null
  avatar_url: string | null
  is_active: boolean
  created_at: string
}

function toSessionUser(user: AuthUserRow): SessionUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    avatar_url: user.avatar_url,
    is_active: Boolean(user.is_active),
    created_at: user.created_at,
  }
}

export function getSessionCookieName() {
  return SESSION_COOKIE_NAME
}

export function getSessionExpiresAt() {
  return new Date(Date.now() + SESSION_DURATION_MS)
}

export async function createSession(userId: string) {
  const sessionToken = crypto.randomUUID()
  const sessionId = crypto.randomUUID()
  const expiresAt = getSessionExpiresAt()

  await execute(
    `INSERT INTO sessions (id, sessionToken, userId, expires)
     VALUES (?, ?, ?, ?)`,
    [sessionId, sessionToken, userId, expiresAt]
  )

  return { sessionToken, expiresAt }
}

export async function setSessionCookie(sessionToken: string, expiresAt: Date) {
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  })
}

export async function clearSessionCookie() {
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
  })
}

export async function getSessionToken() {
  const cookieStore = await cookies()
  return cookieStore.get(SESSION_COOKIE_NAME)?.value ?? ""
}

export async function deleteSession(sessionToken: string) {
  if (!sessionToken) return

  await execute(`DELETE FROM sessions WHERE sessionToken = ?`, [sessionToken])
}

export async function getAuthUser() {
  const sessionToken = await getSessionToken()
  if (!sessionToken) {
    return null
  }

  const [sessions] = await query<SessionRow[]>(
    `SELECT id, sessionToken, userId, expires
     FROM sessions
     WHERE sessionToken = ?
     LIMIT 1`,
    [sessionToken]
  )

  const session = sessions[0]
  if (!session) {
    return null
  }

  const expiresAt = new Date(session.expires)
  if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) {
    await deleteSession(sessionToken)
    await clearSessionCookie()
    return null
  }

  const [users] = await query<AuthUserRow[]>(
    `SELECT id, name, email, role, phone, avatar_url, is_active, created_at
     FROM users
     WHERE id = ?
     LIMIT 1`,
    [session.userId]
  )

  const user = users[0]
  if (!user || !user.is_active) {
    await deleteSession(sessionToken)
    await clearSessionCookie()
    return null
  }

  return toSessionUser(user)
}
