# ADR-0008: Portable publications and independent offline restoration

Status: Accepted — 2026-11-01

## Decision

Keep Astro, GitHub Pages, canonical JSON and stable URLs. Generate JSON, TXT, TSV
and EPUB files only for published editions of public works. Clear the generated
download directory before each build so withdrawn editions do not survive there.
The search index and sitemap apply the same publication boundary.

Create a separate editorial archive containing canonical JSON, provenance,
rights, schemas, glossaries, review history, labelled draft review packets,
governance documentation, portable published editions and a standalone Python 3
restorer. Include per-file SHA-256 and byte lengths, an exact inventory, a digest
of the manifest, and a deterministic ZIP. This archive contains drafts and does
not grant them a publication license. It is not served as a public reading edition.

Test reconstruction using only the exported archive and Python's standard library,
outside the checkout, with network calls disabled. The generated reader includes
only published texts and preserves passage identities and edition-specific rights.
Reject corruption, unlisted files, unsafe paths and symlinks.

## Implementation boundaries

Ajv provides standards-compliant build-time JSON Schema validation; fflate provides
ZIP packaging. Neither is a reader runtime dependency. EPUB files have a stored
first mimetype member, UTF-8 XHTML, navigation, edition attribution and rights.
ZIP member dates are fixed for deterministic output; EPUB metadata uses the
recorded source capture date, not the wall clock of repeated exports. The W3C
[EPUB specification](https://www.w3.org/TR/epub-33/) and
[EPUBCheck](https://github.com/w3c/epubcheck) are the format references.

GitHub Actions retains an editorial archive artifact for 30 days. That improves
retrievability but is neither permanent preservation nor an independent mirror.
External stewards must still verify, copy and periodically restore archives.

## Alternatives rejected

A database, account system, EPUB service, or dependency on Astro for restoration
adds operational obligations without addressing the small corpus's present needs.
Publishing every draft in a convenient download would bypass the editorial and
rights boundary. A checksum without a tested independent reader would not prove
that the literary corpus remained usable.
