# Translation Gap Atlas

Research date: **1 November 2026**. The canonical survey is
[`research/translation-gap-atlas.json`](../research/translation-gap-atlas.json).
It covers **20 works, 40 work–language assessments, 12 source languages and 81 evidence records**.
Vietnamese is the priority; Indonesian is a research comparator. No second-language
production commitment is justified by the evidence yet.

## What the research changes

Several attractive candidates are already translated. The task is to establish a
specific reason another edition would help readers: completeness, lawful open
reuse, reliable source alignment, or a demonstrable literary deficiency. A search
result count cannot answer those questions.

| Work | Positive evidence found | Decision implication |
| --- | --- | --- |
| Wilde, *The Artist* | Tiền Vệ indexes *Người nghệ sĩ*, credited to Hoàng Ngọc-Tuấn. The normalized page returned HTTP 429 during retrieval. | Continue the existing editorial pilot; do not describe it as the first Vietnamese translation or a proven translation gap. |
| Machado, *A Cartomante* | A 2021 report identifies a Hanoi University student translation project. A Vietnamese Machado collection is catalogued separately. | Ask for the student project’s current status; do not infer publication or nonexistence. |
| Sōseki, *Ten Nights of Dreams* | A Vietnamese page explicitly translates five odd-numbered dreams; another Vietnamese translation lead and an Indonesian 2022 book listing exist. | Investigate whole-work coverage and competing editions before translating the entire sequence. |
| Chopin, *The Story of an Hour* | Credited Vietnamese and Indonesian translations are online. | Existence is established; no independent quality verdict has been made. |
| Akutagawa, *The Spider’s Thread* | A Vietnamese translator’s collection contents and an Indonesian publisher’s contents identify the story. | Direct translation is not itself a demonstrated unmet need. |
| Lu Xun, *Kong Yiji* | HCMC library MARC record explicitly lists the story in Trương Chính’s 2024 Kim Đồng collection; the national bibliography corroborates the book. | No Vietnamese absence claim is defensible. Indonesian scholarship alone does not prove an Indonesian prose edition. |
| Kafka, *Before the Law* | DIVA Press lists an Indonesian edition; a Vietnamese edition page claims CC BY-SA. | Audit existing open editions before assuming an open-reuse gap. |
| Andersen, *The Little Match Girl* | National catalogs identify children’s adaptations. | An adaptation is positive evidence of reception, not proof of complete Danish-source translation. |
| Premchand, *Kafan* | Scholarly resources distinguish Urdu December 1935 from Hindi versions and later harmonized translations. | Defer source ingestion pending textual and US copyright analysis. Do not silently relay through a modern English translation. |

All evidence, exact URLs, search queries, search dates, named editions, confidence,
unresolved questions, estimated editorial effort and reviewer capacity are in the
JSON. The findings above are summaries of those inspectable records.

## Three bounded draft pilots

