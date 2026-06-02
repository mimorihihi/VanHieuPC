import { NextRequest } from "next/server"

import { getChatHistory, getChatSessions, handleChatbotMessage } from "@/lib/chatbot"

type ChatbotBody = {
  sessionId?: string
  message?: string
}

export async function GET(req: NextRequest) {
  try {
    const sessionId = req.nextUrl.searchParams.get("sessionId")?.trim() ?? ""
    const [messages, sessions] = await Promise.all([
      getChatHistory(sessionId),
      getChatSessions(sessionId),
    ])

    return Response.json({ messages, sessions })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load chat history"
    return Response.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: ChatbotBody = await req.json()
    const sessionId = body.sessionId?.trim() ?? ""
    const message = body.message?.trim() ?? ""

    if (!message) {
      return Response.json({ error: "message is required" }, { status: 400 })
    }

    const result = await handleChatbotMessage(message, sessionId)
    return Response.json(result)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to process chatbot request"
    return Response.json({ error: message }, { status: 500 })
  }
}
