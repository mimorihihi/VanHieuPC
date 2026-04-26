import { execute, query } from "@/lib/db"
import { NextRequest } from "next/server"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const search = searchParams.get("search") ?? ""
    const whereSql = search ? "WHERE c.name LIKE ?" : ""
    const params = search ? [`%${search}%`] : []
    const [categoriesRows, totalRows] = await Promise.all([
      query(
        `SELECT c.*, p.id as parent_join_id, p.name as parent_join_name
         FROM categories c
         LEFT JOIN categories p ON p.id = c.parent_id
         ${whereSql}
         ORDER BY c.sort_order ASC`,
        params
      ),
      query(`SELECT COUNT(*) as total FROM categories c ${whereSql}`, params),
    ])
    const categories = categoriesRows[0].map((row: any) => ({
      ...row,
      parent: row.parent_join_id
        ? { id: row.parent_join_id, name: row.parent_join_name }
        : null,
    }))

    return Response.json({ categories, total: totalRows[0][0].total })
  } catch (error) {
    return Response.json({ error: "Failed" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, slug, parent_id, image_url, is_active, sort_order } = body

    const id = crypto.randomUUID()
    await execute(
      `INSERT INTO categories (id, name, slug, parent_id, image_url, is_active, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, name, slug, parent_id ?? null, image_url ?? null, is_active ?? true, sort_order ?? 0]
    )
    const [rows] = await query("SELECT * FROM categories WHERE id = ? LIMIT 1", [id])
    return Response.json(rows[0], { status: 201 })
  } catch (error: any) {
    return Response.json({ error: error.message ?? "Failed" }, { status: 500 })
  }
}
