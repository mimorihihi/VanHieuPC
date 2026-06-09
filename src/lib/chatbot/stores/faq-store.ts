import { query } from "@/lib/db"
import { FAQ_FALLBACK } from "../shared/constants"
import { getMeaningfulTokens, normalizeText } from "../shared/text-utils"
import type { FaqRow } from "../shared/types"

export async function searchFaq(message: string) {
  const normalizedMessage = normalizeText(message)
  const tokens = getMeaningfulTokens(message)

  try {
    const [rows] = await query<FaqRow[]>(
      `SELECT id, title, question, content, answer, keywords
       FROM chatbot_faq
       WHERE is_active = true`
    )

    const scored = rows
      .map((row) => {
        const title = row.title ?? row.question ?? "FAQ"
        const content = row.content ?? row.answer ?? ""
        const question = row.question ?? ""
        const answer = row.answer ?? ""
        const keywords = row.keywords ?? ""
        const haystack = normalizeText(`${title} ${question} ${content} ${answer} ${keywords}`)
        const normalizedTitle = normalizeText(title)
        const normalizedQuestion = normalizeText(question)
        const normalizedKeywords = normalizeText(keywords)

        let score = 0

        if (normalizedMessage && haystack.includes(normalizedMessage)) score += 8
        if (normalizedMessage && normalizedTitle.includes(normalizedMessage)) score += 6
        if (normalizedMessage && normalizedQuestion.includes(normalizedMessage)) score += 6

        for (const token of tokens) {
          if (!token) continue
          if (normalizedTitle.includes(token)) score += 4
          if (normalizedQuestion.includes(token)) score += 4
          if (normalizedKeywords.includes(token)) score += 3
          if (haystack.includes(token)) score += 2
        }

        return {
          id: row.id,
          title,
          content,
          keywords,
          score,
        }
      })
      .filter((item) => item.score >= 4)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)

    return scored.map((item) => ({
      id: item.id,
      title: item.title,
      content: item.content,
      keywords: item.keywords,
    }))
  } catch {
    return FAQ_FALLBACK.filter((item) => {
      const haystack = normalizeText(`${item.title} ${item.content} ${item.keywords}`)
      return tokens.filter((token) => token && haystack.includes(token)).length >= 2
    }).slice(0, 3)
  }
}
