# Privacy and security
Implemented public-metadata application only. No student accounts, learning records, mandatory analytics, telemetry, sync, advertising or cloud AI.
Research requests disclose query text and network identifiers to providers. Avoid entering personal learner information. Saved metadata is local and unencrypted; do not store sensitive data on shared devices.

## Boundaries and mitigations
Public bank schema rejects unknown/private fields; it does not detect personal information written inside ordinary free-text fields. There is no private learner data integration. React treats metadata as text. Links require HTTPS. Query/provider IDs are validated and requests allow only fixed API origins. Responses are bounded; requests cancel/time out. No retrieved script, HTML or PDF ingestion is implemented. Future document ingestion must isolate parsers, limit MIME/size/resources, strip active content, and treat prompt instructions as untrusted.

The new app does not use LearnOS's local password hashes, bootstrap accounts or browser role system. OAuth is optional and server-only with cookie-bound state, CSRF checks, short sessions and memory-held tokens. Configuration secrets belong in an ignored restricted .env for local use or a deployment secret manager. An ORCID connection is not an editor role. Native Tauri capabilities grant no filesystem/process commands.

Local records remain until explicitly removed or browser data are cleared. Export/validated restore provide user-controlled backups. Export files are plaintext; protect them at rest and keep them out of Git. Imports replace the public bank only after explicit confirmation; malformed imports leave it unchanged. Browser multi-tab writes and encrypted archives are not implemented. Server identity sessions expire in an hour and on restart/logout. OS/process administrators can access memory; no protection from a compromised machine is claimed.

## Dependencies and release controls
Pinned npm lock, exact Rust dependencies and Cargo.lock support reproducibility. CI runs installation, tests, build and dependency audit. The initial live npm audit could not reach its endpoint due to restricted DNS, so vulnerability status remains unknown. Recheck npm audit and Rust advisories with network access before release. Never automatically apply a breaking security update or claim zero vulnerabilities without a completed check.

## FERPA and COPPA considerations
FERPA can apply to education records held by covered educational institutions; COPPA concerns covered online collection of children's personal information. This project does not collect learner records, but future educational deployments require assessment of legal applicability, institutional contracts, consent, access/deletion, disclosure and retention controls. Local-first design alone is not compliance.
Official starting points: [U.S. Department of Education FERPA](https://studentprivacy.ed.gov/ferpa), [FTC children's privacy guidance](https://www.ftc.gov/business-guidance/privacy-security/childrens-privacy).
No regulatory compliance claim is made.

Report vulnerabilities privately to repository maintainers through GitHub private security reporting if enabled. Do not attach secrets/student data to public issues.
