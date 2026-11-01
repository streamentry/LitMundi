# LitMundi Corpus v2

**The canonical record is UTF-8 NFC JSON.** Website frameworks, hosting accounts and domains can change without changing a work's identity or meaning.

The catalog records each original, translation, planned edition and legacy demonstration separately. Current publication states and selected assessment evidence belong in `catalog/editions.json`; run `npm run quality:status` from the repository root to inspect eligibility. The corpus format version and literary rubric version are separate identities.

## File map

| Path | Meaning |
| --- | --- |
| `catalog/works.json` | Abstract work identity, author, original language and discovery status |
| `catalog/editions.json` | Edition identity, exact witness, source relationship, credits, rights, publication state and selected review records |
| `structure/<work-id>.json` | Ordered immutable passage IDs and explicit retired-ID mappings |
| `segments/<work-id>/<edition-id>.json` | Passage ID → Unicode plaintext |
| `alignments/<work-id>/<edition-id>.json` | Explicit source/target links, including many-to-many relations |
| `editorial/source-checks/<edition-id>.json` | Source SHA-256, complete comparison coverage, witness pages, method and normalization decisions |
| `editorial/<work-id>/` | Glossaries, interpretive alternatives, revision history and recorded text hashes |
| `reviews/rubric-literary-v2.json` | Current AI-first literary rubric and release requirements |
| `reviews/rubric-literary-v1.json` | Preserved historical rubric |
| `reviews/<work-id>/<edition-id>/` | Explicit v2 AI assessments, historical preflights and any actual human reviews, kept distinguishable |
| `schemas/` | JSON Schema 2020-12 specifications |

The legacy Proust sample retains its original content path. The discovery survey and its schema live separately in [`research/`](../research/translation-gap-atlas.json).

## Identity and integrity

Work, edition and passage IDs are never recycled. A new source witness or independent translation receives a new edition ID. Evidence-based corrections preserve identity and history; a source relation cannot be silently reassigned. Retirement needs an explicit mapping, never renumbering. `npm run verify:ids -- <base-commit>` checks these constraints against the earlier Git snapshot; CI uses the PR base or preceding push.

Complete drafts and published translations require full passage coverage and alignment in both directions. Planned editions may have no text. JSON strings contain prose, not executable HTML; the reader escapes them. Historical spelling and unusual authorial style are retained unless a documented editorial policy says otherwise. Source-check records disclose typographic losses and normalizations that plain text cannot preserve.

Every edition with actual text has an `edition.title` in that edition's language. `work.title` remains the canonical original title; `edition.label` describes the witness or publication status. Titles do not consume passage IDs or change stable URLs. Readers and exports use the selected edition's title and retain the original title for attribution and discovery. Empty planned editions need no invented translated title.

Ajv validates the complete JSON Schema 2020-12 rules at build time, with domain checks for relationships, completeness, source-check hashes, review evidence and publication gates. Ajv is not a public-reader runtime dependency.

## Status is a publication boundary

Published originals require a specific witness, documented source-rights assessment and complete source-check evidence. AI-assisted technical comparison is labelled honestly; it does not become a human proofread or critical edition.

Published translations require one complete `ai_review` under `litmundi-literary-v2`, with current source/target digests, all canonical passages assessed, an unrounded weighted score **≥8.6**, and no unresolved current major or critical issue. The weights are 35/25/15/15/10 and category scores use half-point increments. There are no additional category floors or mandatory human reviewer, editor or attestation. Source-rights clearance, lawful reuse, AI attribution, complete alignment and publication metadata remain required.

Edition metadata selects canonical review files through `review.record_paths`. AI assessors are listed in `review.ai_reviewers`; `review.reviewers` is reserved for actual human reviewers. A historical v1 preflight does not qualify as a new v2 assessment. A score of 8.55 fails even if displayed as 8.6.

Current AI assessments also bind the original and translated titles using `title_review: {source_title, target_title, rationale}`. The literal title snapshots supplement the passage JSON digests: changing a title makes its assessment stale without renumbering a passage. Historical body-only records remain inspectable but cannot approve the complete current edition. A finding at `@title` concerns the reviewed title; other finding locations remain canonical passage IDs.

Negative and stale reviews remain historical records. Only evidence matching the final text can support its publication. Material corrections require re-evaluation and republication; any changed content requires fresh matching assessment evidence. See [Quality](../docs/QUALITY.md).

Drafts, planned and withdrawn editions have no public reader routes, search text or publication exports. The retained Proust sample and language-only legacy alias are non-indexed demonstrations outside the collection.

## Exports and rights

`npm run build` generates JSON, TXT, TSV and EPUB downloads for eligible published editions of public works. `npm run export` creates a separate editorial archive with canonical files, labelled review packets, review history, rights manifest, exact inventory and SHA-256 fixity.

No blanket MIT, CC BY or CC0 license applies to every corpus item. AI-only output defaults to CC BY 4.0 (`CC-BY-4.0`) only to the extent the publisher controls applicable rights; preserve its edition-specific statement, source provenance and AI attribution. This does not create copyright, imply human authorship or restrict public-domain material. Actual third-party source material and protected human contributions need their own lawful basis. See [AI content policy](../docs/AI-CONTENT-POLICY.md).

The archive's Python 3 restorer reconstructs only published editions into HTML/TXT without Astro, GitHub or network access. Run `npm run verify:archive` for the isolated deterministic restoration drill. Independent mirrors and accepted custodians remain outstanding; see [Preservation](../docs/PRESERVATION.md).

## Editorial packets and provenance

`npm run review:packet` generates score-free source/target comparison packets and unfilled review templates. They support assessment and voluntary human reading; they are not publication approval by themselves. Follow the current schema and rubric when creating a completed review. The [editorial workflow](../docs/EDITORIAL-WORKFLOW.md) explains assessment, optional feedback, attribution and corrections.

Pilot dossiers: [Wilde](../docs/PILOT-WILDE-THE-ARTIST.md), [Machado](../docs/PILOT-MACHADO-UM-APOLOGO.md), [Pardo Bazán](../docs/PILOT-PARDO-BAZAN-EL-ENCAJE-ROTO.md). Their dated preflight history remains intact. [ADR-0007](../docs/adr/0007-review-history-and-technical-source-checks.md) records source-check and review-history semantics; [ADR-0008](../docs/adr/0008-portable-publications-and-offline-restoration.md) records exports; [ADR-0009](../docs/adr/0009-ai-first-publication.md) supersedes the former human publication prerequisites.
