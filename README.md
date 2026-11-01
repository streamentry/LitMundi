# LitMundi

**Great literature. Every language.** An open literary library built around complete texts, traceable sources and accountable AI translation.

LitMundi uses **AI-first publication**: one full source/target AI assessment must reach an **unrounded weighted score of at least 8.6/10**, with exact content hashes, complete passage coverage, cleared source rights, lawful reuse and no unresolved major or critical issue. Human review and reader feedback are optional after release. The score is an evaluative AI judgment, not human certification. See [Quality](docs/QUALITY.md) and [ADR-0009](docs/adr/0009-ai-first-publication.md).

Current edition states and qualifying evidence are recorded in [the catalog](corpus/catalog/editions.json); `npm run quality:status` reports eligibility. Dated pilot and release records retain the policy and scores that applied when they were written.

## The first three works

| Work and editorial dossier | Original witness | Canonical passages | Vietnamese AI assessment | Publication |
| --- | --- | ---: | ---: | --- |
| [Oscar Wilde — The Artist](docs/PILOT-WILDE-THE-ARTIST.md) | English; Methuen 1913, Gutenberg #774 | 5 | 8.60 | AI-reviewed translation published |
| [Machado de Assis — Um Apólogo](docs/PILOT-MACHADO-UM-APOLOGO.md) | Portuguese; Laemmert 1896, pp. 253–257 | 22 | 8.725 (displayed 8.73) | AI-reviewed translation published |
| [Emilia Pardo Bazán — El encaje roto](docs/PILOT-PARDO-BAZAN-EL-ENCAJE-ROTO.md) | Spanish; Administración [1898?], pp. 233–239 | 15 | 8.55 | Translation remains a draft |

All three originals are published, giving five public editions in total. These AI assessments disclose that the same AI system revised and evaluated the translations; they do not claim independent human review or reader validation.

The [AI-first release report](docs/RELEASE-AI-FIRST-2026-11-01.md) records the policy change, actual assessments and technical verification.

Source checks disclose AI-assisted passage comparison and exact witnesses; they are not human-certified critical editions. Original and Vietnamese edition states remain distinct. Draft, planned and withdrawn editions are excluded from public reading, search and publication downloads. The earlier Proust sample remains a non-indexed legacy demonstration.

The [Translation Gap Atlas](docs/TRANSLATION-GAP-ATLAS.md) surveys **20 works across Vietnamese and Indonesian: 40 assessments, 12 original languages and 81 evidence records**. It records existing translations, bounded searches and uncertainty. It establishes no verified absence or independently assessed inadequacy, and no measured reader demand. Indonesian is a research comparator, not a production commitment.

## Read and contribute

The [GitHub Pages library](https://streamentry.github.io/LitMundi/) has English, Vietnamese, French and Spanish interfaces. Interface languages do not promise translated editions. Readers can browse by author or text language, search published text, follow stable passage links, submit corrections through GitHub and download JSON, TXT or EPUB. TSV is also generated as a portable export.

The reader supports keyboard navigation, mobile layouts, edition selection and optional reading-position storage on the reader's own device. Published translations can display their source alongside the documented passage alignment. Reading and browsing require no account. Submitting an issue uses GitHub's own sign-in.

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

## Deployment and ongoing work

Pull requests are validated and built. A successful push to `main` deploys through the pinned [GitHub Actions workflow](.github/workflows/ci.yml) to `https://streamentry.github.io/LitMundi/`. Follow [Deployment](docs/DEPLOYMENT.md) to verify the actual production run and routes; a local build is not proof of deployment. No custom domain is configured.

The [sitemap index](https://streamentry.github.io/LitMundi/sitemap-index.xml) references separate English, Vietnamese, French and Spanish XML sitemaps. Only canonical public pages are listed: each literary edition has one canonical reader, with actual translation languages distinguished from interface languages. The previous `sitemap.xml` address remains a compatibility index. [Search discovery](docs/SEO.md) explains canonical URLs, accurate modification dates, verification and Google/Bing submission. On this GitHub Pages project URL, crawler policy belongs at `https://streamentry.github.io/robots.txt`; a project-level robots file cannot configure that host-root policy.

Ongoing work includes releasing eligible AI-assessed editions, responding to optional human feedback, improving the texts and obtaining independent archive custody. Reader reports and actual custodians must be recorded when they exist. GitHub's 30-day workflow artifact retention is not an independent mirror.

[Editorial workflow](docs/EDITORIAL-WORKFLOW.md) · [Contributing](CONTRIBUTING.md) · [Architecture](docs/ARCHITECTURE.md) · [Roadmap](docs/ROADMAP.md) · [Governance](GOVERNANCE.md) · [Rights](docs/RIGHTS.md) · [AI content policy](docs/AI-CONTENT-POLICY.md) · [ADRs](docs/adr/README.md)

## Licensing and credit

The [MIT license](LICENSE) covers software and documentation. Corpus texts retain **per-edition rights**. AI-only translations default to CC BY 4.0 (`CC-BY-4.0`) only to the extent the publisher controls applicable rights, under [AI content policy](docs/AI-CONTENT-POLICY.md). This does not create copyright, imply human authorship or restrict public-domain material. Third-party source rights remain separate.

Edition records retain the selected witness, source provenance, AI involvement and any actual contributor credit. Consult the selected edition's terms before reuse. Do not invent a human translator, reviewer or permission to describe AI-only work.

The passage-aligned JSON model draws inspiration from [SuttaCentral/Bilara](https://github.com/suttacentral/bilara-data). LitMundi is independent of SuttaCentral.
