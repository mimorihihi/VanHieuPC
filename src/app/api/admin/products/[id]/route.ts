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

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const [rows] = await query(
      `SELECT
        p.*,
        c.id as category_join_id, c.name as category_join_name,
        b.id as brand_join_id, b.name as brand_join_name
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN brands b ON b.id = p.brand_id
      WHERE p.id = ?
      LIMIT 1`,
      [id]
    )
    const product = rows[0] as any
    if (!product) return Response.json({ error: "Not found" }, { status: 404 })
    product.category = product.category_join_id
      ? { id: product.category_join_id, name: product.category_join_name }
      : null
    product.brand = product.brand_join_id
      ? { id: product.brand_join_id, name: product.brand_join_name }
      : null
    product.specs = typeof product.specs === "string" ? JSON.parse(product.specs) : product.specs
    const [images] = await query(
      "SELECT id, product_id, url, sort_order FROM product_images WHERE product_id = ? ORDER BY sort_order ASC",
      [id]
    )
    const [variants] = await query(
      "SELECT * FROM product_variants WHERE product_id = ? ORDER BY name ASC",
      [id]
    )
    product.images = images
    product.variants = variants.map((v: any) => ({
      ...v,
      attributes: typeof v.attributes === "string" ? JSON.parse(v.attributes) : v.attributes,
    }))
    return Response.json(serializeProduct(product))
  } catch (error) {
    return Response.json({ error: "Failed" }, { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const { name, slug, description, price, sale_price, stock, thumbnail_url, category_id, brand_id, is_active, is_featured, specs } = body

    await execute(
      `UPDATE products
       SET name = ?, slug = ?, description = ?, price = ?, sale_price = ?, stock = ?,
           thumbnail_url = ?, category_id = ?, brand_id = ?, is_active = ?, is_featured = ?, specs = ?
       WHERE id = ?`,
      [
        name,
        slug,
        description,
        price,
        sale_price ?? null,
        stock,
        thumbnail_url ?? null,
        category_id,
        brand_id ?? null,
        is_active,
        is_featured,
        JSON.stringify(specs ?? {}),
        id,
      ]
    )
    const [rows] = await query("SELECT * FROM products WHERE id = ? LIMIT 1", [id])
    return Response.json(serializeProduct(rows[0]))
  } catch (error: any) {
    return Response.json({ error: error.message ?? "Failed" }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await execute("DELETE FROM products WHERE id = ?", [id])
    return Response.json({ success: true })
  } catch (error) {
    return Response.json({ error: "Failed to delete" }, { status: 500 })
  }
}
