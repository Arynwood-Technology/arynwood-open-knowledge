export interface EvaluationCase {
  id: string
  relevantSourceIds: string[]
  retrievedSourceIds: string[]
  citations: Array<{ sourceId: string; bibliographicMatch: boolean }>
  claims: Array<{ supported: boolean; faithful: boolean; attributed: boolean }>
}
export function evaluate(cases: EvaluationCase[]) {
  if (!cases.length) throw new Error('Evaluation dataset is empty.')
  const perCase = cases.map((row) => {
    if (
      !row.id ||
      !row.relevantSourceIds.length ||
      new Set(row.retrievedSourceIds).size !== row.retrievedSourceIds.length
    )
      throw new Error('Invalid evaluation case.')
    const relevant = new Set(row.relevantSourceIds)
    const hits = row.retrievedSourceIds.filter((id) => relevant.has(id)).length
    const first = row.retrievedSourceIds.findIndex((id) => relevant.has(id))
    const correct = row.citations.filter(
      (c) => relevant.has(c.sourceId) && c.bibliographicMatch,
    ).length
    const ratio = (count: number, total: number) =>
      total ? count / total : null
    return {
      id: row.id,
      precision: ratio(hits, row.retrievedSourceIds.length),
      recall: hits / relevant.size,
      reciprocalRank: first < 0 ? 0 : 1 / (first + 1),
      citationAccuracy: ratio(correct, row.citations.length),
      unsupportedClaimRate: ratio(
        row.claims.filter((c) => !c.supported).length,
        row.claims.length,
      ),
      summaryFaithfulness: ratio(
        row.claims.filter((c) => c.faithful).length,
        row.claims.length,
      ),
      attributionCoverage: ratio(
        row.claims.filter((c) => c.attributed).length,
        row.claims.length,
      ),
    }
  })
  const metrics = [
    'precision',
    'recall',
    'reciprocalRank',
    'citationAccuracy',
    'unsupportedClaimRate',
    'summaryFaithfulness',
    'attributionCoverage',
  ] as const
  const aggregate = Object.fromEntries(
    metrics.map((key) => {
      const values = perCase
        .map((r) => r[key])
        .filter((x): x is number => x !== null)
      return [
        key,
        values.length
          ? values.reduce((a, b) => a + b, 0) / values.length
          : null,
      ]
    }),
  )
  return {
    cases: perCase,
    macroAverage: aggregate,
    note: 'Scores rely on supplied relevance and human claim annotations; they are not automatic judgments of research quality.',
  }
}
