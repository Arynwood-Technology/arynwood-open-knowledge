# Validation report
Initial milestone, evaluated locally on Node v22.18.0, npm 10.9.3.

- Offline dependency installation with a pinned npm lock succeeded using locally cached registry packages. No dependencies or local records from LearnOS were copied into version control.
- Production TypeScript check and Vite build passed.
- 22 automated tests passed: 17 Vitest tests across adapters, evidence/provenance, storage/import safety, curriculum, scoring and React workflow; five Node HTTP-handler tests for OAuth/configuration/profile and security behavior.
- Synthetic annotation-scoring CLI passed; fixture macro metrics are 0.5 by construction. This is a harness check, not a benchmark of any model.
- No live ORCID login performed; exposed credentials were not used. Replacement credentials and a registered callback are required.
- Live scholarly API requests from the application were not verified because shell networking is restricted. Tests inject metadata transports. Official documentation was checked through browsing.
- npm audit attempted but failed with DNS EAI_AGAIN; no dependency vulnerability clearance is claimed.
- cargo check --offline attempted. Lock resolution succeeded, but compilation stopped because Cargo could not unpack alloc-stdlib into the read-only home registry. Desktop/native build and installers remain unverified.
- GitHub CLI launch failed due to Snap confinement. Repository creation/push not performed; see PUBLISHING_REPOSITORY.md.
- Manual screen-reader/browser/WebView accessibility testing and independent security/privacy assessment remain pending.

## Known limits
The local metadata bank is plaintext localStorage, capped at 500 records/5 MB; no encryption, transactional multi-tab editing or cloud synchronization. Search retrieves ten results from one provider at a time. Bibliographic verification uses one provider's search/singleton fields, not independent scientific appraisal. No full-text ingestion, evidence editor or public publisher exists. ORCID identity associations are session-scoped, not durable editorial accounts. Tauri integration is a minimal experimental shell. LearnOS teaching/family/studio surfaces and its complete curriculum remain migration candidates.

## Next validation gates
Working network dependency audit and live API/CORS smoke tests; rotated ORCID sandbox consent and production proxy review; actual keyboard/screen-reader/zoom tests; native build on supported platforms; scholarly rights and educator review of additional curriculum; reviewed public export tests before publication features.
