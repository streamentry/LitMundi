# Roadmap: publish, learn and preserve

This roadmap follows the AI-first publication policy adopted on 2026-11-01 in [ADR-0009](adr/0009-ai-first-publication.md). It describes current priorities. Earlier dated release and verification records remain historical and should be read with their original rubric and evidence.

## Foundation

The repository contains complete original and Vietnamese texts for the initial Wilde, Machado and Pardo Bazán works, with stable passage identities, alignments, exact witnesses, source checks, glossaries, interpretive alternatives and revision history. The catalog and `npm run quality:status` report current edition states; this roadmap does not infer publication from an earlier draft score.

The [Translation Gap Atlas](TRANSLATION-GAP-ATLAS.md) covers 20 works across two target languages, 12 original languages and 81 evidence records. Existing translations and search limitations are explicit. It claims no verified absence, independent inadequacy judgment or measured reader demand.

The reader supports four interface locales, accessible passage navigation, edition selection, published-text search, source/translation alignment, correction links, local reading position and portable downloads. The separate editorial archive retains review history, rights and fixity data and supports offline restoration.

Actual deployment evidence belongs in the successful CI/deployment run and [verification records](verification/README.md). A local check does not establish that production has updated.

## Release eligible AI translations

For each complete translation:

1. Confirm its exact source, source-check evidence, rights rationale, lawful reuse and AI attribution under [AI content policy](AI-CONTENT-POLICY.md).
2. Obtain one full source/target AI assessment under `litmundi-literary-v2`, covering every canonical passage and bound to the final hashes.
3. Revise weaknesses and resolve current major or critical findings. The exact weighted score must reach **8.6**; 8.55 fails. Keep half-point category scores and the 35/25/15/15/10 weights.
4. Select the current review record, validate eligibility and publish the edition through the release workflow.
5. Verify the deployed reader, alignment, metadata, downloads and correction links.

No human reviewer, editor, attestation or reader cohort is a prerequisite. An AI score is a disclosed judgment, not a human certification. Prior v1 scores and preflights remain history and cannot be relabelled as qualifying v2 evidence.

## Improve published editions through optional feedback

Invite voluntary readings and corrections after release, using explicitly authorized outreach. Record actual completed readings, stopping points, useful corrections, recommendations and comparisons with lawful existing editions. Do not turn automated browsing or AI responses into reader-demand evidence.

A small pilot reading group can help guide improvements and future work selection; no minimum group size or response count is a publication gate. Human literary review is welcome at any stage but remains optional. When feedback identifies a material correction, re-evaluate and republish the corrected text. A serious current issue blocks the affected edition until resolved.

Indonesian remains a research comparator. Before expanding to another language, document the intended reader benefit, source rights and a credible way to assess the source/target pair. Do not invent reviewer availability or treat the Atlas's incomplete searches as proof that a translation is missing.

## Preservation and succession

Obtain an actual independent archive custodian, a separately retained digest and a documented restore result. Then establish additional custody and a named succession arrangement. No external mirror or successor is represented as having accepted responsibility.

The [executable restoration procedure](PRESERVATION.md) and [governance terms](../GOVERNANCE.md) support a handoff. GitHub's 30-day workflow artifact retention does not establish independent custody.

## Continue, revise or redirect

Continue publication when source rights, lawful reuse, complete current assessment evidence and the v2 quality gate are satisfied. Revise when the score is below threshold or a serious issue is open. Withhold publication when source integrity, rights or matching evidence is missing.

Use the project's actual editorial effort and optional reader feedback to guide additional work. Correcting an existing edition, preserving a source or linking to a better lawful edition can be more valuable than adding another work. Add infrastructure when a concrete need justifies it.
