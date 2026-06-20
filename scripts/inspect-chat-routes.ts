import { query } from "../src/lib/db"
import type { RowDataPacket } from "mysql2/promise"

type ChatMessageInspectRow = RowDataPacket & {
  content: string
  metadata: string | null
  created_at: Date | string
}

async function main() {
  const [rows] = await query<ChatMessageInspectRow[]>(
    `SELECT content, metadata, created_at
     FROM chat_messages
     WHERE role = 'assistant'
     ORDER BY created_at DESC
     LIMIT 10`
  )

  for (const row of rows) {
    const metadata = typeof row.metadata === "string" ? JSON.parse(row.metadata) : (row.metadata || {})
    console.log("\n---", row.created_at)
    console.log(row.content.slice(0, 260).replace(/\n/g, " "))
    console.log(JSON.stringify({
      toolName: metadata.toolName,
      routing: metadata.routing,
      entities: metadata.entities,
    }, null, 2))
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
