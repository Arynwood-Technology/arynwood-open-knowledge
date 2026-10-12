export const topics = [
  'Learning Sciences',
  'Special Education',
  'Mild to Moderate Exceptionalities',
  'Inclusive Education',
  'Universal Design for Learning',
  'Cognitive Development',
  'Educational Psychology',
  'Literacy',
  'Mathematics Education',
  'Executive Function',
  'Communication and Language',
  'Assistive Technology',
  'Educational Accessibility',
  'Evidence-Based Instruction',
  'Educational Technology',
  'AI in Education',
  'Digital Literacy',
  'Privacy-Preserving Learning Systems',
] as const
export type Topic = (typeof topics)[number]
export type ProviderId = 'crossref' | 'openalex'
export type EvidenceKind =
  | 'publication'
  | 'systematic-review'
  | 'meta-analysis'
  | 'preliminary-research'
  | 'professional-guidance'
  | 'educational-resource'
  | 'ai-interpretation'
  | 'unverified-claim'
export interface Author {
  name: string
  orcid?: string
}
export interface Provenance {
  provider: ProviderId
  sourceId: string
  requestUrl: string
  retrievedAt: string
  payloadSha256: string
  fields: string[]
}
export interface ResearchRecord {
  schemaVersion: 1
  id: string
  provider: ProviderId
  sourceId: string
  title: string
  authors: Author[]
  doi?: string
  sourceUrl: string
  publicationDate?: string
  venue?: string
  publicationType?: string
  topics: Topic[]
  researchQuestion: string
  methodology: string
  population: string
  findings: string
  limitations: string[]
  contradictoryFindings: string[]
  educationalApplications: string[]
  accessibilityConsiderations: string[]
  relatedModuleIds: string[]
  relationships: Array<{
    targetId: string
    predicate: 'supports' | 'contradicts' | 'related-to'
    note: string
  }>
  evidence: {
    kind: EvidenceKind
    bibliographic: 'retrieved' | 'verified' | 'conflicting'
    peerReview: 'unknown' | 'documented'
    peerReviewSource?: string
    humanReview: 'unreviewed' | 'reviewed'
    reviewer?: string
    reviewedAt?: string
    verificationDate?: string
    verifiedFields: string[]
    uncertainties: string[]
  }
  attribution: string
  licensing: { metadata: string; fullText: string; licenseUrl?: string }
  provenance: Provenance[]
  revisions: Array<{ at: string; action: string }>
}
export interface ScholarlyProvider {
  id: ProviderId
  search(query: string, signal?: AbortSignal): Promise<ResearchRecord[]>
  lookup(sourceId: string, signal?: AbortSignal): Promise<ResearchRecord>
}
export function guidanceEligible(record: ResearchRecord): boolean {
  return (
    record.evidence.humanReview === 'reviewed' &&
    !!record.evidence.reviewer?.trim() &&
    !!record.evidence.reviewedAt &&
    record.evidence.bibliographic === 'verified'
  )
}
