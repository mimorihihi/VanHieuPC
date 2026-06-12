"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Bot, Clock3, MessageSquare, ShoppingCart, Sparkles, X, Send, Package } from "lucide-react"

import { cn } from "@/lib/utils"

const QUICK_ACTIONS = [
  {
    id: "faq-shipping",
    label: "Chính sách giao hàng",
    message: "FAQ: Chính sách giao hàng của shop như thế nào? Shop có giao hàng toàn quốc không?",
    icon: Package,
  },
  {
    id: "faq-payment",
    label: "Hướng dẫn thanh toán",
    message: "FAQ: Hướng dẫn thanh toán của shop như thế nào? Shop hỗ trợ COD hoặc checkout ra sao?",
    icon: Sparkles,
  },
  {
    id: "faq-return",
    label: "Chính sách đổi trả",
    message: "FAQ: Chính sách đổi trả của shop như thế nào? Khi nào được đổi trả hoặc hoàn tiền?",
    icon: MessageSquare,
  },
  {
    id: "faq-warranty",
    label: "Chính sách bảo hành",
    message: "FAQ: Chính sách bảo hành của shop như thế nào?",
    icon: ShoppingCart,
  },
] as const

type QuickActionId = (typeof QUICK_ACTIONS)[number]["id"]

type ChatbotBody = {
  sessionId?: string
  message?: string
}

type ChatSessionSummary = {
  sessionId: string
  title: string
  preview: string
  createdAt?: string
  isCurrent?: boolean
}

type ChatMessage = {
  id: string
  role: "assistant" | "user"
  content: string
}

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: "assistant-welcome",
    role: "assistant",
    content:
      "Xin chào! Mình có thể hỗ trợ, hướng dẫn gì cho bạn.",
  },
  
]

const CHATBOT_SESSION_KEY = "chatbot_session_id"

