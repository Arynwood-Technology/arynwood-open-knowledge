import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { KnowledgeBank } from './research/bank'
import type { ResearchRecord, ScholarlyProvider, Topic } from './research/model'
import { topics } from './research/model'
import {
  crossrefProvider,
  openalexProvider,
  verifyMetadata,
} from './research/providers'
import { citationText, cslJson } from './research/citations'
import { parseSemesterCurriculum } from './education/curriculum'
import reading from './education/grade-01-reading.module.json'

const curriculum = parseSemesterCurriculum(reading.curriculum)
const defaults = { crossref: crossrefProvider(), openalex: openalexProvider() }
const message = (error: unknown) =>
  error instanceof Error
    ? error.message
    : 'The operation could not be completed.'
const authUrl = import.meta.env.VITE_ORCID_AUTH_URL
const allowedAuthUrl = [
  'http://127.0.0.1:8000/auth/orcid',
  'https://research.arynwood.com/auth/orcid',
].includes(authUrl)
  ? authUrl
  : undefined
function download(name: string, value: string) {
  const url = URL.createObjectURL(
    new Blob([value], { type: 'application/json' }),
  )
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
function Reference({ record }: { record: ResearchRecord }) {
  return (
    <>
      <p>{citationText(record)}</p>
      <a href={record.sourceUrl} target="_blank" rel="noopener noreferrer">
        {record.sourceUrl.startsWith('https://openalex.org/')
          ? 'Provider publication record (opens a new tab)'
          : 'Original publication reference (opens a new tab)'}
      </a>
      <p>
        {record.authors.map((author, i) => (
          <span key={i}>
            {author.name}
            {author.orcid && (
              <>
                {' '}
                ·{' '}
                <a
                  href={'https://orcid.org/' + author.orcid}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  ORCID {author.orcid}
                </a>
              </>
            )}
            {i < record.authors.length - 1 ? '; ' : ''}
          </span>
        ))}
      </p>
    </>
  )
}
export function App({
  bank = new KnowledgeBank(localStorage),
  providers = defaults,
}: {
  bank?: KnowledgeBank
  providers?: Record<string, ScholarlyProvider>
}) {
  const [view, setView] = useState<'discover' | 'bank' | 'learning'>('discover')
  const [providerId, setProviderId] = useState('crossref')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ResearchRecord[]>([])
  const [selected, setSelected] = useState<ResearchRecord | null>(null)
  const [saved, setSaved] = useState<ResearchRecord[]>([])
  const [topic, setTopic] = useState<Topic>('Learning Sciences')
  const [filter, setFilter] = useState('')
  const [bankTopic, setBankTopic] = useState('')
  const [moduleLink, setModuleLink] = useState(false)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [scale, setScale] = useState('normal')
  const [contrast, setContrast] = useState(false)
  const [deletePending, setDeletePending] = useState(false)
  const [restorePending, setRestorePending] = useState<string | null>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const detail = useRef<HTMLHeadingElement>(null)
  const controller = useRef<AbortController | null>(null)
  function refresh() {
    try {
      setSaved(bank.list())
    } catch (e) {
      setError(
        'Saved data could not be read: ' +
          message(e) +
          ' Export the raw data through browser tools before clearing it.',
      )
    }
  }
  useEffect(() => {
    refresh()
    return () => controller.current?.abort()
  }, [])
  useEffect(() => {
    heading.current?.focus()
  }, [view])
  useEffect(() => {
    if (selected) detail.current?.focus()
  }, [selected])
  async function run(task: (signal: AbortSignal) => Promise<void>) {
    setBusy(true)
    setError('')
    setStatus('')
    controller.current = new AbortController()
    try {
      await task(controller.current.signal)
    } catch (e) {
      setError(
        controller.current.signal.aborted ? 'Request cancelled.' : message(e),
      )
    } finally {
      setBusy(false)
      controller.current = null
    }
  }
  function search(event: FormEvent) {
    event.preventDefault()
    setSelected(null)
    setResults([])
    void run(async (signal) => {
      const rows = await providers[providerId].search(query, signal)
      setResults(rows)
      setStatus(
        rows.length +
          ' results retrieved. Inspect a reference to verify metadata.',
      )
    })
  }
  function inspect(record: ResearchRecord) {
    setSelected(null)
    void run(async (signal) => {
      const verified = await verifyMetadata(
        record,
        providers[record.provider],
        signal,
      )
      setSelected(verified)
      setStatus(
        verified.evidence.bibliographic === 'verified'
          ? 'Bibliographic fields checked. Scientific quality and peer review remain unreviewed.'
          : 'Conflicting metadata found. Inspect the uncertainty notes.',
      )
    })
  }
  function save() {
    if (!selected) return
    try {
      bank.save(selected, topic, moduleLink ? reading.id : undefined)
      refresh()
      setStatus(
        'Research record saved locally. Open Knowledge bank to view it.',
      )
      setError('')
    } catch (e) {
      setError(message(e))
    }
  }
  const visible = saved.filter(
    (r) =>
      (!bankTopic || r.topics.includes(bankTopic as Topic)) &&
      (r.title + ' ' + r.authors.map((a) => a.name).join(' '))
        .toLowerCase()
        .includes(filter.toLowerCase()),
  )
  return (
    <div
      className={
        'app ' + (contrast ? 'high-contrast ' : '') + 'reading-' + scale
      }
    >
      <a className="skip-link" href="#main">
        Skip to main content
      </a>
      <header>
        <p className="eyebrow">ARYNWOOD TECHNOLOGY · OPEN EDUCATION</p>
        <h1>Arynwood Open Knowledge</h1>
        <p>Discover research. Inspect its sources. Build understanding.</p>
        <nav aria-label="Main navigation">
          {(['discover', 'bank', 'learning'] as const).map((v) => (
            <button
              key={v}
              aria-current={view === v ? 'page' : undefined}
              onClick={() => {
                setView(v)
                setError('')
                setStatus('')
              }}
            >
              {v === 'discover'
                ? 'Research discovery'
                : v === 'bank'
                  ? 'Knowledge bank'
                  : 'Learning resources'}
            </button>
          ))}
          {allowedAuthUrl && (
            <a href={allowedAuthUrl}>Optional ORCID sign-in</a>
          )}
        </nav>
      </header>
      <aside className="reading-controls" aria-label="Reading preferences">
        <label>
          Text size
          <select value={scale} onChange={(e) => setScale(e.target.value)}>
            <option value="normal">Standard</option>
            <option value="large">Large</option>
            <option value="extra">Extra large</option>
          </select>
        </label>
        <label>
          <input
            type="checkbox"
            checked={contrast}
            onChange={(e) => setContrast(e.target.checked)}
          />
          High contrast
        </label>
      </aside>
      <main id="main">
        <h2 ref={heading} tabIndex={-1}>
          {view === 'discover'
            ? 'Research discovery'
            : view === 'bank'
              ? 'Your knowledge bank'
              : 'Learning resources'}
        </h2>
        <div role="status" aria-live="polite">
          {status}
        </div>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        {view === 'discover' && (
          <>
            <p>
              Search public scholarly metadata without an account or AI model. A
              search sends your topic to the chosen provider. Do not include
              student names or private records.
            </p>
            <form onSubmit={search}>
              <label>
                Metadata provider
                <select
                  value={providerId}
                  disabled={busy}
                  onChange={(e) => setProviderId(e.target.value)}
                >
                  <option value="crossref">Crossref</option>
                  <option value="openalex">OpenAlex</option>
                </select>
              </label>
              <label>
                Educational research topic
                <input
                  type="search"
                  value={query}
                  minLength={3}
                  maxLength={200}
                  required
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Inclusive literacy instruction"
                />
              </label>
              <button disabled={busy} type="submit">
                {busy ? 'Working…' : 'Search research'}
              </button>
              {busy && (
                <button
                  type="button"
                  onClick={() => controller.current?.abort()}
                >
                  Cancel request
                </button>
              )}
            </form>
            <section
              aria-label="Search results"
              aria-busy={busy}
              className="cards"
            >
              {results.map((r) => (
                <article key={r.id}>
                  <p className="eyebrow">
                    {r.provider} · {r.publicationDate ?? 'Date unavailable'}
                  </p>
                  <h3>{r.title}</h3>
                  <p>
                    {r.authors.map((a) => a.name).join('; ') ||
                      'Authors unavailable'}
                  </p>
                  <button disabled={busy} onClick={() => inspect(r)}>
                    Inspect reference: {r.title}
                  </button>
                </article>
              ))}
            </section>
            {selected && (
              <section className="detail" aria-label="Publication details">
                <h3 ref={detail} tabIndex={-1}>
                  {selected.title}
                </h3>
                <Reference record={selected} />
                <p>
                  <strong>
                    Bibliographic status: {selected.evidence.bibliographic}
                  </strong>
                </p>
                <p>
                  Checked fields:{' '}
                  {selected.evidence.verifiedFields.join(', ') || 'None'}.
                  Checked at: {selected.evidence.verificationDate}.
                </p>
                <p>
                  Peer review: {selected.evidence.peerReview}. Human review:{' '}
                  {selected.evidence.humanReview}.
                </p>
                <ul>
                  {selected.evidence.uncertainties.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
                <label>
                  Knowledge topic
                  <select
                    value={topic}
                    onChange={(e) => setTopic(e.target.value as Topic)}
                  >
                    {topics.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={moduleLink}
                    onChange={(e) => setModuleLink(e.target.checked)}
                  />
                  Associate with Grade 1 reading pathway (a relationship, not an
                  endorsement)
                </label>
                <button disabled={busy} onClick={save}>
                  Save research locally
                </button>
                <details>
                  <summary>Provenance and rights</summary>
                  <p>
                    {selected.licensing.metadata} {selected.licensing.fullText}
                  </p>
                  {selected.provenance.map((p, i) => (
                    <p key={i}>
                      {p.provider} · {p.retrievedAt} · SHA-256:{' '}
                      <code>{p.payloadSha256}</code>
                      <br />
                      <a
                        href={p.requestUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Provider metadata request
                      </a>
                    </p>
                  ))}
                </details>
              </section>
            )}
          </>
        )}
        {view === 'bank' && (
          <>
            <p>
              Records stay in this browser on this device. Export a backup
              before clearing browser data. This bank contains public research
              metadata; it is not a place for student information.
            </p>
            <div className="toolbar">
              <button
                onClick={() => {
                  try {
                    download('arynwood-knowledge.json', bank.export())
                  } catch (e) {
                    setError(message(e))
                  }
                }}
              >
                Export JSON backup
              </button>
              <button
                onClick={() =>
                  download('arynwood-citations.csl.json', cslJson(saved))
                }
              >
                Export CSL citations
              </button>
              <label>
                Restore JSON backup
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    if (file.size > 5_000_000) {
                      setError('Backup exceeds 5 MB.')
                      return
                    }
                    setRestorePending(await file.text())
                    e.target.value = ''
                  }}
                />
              </label>
              <button onClick={() => setDeletePending(true)}>
                Delete all saved research
              </button>
            </div>
            {restorePending !== null && (
              <section aria-label="Confirm restore">
                <p>
                  Restore replaces your current bank. Export it first if you
                  want to keep it.
                </p>
                <button
                  onClick={() => {
                    try {
                      bank.restore(restorePending)
                      refresh()
                      setRestorePending(null)
                      setStatus(
                        'Backup restored. Human review labels were reset.',
                      )
                      setError('')
                    } catch (e) {
                      setError(message(e))
                    }
                  }}
                >
                  Replace bank with backup
                </button>
                <button onClick={() => setRestorePending(null)}>
                  Cancel restore
                </button>
              </section>
            )}
            {deletePending && (
              <section aria-label="Confirm deletion">
                <p>Delete all research records from this browser?</p>
                <button
                  onClick={() => {
                    try {
                      bank.clear()
                      refresh()
                      setDeletePending(false)
                      setStatus('All saved research deleted.')
                      setError('')
                    } catch (e) {
                      setError(message(e))
                    }
                  }}
                >
                  Confirm deletion
                </button>
                <button onClick={() => setDeletePending(false)}>
                  Cancel deletion
                </button>
              </section>
            )}
            <label>
              Search saved records
              <input
                type="search"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
            </label>
            <label>
              Filter by knowledge topic
              <select
                value={bankTopic}
                onChange={(e) => setBankTopic(e.target.value)}
              >
                <option value="">All topics</option>
                {topics.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
            <p>{visible.length} saved records</p>
            <section className="cards" aria-label="Saved research">
              {visible.map((r) => (
                <article key={r.id}>
                  <h3>{r.title}</h3>
                  <Reference record={r} />
                  <p>Topics: {r.topics.join(', ')}</p>
                  <p>
                    Bibliographic: {r.evidence.bibliographic} · Human review:{' '}
                    {r.evidence.humanReview} · Peer review:{' '}
                    {r.evidence.peerReview}
                  </p>
                  <p>
                    Related modules: {r.relatedModuleIds.join(', ') || 'None'}
                  </p>
                  <details>
                    <summary>Evidence gaps and history</summary>
                    <ul>
                      {r.evidence.uncertainties.map((u, i) => (
                        <li key={i}>{u}</li>
                      ))}
                    </ul>
                    {r.revisions.map((v, i) => (
                      <p key={i}>
                        {v.at}: {v.action}
                      </p>
                    ))}
                  </details>
                  <button
                    onClick={() => {
                      try {
                        bank.remove(r.id)
                        refresh()
                        setStatus('Record removed.')
                        setError('')
                      } catch (e) {
                        setError(message(e))
                      }
                    }}
                  >
                    Remove record: {r.title}
                  </button>
                </article>
              ))}
            </section>
          </>
        )}
        {view === 'learning' && (
          <section>
            <p>
              This reading pathway comes from LearnOS. An educator must review
              and adapt materials and standards before using it. Its inclusion
              does not imply research validation.
            </p>
            <h3>{reading.name}</h3>
            <p>{reading.description}</p>
            {curriculum?.units.map((unit) => (
              <article key={unit.id}>
                <h4>{unit.title}</h4>
                <p>{unit.essentialQuestion}</p>
                {unit.lessons.map((lesson) => (
                  <details key={lesson.id}>
                    <summary>{lesson.title}</summary>
                    <p>{lesson.objective}</p>
                    <p>
                      Suggested time: {lesson.estimatedMinutes} minutes; adapt
                      as needed.
                    </p>
                    {lesson.activities.map((a) => (
                      <div key={a.id}>
                        <h5>{a.title}</h5>
                        <p>{a.learnerAction}</p>
                        <p>
                          Ways to show understanding:{' '}
                          {a.evidenceOptions.join(', ')}.
                        </p>
                      </div>
                    ))}
                    <ul>
                      {lesson.successCriteria.map((c) => (
                        <li key={c}>{c}</li>
                      ))}
                    </ul>
                  </details>
                ))}
              </article>
            ))}
            <p>
              Educator adaptations can include audio responses, visual examples,
              shorter segments and alternate materials. No learner progress or
              identity is collected here.
            </p>
          </section>
        )}
      </main>
      <footer>
        <p>
          Independent open-source project · Metadata verification is not a
          judgment of scientific quality.
        </p>
        <p>
          ORCID identifies researchers; it does not certify qualifications or
          endorse findings.
        </p>
      </footer>
    </div>
  )
}
