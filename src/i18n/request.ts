import { getRequestConfig } from "next-intl/server"
import { defaultLocale, isValidLocale } from "@/i18n/config"
import { getMessages } from "@/i18n/messages"

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale
  const locale = requested && isValidLocale(requested) ? requested : defaultLocale

  const messages = await getMessages(locale)

  return {
    locale,
    messages,
  }
})
