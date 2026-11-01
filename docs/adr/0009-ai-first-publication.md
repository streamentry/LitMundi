# ADR-0009: AI-first publication and optional human feedback

Status: **Accepted** — 2026-11-01

Supersedes: the mandatory human-review, human-editor and human-attestation publication prerequisites in ADR-0005, ADR-0006 and ADR-0007. Retains their compatible source, rights, integrity and review-history requirements.

## Context

The project owner explicitly changed the publication goal: AI assesses a translation first, a weighted score of at least 8.6 permits publication when the other gates pass, and people can read and provide feedback afterward. Human review is no longer a release prerequisite.

The earlier v1 policy required two independent qualified human reviewers and a maintainer attestation. That policy and its reports must remain inspectable without controlling new v2 releases. Changing the policy must not rewrite an old score, fabricate a reviewer or imply that historical drafts have been evaluated under a new rubric.

## Decision

Introduce `litmundi-literary-v2` for current translation publication.

- Keep the five category weights: semantic fidelity/completeness **35%**, literary voice **25%**, target naturalness **15%**, imagery/terminology **15%**, and editorial mechanics **10%**.
- Keep category scores from 0 to 10 in **0.5-point increments**.
- Require **one** complete AI assessment of the exact source and target, with every canonical passage covered and SHA-256 digests matching the final files.
- Require an **unrounded weighted score ≥8.6**. An exact 8.55 fails; presentation rounding cannot satisfy the gate. Do not retain v1's separate category floors.
- Block publication on any current unresolved **major** or **critical** issue. A high aggregate cannot compensate for a known serious problem.
- Retain complete text/alignment, exact source provenance, technical source checks, cleared source rights and a documented lawful reuse basis.
- Require an explicit v2 `ai_review` record selected through `review.record_paths`. Separate `review.ai_reviewers` from actual human `review.reviewers`.
- Remove mandatory human reviewers, human editors and human editorial attestations from v2 publication. A second AI assessment is optional.
- Disclose the score as an AI evaluative judgment. Do not call it human certification or a guarantee of literary quality.

AI-only output defaults to CC BY 4.0 (`CC-BY-4.0`) only to the extent the publisher controls applicable rights, following [AI content policy](../AI-CONTENT-POLICY.md). This permits open reuse under the stated terms while preserving any publisher-held rights. It does not create copyright, imply human authorship, impose new restrictions on public-domain material or license third-party source rights. Preserve source provenance and AI attribution. Actual protected human contributions require their real attribution and permission or another lawful reuse basis; do not invent human contributors or consent records.

Human reviews and reader corrections are optional after release. A material correction requires re-evaluation and republication. Any text change makes earlier hash-bound evidence stale; the final version requires current matching assessment evidence. A serious current issue blocks the affected edition until it is resolved.

## Migration and historical evidence

1. Preserve `rubric-literary-v1.json`, earlier review JSON, dated source/QA/release reports and earlier ADRs unchanged.
2. Add the v2 rubric and implement its schema, gate and metadata distinctions. Continue validating historical records according to their declared version.
3. Create explicit v2 AI assessments for current editions; do not rename or relabel an old AI preflight to make it qualify.
4. Record final hashes, full coverage, scores, findings and AI identities honestly. Set the selected canonical review paths and rights declarations before changing publication status.
5. Update current quality, workflow, contribution and governance documentation, while retaining links to historical policy.
6. Verify boundary cases, including 8.55 failing and 8.60 meeting the numeric gate, plus stale hashes, incomplete coverage, serious issues and missing rights still blocking publication.

Adopting this ADR does not itself publish any edition. The edition catalog, current assessment evidence, rights records and validation outcome determine eligibility; deployment must be checked separately.

## Consequences and limitations

The project can release eligible AI translations without recruiting human reviewers first. Readers can inspect sources, compare aligned texts and suggest corrections after publication.

AI generation and AI assessment can share blind spots. A complete review record makes the process inspectable but does not eliminate that limitation. Retain concrete reasons, uncertainties, rejected proposals, negative assessments and the history of corrections. Do not repeatedly rerun a grader merely to select a favourable score.

Automated checks establish arithmetic and evidence consistency, not literary truth, legal certainty or the authenticity of a purported human identity. Source-rights and reuse boundaries remain edition-specific. Optional human feedback can improve confidence without being represented as a prerequisite already satisfied.

Original-language source checks and publication-versus-archive separation remain in force. Draft, planned and withdrawn editions remain excluded from public reading and publication exports.

## Alternatives not adopted

- Keeping two mandatory human approvals despite the owner's changed goal.
- Removing source, rights, coverage or serious-issue checks when adopting an AI threshold.
- Rounding 8.55 into a passing 8.6 or averaging a deficient record with another score.
- Converting historical preflights into current assessments by changing their labels.
- Describing AI-only work as human-reviewed or inventing contributors and permissions.

See [Quality](../QUALITY.md), [Editorial workflow](../EDITORIAL-WORKFLOW.md) and [AI content policy](../AI-CONTENT-POLICY.md) for the current operating policy.
