# System design
## Boundaries
A React/TypeScript research web application with optional Tauri v2 shell; shared pure domain modules; no mandatory service, account or LLM. Public research metadata and educational content are separate from any future private learner workspace.

| Component | Interface / responsibility | Milestone status |
| --- | --- | --- |
| Knowledge Engine | ResearchRecord, typed relationships, topic taxonomy, Bank repository | Implemented local metadata bank |
| Research Discovery Engine | ScholarlyProvider.search/lookup, injected JSON transport | Crossref and OpenAlex |
| Researcher Identity | ORCID checksum normalization, stable links and optional isolated OAuth/profile server | Implemented; live configuration pending |
| Evidence Verification | Per-source bibliographic status, unknown quality, human review | Implemented metadata checks and review gate |
| Educational Knowledge Bank | Versioned validated local records, topic/module relationships | Implemented |
| Accessible Learning | Semantic React controls, reading options, upstream pathway preview | Implemented baseline, manual audit pending |
| Educator Resource Library | Declarative curricula and adaptation notes | One upstream reading pathway; full tools planned |
| Local AI Assistant | Optional retrieval and model runner behind reviewed-record boundary | Design only |
| Public Publishing | Explicit approved public projection and editorial queue | Design only |
| Community Framework | Git contributions, review policy and issue templates | Documentation and repository workflow |

## Data flow
Search input → fixed-origin provider → bounded untrusted JSON → schema normalization → search candidate → independent singleton metadata lookup → bibliographic verification → user topic selection → local Bank → knowledge interface. No metadata lookup sets peer review or scientific quality. Verification means selected bibliographic fields match that provider's singleton response, not independent replication of research.

Relationships are explicit edges with source/target IDs, predicate and provenance. SQLite or a graph database can replace storage behind the Bank interface later. No graph database required now. Public record IDs use normalized DOI where available, otherwise provider-scoped IDs. Conflicting provider findings remain separate provenance events.

## Future deployment
Desktop uses the same frontend with minimal Tauri privileges. Optional Node HTTP server owns ORCID OAuth and memory-held tokens; no server framework or cloud dependency. It associates authenticated researchers with ORCID iDs for a one-hour session and retrieves sanitized public affiliations/works. Credentials come from server-only environment variables and never enter frontend bundles. Enforceable editorial/multi-user permissions and durable keyring storage remain planned. MCP research tools will expose only public records through an explicit allowlist. Separate origins and storage for private learner workspaces; no shared localStorage import. Approved article exports must have review, license and correction metadata. No public publishing endpoint is shipped in this milestone.

## Tradeoffs
localStorage offers a small, dependency-light initial store but lacks encryption, transactional multi-tab writes and reliable large archives. Export JSON backups; validated restore and delete. No collaboration or cloud synchronization. Search requires network access and sends query text to the selected provider; saved records and learning preview work offline after assets are available. Optional offline caching/service worker is planned.
