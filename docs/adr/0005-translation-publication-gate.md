# ADR-0005: Translation publication gates

Status: **Accepted** — 2026-10-31

## Decision
No AI draft or unreviewed translation is routable or indexable on the public reading site. Store drafts in openly inspectable Git for scholarly collaboration, but they do not appear as readable editions. Any published translation must have a specific source-edition ID, a complete aligned text, explicit contributor name, rights status `cleared` with an open license, and at least two independent bilingual reviewers whose names are recorded with their evaluation evidence.

Published original-language texts require a specific bibliographic source, public-domain legal assessment or permission, and a manual source-transcription check. A checked transcription is **not** equivalent to a critical scholarly edition.

The validator enforces machine-verifiable fields and integrity conditions. It cannot establish literary merit, reviewer independence, legal validity or the absence of an older translation; human governance owns those judgments.

## Alternatives rejected
- Automatically publish unreviewed AI output as “verified”.
- Treat every translation in a language as one canonical version.
- Publish first and sort out contributor licensing later.
