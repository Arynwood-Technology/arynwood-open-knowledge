# LearnOS foundation audit
Assessment date: 2026-10-11. Upstream: https://github.com/SkyeVault/LearnOS/tree/33d5c36404c6390d62d0b626e9ce05bf88f1038b.
Source inspected read-only through GitHub connector because shell DNS is unavailable. No upstream writes were performed.

## Architecture and reuse decisions
| Area | Inspected source | Finding | Decision |
| --- | --- | --- | --- |
| Shell | src/main.ts, package.json | Vite/TypeScript DOM page functions; React 18 and MUI dependencies support selected surfaces | Build a small React research shell rather than port the entire monolith |
| Living Library | src/pages/cultural-library.ts; content/k12-library.ts | Curated link-first shelves and curriculum discovery, not scholarly verification | Adapt discovery → inspection → local collection flow |
| Module Library | features/modules.ts | Declarative module goals, lessons, resources; local assignment records | Preserve module semantics; separate public module content from private progress |
| K–12 | content/curriculum/k-12; features/module-learning.ts | 1,638 semester manifests in upstream tree; typed units, activities, evidence and human review | Incorporate one Grade 1 reading pathway and curriculum interfaces initially |
| Teacher Desk | pages/teacher-tools.ts; features/teacher-tools.ts | Local lesson plans, classes, engagement and resource views | Future educator module; do not copy learner identities |
| Family Hub | pages/family-hub.ts | Shared/personal calendars and scoped views | Separate future private workspace |
| Learner | pages/home.ts | Subject cards, module assignments, age-specific activities | Accessible read-only pathway preview initially |
| Admin Corner | pages/parent-controls.ts; app/parent-controls.ts; app/access.ts | Interface-scoped permissions and local identity management | Do not reuse as a security boundary |
| Creator Studio | pages/creator-studio.ts and creator-studio-v2.ts (tree inventory) | Local resource authoring / slides | Future educator resource service |
| Design Studio | public/design-studio.html | Large standalone HTML/JS authoring surface, embedded interaction patterns | Keep separate pending accessibility/security audit |
| Desktop | src-tauri/tauri.conf.json; src-tauri/src/lib.rs | Tauri v2; native command shell and CSP | Separate minimal shell, new application identity, restricted network allowlist |
| Storage | app/store.ts; features/modules.ts; module-learning.ts | Versioned localStorage; parsing often via type assertions | New research namespace, runtime validation and explicit export/deletion |
| Citations | docs/CITATION_LOG.md; content/k12-library.ts | Source review log and link-first rights policy | Extend to per-record provenance; no automatic full-text copying |
| Tests | module-learning.test.ts; package.json; tree test inventory | Vitest unit tests; meaningful evidence/review separation coverage | Preserve semantics and add adapter/storage/UI integration tests |
| Documentation | README, docs/PROJECT_HISTORY.md | Prototype limitations and staged classroom security plans | Preserve upstream context by immutable links and provenance manifest |

## Security findings
Source-level observations, not a penetration test: store.ts uses unsalted SHA-256 for local secrets and includes a legacy owner bootstrap. Browser roles cannot protect data from users with local developer tools. Local storage is unencrypted; a corrupt shape can pass version-only checks. Curriculum parsing checks outer shapes but not every activity. DOM pages use innerHTML and escapeHtml in some paths; all insertion paths would need review. Tauri CSP permits arbitrary localhost ports. Document imports and standalone authoring must be treated as untrusted.

The new milestone stores only bibliographic records and public curriculum. It has no student accounts, student records, OAuth secrets, HTML ingestion, native filesystem commands or public write service. React escapes displayed metadata. Research requests use fixed origins, bounded queries, response-size checks, cancellation and timeouts. This does not establish FERPA/COPPA compliance.

## Accessibility findings
Native controls and ARIA appear in teacher navigation; learner subject cards are clickable divs. Animated backgrounds, dense grids, standalone studio controls and route focus need manual keyboard/screen-reader review. CSS includes reduced-motion-related rules, but their presence does not prove conformance. Target WCAG 2.2 AA with testing and human review; no conformance claim.

## Scope and limitations
This is a targeted source audit, not a complete line-by-line review or native build verification. The new app incorporates curriculum structure and one reading module only. The full LearnOS classrooms, calendar, account system, K–12 catalog and studios remain upstream and are planned migration candidates. Existing functionality incorporated here is tested separately; no claim that the entire LearnOS app is included.

