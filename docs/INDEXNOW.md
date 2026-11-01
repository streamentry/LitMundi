# IndexNow after a verified deployment

LitMundi has a small, explicit release utility for notifying participating search
engines about changed pages. It uses Python's standard library and the live
canonical sitemap inventory. **It is not an unattended workflow:** no scheduled
job or automatic notification runs after deployment. An operator captures the
before/after evidence, reviews the plan and explicitly runs `submit`.

An accepted notification is not proof of crawling, indexing, ranking or an AI
citation. IndexNow does not submit a sitemap to Google Search Console and does
not establish ownership in webmaster accounts.

## Ownership key and project scope

The release owner publishes one stable UTF-8 key file at:

```text
https://streamentry.github.io/LitMundi/KEY.txt
```

Replace `KEY` with the actual generated token. The filename must be that token
followed by `.txt`, and the body must contain only the token, optionally followed
by one newline. The utility compares the live file with the local file **byte for
byte**. Do not generate a different key on each build.

The generated token proves control through a publicly readable file. It is not a
paid account credential, a private site login or a personal access token. The
utility needs no additional authentication secret. Its `keyLocation` is always
inside the configured project base, so the key covers `/LitMundi/`; it cannot
authorize notifications for other projects on the same host. A root robots.txt
change is not required for this mechanism.

Publishing the key is a separate release action. Creating a local file alone
does not make it accessible to an engine. `submit` refuses a missing, redirected
or mismatched live key.

## Release procedure

Use a clean, intended release and retain the deployment commit/run separately.
The snapshots describe what the public website actually served; they do not
infer deployment history from Git's `before` SHA.

### 1. Capture the live site before publishing changes

```sh
python3 scripts/indexnow.py snapshot \
  --base https://streamentry.github.io/LitMundi/ \
  --output /tmp/litmundi-indexnow-before.json
```

This follows `sitemap-index.xml`, validates unique scoped URLs and fetches each
canonical page. Every page must return direct HTTP 200, have exactly one matching
canonical link and be indexable. Snapshot makes GET requests only. It records
hashes, not a copy of the literary text.

Do this before the deployment. If the before-snapshot is unavailable, do not
pretend every existing page is new. Start a baseline for the next release, or
recover a genuine earlier snapshot. Initial adoption alone is not a reason to
submit the entire old inventory.

### 2. Deploy, verify production, then capture the after state

Follow [DEPLOYMENT.md](DEPLOYMENT.md), including the release's normal live checks.
After production serves the intended release:

```sh
python3 scripts/indexnow.py snapshot \
  --base https://streamentry.github.io/LitMundi/ \
  --output /tmp/litmundi-indexnow-after.json
```

The utility uses normal HTTPS certificate validation and does not offer an
insecure mode. It does not automatically follow redirects outside the intended
route. Failed reads, invalid XML, unexpected canonical targets or an unavailable
site stop the operation instead of creating an empty or guessed baseline.

### 3. Create and review the immutable plan

```sh
python3 scripts/indexnow.py plan \
  --before /tmp/litmundi-indexnow-before.json \
  --after /tmp/litmundi-indexnow-after.json \
  --output /tmp/litmundi-indexnow-plan.json
```

Review the JSON's `changes` lists:

| List | Meaning |
| --- | --- |
| `added` | Canonical URLs newly present after deployment. |
| `changed` | Shared canonical URLs whose semantic fingerprint changed. |
| `retired` | URLs that were canonical before but are absent from the current inventory. |

The plan contains both snapshots so its diff can be checked again. Snapshot and
plan outputs are created exclusively: an existing path is never silently
overwritten. Use a new filename for a new observation. The file is reviewable,
not cryptographically signed or protected against deliberate editing.

Semantic fingerprints include the rendered document's readable text, title,
descriptive/robots/social metadata, canonical and language alternates, meaningful
anchor destinations, language annotations, image descriptions/URLs and JSON-LD.
CSS classes/styles, stylesheet and JavaScript bundle names, analytics script code
and explicitly marked build timestamps are excluded. JSON-LD's `buildTimestamp`,
`buildTime` and `generatedAt` fields are excluded; genuine bibliographic dates are
retained. This is a documented change heuristic, not a browser rendering engine
or a claim to recognize every possible semantic equivalence.

Each page also has an **exact HTML digest**. That digest is used to detect a stale
or different production release before sending. A CSS/script-only build can
change exact HTML while producing an empty notification plan.

