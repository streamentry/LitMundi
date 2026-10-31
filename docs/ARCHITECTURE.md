# Architecture

## System boundary

UTF-8 JSON tracked in Git is the canonical corpus. Build-time validation produces an Astro static site and portable editions; a separate archive preserves editorial evidence and can rebuild a minimal reader independently. There is no application database, runtime content server, site-owned account system or GitHub OAuth secret.

The website remains replaceable. Work, edition and passage identity do not depend on an interface language, framework or domain. Reviewed corrections change text with an inspectable history; identifiers are never recycled.

## Data and gates

| Layer | Responsibility |
| --- | --- |
| `corpus/catalog/` | Work and edition identity, languages, exact witnesses, rights, credits and publication status |
| `corpus/structure/` and `corpus/segments/` | Stable ordered passage IDs and Unicode plaintext |
| `corpus/alignments/` | Explicit source/translation relationships, including many-to-many links |
| `corpus/editorial/` and `corpus/reviews/` | Source checks, glossaries, decisions, review history and exact text hashes |
| `research/` | Evidence-based discovery with bounded uncertainty |
| `scripts/` | Schema/domain validation, publication gates, identifier preservation, exports and restoration checks |
| `src/` | Disposable static reader and small optional browser enhancements |

JSON Schema 2020-12 validation uses Ajv at build time. Domain checks cover completeness, identity, alignment, rights metadata, source-check coverage and review freshness. PR CI compares identifiers with its base commit using a full Git checkout. Negative or stale reviews remain valid historical evidence; they cannot approve a new translation.

Original editions require a specific witness, assessed rights and a disclosed passage-by-passage source check. AI-assisted technical checking is not labelled a human proofread or critical edition. Translations retain the separate two-qualified-human-review gate and maintainer attestation; see [QUALITY.md](QUALITY.md), [Editorial workflow](EDITORIAL-WORKFLOW.md) and [ADR-0007](adr/0007-review-history-and-technical-source-checks.md).

## Reading, navigation and discovery

Routes remain `/<ui-locale>/works/<work-id>/` and `/<ui-locale>/read/<work-id>/<edition-id>/#<passage-id>`, below the GitHub Pages `/LitMundi/` base. English, Vietnamese, French and Spanish are interface locales. Edition choice prefers a published edition in the requested language, with a visible original-language fallback.

The reader supplies passage navigation, edition and author links, keyboard focus, mobile typography, explicit provenance and portable downloads. Published translations can show their source beside the recorded alignment. There is currently no approved translation to populate that production view; local editorial review packets provide clearly labelled comparisons outside the public site.

Search loads a static index of published works and passages, with title, author and language filters. Browsing and reading remain available without JavaScript. Optional progress and resume controls save only to the reader's browser after opt-in, with a clear control; they are not analytics or evidence of reader demand.

Canonical links, locale `hreflang` alternatives, per-edition structured metadata, sitemap and a base-aware 404 support discovery. Draft text is excluded from routes, the search index, publication downloads and sitemap. The Proust demonstration and its legacy alias remain resolvable and non-indexed, outside the collection.

## Contributions and trust

Passage corrections and reading-experience feedback open GitHub issues with context. GitHub owns authentication and discussion; changes to the corpus require reviewed PRs. Corpus text is escaped as plaintext rather than executed as HTML. No third-party analytics or reader credentials are required.

CI checks metadata and declarations; it cannot establish a person's identity, literary qualification, independence, permission or the truth of a bibliographic absence claim. Maintainers verify that evidence. No machine score creates human certification.

## Publication exports and preservation

Build-time exports generate JSON, TXT, TSV and EPUB only for eligible published editions and clear the generated directory first. The separate editorial archive retains labelled drafts, review packets, evidence, schemas, rights and governance. SHA-256 inventories and deterministic ZIP output support fixity; Python 3 restores published HTML/TXT without the original application or network.

[ADR-0008](adr/0008-portable-publications-and-offline-restoration.md) and [Preservation](PRESERVATION.md) describe the executable drill. Independent custody remains a governance task. The current 30-day GitHub artifact is not a mirror. Scale the corpus only after human review capacity and actual reader value are demonstrated.
