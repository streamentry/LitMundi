# Architecture v0.1

## Architectural boundaries
```text
UTF-8 JSON corpus -> schema and editorial validation -> Astro static build -> static hosting/CDN
                  -> deterministic corpus export + SHA-256 manifest -> independent preservation mirrors
GitHub identity -> GitHub issue form -> editorial triage -> PR review -> canonical JSON correction
```

There is **no runtime backend**: JSON files tracked in Git are the system of record. Astro is a disposable view. This is a deliberate implementation of the requested JSON backend, not an authenticated API or database.

## Data
Catalog entries bind canonical work ID, authorship, date, original language, availability and source bibliographic status. Cognate segment maps use IDs such as `demo-proust:1.1`, with original and translations sharing IDs. Files are UTF-8 JSON and contain plaintext, never executable HTML. An edition is an independently identified, sourced and credited intellectual object; language alone is not an edition ID. Corpus v2 implements unique edition IDs, source witnesses, translation links, segment structure and optional many-to-many alignment maps (ADR-0002), plus separate original and translation publication gates (ADR-0005).

## URL and SEO
Locale-prefixed homepage/works/read pages with canonical links; root language negotiation is only an enhancement and has HTML fallback. Future work: hreflang alternate tags, per-edition structured data, a sitemap, proper 404s, indexing policies for unpublished editions, and a stable permalink resolver independent of UI locales. No fake available translations should be indexed.

## GitHub feedback
A report button links to GitHub with prefilled issue fields. Authentication and comment threads are on GitHub; issues are not embedded on LitMundi. No GitHub client secret is necessary. Correct translation changes happen through PRs, not mutable public comments. Later: client-only read-only issue viewer via cached JSON at build time; rate-limited API only after threat review.

## Security
No untrusted Markdown/HTML in segment values. Content escaped by Astro interpolation. Third-party scripts and ad networks require a security/privacy review. All CI actions should be pinned to immutable SHAs before a production launch.

## Scaling
Split corpus from application repo if size warrants it; retain content-addressed release manifests and archival exports. Partition by stable work and edition identity; static generation may later use incremental publishing without changing data format.
