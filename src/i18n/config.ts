export const locales = ["en", "vi"] as const

export type AppLocale = (typeof locales)[number]

export const defaultLocale: AppLocale = "vi"

export function isValidLocale(locale: string): locale is AppLocale {
  return locales.includes(locale as AppLocale)
}
