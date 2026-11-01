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

All five originals are published, giving ten public editions in total. These AI assessments disclose that the same AI system revised and evaluated the translations; they do not claim independent human review or reader validation. [The first 500-program batch](docs/BATCH-001-VIETNAMESE-500.md) records the three newly qualifying Vietnamese editions and their complete 67 source/target paragraph pairs. Pardo Bazán's earlier failing 8.55 assessment remains in the review history.

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
