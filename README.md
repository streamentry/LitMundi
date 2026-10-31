# LitMundi
**Great literature. Every language.** Open, accountable translations of the world's literary heritage.

> Status: **foundation / demonstration**, not a published translation collection. The Proust snippet is a formatting example only, not a validated critical edition.

## Mission
Make culturally important literature accessible across languages where verified, complete, legally usable translations are missing or inaccessible. Value is measured by preservation, accuracy, discoverability and actual reading—not the number of machine-generated books.

## Quick start
Requires Node.js 22+.
```bash
npm install
npm run validate
npm test
npm run dev
npm run build
npm run export
```
Open http://localhost:4321. Locales: English, Vietnamese, French and Spanish. UI locales are **not** promises of available translations.

## Design
- Astro static website, no application database, no runtime server required.
- Canonical corpus in UTF-8 JSON; segment-level IDs aligned across languages, modeled after [SuttaCentral Bilara](https://github.com/suttacentral/bilara-data).
- Stable URLs: `/<ui-locale>/works/<work-id>/` and `/<ui-locale>/read/<work-id>/<edition-language>/#<segment-id>`.
- GitHub issues are the feedback and moderation workflow; no local account records or fake GitHub OAuth flows.
- Published text is immutable by ID; corrections are reviewed PRs with Git history.
- Rights and provenance, translator consent, independent review and reusable exports are prerequisites for public release.
- Content and presentation separately licensed: [MIT](LICENSE) code; **corpus files are NOT automatically MIT or CC0**; see [RIGHTS](docs/RIGHTS.md).
- Archive preservation means open standards, independent mirrors, checksums, governance continuity and periodic migration. No platform can guarantee 1000 years.

## Roadmap and governance
[Roadmap](docs/ROADMAP.md) · [Architecture](docs/ARCHITECTURE.md) · [Preservation](docs/PRESERVATION.md) · [Rights](docs/RIGHTS.md) · [Contributing](CONTRIBUTING.md) · [Governance](GOVERNANCE.md) · [Security](SECURITY.md) · [ADR index](docs/adr/README.md).

### Feedback
The site links readers directly to GitHub's new-issue flow. GitHub handles login; readers need a GitHub account to submit. Work/segment/language metadata prefill the form; editorial approval happens through pull requests. GitHub Discussions is not enabled on this repository. Do not promise embedded comments until a separate, security-reviewed design is adopted.

## Deployment (GitHub Pages)
Every pull request is validated and built; pushes to `main` deploy via GitHub Actions to **https://streamentry.github.io/LitMundi/**. The Astro build uses a `/LitMundi/` base path, and site URLs use the shared `pagePath()` helper. No custom domain or credential is required.

**Pages activation:** repository Settings → Pages → Build and deployment → Source: **GitHub Actions**. The workflow attempts to configure an uninitialized Pages site automatically; if GitHub rejects that step, an administrator must select the publishing source once. See [Deployment operations](docs/DEPLOYMENT.md).

The generated source does not claim to publish an editorially verified book; demo editions are marked `noindex`. The `litmundi.org` domain is neither verified nor configured.

## Credits
LitMundi draws architectural inspiration from SuttaCentral/Bilara's language-aligned segment JSON model. It is independent of SuttaCentral. All corpus works must credit their individual source editions and translators.
