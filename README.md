# LitMundi
**Great literature. Every language.** Open, accountable translations of the world's literary heritage.

> Status: **first original source text published, translations under review**. The Oscar Wilde pilot is a source-checked 1913 English transcription; the Vietnamese AI-assisted draft is **not** a published or independently reviewed translation. The earlier Proust example remains a non-indexed demonstration.

## Mission
Make culturally important literature accessible across languages where verified, complete, legally usable translations are missing or inaccessible. Value is measured by preservation, accuracy, discoverability and actual reading—not the number of machine-generated books.

## Quick start
Requires Node.js 22+.
```bash
npm ci
npm run validate
npm test
npm run dev
npm run build
npm run export
```
Open http://localhost:4321. Locales: English, Vietnamese, French and Spanish. UI locales are **not** promises of available translations.

## Design
- Astro static website, no application database, no runtime server required.
- Canonical [corpus v2](corpus/README.md) in UTF-8 JSON; segment-level IDs aligned across languages, modeled after [SuttaCentral Bilara](https://github.com/suttacentral/bilara-data). Editions have independent immutable identities, primary-source witness metadata, rights records and explicit alignments.
- Stable URLs: `/<ui-locale>/works/<work-id>/` and `/<ui-locale>/read/<work-id>/<edition-id>/#<segment-id>`. Legacy Proust `/fr/` route remains a canonicalized alias.
- GitHub issues are the feedback and moderation workflow; no local account records or fake GitHub OAuth flows.
- Published text is immutable by ID; corrections are reviewed PRs with Git history.
- **Published translations** require rights provenance, translator consent, full alignment and two independent bilingual reviews; verified original-language texts have a separate source-check gate. Machine-verifiable gates run on every CI build.
- Content and presentation separately licensed: [MIT](LICENSE) code; **corpus files are NOT automatically MIT or CC0**; see [RIGHTS](docs/RIGHTS.md).
- Archive preservation means open standards, independent mirrors, checksums, governance continuity and periodic migration. No platform can guarantee 1000 years.

## Roadmap and governance
[Roadmap](docs/ROADMAP.md) · [Architecture](docs/ARCHITECTURE.md) · [Preservation](docs/PRESERVATION.md) · [Rights](docs/RIGHTS.md) · [Contributing](CONTRIBUTING.md) · [Governance](GOVERNANCE.md) · [Security](SECURITY.md) · [ADR index](docs/adr/README.md).

### Feedback
The site links readers directly to GitHub's new-issue flow. GitHub handles login; readers need a GitHub account to submit. Work/segment/language metadata prefill the form; editorial approval happens through pull requests. GitHub Discussions is not enabled on this repository. Do not promise embedded comments until a separate, security-reviewed design is adopted.

## Deployment (GitHub Pages)
Every pull request is validated and built; pushes to `main` deploy via GitHub Actions to **https://streamentry.github.io/LitMundi/**. The Astro build uses a `/LitMundi/` base path, and site URLs use the shared `pagePath()` helper. No custom domain or credential is required.

**Pages activation:** repository Settings → Pages → Build and deployment → Source: **GitHub Actions**. Pages was initialized successfully through GitHub Actions on 2026-10-31; if recreating or forking the repository, an administrator may need to select the publishing source once. See [Deployment operations](docs/DEPLOYMENT.md).

The website publishes one complete source-checked original-language prose poem [Oscar Wilde, “The Artist”](docs/PILOT-WILDE-THE-ARTIST.md). Unreviewed translations and demo editions are excluded from public reading and indexing. The `litmundi.org` domain is neither verified nor configured.

## Credits
LitMundi draws architectural inspiration from SuttaCentral/Bilara's language-aligned segment JSON model. It is independent of SuttaCentral. All corpus works must credit their individual source editions and translators.

## First pilot
- [The Artist — provenance, legal review and literary-editor checklist](docs/PILOT-WILDE-THE-ARTIST.md)
- [Corpus schema and alignment format](corpus/README.md)
- Current source reading: https://streamentry.github.io/LitMundi/en/read/wilde-the-artist/wilde-artist-en-methuen-1913/

**Important:** The presence of a source edition does not establish that a target-language translation gap exists. The first pilot is deliberately an integrity test, not a claim of market demand.
