# Scholarly API integrations
Official documentation checked 2026-10-11. API contracts and policies can change; recheck before deployment. No paid subscription required by the milestone.

| Provider | Implemented / planned | Auth, limits and rights |
| --- | --- | --- |
| Crossref | Search works and DOI singleton adapter | Public metadata queries without credentials; respect 429 and response limit headers. Factual metadata is reusable, but abstracts and full text need separate rights review. No abstracts/full text ingested. |
| OpenAlex | Search works and work singleton adapter | Current documentation allows basic anonymous queries; a free key increases budget. Keys are unnecessary here. Dataset metadata is CC0; linked full text retains its own rights. Handle 429. |
| ORCID | Checksum/profile links plus optional server-side OAuth and public record adapter | Public API terms restrict credential use to eligible non-commercial uses. Organization deployment must assess those terms/membership. Public record data and API service terms are distinct. Credentials/tokens remain server-only. |
| ERIC | Discovery adapter planned | Official ERIC research-topic API material identifies the IES endpoint. Current detailed API documentation was not successfully retrievable during this assessment; do not ship an inferred contract. Verify fields, peer-review flag semantics, limits and rights before implementation. |

Sources: [Crossref REST API](https://www.crossref.org/documentation/retrieve-metadata/rest-api/), [Crossref API contract](https://api.crossref.org/), [Crossref metadata use](https://crossref.org/services/metadata-retrieval/), [OpenAlex API](https://help.openalex.org/api/), [OpenAlex authentication](https://help.openalex.org/api/authentication/), [ORCID documentation](https://info.orcid.org/documentation/), [ORCID Public API terms](https://info.orcid.org/public-client-terms-of-service/), [ORCID API limits](https://info.orcid.org/ufaqs/what-are-the-api-limits/), [ERIC API material](https://eric.ed.gov/pdf/Using_ERIC_API_for_Research_Topics.pdf).

## Implemented transport controls
Fixed HTTPS origins, no request credentials/referrer, no redirects, query bounds, ten search results, single in-flight request per transport, one-second minimum interval, 15-second timeout and 2 MB streaming response cap. 429 responses block retries for at least 60 seconds and honor longer Retry-After values. Manual retry avoids hidden loops. Browser-exposed rate-limit headers may vary with CORS. Batch harvesting and persisted provider caches are not implemented. Some malformed rows may be skipped; this is a first-page discovery tool, not comprehensive evidence retrieval.

Search discloses the query to the selected provider. Metadata save is explicit. No student records are transmitted. Browser CORS and desktop WebView behavior require live environment checks; mocked tests do not prove provider availability.

## Optional sources
Semantic Scholar, PubMed, DOAJ, OER repositories and archives are future adapters. Each needs its own official contract, usage/redistribution review, authentication handling and tests. Never expose API secrets through VITE_ variables. Provider identifiers and citations must come from actual response fields. Do not manufacture a DOI for documents lacking one.
