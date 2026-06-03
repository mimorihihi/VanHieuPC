import crypto from "crypto"

type VnpPayParams = Record<string, string>

type BuildVnpayPaymentUrlInput = {
  amount: number
  ipAddr: string
  orderInfo: string
  txnRef: string
}

type VerifyVnpayReturnInput = {
  query: URLSearchParams
}

function getRequiredEnv(name: string) {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(`Missing required VNPAY environment variable: ${name}`)
  }
  return value
}

function pad(value: number) {
  return String(value).padStart(2, "0")
}

function formatVnpDate(date: Date) {
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join("")
}

function getVietnamNow() {
  const now = new Date()

  return new Date(
    now.toLocaleString("en-US", {
      timeZone: "Asia/Ho_Chi_Minh",
    })
  )
}

function normalizeParamValue(value: string) {
  return encodeURIComponent(value).replace(/%20/g, "+")
}

function sortParams(params: VnpPayParams) {
  return Object.keys(params)
    .sort()
    .reduce<VnpPayParams>((acc, key) => {
      acc[key] = normalizeParamValue(params[key])
      return acc
    }, {})
}

function buildQueryString(params: VnpPayParams) {
  return Object.entries(sortParams(params))
    .map(([key, value]) => `${encodeURIComponent(key)}=${value}`)
    .join("&")
}

function createSecureHash(serialized: string) {
  const hashSecret = getRequiredEnv("VNP_HASH_SECRET")
  return crypto.createHmac("sha512", hashSecret).update(Buffer.from(serialized, "utf-8")).digest("hex")
}

export function buildVnpayPaymentUrl({ amount, ipAddr, orderInfo, txnRef }: BuildVnpayPaymentUrlInput) {
  const vnpUrl = getRequiredEnv("VNP_URL")
  const tmnCode = getRequiredEnv("VNP_TMN_CODE")
  const returnUrl = getRequiredEnv("VNP_RETURN_URL")

  const now = getVietnamNow()
  const expireAt = new Date(now.getTime() + 15 * 60 * 1000)

  const params: VnpPayParams = {
    vnp_Amount: String(Math.round(amount * 100)),
    vnp_Command: "pay",
    vnp_CreateDate: formatVnpDate(now),
    vnp_CurrCode: "VND",
    vnp_IpAddr: ipAddr,
    vnp_Locale: "vn",
    vnp_OrderInfo: orderInfo,
    vnp_OrderType: "other",
    vnp_ReturnUrl: returnUrl,
    vnp_TmnCode: tmnCode,
    vnp_TxnRef: txnRef,
    vnp_Version: "2.1.0",
    vnp_ExpireDate: formatVnpDate(expireAt),
  }

  const serialized = buildQueryString(params)
  const secureHash = createSecureHash(serialized)
  return `${vnpUrl}?${serialized}&vnp_SecureHash=${secureHash}`
}

export function verifyVnpayReturn({ query }: VerifyVnpayReturnInput) {
  const params: VnpPayParams = {}
  let secureHash = ""

  query.forEach((value, key) => {
    if (key === "vnp_SecureHash") {
      secureHash = value
      return
    }

    if (key === "vnp_SecureHashType") {
      return
    }

    params[key] = value
  })

  const serialized = buildQueryString(params)
  const expectedHash = createSecureHash(serialized)

  return {
    isValidSignature: Boolean(secureHash) && expectedHash.toUpperCase() === secureHash.toUpperCase(),
    params,
    secureHash,
    expectedHash,
  }
}

export function getVnpayClientIp(forwardedForHeader: string | null) {
  const first = forwardedForHeader?.split(",")[0]?.trim()
  return first || "127.0.0.1"
}

export function isVnpaySuccess(responseCode?: string, transactionStatus?: string) {
  return responseCode === "00" && transactionStatus === "00"
}
