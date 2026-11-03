# LitMundi

**Great literature. Every language.** An open literary library built around complete texts, traceable sources and accountable AI translation.

LitMundi uses **AI-first publication**: one full source/target AI assessment must reach an **unrounded weighted score of at least 8.6/10**, with exact content hashes, complete passage coverage, cleared source rights, lawful reuse and no unresolved major or critical issue. Human review and reader feedback are optional after release. The score is an evaluative AI judgment, not human certification. See [Quality](docs/QUALITY.md) and [ADR-0009](docs/adr/0009-ai-first-publication.md).

Current edition states and qualifying evidence are recorded in [the catalog](corpus/catalog/editions.json); `npm run quality:status` reports eligibility. Dated pilot and release records retain the policy and scores that applied when they were written.

## Published Vietnamese editions

| Work and editorial dossier | Original witness | Canonical passages | Vietnamese AI assessment | Publication |
| --- | --- | ---: | ---: | --- |
| [Oscar Wilde — The Artist](docs/PILOT-WILDE-THE-ARTIST.md) | English; Methuen 1913, Gutenberg #774 | 5 | 8.60 | AI-reviewed translation published |
| [Machado de Assis — Um Apólogo](docs/PILOT-MACHADO-UM-APOLOGO.md) | Portuguese; Laemmert 1896, pp. 253–257 | 22 | 8.725 (displayed 8.73) | AI-reviewed translation published |
| [Emilia Pardo Bazán — El encaje roto](docs/BATCH-001-VIETNAMESE-500.md) | Spanish; Administración [1898?], pp. 233–239 | 15 | 8.625 (displayed 8.63) | Revised AI-reviewed translation published |
| [Kate Chopin — The Story of an Hour](docs/BATCH-001-VIETNAMESE-500.md) | English; Society electronic text with the 1895 readings | 23 | 8.80 | AI-reviewed translation published |
| [Saki — The Open Window](docs/BATCH-001-VIETNAMESE-500.md) | English; John Lane 1914, Gutenberg #269 | 29 | 8.875 (displayed 8.88) | AI-reviewed translation published |
| [Guy de Maupassant — La Parure](corpus/editorial/maupassant-la-parure/maupassant-parure-vi-ai-2026.json) | French; Marpon & Flammarion [1885], Gutenberg #14790 | 128 | 8.80 | AI-reviewed translation published |
| [Ryunosuke Akutagawa — 蜘蛛の糸](corpus/editorial/akutagawa-spiders-thread/akutagawa-kumo-vi-ai-2026.json) | Japanese; Chikuma Bunko 1986 via Aozora Bunko #92 | 15 | 8.80 | AI-reviewed translation published |
| [Lu Xun — 孔乙己](corpus/editorial/luxun-kong-yiji/luxun-kong-yiji-vi-ai-2026.json) | Chinese; 魯迅全集 1938 (1948 printing) via validated Wikisource pages | 14 | 8.975 (displayed 8.98) | AI-reviewed translation published |
| [Machado de Assis — A Cartomante](corpus/editorial/machado-a-cartomante/machado-cartomante-vi-ai-2026.json) | Portuguese; Laemmert 1896, pp. 9–29 (Commons scan) | 58 | 8.975 (displayed 8.98) | AI-reviewed translation published |
| [Rabindranath Tagore — পোস্ট্‌মাস্টার](corpus/editorial/tagore-postmaster/tagore-postmaster-vi-ai-2026.json) | Bengali; গল্পগুচ্ছ vol. 1 (Visva-Bharati) via validated Wikisource pages | 33 | 8.85 | AI-reviewed translation published |
| [Horacio Quiroga — El almohadón de pluma](corpus/editorial/quiroga-feather-pillow/quiroga-almohadon-vi-ai-2026.json) | Spanish; Cuentos de amor de locura y de muerte 1917, Gutenberg #13507 | 30 | 8.975 (displayed 8.98) | AI-reviewed translation published |
| [Anton Chekhov — Дама с собачкой](corpus/editorial/chekhov-lady-with-dog/chekhov-dama-vi-ai-2026.json) | Russian; academic ПСС vol. 10 via Russian Wikisource | 128 | 8.975 (displayed 8.98) | AI-reviewed translation published |
| [Hans Christian Andersen — Den lille Pige med Svovlstikkerne](corpus/editorial/andersen-little-match-girl/andersen-pige-vi-ai-2026.json) | Danish; Eventyr II, Det Nordiske Forlag 1900 (Internet Archive scan) | 9 | 8.925 (displayed 8.93) | AI-reviewed translation published |
| [José Martí — Bebé y el señor don Pomposo](corpus/editorial/marti-bebe-pomposo/marti-bebe-vi-ai-2026.json) | Spanish; La Edad de Oro 1889, Gutenberg #19898 | 7 | 8.925 (displayed 8.93) | AI-reviewed translation published |
| [Rokeya Sakhawat Hossain — Sultana's Dream](corpus/editorial/rokeya-sultanas-dream/rokeya-sultana-vi-ai-2026.json) | English; Indian Ladies' Magazine 1905 via Penn electronic text | 137 | 8.925 (displayed 8.93) | AI-reviewed translation published |
| [Leo Tolstoy — Много ли человеку земли нужно](corpus/editorial/tolstoy-how-much-land/tolstoy-zemli-vi-ai-2026.json) | Russian; Собрание сочинений в 22 т., vol. 10 via Russian Wikisource | 92 | 8.925 (displayed 8.93) | AI-reviewed translation published |
| [Ichiyo Higuchi — 十三夜](corpus/editorial/higuchi-thirteenth-night/higuchi-jusanya-vi-ai-2026.json) | Japanese; 文藝倶樂部 閨秀小説號 1895 via Aozora Bunko #55670 | 14 | 8.925 (displayed 8.93) | AI-reviewed translation published |
| [Rabindranath Tagore — কাবুলিওয়ালা](corpus/editorial/tagore-kabuliwala/tagore-kabuliwala-vi-ai-2026.json) | Bengali; গল্পগুচ্ছ vol. 1 (Visva-Bharati) via validated Wikisource pages | 68 | 8.875 (displayed 8.88) | AI-reviewed translation published |
| [Edgar Allan Poe — The Tell-Tale Heart](corpus/editorial/poe-the-tell-tale-heart/poe-tell-tale-vi-ai-2026.json) | English; Raven Edition vol. 2, Gutenberg #2148 | 18 | 8.925 (displayed 8.93) | AI-reviewed translation published |
| [Charlotte Perkins Gilman — The Yellow Wallpaper](corpus/editorial/gilman-the-yellow-wallpaper/gilman-wallpaper-vi-ai-2026.json) | English; Gutenberg #1952 (edition not identified) | 267 | 8.925 (displayed 8.93) | AI-reviewed translation published |
| [Ryunosuke Akutagawa — 羅生門](corpus/editorial/akutagawa-rashomon/akutagawa-rashomon-vi-ai-2026.json) | Japanese; Chikuma Bunko 1986 via Aozora Bunko #127 | 37 | 9.00 | AI-reviewed translation published |
| [Natsume Soseki — 夢十夜](corpus/editorial/soseki-ten-nights/soseki-yume-vi-ai-2026.json) | Japanese; Chikuma Bunko 1988 via Aozora Bunko #799 | 177 | 8.925 (displayed 8.93) | AI-reviewed translation published |
| [Franz Kafka — Die Verwandlung](corpus/editorial/kafka-die-verwandlung/kafka-verwandlung-vi-ai-2026.json) | German; Kurt Wolff 1917, Gutenberg #22367 | 97 | 8.925 (displayed 8.93) | AI-reviewed translation published |
| [Ryunosuke Akutagawa — 藪の中](corpus/editorial/akutagawa-in-a-grove/akutagawa-yabu-vi-ai-2026.json) | Japanese; Chikuma Bunko 1987 via Aozora Bunko #179 | 46 | 8.925 (displayed 8.93) | AI-reviewed translation published |
| [Gustave Flaubert — Un cœur simple](corpus/editorial/flaubert-un-cur-simple/flaubert-coeur-vi-ai-2026.json) | French; Trois contes, Charpentier 1877 via Project Gutenberg #12065 | 243 | 8.8 | AI-reviewed translation published |
| [Nikolai Gogol — Шинель](corpus/editorial/gogol-the-overcoat/gogol-shinel-vi-ai-2026.json) | Russian; Полное собрание сочинений, т. 3 (1938) via Russian Wikisource | 35 | 8.8 | AI-reviewed translation published |
| [Ryunosuke Akutagawa — 地獄變](corpus/editorial/akutagawa-hell-screen/akutagawa-jigoku-vi-ai-2026.json) | Japanese; 傀儡師 1919 facsimile via Aozora Bunko #61 | 143 | 8.925 (displayed 8.93) | AI-reviewed translation published |
| [Charles Dickens — A Christmas Carol](corpus/editorial/dickens-a-christmas-carol/dickens-carol-vi-ai-2026.json) | English; Chapman & Hall 1843 text via Project Gutenberg #46 | 717 | 8.925 (displayed 8.93) | AI-reviewed translation published |
| [Robert Louis Stevenson — Strange Case of Dr Jekyll and Mr Hyde](corpus/editorial/stevenson-strange-case-of-dr-jekyll-and-mr-hyde/stevenson-jekyll-vi-ai-2026.json) | English; Longmans 1886 text via Project Gutenberg #42 | 348 | 8.85 | AI-reviewed translation published |
| [Herman Melville — Bartleby, the Scrivener](corpus/editorial/melville-bartleby-the-scrivener/melville-bartleby-vi-ai-2026.json) | English; Putnam’s Monthly 1853 text via Project Gutenberg #11231 | 251 | 8.8 | AI-reviewed translation published |
| [Edgar Allan Poe — The Fall of the House of Usher](corpus/editorial/poe-the-fall-of-the-house-of-usher/poe-usher-vi-ai-2026.json) | English; Raven Edition vol. 2 (1903) via Project Gutenberg #2148 | 51 | 8.925 (displayed 8.93) | AI-reviewed translation published |
| [Leo Tolstoy — Смерть Ивана Ильича](corpus/editorial/tolstoy-the-death-of-ivan-ilyich/tolstoy-ilyich-vi-ai-2026.json) | Russian; Собрание сочинений в 12 т., т. 11 (1984) via Russian Wikisource | 367 | 8.925 (displayed 8.93) | AI-reviewed translation published |
| [Lu Xun — 狂人日記](corpus/editorial/luxun-diary-madman/luxun-kuangren-vi-ai-2026.json) | Chinese; 魯迅全集 vol. 1 (1938, 1948 printing) via Chinese Wikisource | 78 | 8.925 (displayed 8.93) | AI-reviewed translation published |
| [Higuchi Ichiyō — たけくらべ](corpus/editorial/higuchi-growing-up/higuchi-takekurabe-vi-ai-2026.json) | Japanese; 文藝倶樂部 1896 via Aozora Bunko #55671 | 45 | 8.925 (displayed 8.93) | AI-reviewed translation published |
| [Higuchi Ichiyō — にごりえ](corpus/editorial/higuchi-troubled-waters/higuchi-nigorie-vi-ai-2026.json) | Japanese; 文藝倶樂部 第九篇 1895 via Aozora Bunko #55672 | 23 | 8.925 (displayed 8.93) | AI-reviewed translation published |
| [Lu Xun — 阿Q正傳](corpus/editorial/luxun-ah-q/luxun-ahq-vi-ai-2026.json) | Chinese; 魯迅全集 vol. 1 (1938, 1948 printing) via Chinese Wikisource | 318 | 8.925 (displayed 8.93) | AI-reviewed translation published |
| [Matsuo Bashō — おくのほそ道](corpus/editorial/basho-narrow-road/basho-hosomichi-vi-ai-2026.json) | Japanese; 新釈奥の細道 (1911) base text via Japanese Wikisource | 167 | 8.925 (displayed 8.93) | AI-reviewed translation published |
| [Mary Shelley — Frankenstein](corpus/editorial/shelley-frankenstein/shelley-frankenstein-vi-ai-2026.json) | English; first edition, Lackington 1818 via Project Gutenberg #41445 | 774 | 8.925 (displayed 8.93) | AI-reviewed translation published |
| [Jane Austen — Pride and Prejudice](corpus/editorial/austen-pride-and-prejudice/austen-pride-vi-ai-2026.json) | English; first edition, T. Egerton 1813 via Project Gutenberg #42671 | 2050 | 8.925 (displayed 8.93) | AI-reviewed translation published |
| [Kamo no Chōmei — 方丈記](corpus/editorial/chomei-hojoki/chomei-hojoki-vi-ai-2026.json) | Japanese; 國文大觀 日記草子部 (1909) via Aozora Bunko #975 | 17 | 8.925 (displayed 8.93) | AI-reviewed translation published |
| [Miyazawa Kenji — 注文の多い料理店](corpus/editorial/miyazawa-restaurant-orders/miyazawa-chumon-vi-ai-2026.json) | Japanese; 宮沢賢治全集8 (ちくま文庫) via Aozora Bunko #1927 | 153 | 8.925 (displayed 8.93) | AI-reviewed translation published |
| [Emily Brontë — Wuthering Heights](corpus/editorial/bronte-wuthering-heights/bronte-wuthering-vi-ai-2026.json) | English; Newby 1847 text via Project Gutenberg #768 | 1942 | 8.925 (displayed 8.93) | AI-reviewed translation published |
| [Joseph Conrad — Heart of Darkness](corpus/editorial/conrad-heart-of-darkness/conrad-heart-vi-ai-2026.json) | English; Blackwood text via Project Gutenberg #219 | 198 | 8.925 (displayed 8.93) | AI-reviewed translation published |
| [H. G. Wells — The Time Machine](corpus/editorial/wells-the-time-machine/wells-timemachine-vi-ai-2026.json) | English; Project Gutenberg #35 | 323 | 8.925 (displayed 8.93) | AI-reviewed translation published |

All forty-four originals are published, giving eighty-eight public editions in total. These AI assessments disclose that the same AI system revised and evaluated the translations; they do not claim independent human review or reader validation. [The first 500-program batch](docs/BATCH-001-VIETNAMESE-500.md) records the three newly qualifying Vietnamese editions and their complete 67 source/target paragraph pairs. Pardo Bazán's earlier failing 8.55 assessment remains in the review history.

The [AI-first release report](docs/RELEASE-AI-FIRST-2026-11-01.md) records the policy change, actual assessments and technical verification.

Source checks disclose AI-assisted passage comparison and exact witnesses; they are not human-certified critical editions. Original and Vietnamese edition states remain distinct. Draft, planned and withdrawn editions are excluded from public reading, search and publication downloads. The earlier Proust sample remains a non-indexed legacy demonstration.

The [Translation Gap Atlas](docs/TRANSLATION-GAP-ATLAS.md) surveys **20 works across Vietnamese and Indonesian: 40 assessments, 12 original languages and 81 evidence records**. It records existing translations, bounded searches and uncertainty. It establishes no verified absence or independently assessed inadequacy, and no measured reader demand. Indonesian is a research comparator, not a production commitment.

## 500-work Vietnamese translation program

The [500-work TODO](TODO.md) is the ordered production queue, with source leads, selection rationales, rights holds and publication status in [structured data](research/vietnamese-translation-backlog.json). It covers 500 new or unfinished translation tasks; the previously published Wilde and Machado editions are outside this count. A checked task must correspond to a complete published Vietnamese edition. Literary priority, source clearance and the AI quality score remain separate judgments.

See [selection and execution](docs/VIETNAMESE-500.md). Run `npm run todo:next -- 10` to resume unfinished feasible work, `npm run todo:render` after changing the queue, and `npm run todo:check` to validate the checklist. The existing publication threshold remains an unrounded AI score of at least **8.6/10**, with human feedback optional after release.

## Read and contribute

The [GitHub Pages library](https://streamentry.github.io/LitMundi/) has English, Vietnamese, French and Spanish interfaces. Interface languages do not promise translated editions. Readers can browse by author or text language, search published text, follow stable passage links, submit corrections through GitHub and download JSON, TXT or EPUB. TSV is also generated as a portable export.

The reader opens translated editions with only the translation visible. The **Show original** checkbox enables the documented source/translation comparison and works without JavaScript. Each new visit starts with the translation; the view mode creates no saved preference. Keyboard navigation, mobile layouts, edition selection and optional reading-position storage remain available. Reading and browsing require no account. Submitting an issue uses GitHub's own sign-in.

**Start reading** jumps directly from the title to the first literary passage,
including without JavaScript. EPUB and TXT downloads are available beside it.
Citation details provide a copy action when JavaScript is available and retain
selectable text as a fallback. Switching interface language preserves a passage
selected during the current visit.

Previous and next work links prefer the text language currently being read and
display each destination's actual language. The source bibliography identifies
the original witness; translation-creation records are shown separately.

Title and author searches offer matching editions, with the interface's text
language first when available. Passage searches link to the matching text.
Language and author filters refine the current query without clearing it.

Report specific errors or reading experiences after publication. Material corrections receive a fresh evaluation before republication; serious current issues block the affected edition until resolved.

## Develop and verify

Requires Node.js 22+ and Python 3 for archive verification. Dependencies are locked in `package-lock.json`.

```sh
npm ci
npm run validate
npm run quality:status
npm test
npm run check
npm run build
npm run verify:build
npm run export
npm run verify:archive
```

Use `npm run dev` for the local reader at `http://localhost:4321/LitMundi/`. On restricted workstations, `ASTRO_TELEMETRY_DISABLED=1` avoids writing optional Astro telemetry settings. Before a PR, run `npm run verify:ids -- <base-commit>` to check that established identities and legacy URLs remain intact.

## Durable architecture

[UTF-8 JSON corpus v2](corpus/README.md) is the system of record. Astro is a replaceable static view; there is no database, site-owned account system or OAuth secret. Work, edition and passage identifiers remain stable while corrections remain in Git history.

`npm run build` creates publication downloads only for eligible published editions. `npm run export` creates a separate **editorial archive** with canonical data, labelled drafts and review packets, rights, provenance, schemas, documentation, deterministic ZIP packaging and SHA-256 fixity records. The archive grants no blanket content license. A standalone Python 3 restorer rebuilds published HTML/TXT without Astro, npm, GitHub, network access or the original domain. See [Preservation](docs/PRESERVATION.md).

JSON, TXT, TSV and EPUB downloads carry their canonical reader URL and the exact
original source citation, witness link and source edition identity. EPUB language
annotations distinguish the literary text from English navigation and provenance.
The configured site origin/base in `src/lib/site.json` supplies both Astro and
portable publication URLs.

## Deployment and ongoing work

Pull requests are validated and built. A successful push to `main` deploys through the pinned [GitHub Actions workflow](.github/workflows/ci.yml) to `https://streamentry.github.io/LitMundi/`. Follow [Deployment](docs/DEPLOYMENT.md) to verify the actual production run and routes; a local build is not proof of deployment. No custom domain is configured.

The [sitemap index](https://streamentry.github.io/LitMundi/sitemap-index.xml) references separate English, Vietnamese, French and Spanish XML sitemaps. Only canonical public pages are listed: each literary edition has one canonical reader, with actual translation languages distinguished from interface languages. The previous `sitemap.xml` address remains a compatibility index. [Search discovery](docs/SEO.md) explains canonical URLs, accurate modification dates, verification and Google/Bing submission. On this GitHub Pages project URL, crawler policy belongs at `https://streamentry.github.io/robots.txt`; a project-level robots file cannot configure that host-root policy.

[IndexNow release notifications](docs/INDEXNOW.md) can notify participating
engines of verified changes between two live snapshots. Snapshot and plan
commands are read-only; submission is an explicit post-deployment action with
a retained plan/report. A receipt is not proof of indexing. The normal build
and deployment workflow do not send notifications automatically.

Ongoing work includes releasing eligible AI-assessed editions, responding to optional human feedback, improving the texts and obtaining independent archive custody. Reader reports and actual custodians must be recorded when they exist. GitHub's 30-day workflow artifact retention is not an independent mirror.

[Editorial workflow](docs/EDITORIAL-WORKFLOW.md) · [Contributing](CONTRIBUTING.md) · [Architecture](docs/ARCHITECTURE.md) · [Roadmap](docs/ROADMAP.md) · [Governance](GOVERNANCE.md) · [Rights](docs/RIGHTS.md) · [AI content policy](docs/AI-CONTENT-POLICY.md) · [ADRs](docs/adr/README.md)

## Licensing and credit

The [MIT license](LICENSE) covers software and documentation. Corpus texts retain **per-edition rights**. AI-only translations default to CC BY 4.0 (`CC-BY-4.0`) only to the extent the publisher controls applicable rights, under [AI content policy](docs/AI-CONTENT-POLICY.md). This does not create copyright, imply human authorship or restrict public-domain material. Third-party source rights remain separate.

Edition records retain the selected witness, source provenance, AI involvement and any actual contributor credit. Consult the selected edition's terms before reuse. Do not invent a human translator, reviewer or permission to describe AI-only work.

The passage-aligned JSON model draws inspiration from [SuttaCentral/Bilara](https://github.com/suttacentral/bilara-data). LitMundi is independent of SuttaCentral.
