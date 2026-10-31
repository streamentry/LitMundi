# Contributing

Contribute a specific correction, a source witness, bibliographic evidence or a qualified literary review. All languages and traditions are welcome; evidence and careful reading matter more than production volume.

## Report a concern or reading experience

Open a passage's correction link or choose a [GitHub issue form](https://github.com/streamentry/LitMundi/issues/new/choose). Include the work ID, edition ID, stable passage ID, current wording, proposed wording, exact source and rationale. Do not paste a modern copyrighted translation without permission. GitHub owns sign-in; LitMundi has no account or credential store.

The reading-experience form asks what you read, whether you finished, where you stopped, what helped or hindered and whether you would return or recommend it. Describe an actual reading, not a fabricated user endorsement. Public issues should not contain personal or sensitive information.

## Propose a work or edition

1. Consult the [Translation Gap Atlas](docs/TRANSLATION-GAP-ATLAS.md) and record dated catalog/publisher searches, existing editions, uncertainty and a concrete reader need. A failed web search is not proof of absence.
2. Identify an exact original-language witness and assess rights in the intended jurisdictions. Modern translations, notes, artwork and source-page design can have separate rights.
3. Open a proposal with source evidence, reviewer capacity and the cheapest way to test reader value. Do not imply that an institution or translator has committed without consent.
4. Add a unique work/edition identity, ordered passage structure, complete UTF-8 NFC source and draft, explicit alignment, source-check evidence, glossary and interpretive alternatives. Preserve established IDs and legacy URLs.
5. Disclose AI involvement. Keep translation status `draft` until every publication requirement is met; no model score can promote it.

The [corpus format](corpus/README.md) and [editorial workflow](docs/EDITORIAL-WORKFLOW.md) define the file locations and stage conditions. A different original witness or independent translation needs its own edition ID.

## Review a translation

```sh
npm ci
npm run validate
npm run review:packet
```

Open the relevant `review-packets/<edition-id>.html` locally. It contains the full original and draft, passage identities and exact hashes, without an AI score. Read it independently before consulting other reviewers or preflights. Templates contain unfilled identities and null scores; they are **not review evidence**.

Review every passage and apply [QUALITY.md](docs/QUALITY.md). Record qualifications, language pair, conflicts, independent assessment, concrete findings and a genuine GitHub PR review permalink. Each reviewer must score ≥9.0 overall, fidelity ≥9.0 and every other dimension ≥8.0 before approving publication. No unresolved major or critical finding may remain. Low scores and disagreements should be preserved honestly; they do not make a draft invalid.

After revision, update the review against the final source and target hashes. A maintainer must authenticate the two independent qualified human reviews, contributor identity, lawful rights and written open-license permission, recording the required attestation. Do not claim to be a human reviewer when submitting AI feedback or infer permission from an original's public-domain status.

## Submit a reviewable PR

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

Explain the concrete defect or reader benefit, source evidence, changed passages and validation performed. Preserve meaningful rejected proposals and stale reviews as history. For text corrections, re-evaluate any affected approvals; do not retain an old score as approval of changed text.

Public downloads contain approved publication editions only. The separate editorial archive includes labelled drafts and review packets under their actual rights; it does not grant them a content license. See [Preservation](docs/PRESERVATION.md) before redistributing an archive.

Small, complete, reviewable contributions are preferable to bulk generation without readers, qualified review or permissions.
