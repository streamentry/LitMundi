# GitHub Pages deployment

## Production URL
- Repository: https://github.com/streamentry/LitMundi
- Canonical Pages URL: https://streamentry.github.io/LitMundi/
- Site interface language variants: `/LitMundi/en/`, `/LitMundi/vi/`, `/LitMundi/fr/`, `/LitMundi/es/`.
- No custom domain is configured. Do not add a CNAME until DNS and domain ownership are verified.

## How CI/CD works
One workflow (`.github/workflows/ci.yml`) runs checks on pull requests and pushes:
1. Reproducible `npm ci` from committed `package-lock.json`, validate JSON corpus and tests.
2. Compile Astro as a static site, verify all internal paths use `/LitMundi/`, and export preservation archive.
3. On `main` only, upload the static `dist/` artifact.
4. Deploy through GitHub Pages using short-lived GitHub Actions OIDC. The workflow never needs a personal access token.

Deployments are serialized per ref and use the dedicated `github-pages` environment. Action revisions are pinned to immutable commit SHAs.

## First-time activation
1. Go to **https://github.com/streamentry/LitMundi/settings/pages**.
2. Under **Build and deployment**, confirm **Source** is **GitHub Actions** (not Deploy from a branch). As of 2026-10-31, LitMundi's source is enabled and its initial deployment has succeeded.
3. Go to **Actions**, review `CI and Deploy to GitHub Pages`, and rerun if the earlier deployment was blocked by Pages initialization.
4. Confirm the workflow's `deploy` job is green, then visit https://streamentry.github.io/LitMundi/vi/.

The workflow runs `actions/configure-pages` before deployment, which may initialize Pages automatically in some configurations. If it fails due to insufficient repository administration permission, step 2 must be done by a repository administrator; do not add a PAT secret.

## Troubleshooting
- **404 under /en or /vi:** Confirm Astro config `base: '/LitMundi'` and `pagePath` use; inspect `npm run verify:build`.
- **Deploy error: Pages not found or source not Actions:** Activate source in Settings > Pages.
- **No deploy on PR:** Intentional: PRs are tests only, never production publishing.
- **Site seems stale:** Check completed deployment run, CDN propagation, browser cache.
- **Cannot resolve website:** Verify Pages deployment green and repo visibility public.

## Custom domain migration
Once the owner verifies domain/DNS, update `site` and `base` in `astro.config.mjs`, adapt `scripts/verify-build.mjs` and `public/404.html`, and configure the same domain in GitHub Pages settings. Keep permanent redirects from the existing repository URL where feasible. Do not change content identifiers.

## Operational notes
GitHub Pages has no server runtime or private state. GitHub handles issue author login on its own domain. GitHub Pages is convenient distribution, **not an archival backup**. Independently export and mirror the content according to PRESERVATION.md.
