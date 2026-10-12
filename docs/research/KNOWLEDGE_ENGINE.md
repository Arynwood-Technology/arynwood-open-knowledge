# Knowledge engine
The implemented engine is model-independent. ResearchRecord is the shared contract in src/research/model.ts; KnowledgeBank implements validated, versioned local persistence. Crossref and OpenAlex adapters normalize untrusted responses behind ScholarlyProvider and an injected JsonTransport. Tests need neither an account nor a model.

## Workflow
1. Search a topic of 3–200 characters.
2. Inspect a candidate to fetch its singleton metadata.
3. Follow the original DOI/publication reference.
4. Inspect compared fields, missing metadata and provenance.
5. Choose a taxonomy topic and optionally link the reading module.
6. Save locally; filter the knowledge bank by title/author or topic.
7. Export JSON backup or CSL-JSON citations; restore validated backups or delete data.

The corpus starts empty. No invented literature is bundled. Search and singleton retrieval are separate source observations, not independent scientific validation. The bank caps 500 records and 5 MB serialized data. Storage/quota/corruption errors are surfaced. Invalid restores leave the current bank unchanged. Duplicate saves merge categorization without erasing prior data. Concurrent multi-tab edits are not supported.

## Graph direction
A DOI record connects to topic classifications and stable curriculum IDs. Explicit relationships use supports, contradicts and related-to predicates plus notes. Add concept/resource node types and provenance-backed edges in a later schema version. Never infer support from a mere topic link. Related modules do not constitute an instructional recommendation.

No private learner data, full text or credentials belong in this engine. Export is user-initiated and does not publish anything. Future storage adapters may use IndexedDB or SQLite, with migrations and backup tests.
