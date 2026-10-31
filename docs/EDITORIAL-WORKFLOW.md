# Editorial workflow

The canonical text is UTF-8 JSON. The public reader contains only eligible published
editions; Git and the editorial archive also retain clearly labelled drafts. A
successful build is evidence of mechanical integrity, not literary certification.

## Entry and exit conditions

| Stage | Entry | Exit evidence |
| --- | --- | --- |
| Discovery | A named work and target language | Dated Atlas searches, competing editions, bounded uncertainty, a reader need worth testing |
| Rights assessment | Exact original witness identified | Edition-specific jurisdictional rationale and primary evidence; no borrowed modern translation or editorial additions |
| Source ingestion | Lawful historical text | Complete canonical paragraphs, stable identifiers, source-check record bound to SHA-256, disclosed normalization and checking method |
| Translation | Complete source and explicit edition identity | Direct translation, complete alignment, glossary, interpretive decisions and alternatives |
| AI preflight | Complete draft | Passage-grounded findings and exact source/target digests; serious concerns preserved, not hidden by optimistic scores |
| Human review | Review packet and exact witness | Two independent qualified bilingual humans each review every passage; actual PR review permalinks, qualifications and conflicts disclosed |
| Editorial revision | Actionable findings | Corrections and disagreements recorded; new hashes require refreshed approvals; prior reviews remain history |
| Publication | Complete evidence and contributor consent | Each human score ≥9.0, fidelity ≥9.0, other dimensions ≥8.0; no unresolved major/critical findings; maintainer attestation and open license |
| Community corrections | Reader report with edition/passage | Reviewed PR; stable IDs preserved; changed translation approvals refreshed before republication |
| Archive | Validated release snapshot | Deterministic export, fixity inventory, isolated offline reconstruction, explicit per-edition reuse conditions |

An early feasibility draft can precede a verified gap, as in this three-work cycle,
but this is not evidence of demand and does not authorize further production.
Indonesian remains an Atlas comparator until an actual need and reviewer capacity
are established.

## Preparing an independent review

```sh
npm ci
npm run validate
npm run review:packet
```

Open `review-packets/<edition-id>.html` locally. These parallel source/draft packets
show exact SHA-256 digests and deliberately omit AI scores. They are also included
in the **editorial** archive, not in public website downloads. The adjacent JSON
templates contain null scores and unfilled identities: they are intentionally
invalid and must never be represented as reviews.

Reviewers should assess independently before reading AI grades or one another's
judgements. Describe language and literary experience in `reviewer.qualifications`,
list the language pair, and disclose conflicts. Submit a genuine GitHub PR review
and preserve its `#pullrequestreview-…` URL. Each structured record goes in
`corpus/reviews/<work-id>/<edition-id>/` under a distinct filename. Do not replace
old assessments merely to make the score history look better.

Low scores and open serious findings are valid editorial evidence. They do not
make a draft repository invalid. They **do** make that evidence ineligible for
publication. Historical reviews with different content hashes remain available
but cannot approve the new text. Edition metadata explicitly identifies the
current approving review URLs; unrelated historical reviews do not substitute
for those approvals.

## Maintainer decision and consent

Publication requires an `editorial_attestation` in the edition record. It binds a
named maintainer, date, reviewable PR evidence, both final digests, the approving
reviewer handles, and explicit contributor license-consent URLs. The maintainer
must verify reviewer identity, qualifications and independence, source rights,
and contributor consent. The schema and tests check the declaration's shape and
freshness; they cannot authenticate a person or make a legal judgement.

Document human creative contributions accurately. Do not call an AI the human
translator, use reviewer names without consent, or infer CC BY/CC0 permission from
the original author's public-domain status. No such permissions or human approvals
have been obtained for this cycle's three drafts.

The rubric itself remains version 1 with its original 35/25/15/15/10 weights and
all non-compensatory thresholds. Changing it requires a new ADR and version.

## Minimal release sequence

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

On a restricted workstation, set `ASTRO_TELEMETRY_DISABLED=1` if Astro cannot write
its optional telemetry settings. CI already sets this. Review and merge a PR only
after checks pass, then verify the actual GitHub Pages routes. The archive workflow
artifact expires after 30 days and is not an independent preservation mirror.

## Reader feedback before scale

Use the site's reading-experience issue form. Record actual completed readings,
voluntary returns, useful corrections, recommendations and competing editions.
Browser automation and AI feedback are not reader-demand evidence. Local bookmarks
stay on the reader's device; they are not analytics.

Before commissioning another batch, a reasonable **provisional decision rule** is:
publish one fully approved Vietnamese edition; invite 5–10 suitable readers; seek
at least five completed readings plus specific evidence that this edition adds
value over existing alternatives. These numbers are an experiment design, not
observed results or statistical proof. If readers prefer an existing lawful edition,
link or collaborate with it. Do not enlarge the corpus to avoid that feedback.
