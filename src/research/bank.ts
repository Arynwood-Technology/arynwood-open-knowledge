import type { ResearchRecord, Topic } from './model'
import { topics } from './model'
import { normalizeDoi, normalizeOrcid, safeHttps } from './identity'
export const BANK_KEY = 'arynwood:public-research:v1'
const obj = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v)
const str = (v: unknown, max = 5000): v is string =>
  typeof v === 'string' && v.length <= max
const required = (v: unknown, max = 1000): v is string =>
  str(v, max) && v.trim().length > 0
const strings = (v: unknown): v is string[] =>
  Array.isArray(v) && v.length <= 200 && v.every((x) => str(x))
const date = (v: unknown): v is string =>
  str(v, 40) && /^\d{4}-\d{2}-\d{2}T/.test(v) && Number.isFinite(Date.parse(v))
const providers = ['crossref', 'openalex']
export function validateRecord(value: unknown): ResearchRecord {
  if (
    !obj(value) ||
    value.schemaVersion !== 1 ||
    !providers.includes(String(value.provider)) ||
    !required(value.id) ||
    !required(value.sourceId) ||
    !required(value.title) ||
    !safeHttps(value.sourceUrl) ||
    !Array.isArray(value.authors) ||
    value.authors.length > 200 ||
    !value.authors.every(
      (a) =>
        obj(a) &&
        required(a.name) &&
        (a.orcid === undefined || normalizeOrcid(a.orcid) === a.orcid),
    ) ||
    (value.doi !== undefined && normalizeDoi(value.doi) !== value.doi) ||
    (value.publicationDate !== undefined &&
      (!str(value.publicationDate, 10) ||
        !/^\d{4}(-\d{2}){0,2}$/.test(value.publicationDate))) ||
    (value.venue !== undefined && !str(value.venue)) ||
    (value.publicationType !== undefined && !str(value.publicationType)) ||
    !Array.isArray(value.topics) ||
    !value.topics.length ||
    value.topics.length > topics.length ||
    !value.topics.every((t) => topics.includes(t as Topic)) ||
    ![
      'researchQuestion',
      'methodology',
      'population',
      'findings',
      'attribution',
    ].every((k) => str(value[k])) ||
    ![
      'limitations',
      'contradictoryFindings',
      'educationalApplications',
      'accessibilityConsiderations',
      'relatedModuleIds',
    ].every((k) => strings(value[k])) ||
    !Array.isArray(value.relationships) ||
    value.relationships.length > 200 ||
    !value.relationships.every(
      (r) =>
        obj(r) &&
        required(r.targetId) &&
        ['supports', 'contradicts', 'related-to'].includes(
          String(r.predicate),
        ) &&
        str(r.note),
    ) ||
    !obj(value.evidence) ||
    ![
      'publication',
      'systematic-review',
      'meta-analysis',
      'preliminary-research',
      'professional-guidance',
      'educational-resource',
      'ai-interpretation',
      'unverified-claim',
    ].includes(String(value.evidence.kind)) ||
    !['retrieved', 'verified', 'conflicting'].includes(
      String(value.evidence.bibliographic),
    ) ||
    !['unknown', 'documented'].includes(String(value.evidence.peerReview)) ||
    !['unreviewed', 'reviewed'].includes(String(value.evidence.humanReview)) ||
    !strings(value.evidence.verifiedFields) ||
    !strings(value.evidence.uncertainties) ||
    (value.evidence.reviewer !== undefined &&
      !str(value.evidence.reviewer, 1000)) ||
    (value.evidence.reviewedAt !== undefined &&
      !date(value.evidence.reviewedAt)) ||
    (value.evidence.peerReviewSource !== undefined &&
      !safeHttps(value.evidence.peerReviewSource)) ||
    (value.evidence.verificationDate !== undefined &&
      !date(value.evidence.verificationDate)) ||
    (value.evidence.bibliographic === 'verified' &&
      (!date(value.evidence.verificationDate) ||
        !value.evidence.verifiedFields.includes('title'))) ||
    (value.evidence.humanReview === 'reviewed' &&
      (!required(value.evidence.reviewer) ||
        !date(value.evidence.reviewedAt))) ||
    (value.evidence.peerReview === 'documented' &&
      !safeHttps(value.evidence.peerReviewSource)) ||
    !obj(value.licensing) ||
    !str(value.licensing.metadata) ||
    !str(value.licensing.fullText) ||
    (value.licensing.licenseUrl !== undefined &&
      !safeHttps(value.licensing.licenseUrl)) ||
    !Array.isArray(value.provenance) ||
    !value.provenance.length ||
    value.provenance.length > 100 ||
    !value.provenance.every(
      (p) =>
        obj(p) &&
        providers.includes(String(p.provider)) &&
        required(p.sourceId) &&
        safeHttps(p.requestUrl) &&
        ['https://api.crossref.org', 'https://api.openalex.org'].includes(
          new URL(String(p.requestUrl)).origin,
        ) &&
        date(p.retrievedAt) &&
        str(p.payloadSha256, 64) &&
        /^[a-f0-9]{64}$/.test(p.payloadSha256) &&
        strings(p.fields),
    ) ||
    !Array.isArray(value.revisions) ||
    !value.revisions.length ||
    value.revisions.length > 200 ||
    !value.revisions.every((r) => obj(r) && date(r.at) && required(r.action))
  )
    throw new Error('Invalid research record. Nothing was saved.')
  const expectedId = value.doi
    ? 'doi:' + value.doi
    : value.provider + ':' + value.sourceId
  if (
    value.id !== expectedId ||
    (value.provider === 'crossref' && value.sourceId !== value.doi) ||
    (value.provider === 'openalex' &&
      !/^https:\/\/openalex\.org\/W\d+$/.test(String(value.sourceId)))
  )
    throw new Error('Inconsistent research identifier.')
  // Whitelist shape so unknown/private fields from imports can never enter public records.
  const keys = [
    'schemaVersion',
    'id',
    'provider',
    'sourceId',
    'title',
    'authors',
    'doi',
    'sourceUrl',
    'publicationDate',
    'venue',
    'publicationType',
    'topics',
    'researchQuestion',
    'methodology',
    'population',
    'findings',
    'limitations',
    'contradictoryFindings',
    'educationalApplications',
    'accessibilityConsiderations',
    'relatedModuleIds',
    'relationships',
    'evidence',
    'attribution',
    'licensing',
    'provenance',
    'revisions',
  ]
  for (const key of Object.keys(value))
    if (!keys.includes(key))
      throw new Error('Unknown field in public research record.')
  const nested: Array<[unknown[], string[]]> = [
    [value.authors, ['name', 'orcid']],
    [value.relationships, ['targetId', 'predicate', 'note']],
    [
      [value.evidence],
      [
        'kind',
        'bibliographic',
        'peerReview',
        'peerReviewSource',
        'humanReview',
        'reviewer',
        'reviewedAt',
        'verificationDate',
        'verifiedFields',
        'uncertainties',
      ],
    ],
    [[value.licensing], ['metadata', 'fullText', 'licenseUrl']],
    [
      value.provenance,
      [
        'provider',
        'sourceId',
        'requestUrl',
        'retrievedAt',
        'payloadSha256',
        'fields',
      ],
    ],
    [value.revisions, ['at', 'action']],
  ]
  for (const [rows, allowed] of nested)
    for (const row of rows)
      if (Object.keys(row as object).some((k) => !allowed.includes(k)))
        throw new Error('Unknown nested field in public research record.')
  return structuredClone(value) as unknown as ResearchRecord
}
export interface StoragePort {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}
export class KnowledgeBank {
  constructor(private storage: StoragePort) {}
  list(): ResearchRecord[] {
    const raw = this.storage.getItem(BANK_KEY)
    if (raw === null) return []
    return this.parse(raw)
  }
  private parse(raw: string): ResearchRecord[] {
    if (raw.length > 5_000_000)
      throw new Error('Knowledge bank exceeds the 5 MB limit.')
    const envelope: unknown = JSON.parse(raw)
    if (
      !obj(envelope) ||
      envelope.version !== 1 ||
      Object.keys(envelope).some((k) => !['version', 'records'].includes(k)) ||
      !Array.isArray(envelope.records) ||
      envelope.records.length > 500
    )
      throw new Error('Invalid knowledge bank backup.')
    const records = envelope.records.map(validateRecord)
    if (new Set(records.map((r) => r.id)).size !== records.length)
      throw new Error('Duplicate research identifiers.')
    return records
  }
  private write(records: ResearchRecord[]) {
    if (records.length > 500)
      throw new Error('Knowledge bank supports up to 500 records.')
    const raw = JSON.stringify({ version: 1, records })
    if (raw.length > 5_000_000)
      throw new Error('Knowledge bank exceeds the 5 MB limit.')
    this.storage.setItem(BANK_KEY, raw)
  }
  save(
    record: ResearchRecord,
    topic: Topic,
    moduleId?: string,
  ): ResearchRecord {
    const candidate = validateRecord({
      ...record,
      topics: [...new Set([...record.topics, topic])],
      relatedModuleIds: [
        ...new Set([
          ...record.relatedModuleIds,
          ...(moduleId ? [moduleId] : []),
        ]),
      ],
      revisions: [
        ...record.revisions,
        {
          at: new Date().toISOString(),
          action: 'Saved and categorized locally',
        },
      ],
    })
    const records = this.list()
    // Replacing requires explicit import; duplicate search saves must not destroy prior categorization.
    const existing = records.find((r) => r.id === candidate.id)
    if (existing) {
      existing.topics = [...new Set([...existing.topics, ...candidate.topics])]
      existing.relatedModuleIds = [
        ...new Set([
          ...existing.relatedModuleIds,
          ...candidate.relatedModuleIds,
        ]),
      ]
      existing.revisions.push(
        candidate.revisions[candidate.revisions.length - 1],
      )
      this.write(records.map(validateRecord))
      return existing
    }
    this.write([...records, candidate])
    return candidate
  }
  remove(id: string) {
    this.write(this.list().filter((r) => r.id !== id))
  }
  clear() {
    this.storage.removeItem(BANK_KEY)
  }
  export(): string {
    return JSON.stringify({ version: 1, records: this.list() }, null, 2)
  }
  restore(raw: string) {
    const imported = this.parse(raw)
    // Imported review labels are local assertions, not authenticated editorial approval.
    this.write(
      imported.map((r) =>
        validateRecord({
          ...r,
          evidence: {
            ...r.evidence,
            humanReview: 'unreviewed',
            reviewer: undefined,
            reviewedAt: undefined,
            uncertainties: [
              ...r.evidence.uncertainties,
              'Imported backup: provenance and review require local inspection.',
            ],
          },
          revisions: [
            ...r.revisions,
            {
              at: new Date().toISOString(),
              action: 'Restored from user-selected backup',
            },
          ],
        }),
      ),
    )
  }
}
