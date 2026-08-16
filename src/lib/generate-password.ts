const LOWER = "abcdefghijkmnpqrstuvwxyz"
const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ"
const DIGITS = "23456789"
const SYMBOLS = "!@#$%^&*-_=+?"
const ALL = LOWER + UPPER + DIGITS + SYMBOLS

function randomChar(pool: string) {
  const bytes = new Uint32Array(1)
  crypto.getRandomValues(bytes)
  return pool[bytes[0] % pool.length]
}

function shuffle(chars: string[]) {
  for (let i = chars.length - 1; i > 0; i--) {
    const bytes = new Uint32Array(1)
    crypto.getRandomValues(bytes)
    const j = bytes[0] % (i + 1)
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }
  return chars
}

export function generatePassword(length = 14): string {
  const required = [randomChar(LOWER), randomChar(UPPER), randomChar(DIGITS), randomChar(SYMBOLS)]
  const rest = Array.from({ length: Math.max(0, length - required.length) }, () => randomChar(ALL))
  return shuffle([...required, ...rest]).join("")
}
