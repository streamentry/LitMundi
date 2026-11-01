# Editorial workflow

LitMundi publishes AI translations after a complete v2 AI assessment and the required source, rights and integrity checks. Human review and reader corrections are optional after release. The canonical text is UTF-8 JSON; the public reader contains eligible published editions, while Git and the editorial archive preserve labelled drafts and review history.

A successful build establishes mechanical integrity. The accompanying AI score records a literary judgment; it does not certify human review or guarantee quality.

## Entry and exit conditions

| Stage | Entry | Exit evidence |
| --- | --- | --- |
| Discovery | A named work and target language | Dated Atlas searches, competing editions, bounded uncertainty and a reader benefit to test |
| Rights assessment | Exact original witness identified | Edition-specific jurisdictional rationale and source evidence; lawful use of any included translation, notes or other material |
| Source ingestion | Lawful source text | Complete canonical passages, stable identifiers, source-check record bound to SHA-256, disclosed normalization and checking method |
| Translation | Complete source and explicit edition identity | Direct translation, complete alignment, AI attribution, glossary and interpretive decisions |
| AI assessment | Complete source and target | One full v2 AI assessment, all passage IDs, exact source/target digests, all five scores and passage-grounded reasons |
| Revision | Findings from assessment or corrections | Recorded decisions, resolved serious issues, re-evaluation of changed text and fresh evidence for final hashes |
| Publication | Complete current evidence | Unrounded weighted score ≥8.6, no unresolved major/critical issue, cleared source rights and documented lawful reuse |
| Optional human feedback | Published edition and passage links | Actual reader reports or human reviews, recorded honestly and handled according to severity |
| Republication | Accepted text correction | Updated assessment and rights evidence where affected; valid final hashes and publication checks |
| Archive | Validated release snapshot | Deterministic export, fixity inventory, offline reconstruction and explicit per-edition reuse conditions |

V2 retains the 35/25/15/15/10 weights and half-point category scores. It requires one eligible AI assessment and has no additional category floors, mandatory human review, human editor or human attestation. **An exact score of 8.55 fails; rounding it to 8.6 cannot authorize release.** See [Quality](QUALITY.md) and [ADR-0009](adr/0009-ai-first-publication.md).

A feasibility translation can precede verified reader demand. Label that distinction honestly. The Atlas does not establish translation absence or reader demand merely because a search found no edition. Indonesian remains a research comparator; any future production choice should document its source, purpose and ability to assess the language pair without inventing human commitments.

## Prepare and assess the text

```sh
npm ci
npm run validate
npm run review:packet
```

Open `review-packets/<edition-id>.html` locally for the complete source and target, stable passage identities and exact digests. The packets omit scores to support a fresh reading. They belong to the editorial archive. Unfilled review templates, especially historical templates designed for a different rubric, are not completed assessments and must not be submitted as evidence.

The AI assessor reads the full source and target, covers every canonical passage, assigns the five half-point scores and explains its reasoning. Record uncertainty, source ambiguities, omissions, voice and cadence concerns. Disclose the assessment as AI work and any involvement in generating or revising the text. A second assessment can help but is optional.

Save the explicit `ai_review` record under `corpus/reviews/<work-id>/<edition-id>/` using `litmundi-literary-v2`. Edition metadata selects exact canonical review files through `review.record_paths`; AI assessor identities belong in `review.ai_reviewers`. Actual human reviewers, when present, remain separately identified in `review.reviewers`.

Preserve previous preflights, rejected proposals and low scores. A historical record cannot approve a changed source or target. Any current unresolved major or critical finding blocks publication even when a selected assessment otherwise passes.

## Rights and attribution

Follow [AI content policy](AI-CONTENT-POLICY.md) for the exact publication and reuse basis. AI-only translations default to CC BY 4.0 (`CC-BY-4.0`) only to the extent the publisher controls applicable rights. Record the source witness, separate source-rights terms, AI attribution and edition-specific declaration. The license does not create copyright, imply human authorship or impose new restrictions on public-domain material. It is not a guarantee of worldwide copyright status.

There is no requirement to recruit or name a human editor to release AI-only output. Do not invent a human translator, reviewer, license grant or permission record. Where a real person contributes creative wording or other protected material, document actual attribution and lawful reuse before incorporating it.

A source author's public-domain status does not itself grant rights in someone else's modern translation, annotations or artwork. Retain the distinctions in the rights record. The software/documentation MIT license does not automatically apply to corpus text.

## Release and correction

Select the qualifying v2 evidence, confirm the final hashes, and change the edition to `published` only when the current checks pass. No separate human editorial attestation is required.

```sh
npm ci
npm run validate
npm run verify:ids -- <base-commit>
npm run quality:status
npm test
npm run check
npm run build
npm run verify:build
npm run export
npm run verify:archive
```

On a restricted workstation, set `ASTRO_TELEMETRY_DISABLED=1` if Astro cannot write its optional telemetry settings. CI already sets this. Review and merge the publication change after checks pass, then verify the actual GitHub Pages routes, source/target view, downloads, provenance and correction links. A local build is not evidence that production has updated.

After release, assess reader corrections on their merits. Minor suggestions can be handled through the normal correction process. A serious current issue blocks the affected edition until resolved; do not keep a known major error online solely because its earlier score passed. A credible rights dispute also requires investigation under [Governance](../GOVERNANCE.md).

Preserve stable passage identities through corrections. Any changed text makes its previous review hashes stale. Re-evaluate material corrections and refresh the full-text assessment for the final version before republication, retaining the previous record and explaining the scope of the new check.

The archive workflow artifact expires after 30 days and is not an independent preservation mirror.

## Optional human review and reader feedback

People can read, review and suggest changes after publication. A complete human review should accurately record the reviewer's language competence, qualifications, conflicts, coverage and evidence. Do not portray a casual reader comment as a full literary assessment or AI feedback as a human opinion. Human feedback is valuable; it is not a prerequisite for release.

The site's reading-experience form can record completed readings, stopping points, voluntary returns, useful corrections, recommendations and competing editions. Browser automation and AI responses are not reader-demand evidence. Local bookmarks stay on the reader's device; they are not analytics.

A small feedback exercise, such as inviting 5–10 suitable readers and looking for specific reports of added value, can guide later improvements and work selection. These are proposed experiments, not observed results or mandatory gates. Obtain authorization before sending outreach. If a lawful existing edition serves readers better, consider linking to it or collaborating with its publisher.
