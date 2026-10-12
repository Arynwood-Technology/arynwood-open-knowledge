export function normalizeOrcid(input: unknown): string | undefined {
  if (typeof input !== 'string') return undefined
  const id = input.replace(/^https:\/\/orcid\.org\//i, '').toUpperCase()
  if (!/^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/.test(id)) return undefined
  const digits = id.replaceAll('-', '')
  let total = 0
  for (const digit of digits.slice(0, 15)) total = (total + Number(digit)) * 2
  const remainder = (12 - (total % 11)) % 11
  return digits[15] === (remainder === 10 ? 'X' : String(remainder))
    ? id
    : undefined
}
export function normalizeDoi(input: unknown): string | undefined {
  if (typeof input !== 'string') return undefined
  const doi = input
    .trim()
    .replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, '')
    .toLowerCase()
  return /^10\.\d{4,9}\/[^\s<>"\\]{1,240}$/.test(doi) ? doi : undefined
}
export function safeHttps(input: unknown): string | undefined {
  if (typeof input !== 'string' || input.length > 2048) return undefined
  try {
    const url = new URL(input)
    return url.protocol === 'https:' && !url.username && !url.password
      ? url.href
      : undefined
  } catch {
    return undefined
  }
}
