import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { evaluate } from '../src/research/evaluation.ts'
import type { EvaluationCase } from '../src/research/evaluation.ts'
const path = process.argv[2] ?? 'experiments/fixtures/synthetic-evaluation.json'
const raw = readFileSync(path, 'utf8')
const dataset: unknown = JSON.parse(raw)
if (
  !Array.isArray(dataset) ||
  dataset.length > 10000 ||
  !dataset.every(
    (r) =>
      r &&
      typeof r.id === 'string' &&
      Array.isArray(r.relevantSourceIds) &&
      r.relevantSourceIds.every((x: unknown) => typeof x === 'string') &&
      Array.isArray(r.retrievedSourceIds) &&
      r.retrievedSourceIds.every((x: unknown) => typeof x === 'string') &&
      Array.isArray(r.citations) &&
      r.citations.every(
        (c: { sourceId?: unknown; bibliographicMatch?: unknown }) =>
          typeof c.sourceId === 'string' &&
          typeof c.bibliographicMatch === 'boolean',
      ) &&
      Array.isArray(r.claims) &&
      r.claims.every(
        (c: {
          supported?: unknown
          faithful?: unknown
          attributed?: unknown
        }) =>
          typeof c.supported === 'boolean' &&
          typeof c.faithful === 'boolean' &&
          typeof c.attributed === 'boolean',
      ),
  )
)
  throw new Error('Invalid annotated dataset.')
const result = {
  datasetSha256: createHash('sha256').update(raw).digest('hex'),
  runtime: process.version,
  model: null,
  promptVersion: null,
  results: evaluate(dataset as EvaluationCase[]),
}
const output = JSON.stringify(result, null, 2) + '\n'
if (process.argv[3]) writeFileSync(process.argv[3], output)
else process.stdout.write(output)
