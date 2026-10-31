# ADR-0002: Durable passage and edition identity

Status: **Accepted (v2 corpus)** — 2026-10-31

## Context
SuttaCentral/Bilara aligns cognate language files by stable passage IDs. Literature may have variant original witnesses and competing translations in the same language; therefore a language is **not** an edition identity.

## Decision
- Canonical work ID is independent of title, UI locale, language and digital edition.
- Canonical edition IDs are independent of language (two Vietnamese editions can coexist).
- The work structure defines stable, ordered passage IDs, never recycled.
- Each source/translation edition has its own JSON metadata, rights/provenance, independent reviewer record and content path.
- The translation edition points to a specific source edition. An optional explicit many-to-many passage alignment graph records departures from one-to-one segmentation.
- Published editions require a source witness, rights clearance, content completeness and required human checks. The validator fails closed.
- Readers use `/read/<work-id>/<edition-id>/`; earlier demonstration `/read/demo-proust/fr/` remains as nonindexed alias.

## Consequences
- Greater metadata footprint than language-only files; strong archival reproducibility.
- Documented migration and deprecation maps are required if source passage boundaries change. Never silently reuse IDs.
- Git history is necessary but not sufficient for millennial preservation; export signed/archive releases and independent mirrors in future.
