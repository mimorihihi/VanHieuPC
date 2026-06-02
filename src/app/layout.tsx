import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { cookies } from "next/headers"
import { NextIntlClientProvider } from "next-intl"
import { ChatbotWidget } from "@/components/chatbot-widget"
import { defaultLocale, isValidLocale } from "@/i18n/config"
import './globals.css'

const geistSans = Geist({
  subsets: ['latin'],
  variable: '--font-geist-sans',
})
const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
})

export const metadata: Metadata = {
  title: 'Ecommerce Store',
  description: 'Your premium ecommerce store built with Next.js',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const cookieStore = await cookies()
  const localeCookie = cookieStore.get("locale")?.value ?? defaultLocale
  const locale = isValidLocale(localeCookie) ? localeCookie : defaultLocale
  const messages = locale === "en"
    ? (await import("../../messages/en.json")).default
    : (await import("../../messages/vi.json")).default

  return (
    <html lang={locale}>
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}>
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
          <ChatbotWidget />
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
