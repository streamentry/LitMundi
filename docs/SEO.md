# Search discovery and multilingual sitemaps

LitMundi publishes one sitemap index and separate XML sitemaps for its English,
Vietnamese, French and Spanish interfaces. The inventory follows eligible public
content and the canonical URL policy below. A successful build makes these files
available; it does not establish search-engine submission, indexing, ranking or
citation by an AI system.

## Public endpoints

| File | Purpose |
| --- | --- |
| [`sitemap-index.xml`](https://streamentry.github.io/LitMundi/sitemap-index.xml) | Primary index to submit to search engines |
| [`sitemap.xml`](https://streamentry.github.io/LitMundi/sitemap.xml) | Compatibility copy of the index at the previously published sitemap URL |
| [`sitemap-en.xml`](https://streamentry.github.io/LitMundi/sitemap-en.xml) | Canonical URLs under `/LitMundi/en/` |
| [`sitemap-vi.xml`](https://streamentry.github.io/LitMundi/sitemap-vi.xml) | Canonical URLs under `/LitMundi/vi/` |
| [`sitemap-fr.xml`](https://streamentry.github.io/LitMundi/sitemap-fr.xml) | Canonical URLs under `/LitMundi/fr/` |
| [`sitemap-es.xml`](https://streamentry.github.io/LitMundi/sitemap-es.xml) | Canonical URLs under `/LitMundi/es/` |

All sitemap files live directly under `/LitMundi/`, within the scope of the URLs
they describe. Files are generated from the public route inventory at build time,
with absolute HTTPS URLs, UTF-8 encoding and XML escaping. They are partitioned
automatically before exceeding either protocol limit: 50,000 URLs or 52,428,800
uncompressed bytes per child file. The index references the resulting files;
consumers should follow it instead of constructing shard names.

After the first Vietnamese 500 program batch on 1 November 2026, the ten-edition
corpus has **38 canonical pages**: 11 English-interface, 12 Vietnamese-interface,
7 French-interface and 8 Spanish-interface URLs. These counts describe that
release, not fixed quotas. They change as eligible editions and public pages are
added or removed.

## Interface language and text language

An interface language describes navigation and controls. An edition language
describes the literary text. They are separate: a Portuguese original remains
Portuguese when its reader controls are English or French.

Homes, quality pages and work pages have one self-canonical URL for each interface
language. Their reciprocal `hreflang` links describe the corresponding localized
pages, including an English-interface `x-default` fallback.

Each published edition has **one canonical reader URL**. Its interface matches the
text language when that interface exists; otherwise the English interface is used.
For example, Machado's Portuguese source is canonical under `/en/`, while its
Vietnamese translation is canonical under `/vi/`. All other reader interface URLs
remain accessible, retain their language-switching behavior and point to that
edition's canonical URL. They are excluded from sitemap URL entries and do not
emit their own `hreflang` clusters. They are not marked `noindex` merely because
they are duplicates.

Canonical reader `hreflang` links describe **actual published text languages**
within the same source-edition family, rather than relabeling one text in four
interface languages. Links include the canonical reader itself and use the source
reader as `x-default`. A translation of another witness must not be grouped solely
because it shares a work identifier. If a source family has multiple published
editions in the same text language, every member falls back to a self-only
`hreflang` entry and self `x-default`; no edition is ranked or selected
arbitrarily. Cross-edition alternatives can resume after an explicit preference
policy makes that family unambiguous.

HTML language annotations and `CreativeWork.inLanguage` preserve the real text
language. Structured data identifies the same canonical edition as the HTML
canonical link. Original titles, translated titles, authors, source witnesses,
rights and AI-review disclosures remain grounded in the corpus and visible page.
An AI rubric score is not a reader rating or independent human certification.

## What belongs in the inventory

Include canonical, indexable public home, quality, work and reader pages. Exclude
draft, planned and withdrawn editions; legacy demonstrations; redirects; the 404
page; duplicate reader wrappers; search/filter state; passage fragments; and
download files. Download links and stable passage anchors remain available on
their public reader pages.

This policy preserves the AI-first publication gate. Sitemap generation does not
approve an edition, alter the 8.6 score threshold or create a human-review
requirement. A public reader must already satisfy the existing rights, text,
assessment and completeness checks.

## Modification dates and deterministic output

Page `lastmod` values come from commits affecting relevant content and rendering
dependencies, not the current build time, a file's checkout timestamp or an
unrelated repository commit. Tracking is conservative and uses whole files:
shared catalog or template changes can advance several pages' dates; this is not
a semantic history of individual catalog rows. When the required history is
shallow, unavailable, future-dated or affected by uncommitted changes, the date is
omitted instead of guessed. CI checks out full history for this reason.

The sitemap index omits `lastmod`: an index date concerns the child sitemap file
itself and cannot safely be inferred from the newest page in that file. Optional
`priority` and `changefreq` fields are omitted; Google and Bing ignore them.
Rebuilding an unchanged clean revision produces the same sitemap contents.

## Discovery and the GitHub Pages robots.txt boundary

The effective robots policy for this host is
`https://streamentry.github.io/robots.txt`. A file at
`https://streamentry.github.io/LitMundi/robots.txt` is inside a project subdirectory
and **does not control crawler access**. Publishing that project file does not
prove that the host-root policy permits crawling or advertises this sitemap.

**Observed 2026-11-01:** a read-only HTTPS check returned **404** for the host-root
robots.txt and **200** for the project's robots.txt. A missing root robots.txt
does not block crawling, but it supplies no sitemap declaration. The project's
200 response does not fill that gap. This change does not modify the separate
origin-root deployment.

Where the host-root site is controlled, add this line to its existing robots.txt
without replacing unrelated rules:

```text
Sitemap: https://streamentry.github.io/LitMundi/sitemap-index.xml
```

That file belongs to the origin-root deployment, not this project's output.
Inspect its current response before changing it. For a future custom-domain
deployment, generate URLs from the new site/base configuration and recheck the
effective origin-root robots policy.

HTML pages advertise the index. For explicit search-engine discovery, use the
verified site in Google Search Console and Bing Webmaster Tools and submit the
single `sitemap-index.xml` URL above. The index covers its language files and any
future shards; separately submitting every child is unnecessary. Account
verification and authenticated submission are outside an ordinary build. No
Search Console or Bing Webmaster credentials were available for this change, so
submission and indexing must not be reported as completed.

## SEO and AI search: intended outcome and limits

The intended outcome is a consistent, crawlable inventory with clear canonical
editions, real language relationships and traceable publication information.
Readable HTML, ordinary internal links, stable passages and source provenance
also help systems interpret and cite the works. These are useful foundations for
traditional search and generative search discovery; their presence does not
guarantee traffic or citations.

Google's AI Overviews and AI Mode require no special AI sitemap, `llms.txt` file
or additional schema. Structured data must describe the visible content. For
ChatGPT search, `OAI-SearchBot` access is distinct from `GPTBot` training access;
do not treat permission for training as a prerequisite for search visibility.
Any applicable crawler rules belong in the effective host-root robots.txt.

## Verification and operation

Run the normal checks in [Deployment](DEPLOYMENT.md). Build verification compares
the complete sitemap inventory with generated canonical HTML and checks XML,
language partitions, canonical targets, reciprocal alternatives, size limits and
exclusion of unpublished editions. Keep regression cases for unsupported
interface languages and multiple source witnesses; never infer a translated
edition from the interface prefix.

After deployment, fetch the index, all referenced child files and representative
canonical and duplicate reader URLs. Verify the deployed bytes against the
intended revision, then inspect the host-root robots response independently. A
local or live HTTP check proves availability and content, not acceptance by a
search engine. Record authenticated submission, processing errors and indexing
observations separately when those observations exist.

## Primary references

- [Sitemaps protocol and file limits](https://www.sitemaps.org/protocol.html)
- [Google: build and submit a sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)
- [Google: sitemap indexes](https://developers.google.com/search/docs/crawling-indexing/sitemaps/large-sitemaps)
- [Google: localized versions and hreflang](https://developers.google.com/search/docs/specialty/international/localized-versions)
- [Google: multilingual sites and visible content language](https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites)
- [Google: canonical URL consistency](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls)
- [Google: robots.txt location and scope](https://developers.google.com/crawling/docs/robots-txt/robots-txt-spec)
- [Google: AI features and website eligibility](https://developers.google.com/search/docs/appearance/ai-features)
- [Bing: sitemaps and accurate modification dates for AI search](https://blogs.bing.com/webmaster/2025/7/Keeping-Content-Discoverable-with-Sitemaps-in-AI-Powered-Search/)
- [OpenAI: search and training crawlers](https://developers.openai.com/api/docs/bots)
