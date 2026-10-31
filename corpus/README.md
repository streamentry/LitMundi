# LitMundi Corpus v2

**Canonical repository data:** simple UTF-8 NFC JSON. The website, Node, GitHub and any specific cloud are replaceable; corpus content is not.

## Namespaces
- `catalog/works.json` — abstract works, independent of any publication/translation.
- `catalog/editions.json` — **edition identity**, language, source witness, credits, rights, review status. Supports unlimited independent translations in the same language.
- `structure/<work-id>.json` — canonical ordered segment anchors, retained forever; deprecated IDs map to replacements.
- `segments/<work-id>/<edition-id>.json` — JSON segment ID → Unicode plaintext, inspired by SuttaCentral Bilara.
- `alignments/<work-id>/<edition-id>.json` — explicit mapping between canonical source and target passages for translations; supports many-to-many links and incomplete drafts.
- `schemas/` — JSON Schema Draft 2020-12 public specifications. `scripts/validate.mjs` enforces the domain invariants and publication gates without runtime dependencies.

## Permanence rules
1. Work IDs, edition IDs and published segment IDs are never recycled.
2. Source edition is immutable as an intellectual record: preserve revisions in Git, and versioned archival releases (future work). Correct text with evidence and reviewers; never quietly substitute another source edition.
3. Multiple independent translations in the same language must have **different edition IDs**, source IDs and credits.
4. Published translations require rights clearance, an attributable human contributor, two independent bilingual reviewers, full content and explicit alignment.
5. Never commit a third-party copyrighted translation without permission. No MIT umbrella license for `corpus/`.
6. No HTML/JavaScript in segment strings. Astro escapes text.
7. Unverified demos and AI drafts are stored for reproducible editorial work but MUST NOT be indexed or served as reader editions.
8. Use `npm run export` for a checksummed archive independent of Astro. Archive is a baseline; independent mirrors and restore drills are still required.

## Link migrations
The earlier demonstration URL `/read/demo-proust/fr/` remains generated as an alias to `/read/demo-proust/proust-swann-fr-sample/`, with a canonical target. All future public links use edition IDs, never just language.

## Pilot
[Oscar Wilde: “The Artist”](../docs/PILOT-WILDE-THE-ARTIST.md), source published; Vietnamese draft pending independent human review.
