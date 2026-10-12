import { beforeEach, describe, expect, it, vi } from 'vitest'
import { webcrypto } from 'node:crypto'
import { crossrefProvider, openalexProvider, verifyMetadata } from './providers'
import { BANK_KEY, KnowledgeBank } from './bank'
import { normalizeDoi, normalizeOrcid, safeHttps } from './identity'
import { guidanceEligible } from './model'
import { cslJson } from './citations'
import { createTransport, searchQuery } from './transport'
beforeEach(() => {
  localStorage.clear()
  Object.defineProperty(globalThis, 'crypto', {
    configurable: true,
    value: webcrypto,
  })
})
// Synthetic metadata used only for deterministic tests; never published as scholarship.
const work = {
  DOI: '10.5555/test-literacy',
  title: ['Synthetic literacy test fixture'],
  author: [
    {
      given: 'Test',
      family: 'Author',
      ORCID: 'https://orcid.org/0000-0002-1825-0097',
    },
  ],
  published: { 'date-parts': [[2025, 3, 2]] },
  type: 'journal-article',
  'container-title': ['Test fixture venue'],
}
const transport = vi.fn(async (url: string) =>
  url.includes('?') ? { message: { items: [work] } } : { message: work },
)
const candidate = async () =>
  (await crossrefProvider(transport).search('inclusive literacy'))[0]
