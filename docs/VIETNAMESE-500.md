# 500 works for Vietnamese translation

The owner authorized this program on **1 November 2026**: select 500 literary works, put them in a durable TODO and begin translating them under LitMundi's AI-first publication policy.

The complete, ordered checklist is [TODO.md](../TODO.md). Its source of truth is [the JSON queue](../research/vietnamese-translation-backlog.json); the existing [Translation Gap Atlas](TRANSLATION-GAP-ATLAS.md) remains a separate, dated bibliography survey.

## What was selected

This is an editorial selection of 500 complete works worth making available in a traceable, openly reusable Vietnamese edition. It is not an objective worldwide league table. It includes novels, novellas, short stories, plays, poetry, epics, essays and literary memoirs. A long novel is one task, just as a short story is one task; the number 500 does not measure workload or literary value.

Selection balances literary significance, distinctive style or ideas, breadth across traditions and forms, women authors, usefulness to Vietnamese readers and practical access to lawful sources. Each item has a specific rationale, an initial priority band and supporting bibliographic leads. Bands 1–5 express editorial judgments, from foundational/core selections to more specialized complements; they are not measured reader demand or translation-quality scores. The queue order combines those judgments with production readiness, so a short feasible work can precede a more important long novel.

The initial split reserves 300 places for Europe, the Americas and Oceania, and 200 for Asia, Africa and the Middle East, including relevant diaspora traditions. These are curation assignments, not exhaustive geographic identities. The list caps a named author's contribution at six works, avoids counting a collection and its constituent stories twice, and excludes original Vietnamese works. Anonymous and collective traditions are not treated as one prolific author. Future substitutions should preserve the 500-work scope and explain the reason in Git history.

The two Vietnamese editions already published before this program—Wilde's *The Artist* and Machado's *Um Apólogo*—do not count toward the 500 new or unfinished tasks. Pardo Bazán's existing unfinished translation does count. The Proust demonstration is not a completed translation and cannot satisfy a TODO.

## Evidence and uncertainty

Every entry links to a source registry that records its URL, access method, date and evidential scope. A source may establish the specific work, an anthology containing it, an author's bibliography or only a source-discovery lead. Those levels must not be conflated. Catalog wording may use an English discovery title; the exact original title, print witness, historical variants and Vietnamese edition title are settled before translation. Uncertain publication dates remain null.

The 500-work selection is not a full Vietnamese bibliography audit. Where a work matches the existing Atlas, its positive findings and limitations remain available there; other entries say `not_audited`. A prior Vietnamese translation is not evidence that another edition is useless, and an empty search is not evidence that no translation exists. The proposed benefit is a complete, lawful, aligned, revisable open edition; that benefit and actual reader use still need to be demonstrated work by work. Existing lawful open editions may justify linking, collaborating or replacing a queue item instead of retranslating it.

Rights screens are deliberately separate from publication clearance:

| Screen | What it permits |
| --- | --- |
| `likely_public_domain` | Investigate an exact original witness. The age of a work does not clear a modern translation, edited text, illustration or scan. |
| `unassessed` | Research rights and provenance before using the text. |
| `permission_required` | Keep the work on `blocked_rights`; obtain a documented lawful basis before translation/publication. Listing a title does not authorize reuse. |
| `cleared_in_corpus` | Follow the exact source edition's recorded assessment and its jurisdictional limits. |

Do not use a protected modern English translation as an unacknowledged relay for another original language. A source in the public domain in one country is not automatically cleared everywhere. The corpus rights record, complete source check and [Rights policy](RIGHTS.md) govern each publication.

## Execute and resume

The first batch completes Pardo Bazán's *El encaje roto* and directly translates Chopin's *The Story of an Hour* and Saki's *The Open Window*. It addresses an existing near-ready draft and two bounded English sources while the larger queue remains explicit.

```sh
npm run todo:next -- 10
npm run todo:check
```

Resume active work before starting another item. For the next feasible complete work, verify the exact original witness and source language, check existing Vietnamese editions, and record rights. Translate the whole work—including its title—using stable passage identities and explicit source/target alignment. Revise against the original, preserve substantive alternatives and evaluate the final complete text. Long works may be drafted in chapter-sized batches, but the full-work TODO stays open until the complete edition passes; no chapter excerpt counts as a finished novel.

Publication requires one current, full-coverage AI assessment under `litmundi-literary-v2`, bound to the final source/target hashes and title snapshots. Its **unrounded weighted score must be at least 8.6/10**. Source integrity, lawful reuse, complete coverage and unresolved major/critical findings remain gates. Human review and feedback follow publication voluntarily; neither is required to pass. An AI score is a disclosed evaluation, not independent human certification. Keep failed and superseded reviews as history; improve the text rather than rounding or altering the threshold.

Update the JSON status only when evidence supports it, preserve `created_on`, and advance `updated_on` when adding new research or progress. Then regenerate the visible TODO:

```sh
npm run todo:render
npm run validate
npm run quality:status
npm test
npm run check
npm run build
npm run verify:build
npm run export
npm run verify:archive
```

The existing corpus validator remains responsible for full publication eligibility. The TODO validator additionally checks 500 distinct ordered tasks, valid evidence references, rights holds, real public Vietnamese editions for checked items and agreement between the JSON and generated checklist. A TODO entry is not inserted into the public reading catalog until its corpus records are ready.

Release completed, qualifying work through a reviewable PR, merge after the required checks, and verify the deployed reader and downloads. Mark blocked work honestly and continue with the next feasible entry. A committed backlog does not mean an unattended translation process is running; report actual published editions, active drafts and blockers separately.

## Learn from each release

Keep the quality threshold stable while using actual corrections, completed readings and source problems to revise priorities. Serious factual, source or rights defects stop the affected edition; a failed score calls for revision, not a human-review prerequisite. If an existing lawful edition already meets the intended need, document that finding and reconsider the task. Update selection judgments without rewriting historical reviews or pretending that bibliographic research measured reader demand.
