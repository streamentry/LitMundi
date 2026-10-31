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
6. The metadata declares `review.status` as a completed independent review, lists both reviewers, and lists their evidence URLs. The edition `status` must be changed to `published` through a reviewed pull request. All conditions are checked by CI before deployment.

**Important:** GitHub evidence URLs and JSON claims are not independently authenticated by local CI. Repository maintainers must personally verify reviewer identities, independence, qualifications, ownership and approval in the PR. Automated checks cannot establish literary quality. A translation with a model-generated 10/10 and no qualified human review is **not published**.

## Reviewer process
1. Work independently and **do not read the AI preflight score first**, to avoid anchoring.
2. Read the full original from the exact cited source witness and the full target.
3. Annotate every questionable passage using immutable segment IDs; classify as `minor`, `major`, `critical`, and `open` or `resolved`.
4. Reconcile ambiguous choices with concrete philological or literary evidence, not model confidence.
5. Review all segments and assign all five scores. Submit one JSON file per reviewer in `corpus/reviews/<work-id>/<edition-id>/<github-handle>.json`, with an accurate GitHub PR review permalink.
6. Ensure the record hashes reflect the FINAL reviewed text; after any edit the previous approval becomes stale and requires rechecking.
7. Obtain two independent approvals, named translator/editor attribution, rights evidence and license consent. Then raise a PR changing edition status to `published`.
8. CI checks data integrity and scores; a maintainer checks authenticity, ethics and literary judgement; the merged PR automatically deploys to GitHub Pages.

### Checking source/translation hashes

```bash
shasum -a 256 corpus/segments/wilde-the-artist/wilde-artist-en-methuen-1913.json
shasum -a 256 corpus/segments/wilde-the-artist/wilde-artist-vi-ai-draft-2026.json
npm run validate
npm run quality:status
npm test
```

## Pilot status (2026-10-31)
The Oscar Wilde *The Artist* Vietnamese draft has an **AI-assisted provisional score of 8.6/10**, with qualitative findings stored in the repository. AI preflight is not a human review. Its publication remains **BLOCKED** pending independent reviewers, adequate scores, attribution and permission to publish.

## Long-term governance
The rubric itself is versioned. Changing weights or thresholds requires a new ADR, migration plan and a fresh evaluation where appropriate. Preserve reviews, retractions, disagreements, scores, exact digests and reviewer provenance with every archival release. Don't reverse-engineer a score by tuning the text solely to satisfy a model grader.
