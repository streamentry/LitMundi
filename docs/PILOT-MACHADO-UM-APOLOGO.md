# Pilot 002 — Machado de Assis, “Um Apólogo”

Status, 2026-11-01: **complete Portuguese source edition available; complete Vietnamese draft withheld from public reading and downloads**. There are no qualified human reviews and no affirmative contributor license grant.

## Why this small pilot

The fable tests an economical but difficult kind of writing: dialogue, a material pun, a narrator who interrupts his own ornament, and a final social insult. It adds direct Portuguese-to-Vietnamese work to an English pilot without requiring a novel-length editorial commitment.

The [Translation Gap Atlas](../research/translation-gap-atlas.json) is the discovery record. The recorded searches did not establish the absence of an existing Vietnamese or Indonesian translation. This is an editorial feasibility selection, **not a verified unmet-demand claim**. A related Machado story, *A Cartomante*, already has Vietnamese translation activity; obscurity cannot be inferred from the author's nationality. Reviewer capacity and reader demand remain unproven. Do not expand the production queue on the strength of this draft alone.

## Exact original witness and completeness

Machado de Assis, “Um Apologo”, *Várias histórias*, first edition (Rio de Janeiro: Laemmert & C. Editores, 1896), printed pp. 253–257. The [University of São Paulo's Biblioteca Brasiliana catalog](https://digital.bbm.usp.br/handle/bbm/5307) identifies the printing, author dates and story page range. The [facsimile PDF](https://digital.bbm.usp.br/bitstream/bbm/5307/4/45000018590_Output.o.pdf) contains the story on PDF pages 265–269. BYU's [Machado digital corpus](https://machado.byu.edu/text/um-apologo/?lang=pt) records first publication in *Gazeta de notícias* in 1885; its modernized transcription is a comparator, not this edition's source.

All five printed pages were visually compared with the new transcription by AI-assisted agents. The 22 canonical units follow the printed prose paragraphs and separately indented dialogue. In particular, the sunset/four-day sequence remains in the preceding paragraph, and the pin's and professor's speeches remain with their introducing paragraphs. No end-of-story text was omitted.

Historical forms such as *novello*, *panno*, *baroneza*, *E' boa!*, *Cahindo*, *Veiu* and *Canças-te* remain. Print line breaks and discretionary end-of-line hyphens are joined; running heads, ornaments and page numbers are excluded. The italic four-beat *plic-plic-plic-plic* is documented separately because canonical values are plain text. This is a technical source comparison, **not an independently certified critical edition or a human proofread**.

- [Original Portuguese JSON](../corpus/segments/machado-um-apologo/machado-apologo-pt-laemmert-1896.json)
- [Vietnamese draft: Một ngụ ngôn](../corpus/segments/machado-um-apologo/machado-apologo-vi-ai-draft-2026.json)
- [Stable structure](../corpus/structure/machado-um-apologo.json) and [one-to-one alignment](../corpus/alignments/machado-um-apologo/machado-apologo-vi-ai-draft-2026.json)
- [Source check with PDF hash, pages and coverage](../corpus/editorial/source-checks/machado-apologo-pt-laemmert-1896.json)

## Rights assessment

The source metadata records a term-based assessment for the US, Vietnam and Brazil, dated 2026-11-01. Machado died in 1908. Brazil's [Law 9.610/1998, article 41](https://www2.camara.leg.br/legin/fed/lei/1998/lei-9610-19-fevereiro-1998-365399-normaatualizada-pl.html) provides the ordinary life-plus-70 term. Vietnam's [Copyright Office explanation of article 27](https://cov.gov.vn/quyen-tac-gia-quyen-lien-quan/thoi-han-bao-ho-quyen-tac-gia-la-bao-nhieu-nam-168808.html) gives life plus 50 for ordinary literary works. Both economic terms have expired for this author.

For the US, the old publication dates exceed the applicable 95-year ceiling; [Copyright Office Circular 38B](https://www.copyright.gov/circs/circ38b.pdf) explains that restoration of an eligible foreign work supplies only the remaining term, not a fresh 95 years. This assessment does not rely on a blanket statement about works first published in the US. The [duration provisions](https://www.copyright.gov/title17/92chap3.html) and catalog evidence are retained in edition metadata.

The corpus contains the underlying literary text, not the scan images, institutional design, branding or modern editorial matter. Attribution and integrity obligations still matter. This is a documented assessment, not a worldwide guarantee. The Vietnamese translation has a separate, **uncleared** rights record: the public-domain original does not provide a human contributor's license permission.

## Translation decisions and adversarial revision

The [machine-readable editorial dossier](../corpus/editorial/machado-um-apologo/machado-apologo-vi-ai-draft-2026.json) contains a ten-entry glossary, alternatives, rejected proposals and exact source/target SHA-256 hashes.

The draft preserves the needle/pin distinction so the “head” joke still works; it keeps the repeated *pegou* sequence, the named Diana allusion and the narrator's deflation of his own poetic flourish. A separate AI read identified a dangling Vietnamese subject that could make the needle obey itself. Passage `1.12` now explicitly makes the thread follow and obey the needle. The rejected phrasing and the pre-revision target hash are retained.

Three questions remain for a qualified Portuguese–Vietnamese literary reviewer:

1. **Mucamas.** The current *hầu gái* is legible but does not carry all the Brazilian historical weight. [Michaelis](https://michaelis.uol.com.br/palavra/yVnWw/mucama/) identifies the obsolete enslaved Black domestic-worker sense; [Priberam](https://dicionario.priberam.org/mucama) includes servant or enslaved attendant. A reviewer should choose between a more historical rendering such as *nữ tỳ* and an explanatory note, without inventing biographical details about these unnamed women.
2. **Professor de melancolia.** *Ông giáo dạy môn u sầu* retains the comic title but may overcommit to a literal school subject. *Bậc thầy về nỗi u sầu* is a defensible alternative with a different joke.
3. **Sound and register.** Read the four *plic* beats and the shift to the pin's patronizing *mày/tao* aloud. Do not award fluency by erasing the object's voice or the narrator's irony.

## Quality status and review packet

| Rubric dimension | AI advisory score |
|---|---:|
| Semantic fidelity and completeness | 8.5 |
| Voice, rhythm and register | 8.5 |
| Target-language naturalness | 8.5 |
| Imagery, terminology and consistency | 8.5 |
| Grammar and editorial mechanics | 9.0 |
| **Weighted advisory score** | **8.55** |

The [hash-bound preflight](../corpus/reviews/machado-um-apologo/machado-apologo-vi-ai-draft-2026/ai-preflight-2026-11-01.json) covers all 22 passages. It is a subjective AI editorial assessment, not independent human certification. Additional AI agreement does not increase approval authority. No currently identified major error remains open; that statement is limited to the AI preflight, not a claim of error-free translation.

Human reviewers should first read the complete original and translation **without reading the model score**. Then address the glossary questions, annotate passage IDs and submit independent evidence under [QUALITY.md](QUALITY.md). Publication requires two qualified, independent human reviews, each at least 9.0 overall and 9.0 in fidelity, all other dimensions at least 8.0, exact final hashes, named editorial contribution, written open-license permission and maintainer verification. Until then this remains a complete review draft.
