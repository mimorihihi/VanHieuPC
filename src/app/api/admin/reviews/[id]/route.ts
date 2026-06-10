import { getAuthUser } from "@/lib/auth"
import { execute } from "@/lib/db"
import { NextRequest } from "next/server"

const ALLOWED_REVIEW_STATUSES = ["APPROVED", "HIDDEN"] as const

type ReviewModerationStatus = (typeof ALLOWED_REVIEW_STATUSES)[number]

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Failed"
}

function isReviewModerationStatus(value: string): value is ReviewModerationStatus {
  return ALLOWED_REVIEW_STATUSES.includes(value as ReviewModerationStatus)
}

async function requireAdmin() {
  const authUser = await getAuthUser()
  return authUser?.role === "ADMIN" ? authUser : null
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin()
    if (!admin) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()
    const status = String(body.status ?? "").trim().toUpperCase()

    if (!isReviewModerationStatus(status)) {
      return Response.json({ error: "Invalid review status" }, { status: 400 })
    }

    await execute("UPDATE reviews SET status = ? WHERE id = ?", [status, id])

    return Response.json({ success: true, status })
  } catch (error: unknown) {
    return Response.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
