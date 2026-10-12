# Evidence schema
Canonical TypeScript definitions: src/research/model.ts. Runtime validation: src/research/bank.ts.
All saved records carry schemaVersion=1 and a deterministic DOI or provider-scoped ID.

| Group | Fields |
| --- | --- |
| Identity | id, provider, sourceId, title, authors with validated ORCID iDs, DOI, original sourceUrl |
| Publication | publicationDate with available precision, venue, publicationType |
| Knowledge | topics (18-domain taxonomy), researchQuestion, methodology, population, findings |
| Appraisal | limitations, contradictoryFindings, educationalApplications, accessibilityConsiderations |
| Relationships | relatedModuleIds; targetId/predicate/note edges |
| Evidence | kind, bibliographic status, verifiedFields, uncertainties, peerReview and supporting source, humanReview/reviewer/reviewedAt, verificationDate |
| Provenance | provider, sourceId, requestUrl, retrievedAt, SHA-256 of canonicalized fetched item, observed fields |
| History/rights | revisions, attribution, metadata rights statement, full-text rights statement, optional publication license URL |

Empty methods/findings/population strings mean not assessed, not no effect. Missing publication dates/authors remain explicit uncertainty notes. Hashes identify serialized provider items, not the exact HTTP byte stream and not truth.

Evidence kinds distinguish publication, systematic review, meta-analysis, preliminary research, professional guidance, educational resource, AI interpretation and unverified claim. Initial providers set kind=publication, peerReview=unknown and humanReview=unreviewed. They never infer systematic review or peer review from title/type/DOI. Bibliographic states are retrieved, verified or conflicting. Conflicts preserve both provenance observations.

guidanceEligible requires metadata verification plus a named dated human review; it is a domain gate for future publishing, not an authentication mechanism. No review editor or publication endpoint is shipped. An ORCID-authenticated session alone cannot approve guidance. Imported human review flags reset to unreviewed. Local provenance remains a user-held record, not a signed authority claim.

Unknown/private fields are rejected in backups, including nested objects. Validate strings, arrays, IDs, URLs and schema version before any write. Future schema changes must include explicit migrations and lossless backups.
