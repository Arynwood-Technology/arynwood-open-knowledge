import type { JsonTransport } from './transport'
import { createTransport, searchQuery } from './transport'
import { normalizeDoi, normalizeOrcid, safeHttps } from './identity'
import type { ProviderId, ResearchRecord, ScholarlyProvider } from './model'

export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Invalid provider metadata.')
  return value as Record<string, unknown>
}
const array = (value: unknown): unknown[] => (Array.isArray(value) ? value : [])
const text = (value: unknown, max = 1000) =>
  typeof value === 'string' ? value.trim().slice(0, max) : ''
const firstText = (value: unknown) => text(array(value)[0])
function publicationDate(value: unknown): string | undefined {
  const parts = array(array(object(value)['date-parts'])[0])
  if (
    !parts.length ||
    !parts.every((x) => typeof x === 'number' && Number.isInteger(x))
  )
    return undefined
  const [year, month, day] = parts as number[]
  if (
    year < 1000 ||
    year > 9999 ||
    (month !== undefined && (month < 1 || month > 12)) ||
    (day !== undefined && (day < 1 || day > 31))
  )
    return undefined
  return [year, month, day]
    .filter((x) => x !== undefined)
    .map((x, i) => (i === 0 ? String(x) : String(x).padStart(2, '0')))
    .join('-')
}
async function baseRecord(
  provider: ProviderId,
  raw: unknown,
  requestUrl: string,
): Promise<ResearchRecord> {
  const row = object(raw)
  const crossref = provider === 'crossref'
  const doi = normalizeDoi(crossref ? row.DOI : row.doi)
  const sourceId = crossref ? doi : text(row.id)
  if (
    !sourceId ||
    (!crossref && !/^https:\/\/openalex\.org\/W\d+$/.test(sourceId))
  )
    throw new Error('Missing or invalid publication identifier.')
  const title = crossref ? firstText(row.title) : text(row.display_name)
  if (!title) throw new Error('Missing publication title.')
  const authors = (crossref ? array(row.author) : array(row.authorships))
    .slice(0, 200)
    .map((item) => {
      const a = crossref ? object(item) : object(object(item).author)
      return {
        name: crossref
          ? [text(a.given), text(a.family)].filter(Boolean).join(' ') ||
            text(a.name)
          : text(a.display_name),
        orcid: normalizeOrcid(crossref ? a.ORCID : a.orcid),
      }
    })
    .filter((a) => a.name)
  let date: string | undefined
  if (crossref) {
    const d = row.published ?? row['published-print'] ?? row['published-online']
    date = d ? publicationDate(d) : undefined
  } else {
    const value = text(row.publication_date)
    date =
      /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value))
        ? value
        : undefined
  }
  const bytes = new TextEncoder().encode(JSON.stringify(raw))
  const hash = Array.from(
    new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)),
    (x) => x.toString(16).padStart(2, '0'),
  ).join('')
  const at = new Date().toISOString()
  const license = crossref
    ? safeHttps(object(array(row.license)[0] ?? {}).URL)
    : undefined
  const landingPage = !crossref && row.primary_location
    ? safeHttps(object(row.primary_location).landing_page_url)
    : undefined
  return {
    schemaVersion: 1,
    id: doi ? 'doi:' + doi : provider + ':' + sourceId,
    provider,
    sourceId,
    title,
    authors,
    doi,
    sourceUrl: doi
      ? 'https://doi.org/' + doi.split('/').map(encodeURIComponent).join('/')
      : landingPage || sourceId,
    publicationDate: date,
    venue: crossref ? firstText(row['container-title']) : undefined,
    publicationType: text(row.type) || undefined,
    topics: [],
    researchQuestion: '',
    methodology: '',
    population: '',
    findings: '',
    limitations: [],
    contradictoryFindings: [],
    educationalApplications: [],
    accessibilityConsiderations: [],
    relatedModuleIds: [],
    relationships: [],
    evidence: {
      kind: 'publication',
      bibliographic: 'retrieved',
      peerReview: 'unknown',
      humanReview: 'unreviewed',
      verifiedFields: [],
      uncertainties: [
        'Metadata retrieval does not establish study quality or peer review.',
        ...(!authors.length ? ['Author metadata is missing.'] : []),
        ...(!date ? ['Publication date is missing or invalid.'] : []),
        'Study methods, populations and findings have not been reviewed.',
      ],
    },
    attribution:
      authors.map((a) => a.name).join('; ') ||
      'Author information not supplied',
    licensing: {
      metadata: crossref
        ? 'Crossref factual metadata; see provider terms; abstracts excluded.'
        : 'OpenAlex metadata: CC0.',
      fullText: 'Not retrieved; publication rights require separate review.',
      licenseUrl: license,
    },
    provenance: [
      {
        provider,
        sourceId,
        requestUrl,
        retrievedAt: at,
        payloadSha256: hash,
        fields: [
          'title',
          'authors',
          ...(doi ? ['doi'] : []),
          ...(date ? ['publicationDate'] : []),
        ],
      },
    ],
    revisions: [{ at, action: 'Metadata retrieved from ' + provider }],
  }
}
export function crossrefProvider(
  transport: JsonTransport = createTransport(),
): ScholarlyProvider {
  return {
    id: 'crossref',
    async search(input, signal) {
      const url = new URL('https://api.crossref.org/works')
      url.searchParams.set('query.bibliographic', searchQuery(input))
      url.searchParams.set('rows', '10')
      const response = object(await transport(url.href, signal))
      const items = object(response.message).items
      if (!Array.isArray(items))
        throw new Error('Invalid Crossref result list.')
      const results = await Promise.allSettled(
        items
          .slice(0, 10)
          .map((item) => baseRecord('crossref', item, url.href)),
      )
      if (items.length && results.every((r) => r.status === 'rejected'))
        throw new Error('Crossref results could not be validated.')
      return results.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []))
    },
    async lookup(id, signal) {
      const doi = normalizeDoi(id)
      if (!doi) throw new Error('Invalid DOI.')
      const url = 'https://api.crossref.org/works/' + encodeURIComponent(doi)
      const response = object(await transport(url, signal))
      const record = await baseRecord('crossref', response.message, url)
      if (record.sourceId !== doi)
        throw new Error('Provider returned a different DOI.')
      return record
    },
  }
}
export function openalexProvider(
  transport: JsonTransport = createTransport(),
): ScholarlyProvider {
  return {
    id: 'openalex',
    async search(input, signal) {
      const url = new URL('https://api.openalex.org/works')
      url.searchParams.set('search', searchQuery(input))
      url.searchParams.set('per_page', '10')
      const response = object(await transport(url.href, signal))
      if (!Array.isArray(response.results))
        throw new Error('Invalid OpenAlex result list.')
      const results = await Promise.allSettled(
        response.results
          .slice(0, 10)
          .map((item) => baseRecord('openalex', item, url.href)),
      )
      if (
        response.results.length &&
        results.every((r) => r.status === 'rejected')
      )
        throw new Error('OpenAlex results could not be validated.')
      return results.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []))
    },
    async lookup(id, signal) {
      if (!/^https:\/\/openalex\.org\/W\d+$/.test(id))
        throw new Error('Invalid OpenAlex identifier.')
      const url = 'https://api.openalex.org/works/' + id.split('/').pop()
      const record = await baseRecord(
        'openalex',
        await transport(url, signal),
        url,
      )
      if (record.sourceId !== id)
        throw new Error('Provider returned a different work identifier.')
      return record
    },
  }
}
export async function verifyMetadata(
  candidate: ResearchRecord,
  provider: ScholarlyProvider,
  signal?: AbortSignal,
): Promise<ResearchRecord> {
  if (candidate.provider !== provider.id)
    throw new Error('Provider does not match the record.')
  const current = await provider.lookup(candidate.sourceId, signal)
  const fields = ['title', 'doi', 'publicationDate', 'authors'] as const
  const present = fields.filter((field) =>
    field === 'authors' ? current.authors.length > 0 : !!current[field],
  )
  const conflicting = fields.filter(
    (field) =>
      JSON.stringify(candidate[field]) !== JSON.stringify(current[field]),
  )
  const at = new Date().toISOString()
  return {
    ...current,
    evidence: {
      ...current.evidence,
      bibliographic: conflicting.length ? 'conflicting' : 'verified',
      verificationDate: at,
      verifiedFields: present.filter((f) => !conflicting.includes(f)),
      uncertainties: [
        ...current.evidence.uncertainties,
        ...(conflicting.length
          ? [
              'Search and lookup metadata conflict: ' +
                conflicting.join(', ') +
                '.',
            ]
          : []),
      ],
    },
    provenance: [...candidate.provenance, ...current.provenance],
    revisions: [
      ...candidate.revisions,
      {
        at,
        action: conflicting.length
          ? 'Bibliographic conflict detected'
          : 'Bibliographic fields checked against provider singleton',
      },
    ],
  }
}
