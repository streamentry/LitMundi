# Pilot 001 — Oscar Wilde, “The Artist”

Status, 2026-11-01: **source text published; revised Vietnamese translation is an AI-assisted DRAFT, withheld from the reading website and downloads**. Zero qualifying human reviews and no cleared contributor license.

## Why this work
- Complete, short prose poem (five paragraphs).
- First published in `The Fortnightly Review` in July 1894 as part of *Poems in Prose*.
- Original English source available from a specifically identified public-domain print edition.
- Rich translation problems: biblical register (“abideth”, “dieth”), deliberately capitalised allegorical figures, meaning of “the one thing he had loved”, and the repeated formula “bronze”.
- **Not** claimed to lack an existing Vietnamese/French translation. The translation-gap hypothesis remains **unverified**.

## Exact source witness
Oscar Wilde, “The Artist”, *Poems in Prose*, in *Essays and Lectures*, 4th ed., Methuen & Co. Ltd (London, 1913), section beginning at page 227; transcribed by David Price for Project Gutenberg eBook #774.

- [Project Gutenberg catalog #774](https://www.gutenberg.org/ebooks/774)
- [1913 Methuen transcription, page 227 section](https://www.gutenberg.org/cache/epub/774/pg774-images.html)
- [Wilde original manuscript at Morgan Library](https://www.themorgan.org/collection/oscar-wilde/manuscripts-letters/13) — evidence of authorial variants, **not** the source for this edition.
- Other reproductions vary in punctuation and capitalization. We follow the Methuen/Project Gutenberg witness, **not** a composite critical edition.

## Rights assessment — 2026-10-31
Wilde died in 1900 and the work appeared in 1894; the selected printing is from 1913. The original English text is assessed as public domain in the US (publication before 1931), the EU (generally author lifetime plus 70 years) and Vietnam (for ordinary literary works, author lifetime plus **50 years** under Article 27). Vietnam does **not** use life-plus-70 as its general literary term.  Vietnam copyright term reference: [Copyright Office of Vietnam, 23 April 2026](https://cov.gov.vn/quyen-tac-gia-quyen-lien-quan/thoi-han-bao-ho-quyen-tac-gia-la-bao-nhieu-nam-168808.html). This is a documented assessment, not legal advice; translators, editors, artwork and modern annotations may have independent rights. Do not reproduce Project Gutenberg's branding or editorial boilerplate as though it were itself public domain.

## Release decisions
- English **original source edition**: published; all five paragraphs were rechecked on 2026-11-01 against the exact cited Gutenberg digitization, with an exact match after HTML and whitespace normalization. This was AI-assisted technical checking, not a claim of independent human proofread or a peer-reviewed critical edition.
- Vietnamese AI-assisted draft: revised for source fidelity (notably correcting “One evening” from afternoon to evening), stored in Git **for review only**, **not published or indexed on the reader**. Its revised model preflight remains **8.6/10** using [LitMundi rubric v1](QUALITY.md), with open stylistic issues and **zero qualifying independent human reviews**.
- Another Vietnamese edition: planned with its own independent edition ID, proving no “one translation per language” assumption.
- No automatic translation license is inferred. Before publishing require recorded editor attribution, affirmative license grant and two independent qualified bilingual reviewers.

## Bilingual reviewer checklist
1. No omissions or additional propositions across all five segments.
2. Does “bronze” require “đồng” or “đồng đúc” consistently?
3. Preserve the contrast between transient pleasure and enduring grief.
4. Keep the deliberate archaism of “abideth”, “dieth” without awkward Vietnamese theatricality.
5. “the one thing” must not become “the woman”: the source avoids naming the beloved.
6. Test against alternative historical textual variants; describe why Methuen is chosen.
7. Verify the gap hypothesis with catalogs, publishers and local bibliographic sources.
8. Record translator consent and an open license before changing status to published.

## Gate for next release
No bilingual translation is published until the provenance and rights fields are complete and at least two distinct reviewers are recorded with evidence. The CI enforces the hard gates but human expertise remains a human decision.

## Preliminary quality assessment
The historical, originally unbound review record in `corpus/reviews/wilde-the-artist/wilde-artist-vi-ai-draft-2026/ai-preflight-2026-10-31.json` scores meaning 9.0, authorial voice 8.0, Vietnamese naturalness 8.5, allegory consistency 8.5 and mechanics 9.0, for a **weighted AI preflight of 8.6/10**. This is a subjective AI-assisted editorial judgement, **not an expert assessment or ground truth**. It does not meet the 9.0 threshold and does not count toward the required two human reviewers. Reviewers should challenge all these marks rather than anchoring to them.


## Revision and preflight — 2026-11-01

The complete revised draft remains five passages, aligned to the unchanged English source. The [current editorial record](../corpus/editorial/wilde-the-artist/wilde-artist-vi-ai-draft-2026.json) contains the glossary, alternatives, rejected proposals and exact text hashes. The [current preflight](../corpus/reviews/wilde-the-artist/wilde-artist-vi-ai-draft-2026/ai-preflight-2026-11-01.json) is bound to those hashes; the older 8.6 record remains historical and confers no approval.

This revision preserves the repeated material *bronze*, the repeated *whole world*, and the self-fashioned image rather than varying them for elegance. It restores the paragraph-three “And,” uses *pho tượng* consistently, removes explanatory dash clauses inserted around the two parallel descriptions of human love and sorrow, and retains the ritual personification of fire as *trao nó cho lửa*.

An initially proposed allegorical name, *Lạc Thú Chỉ Còn Trong Chốc Lát*, was rejected after adversarial AI reading: *chỉ còn* can imply time remaining or a residue, whereas the last sentence makes new pleasure. The current *Lạc Thú Chỉ Lưu Lại Một Khoảnh Khắc* retains the elevated lasting/dwelling sense but still needs a human judgment of cadence against the earlier *Chỉ Tồn Tại Một Khoảnh Khắc*. The score remains 8.6; correcting a known weakness is not evidence of literary certification.

The unnamed *one thing / dead thing* remains *điều duy nhất / điều đã chết*. This is deliberately unresolved: the Vietnamese collocation is strained, but replacing it with a woman, wife, person or lost ideal would invent a referent. *Thứ đã chết* is a recorded alternative. Reviewers must address the tension between ambiguity and naturalness directly.

The [source-check record](../corpus/editorial/source-checks/wilde-artist-en-methuen-1913.json) preserves the source SHA-256, exact witness URL, retrieved HTML hash and full coverage. No previously unrecorded human qualification is inferred from the old phrase “manually checked.” The source comparison and multiple AI critiques are disclosed as AI assistance.

### Complete review packet

- [English source JSON](../corpus/segments/wilde-the-artist/wilde-artist-en-methuen-1913.json)
- [Revised Vietnamese draft](../corpus/segments/wilde-the-artist/wilde-artist-vi-ai-draft-2026.json)
- [Explicit passage alignment](../corpus/alignments/wilde-the-artist/wilde-artist-vi-ai-draft-2026.json)
- [Source-check evidence](../corpus/editorial/source-checks/wilde-artist-en-methuen-1913.json)
- [Decisions and glossary](../corpus/editorial/wilde-the-artist/wilde-artist-vi-ai-draft-2026.json)
- [Current AI preflight, to read only after independent assessment](../corpus/reviews/wilde-the-artist/wilde-artist-vi-ai-draft-2026/ai-preflight-2026-11-01.json)

The [Translation Gap Atlas](../research/translation-gap-atlas.json) records an existing Vietnamese rendering of this work, so continuing this pilot cannot be justified by claiming that no Vietnamese translation exists. The value proposition still to test is an openly inspectable, aligned, independently reviewed and lawfully reusable edition. Nothing in this dossier demonstrates reader demand or available review capacity.
