# Preservation and independent restoration

The thousand-year aspiration is a constraint on formats, rights and stewardship, not a guarantee. The corpus must remain usable when its framework, hosting account or domain disappears.

## What the archive contains

Run the producer commands from a validated checkout:

```sh
npm ci
npm run export
npm run verify:archive
```

The export creates `dist-archive/` and a deterministic `dist-archive.zip`. For identical inputs, archive member order, timestamps and bytes are repeatable. The export contains:

| Component | Purpose |
| --- | --- |
| `corpus/` | Canonical UTF-8 NFC text, identities, structures, alignments, source checks, rights and review history |
| `research/` | Translation Gap Atlas, evidence and schema |
| `docs/`, `GOVERNANCE.md`, `CONTRIBUTING.md`, `LICENSE` | Interpretation, stewardship and software/documentation terms |
| `exports/` | JSON, TXT, TSV and EPUB for published editions of public works |
| `review-packets/` | Clearly labelled original/draft comparison packets and unfilled review templates |
| `rights-manifest.json` | Per-edition rights, provenance, attribution and publication state |
| `manifest.json` | Exact file inventory, byte lengths and SHA-256 for every payload file |
| `manifest.sha256` | SHA-256 of the manifest itself |
| `restore.py`, `README.txt` | Independent recovery instructions and executable restorer |

This is an **editorial snapshot**. It includes unpublished drafts and historical assessments for preservation and review. Possession of those files does not grant publication permission or an open content license. Portable publication exports and the restored reading site exclude drafts, withdrawn editions and demonstrations. Read `rights-manifest.json` before reuse.

The archive carries bibliographic witness information and source capture hashes; it does not bundle the large historical facsimile PDFs or page images. Independent stewards should obtain lawful witness copies separately and record their own access and reuse conditions.

## Restore on an offline machine

Obtain the archive and retain its expected manifest digest through a separately trusted channel. Extract a trusted copy with Python's standard library:

```sh
python3 -m zipfile -e dist-archive.zip litmundi-archive
python3 litmundi-archive/restore.py --verify-only
python3 litmundi-archive/restore.py --output litmundi-restored
```

Open `litmundi-restored/index.html`, or read the generated per-edition UTF-8 TXT files. This requires Python 3 and its standard library only. No Node, npm, Astro, Git, GitHub credentials, network request or original domain is needed. Output must be outside the archive and in an empty directory; existing files are not overwritten.

The restorer checks the manifest digest, every listed file's byte count and SHA-256, and the complete inventory. It rejects missing or extra files, unsafe paths and symlinks. It reconstructs published editions from their JSON and ordered passage IDs, keeping attribution, status and rights visible. The original JSON remains the authority; generated HTML is disposable.

**Fixity is not authenticity.** A matching internal checksum proves consistency with the supplied manifest. Someone who changes the archive and all its hashes can create a self-consistent replacement. Retain expected digests independently and compare them before trusting provenance. The current release does not claim cryptographic signing or an external institutional deposit.

## What the automated drill tests

`npm run verify:archive` repeats the export and checks byte-identical ZIP output. It checks and extracts the actual exported ZIP into an isolated temporary directory, disables Python network calls, and reconstructs the published corpus with the exported restorer. It verifies every passage and identifier in the restored text, checks draft exclusion, and confirms that content corruption and an unlisted file are rejected. The final command result, rather than this procedure document, is the evidence that a particular snapshot passed.

CI runs this drill and uploads the ZIP plus manifest digest. GitHub Actions retains that artifact for **30 days**. An expiring artifact in the same hosting ecosystem is neither permanent preservation nor an independent mirror.

## Stewardship still required

The repository owner is the only known steward. No independent institution has accepted custody, and no external mirror or scheduled audit is claimed. A practical first handoff is to give an independent custodian the archive and separately recorded digest, ask them to restore it offline, and retain their dated result and storage location with their consent.

Use more than one independent administrative and physical location once custodians agree. Proposed operating targets are an annual fixity audit and a restore drill at least every three years or before a format migration; these are not active automations. Check that rights and successor instructions travel with every copy. Preserve retired identifiers and disagreements rather than silently replacing history.

[Governance and lawful succession](../GOVERNANCE.md) defines how another organization can continue the project. [ADR-0008](adr/0008-portable-publications-and-offline-restoration.md) records the implemented boundaries; [ADR-0007](adr/0007-review-history-and-technical-source-checks.md) explains source-check and review-history evidence.
