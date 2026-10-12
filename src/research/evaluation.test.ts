import { expect, it } from 'vitest'
import { evaluate } from './evaluation'
it('scores citation reliability and retrieval against explicit human annotations', () => {
  const result = evaluate([
    {
      id: 'fixture',
      relevantSourceIds: ['source:a', 'source:b'],
      retrievedSourceIds: ['source:x', 'source:a'],
      citations: [
        { sourceId: 'source:a', bibliographicMatch: true },
        { sourceId: 'source:x', bibliographicMatch: false },
      ],
      claims: [
        { supported: true, faithful: true, attributed: true },
        { supported: false, faithful: false, attributed: false },
      ],
    },
  ])
  expect(result.macroAverage).toMatchObject({
    precision: 0.5,
    recall: 0.5,
    reciprocalRank: 0.5,
    citationAccuracy: 0.5,
    unsupportedClaimRate: 0.5,
    summaryFaithfulness: 0.5,
    attributionCoverage: 0.5,
  })
})
it('represents unavailable claim metrics as null and rejects empty evaluations', () => {
  expect(
    evaluate([
      {
        id: 'fixture',
        relevantSourceIds: ['a'],
        retrievedSourceIds: [],
        citations: [],
        claims: [],
      },
    ]).macroAverage.unsupportedClaimRate,
  ).toBeNull()
  expect(() => evaluate([])).toThrow('empty')
})
