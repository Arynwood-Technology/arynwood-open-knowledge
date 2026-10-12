const origins = new Set([
  'https://api.crossref.org',
  'https://api.openalex.org',
])
export type JsonTransport = (
  url: string,
  signal?: AbortSignal,
) => Promise<unknown>
export function createTransport(fetcher: typeof fetch = fetch): JsonTransport {
  let busy = false
  let lastRequest = 0
  let blockedUntil = 0
  return async (input, signal) => {
    const url = new URL(input)
    if (!origins.has(url.origin) || url.username || url.password)
      throw new Error('Provider URL is not allowed.')
    if (busy) throw new Error('A provider request is already running.')
    if (Date.now() < blockedUntil)
      throw new Error('Provider rate limit: wait before trying again.')
    busy = true
    try {
      const delay = Math.max(0, 1000 - (Date.now() - lastRequest))
      if (delay) await new Promise((resolve) => setTimeout(resolve, delay))
      const combined = signal
        ? AbortSignal.any([signal, AbortSignal.timeout(15000)])
        : AbortSignal.timeout(15000)
      combined.throwIfAborted()
      lastRequest = Date.now()
      const response = await fetcher(url.href, {
        signal: combined,
        headers: { Accept: 'application/json' },
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
        redirect: 'error',
      })
      if (response.status === 429) {
        const retry = response.headers.get('Retry-After')
        const seconds =
          retry && /^\d+$/.test(retry)
            ? Number(retry)
            : retry
              ? Math.ceil((Date.parse(retry) - Date.now()) / 1000)
              : 60
        blockedUntil =
          Date.now() +
          Math.max(60, Number.isFinite(seconds) ? seconds : 60) * 1000
        throw new Error(
          'Provider rate limit reached. Wait at least one minute, or use the other provider.',
        )
      }
      if (!response.ok)
        throw new Error(
          'Provider request failed (HTTP ' + response.status + ').',
        )
      if (!response.headers.get('content-type')?.includes('json'))
        throw new Error('Provider returned an unexpected content type.')
      if (Number(response.headers.get('content-length')) > 2_000_000)
        throw new Error('Provider response is too large.')
      if (!response.body)
        throw new Error('Provider returned an empty response.')
      const reader = response.body.getReader()
      const chunks: Uint8Array[] = []
      let size = 0
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          size += value.byteLength
          if (size > 2_000_000) {
            await reader.cancel()
            throw new Error('Provider response is too large.')
          }
          chunks.push(value)
        }
      } finally {
        reader.releaseLock()
      }
      const bytes = new Uint8Array(size)
      let offset = 0
      for (const chunk of chunks) {
        bytes.set(chunk, offset)
        offset += chunk.length
      }
      return JSON.parse(new TextDecoder().decode(bytes)) as unknown
    } finally {
      busy = false
    }
  }
}
export function searchQuery(input: string): string {
  const query = input.trim()
  if (query.length < 3 || query.length > 200 || /[\u0000-\u001f]/.test(query))
    throw new Error('Enter a research topic between 3 and 200 characters.')
  return query
}
