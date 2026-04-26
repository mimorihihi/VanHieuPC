import { execute, query } from "@/lib/db"
import { NextRequest } from "next/server"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const search = searchParams.get("search") ?? ""
    const whereSql = search ? "WHERE name LIKE ?" : ""
    const params = search ? [`%${search}%`] : []
    const [brands, totalRows] = await Promise.all([
      query(`SELECT * FROM brands ${whereSql} ORDER BY name ASC`, params),
      query(`SELECT COUNT(*) as total FROM brands ${whereSql}`, params),
    ])

    return Response.json({ brands: brands[0], total: totalRows[0][0].total })
  } catch (error) {
    return Response.json({ error: "Failed" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, slug, logo_url, is_active } = body

    const id = crypto.randomUUID()
    await execute(
      `INSERT INTO brands (id, name, slug, logo_url, is_active)
       VALUES (?, ?, ?, ?, ?)`,
      [id, name, slug, logo_url ?? null, is_active ?? true]
    )
    const [rows] = await query("SELECT * FROM brands WHERE id = ? LIMIT 1", [id])
    return Response.json(rows[0], { status: 201 })
  } catch (error: any) {
    return Response.json({ error: error.message ?? "Failed" }, { status: 500 })
  }
}
