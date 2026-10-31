# LitMundi

**Great literature. Every language.** An open literary library built around complete texts, traceable sources and accountable translation.

> Release state, 2026-11-01: **three source editions and three complete Vietnamese review drafts, covering 42 aligned passages**. No translation has the required independent human approval or cleared contributor license. Drafts are excluded from the public reader, search and publication downloads. The earlier Proust sample remains only as a non-indexed legacy demonstration.

## The first three works

| Work | Original witness | Passages | Vietnamese status |
| --- | --- | ---: | --- |
| [Oscar Wilde — The Artist](docs/PILOT-WILDE-THE-ARTIST.md) | English; Methuen 1913, Gutenberg #774 | 5 | Revised draft; AI preflight 8.60 |
| [Machado de Assis — Um Apólogo](docs/PILOT-MACHADO-UM-APOLOGO.md) | Portuguese; Laemmert 1896, pp. 253–257 | 22 | Complete draft; AI preflight 8.55 |
| [Emilia Pardo Bazán — El encaje roto](docs/PILOT-PARDO-BAZAN-EL-ENCAJE-ROTO.md) | Spanish; Administración [1898?], pp. 233–239 | 15 | Complete draft; AI preflight 8.43 |

Source checks disclose AI-assisted passage comparison and exact witnesses; they are not human-certified critical editions. AI scores are advisory and do not authorize publication. Each translated edition requires **two independent qualified human reviews, each ≥9.0**, plus all [quality and rights gates](docs/QUALITY.md).

The [Translation Gap Atlas](docs/TRANSLATION-GAP-ATLAS.md) surveys **20 works across Vietnamese and Indonesian: 40 assessments, 12 original languages and 81 evidence records**. It records existing translations, bounded searches and uncertainty. It establishes no verified absence or independently assessed inadequacy, and no measured reader demand. Indonesian is a research comparator, not a production commitment.

## Read and contribute

The [GitHub Pages library](https://streamentry.github.io/LitMundi/) has English, Vietnamese, French and Spanish interfaces. Interface languages do not promise translated editions. Readers can browse by author or text language, search published text, follow stable passage links, submit corrections through GitHub and download JSON, TXT or EPUB. TSV is also generated as a portable export.

The reader supports keyboard navigation, mobile layouts, edition selection and optional reading-position storage on the reader's own device. Published translations can display their original alongside the documented passage alignment; no unpublished draft is used to populate that view. Reading and browsing require no account. Submitting an issue uses GitHub's own sign-in.

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

[UTF-8 JSON corpus v2](corpus/README.md) is the system of record. Astro is a replaceable static view; there is no database, site-owned account system or OAuth secret. Work, edition and passage identifiers remain stable while reviewed corrections remain in Git history.

`npm run build` creates publication downloads only for eligible published editions. `npm run export` creates a separate **editorial archive** with canonical data, labelled drafts and review packets, rights, provenance, schemas, documentation, deterministic ZIP packaging and SHA-256 fixity records. That archive grants no blanket license to its drafts. A standalone Python 3 restorer rebuilds published HTML/TXT without Astro, npm, GitHub, network access or the original domain. See [Preservation](docs/PRESERVATION.md).

## Deployment and remaining work

Pull requests are validated and built. A successful push to `main` deploys through the pinned [GitHub Actions workflow](.github/workflows/ci.yml) to `https://streamentry.github.io/LitMundi/`. Follow [Deployment](docs/DEPLOYMENT.md) to verify the actual production run and routes; a local build is not proof of deployment. No custom domain is configured.

The highest-value next step is a real bilingual review of the short Wilde draft, followed by the second independent review and contributor permission. Reader feedback, committed reviewers and independent archival mirrors remain outstanding. GitHub's 30-day workflow artifact retention is not an independent mirror.

[Editorial workflow](docs/EDITORIAL-WORKFLOW.md) · [Contributing](CONTRIBUTING.md) · [Architecture](docs/ARCHITECTURE.md) · [Roadmap](docs/ROADMAP.md) · [Governance](GOVERNANCE.md) · [Rights](docs/RIGHTS.md) · [ADRs](docs/adr/README.md)

## Licensing and credit

The [MIT license](LICENSE) covers software and documentation. Corpus texts have **per-edition rights**, not an automatic MIT or CC0 license. Cite the selected original witness and credited contributors before reuse.

The passage-aligned JSON model draws inspiration from [SuttaCentral/Bilara](https://github.com/suttacentral/bilara-data). LitMundi is independent of SuttaCentral. The aim is a small library readers value and can lawfully preserve, not a count of generated books.
