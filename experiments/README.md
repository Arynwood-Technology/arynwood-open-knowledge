# Reproducible engineering research
This folder contains a scoring harness and synthetic test fixtures, not a study of any model or learner.
Run `npm run evaluate` to produce deterministic scores with dataset SHA-256 and runtime version.
The fixture IDs refer to invented test objects, not publications. Fixtures are authored for this repository and available under its MIT license. Never use them as citations.

Each real experiment must record: Git commit, dependency locks, operating system/hardware, model artifact digest and license, Ollama/runtime version, embedding model digest, decoding options/seed, exact prompt version, retrieval settings, query set and inclusion rules, source licenses, human annotations and disagreements, scoring method, output hashes and limitations. Publish no private learner records or restricted source text.

Initial protocol templates in protocols.json cover six research topics. They are planned studies; no real benchmark claims have been made. Citation accuracy uses bibliographic matches against independently inspected sources. Summary faithfulness/unsupported claims require documented human judgments. Null scores mean missing annotations, not perfect performance. Hashes detect change, not truth. Register protocols before collecting model outputs and preserve negative results.
