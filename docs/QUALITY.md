# LitMundi Literary Translation Quality Standard — v2

**Publication threshold: an unrounded weighted score of at least 8.6/10 from one complete AI assessment of the final source and target text.** Human review is optional and may follow publication. Source rights, lawful reuse, complete coverage, current content hashes and resolution of serious issues remain required.

[ADR-0009](adr/0009-ai-first-publication.md) adopts this AI-first policy. The machine-readable rubric is [`litmundi-literary-v2`](../corpus/reviews/rubric-literary-v2.json). The [v1 rubric](../corpus/reviews/rubric-literary-v1.json), earlier reviews and dated reports remain historical records under the policy that applied when they were created.

## Weighted rubric

| Criterion | Weight | What the assessment examines |
| --- | ---: | --- |
| Semantic fidelity and completeness | 35% | Added, omitted or inverted meaning; narrative relationships; purposeful ambiguity. |
| Voice, rhythm and register | 25% | Authorial voice, repetition, rhetorical force, cadence and historical register. |
| Naturalness in the target language | 15% | Idiomatic literary prose, readable sentences and avoidance of unintended calques. |
| Imagery and terminology | 15% | Metaphors, symbols, semantic contrasts, names and recurring terms. |
| Grammar and editorial mechanics | 10% | Punctuation, spelling, morphology, syntax and typography. |

Rate each category from 0 to 10 in **0.5-point increments**. Calculate:

`weighted score = Σ(category score × category weight) / 100`

The exact weighted result determines eligibility. **8.55 fails; it must not be rounded to 8.6 to pass.** A display can format a score for readers, but formatting must not alter the comparison. V2 has no additional category floors and does not require a second assessment.

| Scores in the order above | Exact weighted score | Numeric gate |
| --- | ---: | --- |
| 9, 8.5, 8, 8.5, 8 | 8.55 | Fails |
| 9, 8.5, 8, 8.5, 8.5 | 8.60 | Passes |

A passing number is only one release condition. An unresolved major mistranslation still blocks publication even if the weighted score is high.

