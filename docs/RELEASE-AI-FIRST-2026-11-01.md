# AI-first publication v2 — 1 November 2026

The project owner changed the release policy to AI assessment first, with human reading and feedback after publication. [ADR-0009](adr/0009-ai-first-publication.md) records that decision and explicitly supersedes the former mandatory human-review prerequisites. The v1 rubric, old review files, earlier ADRs and dated release reports remain historical evidence.

## Publication rule

One full-coverage, current AI assessment must achieve an **unrounded weighted score of at least 8.6/10** under `litmundi-literary-v2`. The five weights remain **35/25/15/15/10** for fidelity, voice, naturalness, imagery/terminology and mechanics. Scores use half-point category increments. There is no second-review requirement, human reviewer/editor prerequisite, maintainer attestation or inherited category floor.

Source rights, documented open reuse, complete text and alignment, exact source/target hashes and the absence of current unresolved major/critical findings still apply. The score is explicitly attributed to AI. Optional human feedback does not become a publication approval or a human certification automatically.

## Current editions

| Work | Passages assessed | Weighted AI score | Result |
| --- | ---: | ---: | --- |
| [Wilde — The Artist](PILOT-WILDE-THE-ARTIST.md) | 5 | 8.60 | Vietnamese translation published |
| [Machado — Um Apólogo](PILOT-MACHADO-UM-APOLOGO.md) | 22 | 8.725; displayed 8.73 | Vietnamese translation published |
| [Pardo Bazán — El encaje roto](PILOT-PARDO-BAZAN-EL-ENCAJE-ROTO.md) | 15 | 8.55 | Vietnamese translation remains a draft |

The three originals remain published: five public editions in total. Stable edition IDs and URLs are retained, including `-draft-2026` in identifiers that predate publication. Publication status comes from the catalog, not a substring in an identifier.

The fresh v2 records cover all 42 passages and disclose the evaluation method and limitations. Wilde's text was unchanged. Four Machado passages and seven Pardo Bazán passages were revised; exact before/after records are in their editorial dossiers. The same AI system revised and assessed the texts with previous scores visible. These are not blind assessments, independent model consensus, human literary review or evidence of reader satisfaction. Pardo's score was not rounded up or increased merely to clear the gate.

## Reader, reuse and preservation

All four interface languages distinguish AI-reviewed translations, human-reviewed editions and checked originals. The reader displays the validated AI score, policy and evidence, with actual source/translation alignment. AI is not represented as a human translator or the score as a reader rating in structured metadata. An existing JSON-LD escaping defect was also corrected and regression-tested.

AI-only translations use the scoped [AI content policy](AI-CONTENT-POLICY.md): CC BY 4.0 applies only to rights the publishing maintainer controls; it creates no copyright or human authorship and imposes no restriction on public-domain material. Original source rights remain separate.

Public JSON, TXT, TSV and EPUB downloads preserve AI status, score, evidence, provenance and rights. The editorial archive includes labelled drafts and history; its standalone offline restorer reconstructs only the five published editions and retains the AI disclosure. Reader feedback and correction links are available after release.

## Verification

The implementation was checked from baseline `eacfff6c273065c876a438f5ced0d893ca744c56` with a clean dependency install. Local results are distinct from production acceptance, which is recorded in the release pull request after deployment.

| Check | Result |
| --- | --- |
| Corpus and Atlas validation | Passed; 4 work records, 10 edition records, 5 public editions; research evidence preserved |
| Canonical IDs and legacy URLs | Preserved against the baseline |
| Automated tests | **69 passed**, 0 failed; includes exact 8.60 acceptance, 8.55 rejection, stale hashes, coverage, serious findings, rights and reviewer-evidence integrity |
| Astro type check | **40 files**, 0 errors, 0 warnings, 0 hints |
| Production build and routing verification | **54 HTML files**, **1,921 local links/anchors**, **40 canonical sitemap routes**, **2 real aligned translations** |
| Local HTTP/content verification | **106/106 passed**; [full record](verification/ai-first-local-http-2026-11-01.json) |
| Browser acceptance | **40 routes** across four locales with zero axe violations; **26 mobile cases** at 320/390px without overflow; [full record](verification/ai-first-reader-2026-11-01.json) |
| Browser interactions | All five editions searchable; both real parallel readers match canonical text and correction identities; keyboard, locale switching, optional bookmarks and no-JavaScript reading passed; zero browser exceptions |
| Review packet | Two labelled packet/template files for the remaining draft; no fabricated assessment or human signoff |
| EPUB validation | All **5 EPUBs** passed official EPUBCheck 5.4.0 with `--failonwarnings`: zero errors or warnings; [per-file results and hashes](verification/ai-first-epub-2026-11-01.json) |
| Archive restoration | Byte-identical repeated ZIP export; checked extraction; isolated, network-disabled reconstruction of all five public editions; draft exclusion and corruption/inventory rejection passed |
| Historical evidence | V1 rubric, previous preflight records and separate adversarial review retained unchanged |

Automated checks establish arithmetic, evidence consistency and tested software behavior. They do not establish literary truth, reader demand, complete accessibility certification or independent archive custody. The next operating work is to observe actual reading and corrections, revise affected passages and bind any new publication assessment to the revised hashes. Human feedback is welcome and optional throughout.
