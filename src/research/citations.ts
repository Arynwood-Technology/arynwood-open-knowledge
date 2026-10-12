import type { ResearchRecord } from './model'
export function citationText(record: ResearchRecord): string {
  return [
    record.authors.map((a) => a.name).join('; ') || 'Unknown author',
    '(' + (record.publicationDate ?? 'n.d.') + ')',
    record.title,
    record.venue,
    record.sourceUrl,
  ]
    .filter(Boolean)
    .join('. ')
}
export function cslJson(records: ResearchRecord[]): string {
  return JSON.stringify(
    records.map((r) => ({
      id: r.id,
      type:
        r.publicationType === 'journal-article'
          ? 'article-journal'
          : 'document',
      title: r.title,
      author: r.authors.map((a) => ({
        literal: a.name,
        ...(a.orcid ? { ORCID: 'https://orcid.org/' + a.orcid } : {}),
      })),
      DOI: r.doi,
      URL: r.sourceUrl,
      'container-title': r.venue,
      ...(r.publicationDate
        ? {
            issued: {
              'date-parts': [r.publicationDate.split('-').map(Number)],
            },
          }
        : {}),
    })),
    null,
    2,
  )
}
