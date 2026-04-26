import { query } from "@/lib/db"
import { NextRequest } from "next/server"

export async function GET(_req: NextRequest) {
  try {
    const [catRows]   = await query(`SELECT id, name, slug FROM categories WHERE is_active = true ORDER BY sort_order ASC`)
    const [brandRows] = await query(`SELECT id, name, slug FROM brands WHERE is_active = true ORDER BY name ASC`)

    // Price range
    const [priceRows] = await query(`SELECT MIN(price) as min_price, MAX(price) as max_price FROM products WHERE is_active = true`)
    const price = (priceRows as any)[0]

    return Response.json({
      categories: catRows,
      brands:     brandRows,
      priceRange: {
        min: Number(price?.min_price ?? 0),
        max: Number(price?.max_price ?? 10000),
      },
    })
  } catch (error) {
    console.error("[/api/products/filters]", error)
    return Response.json({ categories: [], brands: [], priceRange: { min: 0, max: 10000 } })
  }
}