The rubric is project-specific and informed by [MQM's typology](https://www.themqm.org/mqm-pillars/typology/) and [scoring guidance](https://www.themqm.org/mqm-pillars/the-mqm-scoring-models/); it is not an official MQM score. Scores are **evaluative AI judgments**, not objective measurements, human certification or a guarantee of literary merit. Include concrete passage-level reasons and disclose uncertainty. Do not claim statistical calibration or reviewer independence that has not been established.

## Publication requirements

A translated edition is eligible only when all of these conditions hold:

1. **Complete text and alignment.** The exact source edition is identified; the full source and target are present; every canonical passage is covered and the alignment is complete.
2. **One current AI assessment.** At least one structured review explicitly uses `kind: ai_review` and `litmundi-literary-v2`, assesses the entire source and target, includes every canonical passage ID, and records all five category scores with reasons.
3. **Exact evidence and threshold.** The selected review's SHA-256 digests match the current source and target JSON, and its unrounded weighted score is at least 8.6. Edition metadata selects the canonical evidence using `review.record_paths` and identifies AI assessors separately in `review.ai_reviewers`.
4. **No unresolved serious issue.** Any current unresolved major or critical finding blocks publication, including a finding in another current AI or optional human review. A favourable selected score cannot cancel such a finding.
5. **Source rights and lawful reuse.** The source witness and jurisdictional rights rationale are recorded, rights are cleared, and the edition has a documented lawful reuse basis. AI-only output defaults to CC BY 4.0 (`CC-BY-4.0`) only to the extent the publisher controls applicable rights, as explained in [AI content policy](AI-CONTENT-POLICY.md). This does not create copyright, imply human authorship or restrict public-domain material. Source provenance, separate source-rights terms and AI attribution remain visible.
6. **Publication metadata and validation.** The edition explicitly becomes `published` only after its evidence and all publication checks pass. The public reader, search and publication downloads include eligible published editions.

There is **no mandatory human reviewer, named human editor or human editorial attestation** under v2. Keep `review.reviewers` for actual human reviewers; never populate it with an AI identity or invent qualifications, consent, PR reviews or contributors. If human creative material is actually incorporated, document its attribution and lawful reuse according to the AI content policy and the edition's rights record.

CI validates the structured evidence, arithmetic, passage coverage, references and hashes. It does not prove that a model's literary judgment is correct, authenticate a person or settle a legal question.

## Assessment and revision process

1. Read the complete canonical source and complete target against the specified edition. Consult the source witness when a transcription or interpretation needs checking.
2. Examine fidelity, voice, naturalness, imagery and mechanics. Identify questions by stable passage ID and explain the relevant source wording.
3. Record the assessment honestly as AI work, including material generation or revision involvement. Do not claim an independent human read or copy names from a template.
4. Classify findings as `minor`, `major` or `critical`, and as `open` or `resolved`. Major findings include material distortion, omission, misleading imagery or loss of an important formal effect. Critical findings include fabricated content, unlicensed material, falsified evidence or pervasive meaning change.
5. Revise substantive weaknesses and record accepted and rejected proposals. Re-evaluate the final text; do not change scores merely to cross the threshold.
6. Save the complete v2 assessment in `corpus/reviews/<work-id>/<edition-id>/`, with exact final hashes and complete passage coverage. Select its path in the edition record, then run the publication checks.
7. Publish the eligible edition with its AI attribution, source provenance, rights and assessment evidence. Invite optional human readings and corrections after release.

Any source or target edit makes a previously bound assessment stale. Refresh the assessment against the final text before republication. A material correction requires literary re-evaluation and a new publication decision, not just a new hash. Describe the work actually rechecked; do not represent a narrow correction check as a new full reading.

## Review history and optional human feedback

Keep negative, advisory and superseded reviews. A low score is valid evidence and a reason to revise; it is not a reason to delete the record. A review with obsolete hashes cannot approve the current text. Historical v1 preflights and human assessments remain under their original rubric; changing the policy does not turn them into v2 AI assessments.

Optional human reviewers and readers can report mistakes, compare editions and suggest improvements after release. Human reviewers should identify their actual role, language competence and any conflicts. Reader feedback is useful evidence without being a full rubric review. No minimum number of human readers or approvals is a publication prerequisite.

Investigate serious reports promptly. Record a confirmed current major or critical issue and withhold the affected edition until it is resolved and re-evaluated. For a credible rights dispute, follow [Governance](../GOVERNANCE.md) and the [AI content policy](AI-CONTENT-POLICY.md). Retain the concern and resolution history.

## Original-source checks

Published originals retain their separate technical gate: an exact witness and legal provenance, complete canonical coverage, and a source-check record bound to the source digest. Record witness pages, checked passages, comparison method and normalization decisions.

An AI-assisted passage comparison, including visual facsimile checking when performed, is a technical source check. It is not human proofreading or critical-edition certification. [ADR-0007](adr/0007-review-history-and-technical-source-checks.md) records this distinction; [ADR-0009](adr/0009-ai-first-publication.md) changes the translation publication policy without removing the source gate.

## Check current eligibility

```sh
npm run validate
npm run quality:status
npm test
```

The edition catalog and current hash-bound v2 records determine eligibility. Dated pilot dossiers and earlier release reports explain past decisions; their old thresholds, scores and blocked states do not describe current policy automatically.

`npm run review:packet` prepares local full-text comparison packets. Their unfilled templates are aids, not completed review evidence. See [Editorial workflow](EDITORIAL-WORKFLOW.md) for assessment, release and correction steps.

## Versioning and preservation

Changing rubric weights, thresholds or publication requirements requires a new rubric version and ADR. Preserve old rubrics, scores, disagreements, exact digests and review provenance. [Preservation](PRESERVATION.md) and [ADR-0008](adr/0008-portable-publications-and-offline-restoration.md) describe publication exports and the separate labelled editorial archive.
