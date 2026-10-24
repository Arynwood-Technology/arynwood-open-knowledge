# Arynwood Open Knowledge

[![Validate](https://github.com/Arynwood-Technology/arynwood-open-knowledge/actions/workflows/ci.yml/badge.svg)](https://github.com/Arynwood-Technology/arynwood-open-knowledge/actions/workflows/ci.yml)
Local-first educational research and inclusive learning, built on a documented LearnOS foundation.
An independent MIT-licensed Arynwood Technology project, using a pinned foundation without modifying or forking SkyeVault/LearnOS.

## Use the initial milestone
Requires Node >=22.12 and npm.
```sh
npm ci
npm run dev
```
Open the displayed local URL. Search an educational topic with Crossref or OpenAlex, inspect a publication, follow its source, view bibliographic checks, choose a knowledge topic, optionally associate the reading pathway, and save locally. Open Knowledge bank to search/filter records and export JSON backups or CSL citations. No LLM, login, API key or paid service is required.

Saved records live in this browser on this device. Search sends your query to the selected provider; do not include private learner information. Metadata verification is distinct from peer review, evidence quality and human educational review. Methods/findings are left unassessed until human appraisal.

```sh
npm test
npm run build
npm run evaluate
npm run preview
```

## Optional ORCID connection
[ORCID setup](docs/research/ORCID_SETUP.md) explains the server-only environment configuration, callback routes and public researcher profiles. Use your own server-side credentials; `.env.example` contains a public client ID and a blank secret. Public discovery remains available without the optional server.

Run the built app and optional OAuth routes from the local Node server through the configured origin. The proposed production HTTPS callback has not been hosted. Production credentials require HTTPS; sandbox loopback development needs a separately registered sandbox client. Tokens stay in server memory; authenticated ORCID iDs do not imply verified qualifications or editor permission.

## Implementation status
| Complete | Experimental / environment validation pending | Planned |
| --- | --- | --- |
| React research interface; Crossref/OpenAlex adapters; singleton bibliographic checks; source provenance; 18-domain local bank; topic/module associations; backup/restore/deletion; CSL export; reading controls; one LearnOS reading pathway; optional ORCID OAuth/profile routes; synthetic evaluation harness; architecture and governance docs | Live API/CORS behavior; actual ORCID consent with rotated credentials; manual assistive-technology audit; native Tauri shell; dependency security audit | ERIC/additional providers; full LearnOS teaching/family tools; encrypted transactional storage; local AI/RAG/MCP; public articles/feeds; community editorial service |

Initial tests use injected synthetic metadata, never pretend test citations are real scholarship. The repository is a working first milestone, not the entire long-term ecosystem.

## Repository layout
```text
src/
  research/        # schema, providers, verification, bank, citations, evaluation
  education/       # adapted LearnOS curriculum interface and reading manifest
  App.tsx          # discovery, knowledge bank and learning-resource views
server/            # optional isolated ORCID OAuth/public profile service
src-tauri/         # minimal optional desktop shell, no native command privileges
scripts/           # reproducible annotation-scoring CLI
experiments/       # synthetic fixture and six research protocol templates
docs/
  architecture/    # audit, system design, exact upstream provenance
  research/        # methodology, schema, APIs, OAuth, AI evaluation
  education/       # special education scope and accessibility principles
  community/       # contributions and editorial policy
  security/        # privacy, retention, threats and compliance considerations
  publishing/      # reviewed public-knowledge design
.github/           # CI, contribution and correction templates
```

[Foundation audit](docs/architecture/FOUNDATION_AUDIT.md) · [System design](docs/architecture/SYSTEM_DESIGN.md) · [Upstream provenance](docs/architecture/UPSTREAM_PROVENANCE.md) · [Roadmap](docs/ROADMAP.md) · [Validation and limitations](docs/VALIDATION.md) · [Publishing the repository](docs/PUBLISHING_REPOSITORY.md)

## Desktop development
The Tauri shell is experimental. Rust dependencies are pinned and Cargo.lock is provided. Install the platform prerequisites and an independently installed Tauri v2 CLI (tested upstream CLI family: 2.10.x), then run `cargo tauri dev` or `npm run tauri -- dev` if the CLI is available locally. The CLI is optional and not a web dependency. No installers or desktop credential sidecar are supplied. Native build verification remains incomplete in this environment.

## Contribution and academic direction
See [Contributing](CONTRIBUTING.md), [Editorial policy](docs/community/EDITORIAL_POLICY.md), and [Privacy/security](docs/security/PRIVACY_SECURITY.md). Formal academic direction: Special Education, Mild to Moderate Exceptionalities. No automated disability diagnosis, placement or unreviewed high-stakes recommendations.

## License and attribution
MIT; complete original copyright notice retained in LICENSE. NOTICE and upstream-manifest.json document reused/adapted source. The original LearnOS history remains accessible at the pinned upstream revision. Linked publications and third-party resources retain their own rights.

## How this is built

I decide the scope and architecture, review changes, run the available checks and ship releases.
Claude Code and Codex work with me as pair programmers; some assisted commits carry
co-author trailers, and others do not. [How we build](https://github.com/Arynwood-Technology/.github/blob/main/HOW-WE-BUILD.md).
