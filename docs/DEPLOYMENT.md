# GitHub Pages deployment

## Target and routes

- Repository: <https://github.com/streamentry/LitMundi>
- Canonical site: <https://streamentry.github.io/LitMundi/>
- Interface roots: `/LitMundi/en/`, `/LitMundi/vi/`, `/LitMundi/fr/`, `/LitMundi/es/`.
- No custom domain is configured. Do not add a CNAME without verified ownership and DNS.

The target URL and local build do not prove a new release is live. Record the completed deployment run and verify production after merge.

## CI/CD contract

The pinned [workflow](../.github/workflows/ci.yml) runs on PRs, pushes to `main` and manual dispatch:

1. Check out full Git history (`fetch-depth: 0`) and install locked dependencies with `npm ci`.
2. Validate schemas, corpus, Atlas and publication gates. Compare established IDs and legacy URLs against the PR base or preceding push commit with `verify:ids`.
3. Report quality state, run tests, build the static site and generated publication downloads, and verify routes, links, SEO and draft exclusion.
4. Export the editorial archive and run deterministic, isolated offline restoration checks.
5. Upload the archive ZIP and manifest digest as a workflow artifact with **30-day retention**.
6. On `main` only, upload `dist/` and deploy through GitHub Pages with short-lived Actions OIDC credentials.

PRs do not deploy production. The archive artifact includes labelled editorial drafts and rights restrictions; it is separate from website downloads and is not an independent mirror. Deployments are serialized per ref. No personal access token or site-owned login secret is needed.

## Local release checks

```sh
npm ci
npm run validate
npm run verify:ids -- <base-commit>
npm run quality:status
npm test
npm run check
npm run build
npm run verify:build
npm run export
npm run verify:archive
```

On a restricted workstation, use `ASTRO_TELEMETRY_DISABLED=1` if optional telemetry settings cannot be written. CI already sets it. `quality:status` reports current v2 AI eligibility, selected evidence and retained historical assessments. A below-threshold draft remains blocked without preventing a valid build of other eligible editions; human review is not a release prerequisite.

## Production verification

After the `Deploy public site` job succeeds, verify the deployed revision and actual URLs:

```sh
npm run verify:deployed -- --output /tmp/litmundi-production-check.json
```

This read-only check compares production routes, complete passage text, provenance, publication downloads and their hashes against the validated local checkout. It also checks that draft/planned/withdrawn reader routes return 404. Keep the deployment run and commit SHA alongside the resulting report; do not run it against a checkout different from the intended release.

- All four interface roots, each public work and source-edition route, the sitemap and 404 page.
- Language switching keeps the work/edition and passage context; text-language fallback is explicit.
- Published text search, author/language filters, JSON/TXT/EPUB downloads, provenance and copyright notices.
- Passage permalinks and GitHub correction links contain the correct work, edition and segment. Inspect the issue form without submitting a fabricated reader report.
- No draft reader route, draft search text or publication download appears. Legacy demonstration aliases remain non-indexed.
- Mobile layout and keyboard reading/edition navigation. Optional saved position stays local and can be cleared.

Retain observed checks and failures in [verification records](verification/README.md). Browser automation confirms behavior, not real-reader demand or human literary approval.

## Initial activation and troubleshooting

For a new fork, an administrator may need to select **Settings → Pages → Build and deployment → GitHub Actions**. The original repository's initial Pages deployment was established on 2026-10-31. If `configure-pages` lacks administration permission, configure the setting rather than adding a PAT secret.

For a route 404, check Astro's `/LitMundi/` base and shared URL helpers, then run `verify:build`. For a stale site, inspect the actual deployment run and cache propagation. A successful PR build intentionally has no deployment. Archive failures must be fixed before treating the snapshot as restorable.

A later domain migration requires updating the site/base configuration and verification assumptions while preserving work, edition and passage IDs and redirects where available. GitHub Pages remains replaceable distribution; use [Preservation](PRESERVATION.md) for independent recovery.
