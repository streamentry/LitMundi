# Vietnamese 500 — first completed translation batch

Assessment date: **1 November 2026**. These are complete Vietnamese texts, not samples. The edition catalog selects their final title-aware, hash-bound AI reviews under the unchanged `litmundi-literary-v2` policy. Deployment must still be established by the release workflow and live checks.

| Work | Vietnamese title | Complete paragraphs | Unrounded weighted AI score | Catalog state |
| --- | --- | ---: | ---: | --- |
| Emilia Pardo Bazán — *El encaje roto* | **Dải ren rách** | 15 | **8.625** | Published; displayed 8.63 |
| Kate Chopin — *The Story of an Hour* | **Chuyện trong một giờ** | 23 | **8.8** | Published |
| Saki — *The Open Window* | **Cửa sổ để ngỏ** | 29 | **8.875** | Published; displayed 8.88 |

The batch covers **67 source/target paragraph pairs**. Every pair and both titles were read in full. The same AI system drafted, revised and assessed these texts; a separate task using that system supplied a full comparison and concrete corrections. This is correlated AI feedback, not independent human review or model diversity. Scores are subjective judgments, not calibrated quality measurements. Human feedback remains optional after release.

## Sources and textual choices

**Pardo Bazán:** the established Administración **[1898?]** Spanish witness and its 15 immutable passage IDs are unchanged. Seven Vietnamese paragraphs were revised for the long imagined wedding scene, dialogue, the historical lace measure and the tearing image. The conversational *un decir Jesús* becomes *trong chớp mắt*; *tercia* becomes *một phần ba thước Tây Ban Nha*, without a fabricated precise conversion. The exact old jewelry term remains a disclosed minor uncertainty. Naturalness rises from 8.5 to 9; the other category judgments remain 8.5/8.5/8.5/9. The earlier **8.55** reviews retain their original bytes and hashes; the new score does not result from rounding the old one.

**Chopin:** the selected [Kate Chopin International Society text](https://www.katechopin.org/story-hour/) includes the **1895** readings. Its [version notes](https://www.katechopin.org/the-story-of-an-hour/) distinguish these from the 1894 *Vogue* printing and discuss the uncertain authorship of the historical handwritten corrections. The Vietnamese preserves the additional *her* as **sống thay nàng**, the separate Richards sentence and the doctors’ ironic closing explanation. The Society’s complete electronic text was retrieved through web extraction; direct HTTP returned an anti-bot page, and the alternative UVA page returned 403. Those failed responses were not used as literary text. The complete extracted story is retained as an editorial witness with its own hash. No new facsimile collation is claimed.

**Saki:** [Project Gutenberg #269](https://www.gutenberg.org/ebooks/269) identifies David Price’s transcription of the **1914 John Lane** edition. Only the complete 29-paragraph *The Open Window* section was imported. The earlier newspaper publication is bibliographic context, not a second source mixed into this text. Final revisions preserve twilight rather than complete darkness, remove an invented posture in the grave, and smooth a Vietnamese calque. The floor-length glazed opening, hunters’ clothing, spaniel and repeated song remain consistent across the invented story and the return.

The new originals have source-check records and preserved paragraph extracts in `corpus/editorial/source-checks/` and `corpus/editorial/source-witnesses/`. Source rights and the translations’ conditional CC BY 4.0 terms are recorded separately in each edition. Modern website notes, designs and scans are not incorporated into the literary texts. The [AI content policy](AI-CONTENT-POLICY.md) remains in force.

## Assessment and limits

| Edition | Fidelity 35% | Voice 25% | Naturalness 15% | Imagery 15% | Mechanics 10% |
| --- | ---: | ---: | ---: | ---: | ---: |
| Pardo Bazán | 8.5 | 8.5 | 9 | 8.5 | 9 |
| Chopin | 9 | 8.5 | 8.5 | 9 | 9 |
| Saki | 9 | 8.5 | 9 | 9 | 9 |

No unresolved major or critical finding remains. Minor tradeoffs are retained explicitly: historical jewelry and cadence in Pardo Bazán, psychological abstraction and Vietnamese kinship register in Chopin, and kinship/period understatement in Saki. English *sister* and *aunt* do not establish all the age and genealogy distinctions required by ordinary Vietnamese address; the chosen forms do not constitute additional biographical evidence.

The selected review filename for each edition is `ai-review-v2-batch-001-2026-11-01.json`, under its own `corpus/reviews/<work>/<edition>/` directory. Each record binds the exact source and target JSON hashes, lists every reviewed passage, records the two literal title strings and gives findings and reasons. Editorial dossiers retain glossary choices, passage-level coverage notes and revision history.

The scoped corpus validator and quality report pass with **6 works including the retained demonstration, 14 edition records and 10 public editions**. Full build, archive, deployment and browser checks belong to the integrating release; this document does not substitute for those results.

Existing Vietnamese translations and actual reader demand have not been comprehensively audited. The Atlas already documents a Vietnamese Chopin translation. These new editions offer complete direct translation, explicit sources, alignment and reusable text; they are not claimed to be the first Vietnamese versions or better than every existing translation.
