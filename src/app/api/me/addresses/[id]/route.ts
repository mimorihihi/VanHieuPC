import { getAuthUser } from "@/lib/auth"
import { execute, query } from "@/lib/db"
import { NextRequest } from "next/server"
import type { RowDataPacket } from "mysql2/promise"

type AddressRow = RowDataPacket & {
  id: string
  user_id: string
  full_name: string
  phone: string
  province: string
  district: string
  ward: string
  address_line: string
  is_default: number | boolean
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Failed"
}

function parseIsDefault(value: unknown) {
  return value === true || value === "true" || value === 1 || value === "1"
}

async function requireAuthUserId() {
  const authUser = await getAuthUser()
  return authUser?.id ?? ""
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireAuthUserId()
    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()
    const fullName = body.full_name?.trim() ?? ""
    const phone = body.phone?.trim() ?? ""
    const province = body.province?.trim() ?? ""
    const district = body.district?.trim() ?? ""
    const ward = body.ward?.trim() ?? ""
    const addressLine = body.address_line?.trim() ?? ""
    const isDefault = parseIsDefault(body.is_default)

    if (!fullName || !phone || !province || !district || !ward || !addressLine) {
      return Response.json({ error: "All address fields are required" }, { status: 400 })
    }

    const [existingRows] = await query<RowDataPacket[]>(
      "SELECT id FROM addresses WHERE id = ? AND user_id = ? LIMIT 1",
      [id, userId]
    )
    if (existingRows.length === 0) {
      return Response.json({ error: "Address not found" }, { status: 404 })
    }

    if (isDefault) {
      await execute("UPDATE addresses SET is_default = 0 WHERE user_id = ?", [userId])
    }

    await execute(
      `UPDATE addresses
       SET full_name = ?, phone = ?, province = ?, district = ?, ward = ?, address_line = ?, is_default = ?
       WHERE id = ? AND user_id = ?`,
      [fullName, phone, province, district, ward, addressLine, isDefault, id, userId]
    )

    const [rows] = await query<AddressRow[]>(
      `SELECT id, user_id, full_name, phone, province, district, ward, address_line, is_default
       FROM addresses
       WHERE id = ? AND user_id = ?
       LIMIT 1`,
      [id, userId]
    )

    const address = rows[0]
    return Response.json({
      address: address ? { ...address, is_default: Boolean(address.is_default) } : null,
    })
  } catch (error: unknown) {
    return Response.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireAuthUserId()
    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    await execute("DELETE FROM addresses WHERE id = ? AND user_id = ?", [id, userId])
    return Response.json({ success: true })
  } catch (error: unknown) {
    return Response.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