describe('scholarly adapters and verification', () => {
  it('normalizes scholarly metadata, checks singleton fields, and records provenance without promoting quality', async () => {
    const provider = crossrefProvider(transport)
    const row = await verifyMetadata(await candidate(), provider)
    expect(row.evidence.bibliographic).toBe('verified')
    expect(row.evidence.verifiedFields).toEqual([
      'title',
      'doi',
      'publicationDate',
      'authors',
    ])
    expect(row.evidence.peerReview).toBe('unknown')
    expect(guidanceEligible(row)).toBe(false)
    expect(row.provenance).toHaveLength(2)
    expect(row.provenance[0].payloadSha256).toMatch(/^[a-f0-9]{64}$/)
    expect(row.authors[0].orcid).toBe('0000-0002-1825-0097')
    expect(transport.mock.calls[0][0]).toContain(
      'query.bibliographic=inclusive+literacy',
    )
  })
  it('exposes conflicting metadata rather than silently verifying it', async () => {
    const provider = crossrefProvider(async () => ({
      message: { ...work, title: ['Changed fixture'] },
    }))
    const row = await verifyMetadata(await candidate(), provider)
    expect(row.evidence.bibliographic).toBe('conflicting')
    expect(row.evidence.verifiedFields).not.toContain('title')
  })
  it('rejects wrong identifiers and malformed result lists', async () => {
    await expect(
      crossrefProvider(async () => ({
        message: { ...work, DOI: '10.5555/other' },
      })).lookup(work.DOI),
    ).rejects.toThrow('different DOI')
    await expect(
      crossrefProvider(async () => ({ message: {} })).search('literacy'),
    ).rejects.toThrow('result list')
    await expect(
      crossrefProvider(async () => ({
        message: { items: [{ title: ['Missing identifier'] }] },
      })).search('literacy'),
    ).rejects.toThrow('validated')
  })
  it('supports independent OpenAlex metadata and provider identity checks', async () => {
    const raw = {
      id: 'https://openalex.org/W123',
      doi: 'https://doi.org/10.5555/openalex-fixture',
      display_name: 'Synthetic OpenAlex fixture',
      publication_date: '2025-02-01',
      type: 'article',
      authorships: [
        {
          author: {
            display_name: 'Test Author',
            orcid: 'https://orcid.org/0000-0002-1825-0097',
          },
        },
      ],
    }
    const provider = openalexProvider(async (url) =>
      url.includes('?') ? { results: [raw] } : raw,
    )
    const row = await verifyMetadata(
      (await provider.search('special education'))[0],
      provider,
    )
    expect(row.evidence.bibliographic).toBe('verified')
    expect(row.licensing.metadata).toContain('CC0')
    await expect(provider.lookup('https://evil.example/W123')).rejects.toThrow(
      'Invalid OpenAlex',
    )
    await expect(
      verifyMetadata(row, crossrefProvider(transport)),
    ).rejects.toThrow('does not match')
  })
  it('rejects invalid query, DOI, ORCID checksums and unsafe links', () => {
    expect(normalizeOrcid('0000-0002-1825-0097')).toBe('0000-0002-1825-0097')
    expect(normalizeOrcid('0000-0002-1825-0098')).toBeUndefined()
    expect(normalizeDoi('https://doi.org/10.5555/ABC')).toBe('10.5555/abc')
    expect(normalizeDoi('made up')).toBeUndefined()
    expect(safeHttps('javascript:alert(1)')).toBeUndefined()
    expect(safeHttps('https://user:secret@example.org')).toBeUndefined()
    expect(() => searchQuery('ab')).toThrow()
    expect(() => searchQuery('a'.repeat(201))).toThrow()
  })
})
describe('local knowledge bank', () => {
  it('saves, reloads, deduplicates, categorizes, links modules and exports citations', async () => {
    const row = await verifyMetadata(
      await candidate(),
      crossrefProvider(transport),
    )
    const bank = new KnowledgeBank(localStorage)
    bank.save(row, 'Literacy', 'grade-01-reading-semester-01')
    bank.save(row, 'Inclusive Education')
    const saved = new KnowledgeBank(localStorage).list()
    expect(saved).toHaveLength(1)
    expect(saved[0].topics).toEqual(['Literacy', 'Inclusive Education'])
    expect(saved[0].relatedModuleIds).toEqual(['grade-01-reading-semester-01'])
    expect(JSON.parse(cslJson(saved))[0]).toMatchObject({
      DOI: work.DOI,
      type: 'article-journal',
    })
    bank.restore(bank.export())
    expect(bank.list()[0].evidence.humanReview).toBe('unreviewed')
    bank.remove(row.id)
    expect(bank.list()).toEqual([])
    bank.save(row, 'Literacy')
    bank.clear()
    expect(localStorage.getItem(BANK_KEY)).toBeNull()
  })
  it('rejects malformed/private fields and never overwrites valid data on bad restore', async () => {
    const bank = new KnowledgeBank(localStorage)
    bank.save(await candidate(), 'Literacy')
    const original = bank.export()
    const backup = JSON.parse(original)
    backup.records[0].studentName = 'Private record'
    expect(() => bank.restore(JSON.stringify(backup))).toThrow('Unknown field')
    backup.records[0].studentName = undefined
    backup.records[0].authors[0].studentName = 'Private record'
    expect(() => bank.restore(JSON.stringify(backup))).toThrow('Unknown nested')
    expect(() => bank.restore('{"version":1,"records":[{}]}')).toThrow(
      'Invalid research',
    )
    expect(bank.export()).toBe(original)
  })
  it('surfaces corrupt storage and quota errors', async () => {
    localStorage.setItem(BANK_KEY, '{"version":2,"records":[]}')
    expect(() => new KnowledgeBank(localStorage).list()).toThrow(
      'Invalid knowledge',
    )
    const storage = {
      getItem: () => null,
      removeItem: () => {},
      setItem: () => {
        throw new Error('Storage quota exceeded')
      },
    }
    expect(() =>
      new KnowledgeBank(storage).save({ ...{} } as never, 'Literacy'),
    ).toThrow()
    const row = await candidate()
    expect(() => new KnowledgeBank(storage).save(row, 'Literacy')).toThrow(
      'quota',
    )
  })
})
describe('bounded fixed-origin transport', () => {
  it('rejects arbitrary origins before fetching and rate limits retries', async () => {
    const fetcher = vi.fn(
      async () =>
        new Response('{}', {
          status: 429,
          headers: { 'content-type': 'application/json', 'retry-after': '120' },
        }),
    )
    const transport = createTransport(fetcher as typeof fetch)
    await expect(transport('https://example.org/data')).rejects.toThrow(
      'not allowed',
    )
    expect(fetcher).not.toHaveBeenCalled()
    await expect(transport('https://api.crossref.org/works')).rejects.toThrow(
      'rate limit reached',
    )
    await expect(transport('https://api.crossref.org/works')).rejects.toThrow(
      'wait',
    )
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
  it('handles successful JSON, invalid content, oversize data and cancellation', async () => {
    const good = vi.fn(
      async () =>
        new Response('{"message":{}}', {
          headers: { 'content-type': 'application/json' },
        }),
    )
    expect(
      await createTransport(good as typeof fetch)(
        'https://api.crossref.org/works',
      ),
    ).toEqual({ message: {} })
    const html = vi.fn(
      async () =>
        new Response('<html>', { headers: { 'content-type': 'text/html' } }),
    )
    await expect(
      createTransport(html as typeof fetch)('https://api.crossref.org/works'),
    ).rejects.toThrow('content type')
    const big = vi.fn(
      async () =>
        new Response('x'.repeat(2_000_001), {
          headers: { 'content-type': 'application/json' },
        }),
    )
    await expect(
      createTransport(big as typeof fetch)('https://api.crossref.org/works'),
    ).rejects.toThrow('too large')
    const abort = new AbortController()
    abort.abort()
    await expect(
      createTransport(good as typeof fetch)(
        'https://api.crossref.org/works',
        abort.signal,
      ),
    ).rejects.toThrow()
  })
})
