import { defaultLocale, isValidLocale, type AppLocale } from "@/i18n/config"

type Messages = Record<string, unknown>

function mergeMessages(...modules: Messages[]) {
  return Object.assign({}, ...modules)
}

export async function getMessages(localeInput: string | undefined | null) {
  const locale: AppLocale = localeInput && isValidLocale(localeInput) ? localeInput : defaultLocale

  if (locale === "en") {
    const [header, cart, checkout, home, footer, payment] = await Promise.all([
      import("../../messages/en/header.json"),
      import("../../messages/en/cart.json"),
      import("../../messages/en/checkout.json"),
      import("../../messages/en/home.json"),
      import("../../messages/en/footer.json"),
      import("../../messages/en/payment.json"),
    ])

    return mergeMessages(header.default, cart.default, checkout.default, home.default, footer.default, payment.default)
  }

  const [header, cart, checkout, home, footer, payment] = await Promise.all([
    import("../../messages/vi/header.json"),
    import("../../messages/vi/cart.json"),
    import("../../messages/vi/checkout.json"),
    import("../../messages/vi/home.json"),
    import("../../messages/vi/footer.json"),
    import("../../messages/vi/payment.json"),
  ])

  return mergeMessages(header.default, cart.default, checkout.default, home.default, footer.default, payment.default)
}
