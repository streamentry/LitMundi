# ADR-0007: Preserve honest review history and disclose source checking

Status: Accepted — 2026-11-01

## Problem

The original validator confused negative literary findings with malformed data.
An honest low human score or open serious AI finding could break validation even
for an unpublished draft. It also did not enforce all immutable rubric constants,
and maintainer verification of reviewer qualifications was a prose responsibility
without a hash-bound record. Original-source checks had no reproducible record of
what was compared or whether a human actually performed the comparison.

## Decision

Separate structural errors from publication blockers. Preserve negative and stale
assessments as history; only current, explicitly selected independent human reviews
can approve a translation. Any current major/critical finding blocks publication.
Record reviewer qualifications, languages and conflicts, and require a separate
maintainer attestation of identities, independence, rights and contributor consent.
Protect every existing v1 criterion, weight and threshold without lowering any.

Clarify ADR-0005's original-source checking requirement: a documented
passage-by-passage comparison is required, including exact source digest, complete
coverage, named witness and pages, checking method and normalization decisions.
An AI-assisted visual comparison with a facsimile is a **technical source check**;
it must be disclosed as such and cannot be labelled human proofread or a critical
scholarly edition. This clarifies the provenance of published originals; it does
not satisfy or relax either of the two human translation-review requirements.

Use a complete JSON Schema 2020-12 validator rather than a handwritten subset.
Require full alignment in both directions for complete drafts as well as published
translations. Compare identifiers against the PR base to prevent accidental
removal, reassignment and reuse of retired identifiers.

## Consequences

Editors can document real weaknesses without hiding them to get green CI. New
translations remain blocked until actual reviewers and license consent exist.
Qualified reviewers still need to examine every final passage. CI cannot verify
human identity, legal authority, literary merit, or deliberate misuse of metadata.
The maintainer owns those judgements and must retain inspectable evidence.
