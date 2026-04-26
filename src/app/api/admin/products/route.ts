import { execute, query } from "@/lib/db"
import { NextRequest } from "next/server"

function serializeProduct(p: any) {
  return {
    ...p,
    price: p.price?.toString() ?? "0",
    sale_price: p.sale_price?.toString() ?? null,
    avg_rating: p.avg_rating?.toString() ?? "0",
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const page = parseInt(searchParams.get("page") ?? "1")
    const limit = parseInt(searchParams.get("limit") ?? "20")
    const search = searchParams.get("search") ?? ""

    const whereSql = search ? "WHERE p.name LIKE ?" : ""
    const whereParams = search ? [`%${search}%`] : []
    const [productsRows, totalRows] = await Promise.all([
      query(
        `SELECT
          p.*,
          c.id as category_join_id, c.name as category_join_name,
          b.id as brand_join_id, b.name as brand_join_name
        FROM products p
        LEFT JOIN categories c ON c.id = p.category_id
        LEFT JOIN brands b ON b.id = p.brand_id
        ${whereSql}
        ORDER BY p.created_at DESC
        LIMIT ? OFFSET ?`,
        [...whereParams, limit, (page - 1) * limit]
      ),
      query(`SELECT COUNT(*) as total FROM products p ${whereSql}`, whereParams),
    ])
    const products = productsRows[0].map((p: any) => ({
      ...p,
      category: p.category_join_id ? { id: p.category_join_id, name: p.category_join_name } : null,
      brand: p.brand_join_id ? { id: p.brand_join_id, name: p.brand_join_name } : null,
      specs: typeof p.specs === "string" ? JSON.parse(p.specs) : p.specs,
    }))

    return Response.json({
      products: products.map(serializeProduct),
      total: totalRows[0][0].total,
      page,
      limit,
    })
  } catch (error) {
    console.error(error)
    return Response.json({ error: "Failed to fetch products" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, slug, description, price, sale_price, stock, thumbnail_url, category_id, brand_id, is_active, is_featured, specs } = body

    const id = crypto.randomUUID()
    await execute(
      `INSERT INTO products
      (id, name, slug, description, price, sale_price, stock, thumbnail_url, category_id, brand_id, specs, avg_rating, is_active, is_featured, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, NOW())`,
      [
        id,
        name,
        slug,
        description ?? "",
        price,
        sale_price ?? null,
        stock ?? 0,
        thumbnail_url ?? null,
        category_id,
        brand_id ?? null,
        JSON.stringify(specs ?? {}),
        is_active ?? true,
        is_featured ?? false,
      ]
    )
    const [rows] = await query("SELECT * FROM products WHERE id = ? LIMIT 1", [id])
    return Response.json(serializeProduct(rows[0]), { status: 201 })
  } catch (error: any) {
    console.error(error)
    return Response.json({ error: error.message ?? "Failed to create product" }, { status: 500 })
  }
}
