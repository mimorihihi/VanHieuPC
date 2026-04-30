import { getRequestConfig } from "next-intl/server"
import { defaultLocale, isValidLocale } from "@/i18n/config"

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale
  const locale = requested && isValidLocale(requested) ? requested : defaultLocale

  const messages = locale === "en"
    ? (await import("../../messages/en.json")).default
    : (await import("../../messages/vi.json")).default

  return {
    locale,
    messages,
  }
})
