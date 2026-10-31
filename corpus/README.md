# LitMundi Corpus v2

**The canonical record is UTF-8 NFC JSON.** Website frameworks, hosting accounts and domains can change without changing a work's identity or meaning.

The first cycle contains three complete originals and three Vietnamese drafts covering **42 canonical passages**. The older Proust demonstration and planned empty editions remain distinct records. No Vietnamese translation is publication-approved.

## File map

| Path | Meaning |
| --- | --- |
| `catalog/works.json` | Abstract work identity, author, original language and discovery status |
| `catalog/editions.json` | Independent edition identity, exact witness, source relationship, credits, rights and review status |
| `structure/<work-id>.json` | Ordered immutable passage IDs and explicit retired-ID mappings |
| `segments/<work-id>/<edition-id>.json` | Passage ID → Unicode plaintext |
| `alignments/<work-id>/<edition-id>.json` | Explicit source/target links, including many-to-many relations |
| `editorial/source-checks/<edition-id>.json` | Source SHA-256, complete comparison coverage, witness pages, method and normalization decisions |
| `editorial/<work-id>/` | Glossaries, interpretive alternatives, revision history and current draft hashes |
| `reviews/<work-id>/<edition-id>/` | AI preflights and actual human review records, kept distinguishable |
| `schemas/` | JSON Schema 2020-12 specifications |

The legacy Proust sample retains its original content path. The discovery survey and its schema live separately in [`research/`](../research/translation-gap-atlas.json).

## Identity and integrity

Work, edition and passage IDs are never recycled. A new source witness or independent translation receives a new edition ID. Evidence-based corrections preserve identity and history; a source relation cannot be silently reassigned. Retirement needs an explicit mapping, never renumbering. `npm run verify:ids -- <base-commit>` checks these constraints against the earlier Git snapshot; CI uses the PR base or preceding push.

Complete drafts and published translations require full passage coverage and alignment in both directions. Planned editions may have no text. JSON strings contain prose, not executable HTML; the reader escapes them. Historical spelling and unusual authorial style are retained unless a documented editorial policy says otherwise. Plain text cannot encode every feature of a printed page, so source-check records disclose typographic losses and normalizations.

Ajv validates the complete JSON Schema 2020-12 rules at build time, with domain checks for relationships, completeness, source-check hashes, review evidence and publication gates. Ajv is not a public-reader runtime dependency.

## Status is a publication boundary

Published originals need a specific witness, documented rights assessment and full source-check evidence. AI-assisted technical comparison is labelled honestly; it does not become a human proofread or critical edition.

Published translations need two independent qualified human reviews and every threshold in [QUALITY.md](../docs/QUALITY.md), current source/target digests, contributor attribution, written open-license permission and maintainer attestation. Negative and stale reviews remain historical records; only current qualifying evidence can approve publication. An AI preflight never qualifies.

Drafts, planned and withdrawn editions do not have public reader routes, search text or publication exports. The retained Proust sample and language-only legacy alias are non-indexed demonstrations outside the collection; they are not published editions.

## Exports and rights

`npm run build` generates JSON, TXT, TSV and EPUB downloads for published editions of public works. `npm run export` creates a separate editorial archive with canonical files, labelled draft review packets, review history, rights manifest, exact inventory and SHA-256 fixity. No blanket MIT, CC BY or CC0 license applies to the corpus.

The archive's Python 3 restorer reconstructs only published editions into HTML/TXT without Astro, GitHub or network access. Run `npm run verify:archive` for the isolated deterministic restoration drill. Independent mirrors and accepted custodians remain outstanding; see [Preservation](../docs/PRESERVATION.md).

## Editorial packets and provenance

`npm run review:packet` generates score-free original/draft comparison packets and unfilled review templates. They are editorial aids, not published literary editions or approval evidence. The workflow, qualifications and consent requirements are in [EDITORIAL-WORKFLOW.md](../docs/EDITORIAL-WORKFLOW.md).

Pilot dossiers: [Wilde](../docs/PILOT-WILDE-THE-ARTIST.md), [Machado](../docs/PILOT-MACHADO-UM-APOLOGO.md), [Pardo Bazán](../docs/PILOT-PARDO-BAZAN-EL-ENCAJE-ROTO.md). [ADR-0007](../docs/adr/0007-review-history-and-technical-source-checks.md) records review/source-check semantics; [ADR-0008](../docs/adr/0008-portable-publications-and-offline-restoration.md) records publication versus archival exports.
