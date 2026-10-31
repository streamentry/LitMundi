# Reader verification

[The release report](../RELEASE-2026-11-01.md) summarizes the deployed first cycle. `build-2026-11-01.json` records local acceptance. `production-2026-11-01.json` records the actual release commit, successful deployment workflow, 78 production HTTP/content checks and browser acceptance on the live site. It retains the explicit Chromium certificate exception needed for the test environment's proxy; the separate Python HTTPS check kept certificate validation enabled.

`reader-2026-11-01.json` records actual checks against the locally built three-work release. It includes tool versions, source-text hashes, tested routes, mobile viewport sizes and limitations. This evidence does not claim production deployment, complete accessibility certification, human literary review or actual reader demand.

The normal dependency-free route/content checks run with:

```bash
npm run build
npm run verify:build
node tests/reader-data.test.mjs
npm run check
```

`verify:build` checks every generated HTML link and fragment; canonical public sitemap membership and hreflang; complete passage text, metadata and correction context; and absence of drafts from reading routes, search, scripts and public downloads. The five reader-rule tests cover publication filtering, language fallback, accent-insensitive search and explicit many-to-many alignment, including invalid graphs.

## Optional real-browser acceptance check

Run from the repository root. Install verification tools outside the project, so the deployed site gains no dependencies:

```bash
npm install --prefix /tmp/litmundi-browsercheck --no-audit --no-fund playwright@1.56.1 @axe-core/playwright@4.10.2
PLAYWRIGHT_BROWSERS_PATH=/tmp/litmundi-browser node /tmp/litmundi-browsercheck/node_modules/playwright/cli.js install chromium --only-shell
npm run preview -- --host 127.0.0.1 --port 4321
```

In another terminal:

```bash
PLAYWRIGHT_BROWSERS_PATH=/tmp/litmundi-browser node docs/verification/check-reader.mjs http://127.0.0.1:4321/LitMundi/ /tmp/litmundi-reader-check.json
```

If the environment prevents Astro from writing its telemetry configuration, set `ASTRO_TELEMETRY_DISABLED=1` for the build and preview commands. If tools were installed elsewhere, set `LITMUNDI_BROWSER_TOOLS` to that installation's `node_modules` path. Browser/system dependencies may need installation on another operating system.

The same browser command accepts the production base URL after deployment. Certificate verification stays enabled by default. In a controlled environment where Chromium does not trust a known TLS-inspecting proxy, `LITMUNDI_BROWSER_IGNORE_HTTPS_ERRORS=1` permits interaction checks and visibly records the exception and limitation. Such a run does not verify TLS; retain a separate normal HTTPS check and do not conceal certificate failures.

The script checks 32 routes across all four UI languages with axe's WCAG 2/2.1 A/AA rules; 12 mobile route/viewport combinations at 320 and 390 pixels; keyboard skip navigation; full-text search in the three original languages; combined author/language filters; preservation of passage links when switching UI language; optional browser-local bookmarks; and reading/navigation/download links without JavaScript. The browser check is pinned to this three-work acceptance case and should be adapted when content grows.

## Parallel reader without publishing a draft

There are no human-approved translations in the release. Render-test the parallel reader with fictional content in a separate temporary copy:

```bash
python docs/verification/make-parallel-fixture.py /tmp/litmundi-parallel-fixture
cd /tmp/litmundi-parallel-fixture
ASTRO_TELEMETRY_DISABLED=1 ./node_modules/.bin/astro build
./node_modules/.bin/astro preview --host 127.0.0.1 --port 4322
```

The direct Astro command is only for this isolated fixture: it intentionally does **not** run the publication validator. It does not fabricate human review evidence, and neither this corpus nor its output may be deployed or merged. Real builds always run `npm run build`, which validates the canonical corpus before rendering.

From the real repository, rerun the browser script with:

```bash
PLAYWRIGHT_BROWSERS_PATH=/tmp/litmundi-browser \
LITMUNDI_PARALLEL_FIXTURE_URL=http://127.0.0.1:4322/LitMundi/en/read/fixture-pair/fixture-target/ \
node docs/verification/check-reader.mjs http://127.0.0.1:4321/LitMundi/ /tmp/litmundi-reader-check.json
```

The fixture checks a two-source-to-one-target group and a one-source-to-two-target group, desktop columns, stacked mobile order, unique passage anchors and automated accessibility. It is evidence about rendering mechanics only. Qualified human reviewers still decide whether a real alignment and translation faithfully represent an original.
