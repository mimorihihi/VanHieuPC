import { query } from "@/lib/db"
import { NextRequest } from "next/server"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const page    = Math.max(1, parseInt(searchParams.get("page")  ?? "1"))
    const limit   = Math.min(60, parseInt(searchParams.get("limit") ?? "20"))
    const search  = searchParams.get("search") ?? ""
    const category = searchParams.get("category") ?? ""   // slug
    const brand    = searchParams.get("brand")    ?? ""   // slug
    const minPrice = searchParams.get("minPrice") ?? ""
    const maxPrice = searchParams.get("maxPrice") ?? ""
    const sort     = searchParams.get("sort")     ?? "newest"

    const conditions: string[] = ["p.is_active = true"]
    const params: (string | number)[] = []

    if (search)   { conditions.push("p.name LIKE ?"); params.push(`%${search}%`) }
    if (category) { conditions.push("c.slug = ?");   params.push(category) }
    if (brand)    { conditions.push("br.slug = ?");  params.push(brand) }
    if (minPrice) { conditions.push("p.price >= ?"); params.push(Number(minPrice)) }
    if (maxPrice) { conditions.push("p.price <= ?"); params.push(Number(maxPrice)) }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : ""

    const orderMap: Record<string, string> = {
      newest:     "p.created_at DESC",
      price_asc:  "p.price ASC",
      price_desc: "p.price DESC",
      rating:     "p.avg_rating DESC",
      name_asc:   "p.name ASC",
    }
    const orderBy = orderMap[sort] ?? "p.created_at DESC"

    const offset = (page - 1) * limit

    const [productsRows, totalRows] = await Promise.all([
      query(
        `SELECT
          p.id, p.name, p.slug, p.price, p.sale_price, p.stock,
          p.thumbnail_url, p.avg_rating, p.is_featured,
          c.id as category_id, c.name as category_name, c.slug as category_slug,
          br.id as brand_id, br.name as brand_name, br.slug as brand_slug
        FROM products p
        LEFT JOIN categories c  ON c.id  = p.category_id
        LEFT JOIN brands     br ON br.id = p.brand_id
        ${whereClause}
        ORDER BY ${orderBy}
        LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      ),
      query(
        `SELECT COUNT(*) as total
         FROM products p
         LEFT JOIN categories c  ON c.id  = p.category_id
         LEFT JOIN brands     br ON br.id = p.brand_id
         ${whereClause}`,
        params
      ),
    ])

    const products = productsRows[0].map((p: any) => ({
      id:            p.id,
      name:          p.name,
      slug:          p.slug,
      price:         p.price?.toString() ?? "0",
      sale_price:    p.sale_price?.toString() ?? null,
      stock:         p.stock,
      thumbnail_url: p.thumbnail_url,
      avg_rating:    Number(p.avg_rating ?? 0),
      is_featured:   Boolean(p.is_featured),
      category:      p.category_id ? { id: p.category_id, name: p.category_name, slug: p.category_slug } : null,
      brand:         p.brand_id    ? { id: p.brand_id,    name: p.brand_name,    slug: p.brand_slug    } : null,
    }))

    const total = Number((totalRows[0] as any)[0]?.total ?? 0)

    return Response.json({
      products,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error("[/api/products] Error:", error)
    return Response.json({ error: "Failed to fetch products" }, { status: 500 })
  }
}
