import type { RowDataPacket } from "mysql2/promise"

import { execute, query } from "@/lib/db"
import type { ChatHistoryMessage, ChatMessageRow, ChatSessionRow, ChatSessionSummary } from "../shared/types"

export async function ensureChatSession(sessionId?: string) {
  const resolvedSessionId = sessionId?.trim() || crypto.randomUUID()

  const [rows] = await query<RowDataPacket[]>(
    `SELECT id FROM chat_sessions WHERE id = ? LIMIT 1`,
    [resolvedSessionId]
  )

  if (!rows[0]) {
    await execute(
      `INSERT INTO chat_sessions (id, user_id, session_token)
       VALUES (?, NULL, ?)`,
      [resolvedSessionId, resolvedSessionId]
    )
  }

  return resolvedSessionId
}

export async function saveChatMessage(
  sessionId: string,
  role: "user" | "assistant",
  content: string,
  metadata?: Record<string, unknown>
) {
  const id = crypto.randomUUID()

  await execute(
    `INSERT INTO chat_messages (id, session_id, role, content, metadata)
     VALUES (?, ?, ?, ?, ?)`,
    [id, sessionId, role, content, metadata ? JSON.stringify(metadata) : null]
  )
}

export async function getChatHistory(sessionId?: string): Promise<ChatHistoryMessage[]> {
  const resolvedSessionId = sessionId?.trim()
  if (!resolvedSessionId) return []

  const [rows] = await query<ChatMessageRow[]>(
    `SELECT id, role, content, metadata, created_at
     FROM chat_messages
     WHERE session_id = ?
     ORDER BY created_at ASC`,
    [resolvedSessionId]
  )

  return rows.map((row) => ({
    id: row.id,
    role: row.role,
    content: row.content,
    createdAt:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : String(row.created_at),
  }))
}

export async function getChatSessions(currentSessionId?: string): Promise<ChatSessionSummary[]> {
  const [rows] = await query<ChatSessionRow[]>(
    `SELECT
       cs.id AS session_id,
       cs.created_at,
       (
         SELECT cm.content
         FROM chat_messages cm
         WHERE cm.session_id = cs.id
         ORDER BY cm.created_at DESC
         LIMIT 1
       ) AS latest_content
     FROM chat_sessions cs
     ORDER BY cs.created_at DESC
     LIMIT 10`
  )

  return rows.map((row, index) => {
    const preview = (row.latest_content ?? "Chưa có nội dung").trim()
    const title = index === 0 ? "Cuộc trò chuyện gần nhất" : `Cuộc trò chuyện #${index + 1}`

    return {
      sessionId: row.session_id,
      title,
      preview: preview.length > 72 ? `${preview.slice(0, 72)}...` : preview,
      createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
      isCurrent: currentSessionId?.trim() === row.session_id,
    }
  })
}
