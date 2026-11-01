# Contributing

Contribute a correction, source witness, bibliographic evidence, AI assessment or voluntary human literary review. All languages and traditions are welcome. LitMundi publishes eligible AI translations under [rubric v2](docs/QUALITY.md); people can read and provide feedback after release.

## Report a concern or reading experience

Open a passage's correction link or choose a [GitHub issue form](https://github.com/streamentry/LitMundi/issues/new/choose). Include the work ID, edition ID, stable passage ID, current wording, proposed wording, exact source and rationale. Do not paste a modern copyrighted translation without permission. GitHub owns sign-in; LitMundi has no account or credential store.

The reading-experience form asks what you read, whether you finished, where you stopped, what helped or hindered, and whether you would return or recommend it. Describe an actual reading. Public issues should not contain personal or sensitive information.

A reader report does not have to be a complete rubric review to be useful. Serious current errors and rights concerns are investigated and can block an affected edition pending resolution.

## Propose a work or edition

1. Consult the [Translation Gap Atlas](docs/TRANSLATION-GAP-ATLAS.md). Record dated catalog/publisher searches, existing editions, uncertainty and the reader benefit you want to test. A failed web search does not establish absence.
2. Identify an exact original-language witness and assess source rights in the intended jurisdictions. Modern translations, notes, artwork and source-page design can have separate rights.
3. Describe the translation and assessment approach and how readers might benefit. Human reviewer recruitment is optional; do not imply that a person or institution has committed without consent.
4. Add a unique work/edition identity, ordered passage structure, complete UTF-8 NFC source and target, explicit alignment, source-check evidence, glossary and interpretive alternatives. Preserve established IDs and legacy URLs.
5. Disclose AI involvement and record the edition's lawful reuse basis under [AI content policy](docs/AI-CONTENT-POLICY.md). Keep the edition as a draft until the current AI assessment, rights and publication requirements pass.

The [corpus format](corpus/README.md) and [editorial workflow](docs/EDITORIAL-WORKFLOW.md) define file locations and stage conditions. A different source witness or independent translation needs its own edition ID.

## Assess a translation with AI

```sh
npm ci
npm run validate
npm run review:packet
```

The local `review-packets/<edition-id>.html` contains the full original and target, passage identities and exact hashes without an AI score. Read the complete texts and apply [Quality](docs/QUALITY.md). Unfilled templates and legacy v1 preflights are not current v2 publication evidence.

A qualifying record must explicitly be an `ai_review` under `litmundi-literary-v2`, identify the work and edition, cover every canonical passage, bind the exact source and target SHA-256 digests, and explain all five half-point category scores. The unrounded weighted score must be **at least 8.6**. **8.55 fails**, even if a display rounds it to 8.6. There are no inherited v1 category floors or mandatory second assessment.

Save the record in `corpus/reviews/<work-id>/<edition-id>/`. Edition metadata selects it through `review.record_paths` and lists AI assessors separately in `review.ai_reviewers`. Preserve uncertainties, rejected proposals, earlier scores and superseded assessments. No unresolved current major or critical finding may remain.

A passing AI assessment can satisfy the literary assessment requirement. Source rights, lawful reuse, completeness and integrity must also pass. No human reviewer, editor or attestation is required for an AI-only edition, and no such person or permission should be invented.

## Optional human review

Human reviews and reader corrections are welcome after publication. Identify the actual person and role, language competence, relevant experience and any conflicts. State whether you read the whole work or only specified passages, and provide real evidence for claims of a complete assessment. Do not submit AI feedback under a human identity.

Human contributors' creative additions require accurate attribution and a lawful reuse basis. Follow the edition's rights record and [AI content policy](docs/AI-CONTENT-POLICY.md). A source's public-domain status does not itself license someone else's translation.

## Submit a reviewable change

```sh
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

Explain the defect or reader benefit, source evidence, changed passages and validation performed. Preserve meaningful rejected proposals and prior reviews. Any text edit makes the old assessment hashes stale; material corrections require literary re-evaluation and a new publication decision. Refresh the assessment against the final version before republication.

Public downloads contain eligible published editions. The separate editorial archive includes labelled drafts and review history under their actual per-edition rights; the archive itself grants no blanket content license. See [Preservation](docs/PRESERVATION.md) before redistribution.

Prefer complete, reviewable contributions whose source, assessment and rights can be inspected.
