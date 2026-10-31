# Preservation for the next millennium
A one-thousand-year aspiration is a governance and format design constraint, **not a guarantee**.

## Invariants
1. Text data independent from Astro, npm, cloud provider and domain.
2. Unicode UTF-8 + NFC, simple JSON, stable IDs and documented schemas; no proprietary database.
3. Canonical source citations, rights, translation provenance, editorial signoffs, and dated change logs.
4. Reproducible archive exports with SHA-256 per file and manifest; verify restores regularly.
5. Readable open exports in JSON, TSV and plain text; consider TEI XML and IIIF for scholarly interoperability.
6. Mirrors across independent organizations, legal jurisdictions and physical locations; never depend solely on GitHub.
7. Versioned records, migration maps and deprecation rather than destructive ID changes.
8. Annual fixity audits, 3-year restore drills and format migration reviews (proposed targets).
9. Named successor stewards, published bylaws, backup funding and clear license rights enabling lawful forks.
10. Preservation of source context, unresolved editorial disagreement and bibliographic uncertainty.

## Risks
A GitHub account, domain registration, CI service and commercial hosting can disappear. Cryptographic hashes alone do not preserve files. The true preservation metric is independent entities capable of reconstructing both corpus and provenance from archived exports. An unverified demo is not preserved literary scholarship.

## Exit drill
Clone an archival export on an offline machine, validate JSON and checksums with independent utilities, regenerate a minimal HTML reader without Astro, and document what failed. Repeat before calling the project archival-grade.
