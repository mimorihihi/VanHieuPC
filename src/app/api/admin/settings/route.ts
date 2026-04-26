import { execute, query } from "@/lib/db"
import { NextRequest } from "next/server"

export async function GET(_req: NextRequest) {
  try {
    const [settings] = await query("SELECT `key`, `value` FROM site_settings")
    const map: Record<string, string> = {}
    settings.forEach((s: any) => {
      map[s.key] = s.value
    })
    return Response.json(map)
  } catch {
    return Response.json({ error: "Failed" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: Record<string, string> = await req.json()
    const ops = Object.entries(body).map(([key, value]) =>
      execute(
        `INSERT INTO site_settings (\`key\`, \`value\`)
         VALUES (?, ?)
         ON DUPLICATE KEY UPDATE \`value\` = VALUES(\`value\`)`,
        [key, value]
      )
    )
    await Promise.all(ops)
    return Response.json({ success: true })
  } catch (error: any) {
    return Response.json({ error: error.message ?? "Failed" }, { status: 500 })
  }
}
