# Roadmap: evidence before scale

State of the first three-work release cycle, 2026-11-01. This separates implemented repository work from external evidence still required; it does not certify an unverified deployment or translation.

## Implemented

- Three complete, legally assessed original editions: Wilde's *The Artist* (English), Machado's *Um Apólogo* (Portuguese) and Pardo Bazán's *El encaje roto* (Spanish), with exact witnesses and disclosed technical source checks.
- Three complete direct Vietnamese drafts: **42 canonical passages**, explicit alignments, glossaries, interpretive alternatives, revision records and hash-bound AI preflights. All remain withheld from public reading.
- [Translation Gap Atlas](TRANSLATION-GAP-ATLAS.md): 20 works × two target languages, 12 original languages and 81 evidence records. Existing translations and search limitations are explicit; no verified absence, independent inadequacy judgment or measured demand is claimed.
- Four interface locales; accessible reading and passage navigation; edition/language fallback; published-text search; source/translation alignment support; correction links; optional local reading position; canonicals, locale alternatives, sitemap and structured metadata.
- Portable JSON, TXT, TSV and EPUB publication exports, plus a separate editorial archive with labelled review packets, per-edition rights and fixity records.
- Original quality thresholds retained, with current-versus-historical review handling, full schema validation, PR-base identifier checks and explicit maintainer verification.
- Deterministic archive verification and an executable Python 3 offline restoration drill; GitHub Actions archive retention is 30 days.

Actual release evidence belongs in the completed CI/deployment run and [verification records](verification/README.md). A passing local check does not establish that production has updated.

## The next editorial milestone

The shortest path is to finish **one** independently reviewed Vietnamese edition, beginning with Wilde's five passages:

1. Obtain one qualified English–Vietnamese literary review against the exact source and score-free review packet; revise the text and retain disagreements.
2. Obtain the second independent review of the final text. Each reviewer must meet every [quality threshold](QUALITY.md); all evidence must match the final hashes.
3. Record named human editorial contributions and affirmative permission for CC BY 4.0 or CC0. A maintainer must authenticate the evidence before a publication PR.
4. After deployment, verify reading, downloads, metadata, corrections and draft exclusion on the actual public URLs.

No qualified reviewer commitment or contributor grant has yet been verified. Multiple AI evaluations cannot replace those steps. Machado and Pardo Bazán remain complete review packets while this work proceeds.

## Reader evidence before another batch

After one translation is approved, invite a small group of relevant readers through an explicitly authorized outreach process. Use the site's feedback form to record completed readings, stopping points, voluntary returns, useful corrections, recommendations and comparisons with existing lawful editions. The current project has no measured reader cohort or retention result.

The [editorial workflow](EDITORIAL-WORKFLOW.md) proposes 5–10 initial readers and at least five completed readings with specific evidence of added value as a **provisional experiment**, not a validated benchmark. If existing editions meet the need better, link to or partner with them. Indonesian remains a research comparator until a specific reader need and bilingual review capacity are established.

## Preservation and succession

Obtain an actual independent archive custodian, a separately retained digest and a documented restore result. Then establish additional custody and a named succession arrangement. No external mirror or successor has accepted responsibility. The [current executable procedure](PRESERVATION.md) and [governance terms](../GOVERNANCE.md) make a handoff possible without pretending it has happened.

## Continue, pause or redirect

Continue a work when source rights, editorial capacity and a concrete reader benefit are credible. Pause publication when any required human review, permission, source integrity or current hash is missing. Pause new translation production if reviewers cannot be secured or reader feedback shows no added value. Redirect effort toward corrections, source preservation or collaboration rather than increasing the number of unverified drafts.

Do not add a database, account system, bulk generation pipeline, semantic-search service or speculative preservation network to avoid the present human and reader bottlenecks.
