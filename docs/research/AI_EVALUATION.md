# Optional local AI and evaluation
Implemented: deterministic annotation-based scoring harness, synthetic fixture and six protocol templates. Not implemented: model invocation, embeddings, RAG, vector storage or AI generation. No benchmark result about a real LLM is claimed.

Run `npm run evaluate`. The CLI accepts optional dataset and output paths. It records dataset SHA-256, Node version and model/prompt null when no model is run. Unit tests verify metric arithmetic, including missing annotations.

Metrics: retrieval precision/recall/reciprocal rank; correct source-and-metadata citation fraction; human-annotated unsupported claim rate; summary faithfulness; attribution coverage. No annotations yields null. Citation scoring requires inspected source matches, not just plausible syntax. Labels must not come from the model being evaluated.

Planned local runtime: optional Ollama adapter → a pinned open model → lawful local corpus → local embedding/ranking adapter → source-grounded answer with record IDs. A future vector adapter can use a local SQLite extension or local files without an external service. Model/model-license, embedding digest, prompt version, decoding seed/options and corpus hash belong in every run manifest. First compare a keyword retrieval baseline with embeddings.

Only retrieved source snippets may support generated claims. Treat document instructions as untrusted content. Require citations to bank IDs, verify actual source existence and bibliographic agreement, report contradiction and missing evidence, and keep interpretations unreviewed until human approval. Do not let the model select student placement or infer disability. MCP read tools must expose a public projection; private records and credentials are excluded.

Retain errors, contradictory outcomes and annotation disagreement. Use dual human raters and held-out questions. Automated syntax checks alone cannot prove summary faithfulness. Local execution can preserve privacy but still requires network/telemetry inspection and data handling review. See experiments/README.md and protocol templates.