### 4. Explicitly submit verified changes

Replace `public/KEY.txt` with the actual local ownership-key file:

```sh
python3 scripts/indexnow.py submit \
  --plan /tmp/litmundi-indexnow-plan.json \
  --key-file public/KEY.txt \
  --output /tmp/litmundi-indexnow-report.json
```

This is the only command that can POST. Before the first POST it verifies the
live key, refetches the canonical inventory and requires the current semantic and
exact HTML hashes to match the reviewed after-snapshot. It also checks retired
URLs: a 404/410, a redirect to a current canonical URL, a new canonical target or
an explicit noindex can justify retirement. An indexable, self-canonical page
that disappeared from the inventory is rejected.

If another deployment occurred after the snapshot, capture and review a new plan.
Do not weaken the byte check to force an old plan through. An empty plan reports
`no_changes` and makes no HTTP requests, including no POST.

Sorted, deduplicated URLs are sent to `https://api.indexnow.org/indexnow`, at most
10,000 per batch. Ordinary duplicate interface wrappers, fragments, unpublished
editions and downloads are not added independently. Previously canonical URLs
whose status changed remain eligible for retirement notifications.

## Reports and retry behavior

| State | What it establishes |
| --- | --- |
| `no_changes` | No semantic/inventory changes; no request sent. |
| `received` | HTTP 200 acknowledgment. Indexing is not measured. |
| `key_validation_pending` | HTTP 202 acknowledgment; engine key validation remains pending. |
| `failed` | Verification, configuration or HTTP failure; inspect the saved error and affected batch. |
| Batch `unconfirmed` | A request encountered a network failure without a confirmed acknowledgment. It might have reached the server. |
| Batch `pending` | No acknowledgment has been recorded for this batch. |

Reports are written before submission and updated atomically after each batch.
They retain the plan's exact file hash, URLs, HTTP status and `Retry-After` when
provided. The overall report always says `indexing: not_measured`.

There are no automatic retries. Fix permanent 400/403/422 errors; for 429, respect
the server's `Retry-After` before trying again. Exact daily limits vary by engine
and are not publicly specified. Do not confuse the 10,000-URL batch limit with a
daily quota, and do not repeatedly send unchanged URLs.

To resume after resolving a transient failure:

```sh
python3 scripts/indexnow.py submit \
  --plan /tmp/litmundi-indexnow-plan.json \
  --key-file public/KEY.txt \
  --resume-report /tmp/litmundi-indexnow-report.json \
  --output /tmp/litmundi-indexnow-resumed-report.json
```

The previous report must match the **exact plan bytes** and batch URL lists. Only
matching HTTP 200/202 acknowledgments are skipped; the remaining batches still
require current production verification. Preserve the old report and use a new
output filename. A failed key setup can be corrected and submitted again without
`--resume-report` when no batches were acknowledged.

The utility cannot guarantee exactly-once delivery after a process crash or a
network failure: the server may receive a request before a local acknowledgment
is saved. Retain the plan and report and use restrained retries. Do not rebuild a
new baseline and silently forget failed changes. Automatic recovery across later
deployments would need durable pending-plan state and is explicitly future work.

## Bounds and verification

Operations are limited to 10,000 canonical pages, 32 sitemap files, 4 MiB per HTTP
response, 128 MiB of response bodies per operation, a 20-second request timeout
and a 300-second operation budget. Redirects are handled explicitly; DTD/entity
declarations and out-of-project sitemap URLs are rejected. Large or slower
deployments may need an intentionally revised bound rather than a silent bypass.

Run the focused tests with:

```sh
python3 -B tests/indexnow_test.py
```

The Node test wrapper includes them in `npm test`. Tests use mocked HTTP and do
not contact IndexNow. They cover semantic versus cosmetic changes, malformed
inventories, stale live output, key mismatches, retired canonicals, batch limits,
partial failures and exact-plan resume behavior.

## Official references

- [IndexNow protocol, project-path keyLocation, batch limit and response codes](https://www.indexnow.org/documentation)
- [IndexNow FAQ: meaningful changes, redirects, first adoption, rate limits and retries](https://www.indexnow.org/faq)
- [Bing setup: ownership verification and no indexing guarantee](https://www.bing.com/indexnow/getstarted)

These sources were checked on 2026-11-01. IndexNow complements the complete XML
sitemap; it does not replace it or establish a ranking or citation outcome.
