import { extractBudgetRange, normalizeText } from "../shared/text-utils"

export type NormalizedChatInput = {
  original: string
  normalized: string
  normalizedForMatching: string
  expansions: Record<string, string>
  budget: {
    minPrice?: number
    maxPrice?: number
    budgetMode?: "approx" | "max" | "min" | "range"
  }
}

const phraseExpansions: Record<string, string> = {
  "choi gem": "chơi game",
  "choi game": "chơi game",
  "chs game": "chơi game",
  "con hong": "còn không",
  "con k": "còn không",
  "con ko": "còn không",
  "con khong": "còn không",
  "còn hong": "còn không",
  "còn k": "còn không",
  "còn ko": "còn không",
  "bao nhieu": "bao nhiêu",
}

const tokenExpansions: Record<string, string> = {
  lap: "laptop",
  lappy: "laptop",
  pc: "PC",
  man: "màn hình",
  mh: "màn hình",
  valo: "Valorant",
  val: "Valorant",
  lol: "League of Legends",
  pubg: "PUBG",
  fo4: "FIFA Online 4",
  fc: "FC Online",
  cs2: "Counter-Strike 2",
  gem: "game",
  game: "game",
  chs: "chơi",
  choi: "chơi",
  bn: "bao nhiêu",
  nhiu: "bao nhiêu",
  nhieu: "nhiêu",
  z: "vậy",
  dz: "vậy",
  hong: "không",
  hok: "không",
  ko: "không",
  k: "không",
  stock: "tồn kho",
  card: "GPU",
  vga: "GPU",
  gpu: "GPU",
  cpu: "CPU",
  ram: "RAM",
  ssd: "SSD",
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function normalizeMoneyToken(token: string) {
  const match = token.match(/^(\d+(?:[.,]\d+)?)(tr|trieu|cu|m)$/i)
  if (!match) return null

  const amount = match[1].replace(/,/g, ".")
  return `${amount} triệu`
}

function collectPhraseExpansions(input: string, expansions: Record<string, string>) {
  let output = input

  for (const [source, target] of Object.entries(phraseExpansions)) {
    const pattern = new RegExp(`\\b${escapeRegExp(source)}\\b`, "gi")
    if (pattern.test(output)) {
      expansions[source] = target
    }
  }
}

function collectTokenExpansions(input: string, expansions: Record<string, string>) {
  input
    .split(/(\s+)/)
    .forEach((part) => {
      if (/^\s+$/.test(part)) return

      const cleanToken = normalizeText(part).replace(/[^a-z0-9]/g, "")
      const moneyText = normalizeMoneyToken(cleanToken)

      if (moneyText) {
        expansions[part] = moneyText
        return
      }

      const expanded = tokenExpansions[cleanToken]
      if (!expanded) return

      expansions[part] = expanded
    })
}

export function normalizeChatInput(message: string): NormalizedChatInput {
  const original = message
  const expansions: Record<string, string> = {}
  const normalized = message.trim().replace(/\s+/g, " ")
  collectPhraseExpansions(normalized, expansions)
  collectTokenExpansions(normalized, expansions)
  const budget = extractBudgetRange(normalized)

  return {
    original,
    normalized,
    normalizedForMatching: normalizeText(normalized),
    expansions,
    budget,
  }
}