1. **Wilde — *The Artist*, English → Vietnamese.** Continue the existing five-passage
   pilot to test ambiguous imagery, revision history and independent review.
   [UCC’s bibliography](https://celt.ucc.ie/document/E850003-016/) identifies the
   1913 Methuen witness. Existing Vietnamese supply is acknowledged.
2. **Machado de Assis — *Um Apólogo*, Portuguese → Vietnamese.** Short scope,
   Brazilian literary tradition and accessible old-source evidence make a limited
   draft worthwhile. The [USP catalog](https://digital.bbm.usp.br/handle/bbm/5307)
   identifies *Várias histórias*, Laemmert 1896, pp.253–257. This is a feasibility
   selection; a verified Vietnamese gap and actual reader demand are still missing.
3. **Emilia Pardo Bazán — *El encaje roto*, Spanish → Vietnamese.** The
   [Cervantes old-edition record](https://cervantesvirtual.com/obra/cuentos-de-amor/)
   and [Alicante facsimile index](https://sirio.ua.es/libros/BEducacion/cuentos_amor/index.htm)
   identify *Cuentos de amor*, Madrid, Administración, **[1898?]**, vol.16,
   pp.233–239. Preserve the date uncertainty. Cervantes’s separate electronic
   transcription derives from a 1963 edition and is not interchangeable with this
   old witness. No exact Vietnamese or Indonesian edition was established in this
   bounded search; that is not proof that none exists.

These selections do not authorize public translated editions. Source clearance,
complete alignment, two qualified independent human reviews, contributor consent
and the existing literary thresholds remain separate gates. They also do not
justify a large translation pipeline.

## What the Atlas does not establish

This is a first-pass evidence survey, **not a comprehensive bibliographic census**.
Many sources were available as search-index excerpts. The `access_method` field
distinguishes those from pages opened in full; known retrieval failures are
recorded. Most negative searches used public indexes of catalog domains, not the
catalogs’ complete internal databases. Print-only editions, alternate titles and
unindexed anthology contents may be missing.

The Atlas makes **zero verified-absence claims**, **zero independent inadequacy
claims**, and **zero claims of measured LitMundi reader demand**. `high` confidence
means strong positive evidence of an edition’s existence, not confidence in its
completeness, quality, license or stock availability. A translation hosted online
is not thereby licensed for republication. Unknown translators and ISBNs are
`null`, not guessed.

Human editorial-hour ranges are planning judgments, not quotations or empirical
measurements. They include collation, revision and two reviews, and exclude the
unbounded time needed to find reviewers. **No qualified reviewer commitments have
been verified for any work.** Institutional translation activity is a recruitment
lead only; no university or published translator is presented as a project partner.

## Evidence vocabulary

| Classification | Meaning |
| --- | --- |
| `translation_found` | Item-level positive evidence or a credited translation was found. Completeness and quality may still be unverified. |
| `translation_reported` | A named book, catalog or literary report points to a translation; further item-level checking is needed. |
| `translation_project_reported` | A project was reported; completion and availability are not established. |
| `partial_translation_found` | The located text explicitly covers part of the work. Other complete editions may exist. |
| `adaptation_found` | A retelling, abridgment, children’s version or screen adaptation exists; it is not treated as an unabridged translation. |
| `scholarship_found_translation_unverified` | Target-language research or reception exists without a verified prose edition. |
| `unverified_rendering_found` | An unattributed or bibliographically uncertain rendering is a lead only. |
| `no_translation_found_in_bounded_search` | Searches did not establish an edition. Confidence in absence is low. |
| `translation_apparently_unavailable` | Reserved for an identified translation with documented availability checks; not used here. |
| `verified_gap` | Requires a specified scope, at least two bibliographic sources and attributable human specialist verification; not used here. |
| `existing_translation_independently_assessed_inadequate` | Requires an edition-specific independent bilingual assessment and inspectable errors; not used here. |

## Legal boundary

The Atlas includes primary legal references for the US, Vietnam, Indonesia and the
Spanish transition rule. These support screening, not global rights clearance.
Edition metadata remains the authority for actual source imports. A public-domain
original can coexist with protected modern translations, introductions, scholarly
interventions, scans or recordings. Ibsen’s modern Oslo edition, for example,
declares CC BY-NC; a digitized scholarly page cannot be treated as an unrestricted
old-text witness without examining what is actually being reused.

## Reproduce and extend

```sh
node scripts/validate-atlas.mjs
node --test tests/atlas.test.mjs
```

The JSON Schema checks record shape. The validator also checks unique identities,
resolved evidence references, real calendar dates, language coverage for **every**
work, honest separation of unvalidated demand and reviewer commitments, and the
extra evidence needed for strong gap claims. Mechanical validation cannot prove
that a source is true or that a person is qualified; a maintainer must inspect the
underlying evidence.

Before commissioning more drafts, ask a bilingual librarian/editor to resolve
alternate titles and anthology contents for the two new pilots. Recruit two real
reviewers per source-language pair and ask 5–10 actual Vietnamese readers to read
a legally cleared, eligible edition. Preserve observations of completion, voluntary
return, useful corrections and recommendations. If those tests do not show a need
that existing editions already meet, improve the current small corpus rather than
increasing volume.
