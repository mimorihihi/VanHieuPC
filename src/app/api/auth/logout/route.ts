import { clearSessionCookie, deleteSession, getSessionToken } from "@/lib/auth"

export async function POST() {
  try {
    const sessionToken = await getSessionToken()

    if (sessionToken) {
      await deleteSession(sessionToken)
    }

    await clearSessionCookie()

    return Response.json({ success: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed"
    return Response.json({ error: message }, { status: 500 })
  }
}
