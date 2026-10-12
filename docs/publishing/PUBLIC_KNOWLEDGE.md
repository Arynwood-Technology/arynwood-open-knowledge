# Public knowledge publishing design
Planned separate public projection from reviewed, licensed research and educator resources. The private learning workspace must never share this export pipeline.

Stable /articles/{slug} and /topics/{slug} URLs; accessible HTML; named authors and optional ORCID profile links; DOI/source references; publication/update dates; evidence/human-review status; immutable revisions and correction notices. Export Schema.org Article or TechArticle based on actual content, never a fabricated scholarly status. Use ScholarlyArticle only when appropriate for the source/type. Include machine-readable JSON metadata, CSL citations and RSS/Atom feeds built from approved public records.

Start with static pages and a local editorial build command, not mandatory hosting or microservices. Add accessible collection search from public metadata. Keep URLs stable and redirects documented. Avoid indexing drafts, private information, empty machine-generated topic pages or misleading author credentials. Legitimate discoverability follows original useful work, transparent attribution and earned citations.

Before implementation: define reviewed article schema, enforce authenticated editor authorization, review rights and accessibility, create public export tests rejecting private fields, and add correction/revision tooling. The current local export is a backup/citation function, not public publishing. research.arynwood.com is proposed and not deployed.