export function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [input, setInput] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [sessionId, setSessionId] = useState(() => {
    if (typeof window === "undefined") return ""
    return window.localStorage.getItem(CHATBOT_SESSION_KEY) ?? ""
  })
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES)
  const scrollRef = useRef<HTMLDivElement | null>(null)

  const hasMessages = messages.length > 0

  useEffect(() => {
    if (!scrollRef.current) return
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, isOpen])

  const loadSessions = async (targetSessionId?: string) => {
    const query = targetSessionId ? `?sessionId=${encodeURIComponent(targetSessionId)}` : ""
    const response = await fetch(`/api/chatbot${query}`)
    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || "Không thể tải danh sách hội thoại.")
    }

    if (Array.isArray(data.sessions)) {
      setSessions(data.sessions)
    }

    return data
  }

  const loadHistory = async (targetSessionId: string) => {
    if (!targetSessionId) return

    setIsLoadingHistory(true)

    try {
      const data = await loadSessions(targetSessionId)

      if (Array.isArray(data.messages) && data.messages.length > 0) {
        setMessages(
          data.messages.map((message: ChatMessage) => ({
            id: message.id,
            role: message.role,
            content: message.content,
          }))
        )
      } else {
        setMessages(INITIAL_MESSAGES)
      }
    } finally {
      setIsLoadingHistory(false)
    }
  }

  const statusText = useMemo(() => {
    if (isLoadingHistory) return "Đang tải hội thoại"
    return isOpen ? "Đang hỗ trợ" : "Sẵn sàng tư vấn"
  }, [isLoadingHistory, isOpen])


  const sendMessage = async (messageText: string) => {
    const trimmed = messageText.trim()
    if (!trimmed || isSending) return

    setIsOpen(true)
    setIsSending(true)

    const assistantMessageId = crypto.randomUUID()

    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role: "user",
        content: trimmed,
      },
      {
        id: assistantMessageId,
        role: "assistant",
        content: "",
      },
    ])

    try {
      const body: ChatbotBody = {
        sessionId,
        message: trimmed,
      }

      const response = await fetch("/api/chatbot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || "Không thể xử lý yêu cầu lúc này.")
      }

      const nextSessionId = response.headers.get("x-chat-session-id")
      if (nextSessionId) {
        setSessionId(nextSessionId)
        window.localStorage.setItem(CHATBOT_SESSION_KEY, nextSessionId)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error("Không thể đọc phản hồi từ chatbot.")
      }

      const decoder = new TextDecoder()
      let streamedContent = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        streamedContent += decoder.decode(value, { stream: true })
        setMessages((prev) =>
          prev.map((message) =>
            message.id === assistantMessageId
              ? { ...message, content: streamedContent }
              : message
          )
        )
      }

      const finalChunk = decoder.decode()
      if (finalChunk) {
        streamedContent += finalChunk
        setMessages((prev) =>
          prev.map((message) =>
            message.id === assistantMessageId
              ? { ...message, content: streamedContent }
              : message
          )
        )
      }

      if (!streamedContent.trim()) {
        setMessages((prev) =>
          prev.map((message) =>
            message.id === assistantMessageId
              ? { ...message, content: "Mình chưa tạo được phản hồi phù hợp. Bạn vui lòng thử lại nhé." }
              : message
          )
        )
      }
    } catch (error) {
      setMessages((prev) =>
        prev.map((message) =>
          message.id === assistantMessageId
            ? {
                ...message,
                content:
                  error instanceof Error
                    ? error.message
                    : "Hệ thống đang bận, bạn vui lòng thử lại sau.",
              }
            : message
        )
      )
    } finally {
      setIsSending(false)
    }
  }

  const handleQuickAction = (actionId: QuickActionId) => {
    const action = QUICK_ACTIONS.find((item) => item.id === actionId)
    if (!action) return

    void sendMessage(action.message)
  }

  const handleStartNewChat = () => {
    window.localStorage.removeItem(CHATBOT_SESSION_KEY)
    setSessionId("")
    setIsHistoryOpen(false)
    setSessions((prev) =>
      prev.map((item) => ({
        ...item,
        isCurrent: false,
      }))
    )
    setMessages(INITIAL_MESSAGES)
    setInput("")
    setIsOpen(true)
    void loadSessions().catch(() => undefined)
  }

  const handleSelectSession = (targetSessionId: string) => {
    if (!targetSessionId || isLoadingHistory) return

    setSessionId(targetSessionId)
    window.localStorage.setItem(CHATBOT_SESSION_KEY, targetSessionId)
    setIsHistoryOpen(false)
    setIsOpen(true)
    void loadHistory(targetSessionId)
  }

  const handleReviewChat = () => {
    setIsOpen(true)
    setIsHistoryOpen((prev) => !prev)

    if (!isHistoryOpen) {
      void loadSessions(sessionId || undefined).catch(() => undefined)
    }
  }

  const handleSubmit = () => {
    const trimmed = input.trim()
    if (!trimmed) return

    setInput("")
    void sendMessage(trimmed)
  }

  return (
    <>
      <div className="pointer-events-none fixed right-4 bottom-4 z-50 flex w-[calc(100vw-2rem)] max-w-[360px] flex-col items-end gap-2.5 sm:right-5 sm:bottom-5">
        <div
          className={cn(
            "pointer-events-auto w-full origin-bottom-right overflow-hidden rounded-[24px] border border-zinc-200 bg-white text-zinc-900 shadow-[0_18px_60px_rgba(15,23,42,0.12)] transition-all duration-300",
            isOpen
              ? "translate-y-0 scale-100 opacity-100"
              : "pointer-events-none translate-y-6 scale-95 opacity-0"
          )}
        >
          <div className="relative overflow-hidden border-b border-zinc-200 bg-gradient-to-br from-sky-50 via-white to-cyan-50 px-4 pt-4 pb-3.5">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-300 to-transparent" />
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 via-cyan-500 to-blue-600 text-white shadow-[0_10px_24px_rgba(14,165,233,0.24)]">
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold tracking-wide text-zinc-900">Chăm sóc khách hàng</p>
                  <div className="mt-1 flex items-center gap-2 text-[11px] text-zinc-500">
                    <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.35)]" />
                    <span>{statusText}</span>
                  </div>
                </div>
              </div>
              <button
                id="chatbot-close-button"
                type="button"
                onClick={() => setIsOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-500 transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900"
                aria-label="Đóng chatbot"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-3 flex items-start justify-between gap-2.5">
              
              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  id="chatbot-review-session-button"
                  type="button"
                  onClick={handleReviewChat}
                  disabled={isLoadingHistory}
                  className="rounded-full border border-zinc-200 bg-white px-3 py-2 text-[11px] font-medium text-zinc-600 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isHistoryOpen ? "Ẩn lại" : "Xem lại"}
                </button>
                <button
                  id="chatbot-new-session-button"
                  type="button"
                  onClick={handleStartNewChat}
                  className="rounded-full border border-zinc-200 bg-white px-3 py-2 text-[11px] font-medium text-zinc-600 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700"
                >
                  Chat mới
                </button>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-b from-white to-zinc-50">
            {isHistoryOpen && sessions.length > 0 ? (
              <div className="border-b border-zinc-200 px-3.5 pt-2.5 pb-2">
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-400">
                  Cuộc trò chuyện gần đây
                </div>
                <div className="max-h-[132px] space-y-2 overflow-y-auto">
                  {sessions.map((item) => (
                    <button
                      key={item.sessionId}
                      id={`chatbot-session-item-${item.sessionId}`}
                      type="button"
                      onClick={() => handleSelectSession(item.sessionId)}
                      disabled={isLoadingHistory}
                      className={cn(
                        "flex w-full items-start gap-2 rounded-2xl border px-3 py-2.5 text-left transition disabled:cursor-not-allowed disabled:opacity-60",
                        item.isCurrent
                          ? "border-sky-200 bg-sky-50 text-sky-900"
                          : "border-zinc-200 bg-white text-zinc-700 hover:border-sky-200 hover:bg-sky-50"
                      )}
                    >
                      <div
                        className={cn(
                          "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                          item.isCurrent ? "bg-sky-100 text-sky-600" : "bg-zinc-100 text-zinc-500"
                        )}
                      >
                        <Clock3 className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="block text-[11px] font-semibold">{item.title}</span>
                        <span className="mt-1 flex items-center gap-1.5 text-[11px] leading-4 text-zinc-500">
                          <span className="inline-block h-3 w-0.5 rounded-full bg-zinc-300" />
                          <span className="truncate">{item.preview}</span>
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div ref={scrollRef} className="max-h-[392px] space-y-3 overflow-y-auto px-3.5 py-3">
              {hasMessages ? (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "flex w-full",
                      message.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[90%] rounded-[22px] px-3.5 py-2.5 text-[13px] leading-6 shadow-sm",
                        message.role === "user"
                          ? "rounded-br-md bg-gradient-to-r from-sky-500 to-blue-600 text-white"
                          : "rounded-bl-md border border-zinc-200 bg-white text-zinc-700"
                      )}
                    >
                      <p>{message.content}</p>
                    </div>
                  </div>
                ))
              ) : null}
            </div>

            <div className="border-t border-zinc-200 px-3.5 pt-3.5 pb-3">
              <div className="mb-2.5 flex flex-wrap gap-2">
                {QUICK_ACTIONS.map((action) => {
                  const Icon = action.icon
                  return (
                    <button
                      key={action.id}
                      id={`chatbot-quick-action-${action.id}`}
                      type="button"
                      onClick={() => handleQuickAction(action.id)}
                      disabled={isSending}
                      className="group inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-zinc-700 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Icon className="h-3.5 w-3.5 text-sky-500 transition group-hover:text-sky-600" />
                      <span>{action.label}</span>
                    </button>
                  )
                })}
              </div>

              <div className="rounded-[20px] border border-zinc-200 bg-white p-1.5 shadow-[0_6px_20px_rgba(15,23,42,0.06)]">
                <div className="flex items-end gap-2">
                  <label htmlFor="chatbot-message-input" className="sr-only">
                    Nhập tin nhắn cho chatbot
                  </label>
                  <textarea
                    id="chatbot-message-input"
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault()
                        handleSubmit()
                      }
                    }}
                    rows={1}
                    placeholder="Hỏi về giá, tồn kho hoặc chính sách..."
                    className="min-h-[46px] flex-1 resize-none bg-transparent px-3 py-2.5 text-[13px] text-zinc-800 placeholder:text-zinc-400 focus:outline-none"
                  />
                  <button
                    id="chatbot-send-button"
                    type="button"
                    onClick={handleSubmit}
                    disabled={isSending}
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-[0_10px_20px_rgba(37,99,235,0.22)] transition hover:scale-[1.03] hover:shadow-[0_14px_28px_rgba(37,99,235,0.28)] disabled:cursor-not-allowed disabled:opacity-60"
                    aria-label="Gửi tin nhắn"
                  >
                    {isSending ? <Bot className="h-4 w-4 animate-pulse" /> : <Send className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <button
          id="chatbot-launcher-button"
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="pointer-events-auto inline-flex h-11 w-11 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-700 shadow-[0_12px_30px_rgba(15,23,42,0.12)] transition hover:-translate-y-0.5 hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700"
          aria-label="Mở chatbot hỗ trợ"
        >
          <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 via-cyan-500 to-blue-600 text-white shadow-[0_8px_18px_rgba(37,99,235,0.2)]">
            <MessageSquare className="h-4 w-4" />
            <span className="absolute -top-0.5 -right-0.5 inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
          </span>
        </button>
      </div>
    </>
  )
}
