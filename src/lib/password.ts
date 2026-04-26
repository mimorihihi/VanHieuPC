import { randomBytes, scryptSync, timingSafeEqual } from "crypto"

const SCRYPT_N = 16384
const SCRYPT_R = 8
const SCRYPT_P = 1
const KEY_LENGTH = 64

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex")
  const derived = scryptSync(password, salt, KEY_LENGTH, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  })

  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt}$${derived.toString("hex")}`
}

export function verifyPassword(password: string, encodedHash: string | null | undefined): boolean {
  try {
    if (!encodedHash) return false

    const parts = encodedHash.split("$")
    if (parts.length !== 6) return false
    if (parts[0] !== "scrypt") return false

    const n = Number(parts[1])
    const r = Number(parts[2])
    const p = Number(parts[3])
    const salt = parts[4]
    const hashHex = parts[5]

    if (!n || !r || !p || !salt || !hashHex) return false

    const actual = Buffer.from(hashHex, "hex")
    const expected = scryptSync(password, salt, actual.length, { N: n, r, p })

    if (actual.length !== expected.length) return false
    return timingSafeEqual(actual, expected)
  } catch {
    return false
  }
}
