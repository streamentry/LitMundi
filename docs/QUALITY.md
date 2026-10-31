# LitMundi Literary Translation Quality Standard — v1

**Release threshold: ≥9.0/10 from each of two independent qualified human literary reviewers.** This standard is project-specific, informed by [MQM's typology](https://www.themqm.org/mqm-pillars/typology/) and [scoring guidance](https://www.themqm.org/mqm-pillars/the-mqm-scoring-models/), but it is **not** an official MQM score.

## Weighted rubric

| Criterion | Weight | At 9–10 |
|---|---:|---|
| Semantic fidelity and completeness | 35% | No substantive added, omitted or inverted meaning; preserves purposeful ambiguity. |
| Voice, rhythm and register | 25% | Maintains authorial voice, repetition, rhetorical force and historical register. |
| Naturalness in target language | 15% | Idiomatic literary prose without calques; withstands reading aloud. |
| Imagery and terminology | 15% | Preserves metaphors, symbols, semantic contrasts, and recurring terms. |
| Grammar and editorial mechanics | 10% | Reliable punctuation, spelling, morphology, syntax, typography. |

Each dimension is rated 0–10 in 0.5-point increments. Weighted score = Σ (dimension score × weight) / 100. Marks are **evaluative judgments**, not objective measurements; reviewers should include passage-level rationale. No published claim of statistical reliability until the rubric is calibrated against independent human assessments.

### Anchors

- **9.0–10.0** Publication-grade: faithful and stylistically accomplished, only inconsequential minor issues.
- **8.0–8.99** Strong draft: meaningful local improvements still necessary.
- **7.0–7.99** Material revision: several weaknesses in voice or nuance.
- **Below 7.0** Unacceptable for publication.

## Non-compensatory publication gates

1. Two genuinely independent qualified bilingual **human** reviewers must each score **≥9.0** (not just average ≥9).
2. Semantic fidelity ≥9 for each reviewer; every other dimension ≥8.
3. 100% of canonical segments assessed; no unresolved **major** or **critical** issues. Critical issues include fabricated content, copyright violations, or intentionally false attestations.
4. Review records identify edition, source edition, exact SHA-256 of the source and target JSON, reviewer GitHub identity and direct GitHub PR review evidence.
5. Exact source witness and legal provenance are recorded; rights are explicitly `cleared`; translator/editor consent and open license (`CC-BY-4.0` or `CC0-1.0`) are documented.
6. The metadata declares `review.status` as a completed independent review, lists both reviewers, and lists their evidence URLs. The edition `status` must be changed to `published` through a reviewed pull request. CI checks the structured declarations, scores, coverage and hashes before deployment; the maintainer verifies their authenticity.

Publication also requires an `editorial_attestation` in the edition metadata. It records the verifying maintainer, date, reviewable PR evidence, exact final source and target hashes, approving reviewer handles, and contributor license-consent URLs. Reviewers disclose their language pair, qualifications and conflicts. This makes the existing editorial responsibility inspectable without changing the rubric or its thresholds.

GitHub evidence URLs and JSON claims are not independently authenticated by local CI. Repository maintainers must personally verify reviewer identities, independence, qualifications, ownership and approval in the PR. Automated checks cannot establish literary quality. A translation with a model-generated 10/10 and no qualified human review is **not published**.

## Review history and source checks

Keep well-formed negative, advisory and superseded reviews. A low score or an open serious finding is valid editorial evidence for a draft; it is a publication blocker, not a reason to delete the record or disguise the finding. Reviews whose source or target hashes no longer match remain historical and cannot approve the current text. Edition metadata selects the current approving evidence URLs, and any current unresolved major or critical finding blocks publication even if another review gives a high score.

An AI preflight can identify omissions, ambiguity, terminology and cadence questions. It cannot count as either human review, authenticate a contributor, or grant a license. Preserve its exact hashes and passage-level reasoning, including rejected revisions and unresolved questions. A numerical increase is not evidence of human approval.

Published originals have a separate technical source gate: exact witness and legal provenance, complete canonical coverage, and a source-check record bound to the source digest. That record identifies the witness pages, checked segments, method and normalization decisions. This cycle's checks are explicitly **AI-assisted passage comparisons**, including visual facsimile checks where applicable; they are not human proofreading or critical-edition certification. This distinction is documented in [ADR-0007](adr/0007-review-history-and-technical-source-checks.md) and never substitutes for translation review.

## Reviewer process

1. Work independently and **do not read the AI preflight score first**, to avoid anchoring.
2. Read the full original from the exact cited source witness and the full target.
3. Annotate every questionable passage using immutable segment IDs; classify as `minor`, `major`, `critical`, and `open` or `resolved`.
4. Reconcile ambiguous choices with concrete philological or literary evidence, not model confidence.
5. Review all segments and assign all five scores. Submit a distinct JSON record in `corpus/reviews/<work-id>/<edition-id>/`, with an accurate GitHub PR review permalink, qualifications and conflict disclosure. Keep earlier records when submitting a refreshed assessment.
6. Ensure the record hashes reflect the FINAL reviewed text; after any edit the previous approval becomes stale and requires rechecking.
7. Obtain two independent approvals, named translator/editor attribution, rights evidence and license consent. Add the maintainer's hash-bound attestation and raise a PR changing edition status to `published`.
8. CI checks data integrity and scores; a maintainer checks authenticity, ethics and literary judgement. The main-branch workflow deploys eligible published content to GitHub Pages; verify the actual deployed result after the workflow succeeds.

Prepare source/draft review packets with `npm run review:packet`. The local HTML packets omit AI scores to support independent assessment. Adjacent JSON templates have unfilled identities and null scores and are intentionally invalid until a real reviewer completes them. They belong to the editorial archive and are excluded from public publication downloads. See the full [editorial workflow](EDITORIAL-WORKFLOW.md).

### Checking source/translation hashes

```bash
shasum -a 256 corpus/segments/wilde-the-artist/wilde-artist-en-methuen-1913.json
shasum -a 256 corpus/segments/wilde-the-artist/wilde-artist-vi-ai-draft-2026.json
npm run validate
npm run quality:status
npm test
```

## Pilot status (2026-11-01)

The three complete Vietnamese drafts cover all **42 canonical passages**. All remain **BLOCKED**, with **0 of 2 required human reviews** per edition and no cleared contributor publication license.

| Draft | Passages | Current AI preflight | Editorial dossier |
| --- | ---: | ---: | --- |
| Wilde, *The Artist* | 5 | 8.60 | [Source, revisions and open questions](PILOT-WILDE-THE-ARTIST.md) |
| Machado, *Um Apólogo* | 22 | 8.55 | [Source, revisions and open questions](PILOT-MACHADO-UM-APOLOGO.md) |
| Pardo Bazán, *El encaje roto* | 15 | 8.43 | [Source, revisions and open questions](PILOT-PARDO-BAZAN-EL-ENCAJE-ROTO.md) |

These are advisory judgments recorded against the current text, not measured translation quality. The original Wilde 8.6 record dated 2026-10-31 remains untouched as historical evidence without content hashes; the dated current assessment is separate. Independent AI adversarial checks are also disclosed as AI work and confer no human-review eligibility.

## Long-term governance

The rubric itself is versioned. Changing weights or thresholds requires a new ADR, migration plan and a fresh evaluation where appropriate. Preserve reviews, retractions, disagreements, scores, exact digests and reviewer provenance with every archival release. Don't reverse-engineer a score by tuning the text solely to satisfy a model grader.

[Preservation](PRESERVATION.md) and [ADR-0008](adr/0008-portable-publications-and-offline-restoration.md) explain how published exports remain separate from the labelled editorial archive, including its drafts, review history and edition-specific rights.
