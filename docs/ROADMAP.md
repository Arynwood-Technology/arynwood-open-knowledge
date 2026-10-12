# Roadmap
## Complete in initial milestone
Pinned LearnOS audit/provenance/license; independent Git repository; React research interface; Crossref/OpenAlex metadata adapters; singleton bibliographic comparison and uncertainty; 18-domain knowledge schema; local categorization, module links, search, backup/restore/deletion and CSL export; one upstream reading pathway; reading controls and semantic baseline; optional server-side ORCID OAuth/public profile adapter; synthetic engineering evaluation harness; contributor/editorial/privacy policies.

## Experimental / awaiting environment validation
Tauri minimal shell and capability configuration (native dependency check incomplete).
ORCID OAuth is covered with mock HTTP-handler tests; rotated credentials and actual registered redirects are needed for a live test. Production endpoint/TLS hosting is not provisioned. Current provider live/CORS behavior and assistive-technology use require real environment validation. No complete WCAG, security or regulatory assessment.

## Next milestones
1. Restore working GitHub CLI/network and publish the reviewed local repository without overwriting an existing remote.
2. Rotate/configure ORCID credentials; validate sandbox consent/state/logout; deploy the HTTPS callback only after security review.
3. Run live Crossref/OpenAlex integration and dependency/advisory checks; measure accessibility with screen-reader users.
4. Add ERIC after current contract/rights verification; cross-provider conflicts, cache and controlled paging.
5. Migrate storage to validated IndexedDB/SQLite with transactions, schema migrations, encrypted optional archives and backup recovery.
6. Migrate additional LearnOS curriculum and educator planning under separate public/private boundaries; review grade/standards alignment.
7. Run registered citation/retrieval experiments with rights-cleared corpora and human annotations. Add optional local Ollama/embedding adapters.
8. Implement reviewed static articles, permanent URLs, structured metadata, feeds and correction history.
9. Build editorial/community roles and moderation before accepting public write submissions.
10. Grow special education literature syntheses alongside formal study and appropriate professional review.

The long-term ecosystem is intentionally larger than this first functional milestone. No automated diagnosis, placement, publication of unreviewed contributions, mandatory cloud or paid AI dependency is planned.
