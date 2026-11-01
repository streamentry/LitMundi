#!/usr/bin/env python3
"""Read-only HTTP/content verification against the local canonical corpus."""
import argparse
import concurrent.futures
import datetime
import hashlib
import html
import json
import re
import urllib.error
import urllib.request
from pathlib import Path
from urllib.parse import parse_qs, urljoin, urlparse
from lib.seo_validation import expected_inventory, parse_index, parse_sitemap, validate_page, verify_build


def review_category(edition):
    """Keep the disclosure precedence identical to reader-data.mjs."""
    if edition.get("status") != "published":
        return "unreviewed"
    if edition["kind"] == "source":
        return "source"
    if edition.get("publication_policy") == "litmundi-literary-v2" or edition["review"]["status"] == "ai_reviewed":
        return "ai"
    if edition["review"]["status"] in ("bilingual_reviewed", "literary_edited", "expert_reviewed"):
        return "human"
    return "translation"


def attributes(markup):
    return {key: html.unescape(value) for key, value in re.findall(r'([\w:-]+)="([^"]*)"', markup)}


def edition_title(work, edition):
    return edition["title"] if edition and edition.get("title") is not None else work["title"]


def elements(markup, tag):
    return [(raw, attributes(raw), html.unescape(re.sub(r"<[^>]*>", "", body))) for raw, body in re.findall(r"<" + tag + r"\b([^>]*)>([\s\S]*?)</" + tag + r">", markup)]


def title_problems(markup, work, edition, tag="h1", page_title=None):
    problems = []
    title = edition_title(work, edition)
    language = edition["language"] if edition.get("title") else work["original_language"]
    headings = [(attrs, text) for _, attrs, text in elements(markup, tag) if attrs.get("data-edition-title") == edition["id"]]
    if len(headings) != 1 or headings[0][1] != title or headings[0][0].get("lang") != language:
        problems.append("Incorrect edition title or title language: " + edition["id"])
    originals = [(attrs, text) for raw, attrs, text in elements(markup, "span") if "data-original-title" in raw]
    show_original = edition["kind"] == "translation" and title != work["title"]
    if len(originals) != (1 if show_original else 0) or (show_original and (originals[0][1] != work["title"] or originals[0][0].get("lang") != work["original_language"])):
        problems.append("Incorrect original-title subtitle: " + edition["id"])
    if page_title is not None:
        titles = [text for _, _, text in elements(markup, "title")]
        og_titles = [attrs.get("content") for raw in re.findall(r"<meta\b([^>]*)>", markup) if (attrs := attributes(raw)).get("property") == "og:title"]
        if titles != [page_title + " · LitMundi"] or og_titles != titles:
            problems.append("Browser/Open Graph title does not use the selected edition title")
    return problems


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base", default="https://streamentry.github.io/LitMundi/")
    parser.add_argument("--canonical-base", help="Expected canonical site URL, if --base points to a local preview")
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    base = args.base.rstrip("/") + "/"
    canonical_base = (args.canonical_base or args.base).rstrip("/") + "/"
    root = Path(__file__).resolve().parent.parent
    # Validate the local release first; compare the deployed hierarchy against
    # these parsed bytes, not a guessed list of child sitemap filenames.
    seo_report = verify_build(root, canonical_base)
    seo_inventory = expected_inventory(root, canonical_base)
    sitemap_index_bytes = (root / "dist/sitemap-index.xml").read_bytes()
    sitemap_children = parse_index(sitemap_index_bytes, canonical_base, seo_inventory["locales"])
    child_by_name = {info["name"]: info for info in sitemap_children.values()}
    read = lambda name: json.loads((root / name).read_text(encoding="utf-8"))
    works = read("corpus/catalog/works.json")
    editions = read("corpus/catalog/editions.json")
    languages = list(read("src/lib/locales.json"))
    language_names = read("corpus/catalog/languages.json")
    works_by_id = {work["id"]: work for work in works}
    published = [edition for edition in editions if edition["status"] == "published" and edition["content_path"] and works_by_id[edition["work_id"]]["visibility"] == "public"]
    published_by_id = {edition["id"]: edition for edition in published}
    public_work_ids = {edition["work_id"] for edition in published}
    samples = [edition for edition in editions if edition["status"] == "sample" and works_by_id[edition["work_id"]]["visibility"] == "demo"]
    excluded = [edition for edition in editions if edition not in published and edition not in samples]
    texts = {edition["id"]: read(edition["content_path"]) for edition in published}
    structures = {work_id: read("corpus/structure/" + work_id + ".json")["segment_ids"] for work_id in public_work_ids}

    def preferred_edition(work_id, locale):
        available = [edition for edition in published if edition["work_id"] == work_id]
        return next((edition for edition in available if edition["language"] == locale), None) or next((edition for edition in available if edition["kind"] == "source" and edition["language"] == works_by_id[work_id]["original_language"]), None) or available[0]

    jobs = {}
    for lang in languages:
        for route in [lang + "/", lang + "/quality/"]:
            jobs[route] = (200, "page", None)
        for work_id in sorted(public_work_ids):
            route = lang + "/works/" + work_id + "/"
            jobs[route] = (200, "work", preferred_edition(work_id, lang))
        for edition in published:
            route = lang + "/read/" + edition["work_id"] + "/" + edition["id"] + "/"
            jobs[route] = (200, "reader", edition)
            for slug in edition["legacy_slugs"]:
                jobs[lang + "/read/" + edition["work_id"] + "/" + slug + "/"] = (200, "legacy", edition)
        for edition in excluded:
            for slug in [edition["id"], *edition["legacy_slugs"]]:
                jobs[lang + "/read/" + edition["work_id"] + "/" + slug + "/"] = (404, "excluded", None)
        for edition in samples:
            for slug in [edition["id"], *edition["legacy_slugs"]]:
                jobs[lang + "/read/" + edition["work_id"] + "/" + slug + "/"] = (200, "legacy", edition)
    for edition in [*published, *excluded]:
        for extension in ("json", "txt", "epub", "tsv"):
            jobs["downloads/" + edition["id"] + "." + extension] = (200, "download", edition) if edition in published else (404, "excluded", None)
    for route, kind in [("", "root"), ("sitemap-index.xml", "sitemap-index"), ("sitemap.xml", "sitemap-index"),
                        *((name, "sitemap-child") for name in child_by_name),
                        ("robots.txt", "robots"), ("search-index.json", "search"), ("downloads/manifest.json", "download-manifest")]:
        jobs[route] = (200, kind, None)
    jobs["this-route-must-not-exist/"] = (404, "excluded", None)

    def check(item):
        route, (expected, kind, edition) = item
        url = urljoin(base, route)
        request = urllib.request.Request(url, headers={"User-Agent": "LitMundi-release-verification/2.0", "Cache-Control": "no-cache"})
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                status, data = response.status, response.read()
                content_type = response.headers.get_content_type()
                final_url = response.geturl()
        except urllib.error.HTTPError as error:
            status, data = error.code, error.read()
            content_type, final_url = error.headers.get_content_type(), error.geturl()
        except Exception as error:
            return {"url": url, "expected_status": expected, "error": str(error), "passed": False}
        problems = []
        if status != expected:
            problems.append("Expected HTTP " + str(expected) + ", received " + str(status))
        if status == 200 and final_url != url:
            problems.append("Public route unexpectedly redirects to " + final_url)
        try:
            if status == 200:
                if kind == "download":
                    if data != (root / "public" / route).read_bytes():
                        problems.append("Deployed download differs from validated local bytes")
                else:
                    text = data.decode("utf-8")
                    decoded = html.unescape(text)
                    if kind in ("page", "work", "reader"):
                        validate_page(text, urljoin(canonical_base, route), seo_inventory, canonical_base)
                        if 'href="#main"' not in text:
                            problems.append("Skip navigation missing")
                        if "reader-feedback.yml" not in text:
                            problems.append("Reader feedback template missing")
                    if kind == "page" and route in [language + "/" for language in languages]:
                        locale = route.split("/")[0]
                        cards = {attributes(raw).get("data-work-id"): body for raw, body in re.findall(r"<article\b([^>]*)>([\s\S]*?)</article>", text) if "data-work-id" in raw}
                        if set(cards) != public_work_ids:
                            problems.append("Catalog must contain one card per public work")
                        for work_id in public_work_ids:
                            problems.extend(title_problems(cards.get(work_id, ""), works_by_id[work_id], preferred_edition(work_id, locale), tag="h3"))
                    if kind in ("reader", "work"):
                        work = works_by_id[edition["work_id"]]
                        title = edition_title(work, edition)
                        page_title = title + " — " + language_names.get(edition["language"], edition["language"]) if kind == "reader" else title
                        problems.extend(title_problems(text, work, edition, page_title=page_title))
                    if kind == "work":
                        listed = [(attrs, heading) for _, attrs, heading in elements(text, "h3") if "data-edition-title" in attrs]
                        expected_editions = [item for item in published if item["work_id"] == edition["work_id"]]
                        if sorted(attrs["data-edition-title"] for attrs, _ in listed) != sorted(item["id"] for item in expected_editions):
                            problems.append("Edition title list must contain exactly published editions")
                        for attrs, heading in listed:
                            target = published_by_id.get(attrs["data-edition-title"])
                            if not target or heading != edition_title(work, target):
                                problems.append("Incorrect title in edition list")
                    if kind == "reader":
                        segments = {}
                        for outer, inner, passage in re.findall(r'<div\b([^>]*\bclass="segment"[^>]*)>\s*<p\b([^>]*)>([\s\S]*?)</p>', text):
                            attrs = attributes(outer)
                            identifier = attrs.get("id")
                            if identifier in segments:
                                problems.append("Duplicate passage identifier " + identifier)
                            segments[identifier] = (html.unescape(passage), attributes(inner).get("lang"), attrs.get("data-reading-segment"))
                        for identifier in structures[edition["work_id"]]:
                            if segments.get(identifier) != (texts[edition["id"]][identifier], edition["language"], identifier):
                                problems.append("Missing or incorrect canonical passage " + identifier)
                        source = published_by_id.get(edition.get("source_edition_id")) if edition["kind"] == "translation" else None
                        if edition["kind"] == "translation" and not source:
                            problems.append("Published translation lacks a public original")
                        if source:
                            for identifier, passage in texts[source["id"]].items():
                                if segments.get("source-" + identifier) != (passage, source["language"], None):
                                    problems.append("Missing or incorrect parallel original " + identifier)
                            alignment = read("corpus/alignments/" + edition["work_id"] + "/" + edition["id"] + ".json")
                            if len(re.findall(r'class="parallel-row"', text)) != len(alignment["links"]):
                                problems.append("Parallel alignment row count differs")
                        expected_segments = len(texts[edition["id"]]) + (len(texts[source["id"]]) if source else 0)
                        if len(segments) != expected_segments:
                            problems.append("Unexpected total passage count")
                        category = review_category(edition)
                        if 'data-review-category="' + category + '"' not in text:
                            problems.append("Incorrect review category disclosure")
                        if edition.get("publication_policy") and 'data-publication-policy="' + edition["publication_policy"] + '"' not in text:
                            problems.append("Publication policy disclosure missing")
                        scores = re.findall(r'data-ai-score="([^"]+)"', text)
                        expected_scores = [edition["review"]["score"]] if category == "ai" and isinstance(edition["review"].get("score"), (int, float)) else []
                        if [float(score) for score in scores] != expected_scores:
                            problems.append("AI score does not match current selected metadata")
                        metadata_match = re.search(r'<script type="application/ld\+json">([\s\S]*?)</script>', text)
                        metadata = json.loads(metadata_match.group(1)) if metadata_match else {}
                        if metadata.get("identifier") != edition["id"] or metadata.get("inLanguage") != edition["language"]:
                            problems.append("Incorrect structured edition identity")
                        if metadata.get("name") != title or metadata.get("alternateName") != (work["title"] if edition["kind"] == "translation" and title != work["title"] else None):
                            problems.append("Structured metadata has incorrect edition/original titles")
                        for _, attrs, heading in elements(text, "span"):
                            if "data-navigation-title" not in attrs:
                                continue
                            target = published_by_id.get(attrs["data-navigation-title"])
                            if not target or heading != edition_title(works_by_id[target["work_id"]], target):
                                problems.append("Incorrect selected edition title in work navigation")
                        if category == "ai" and (metadata.get("creativeWorkStatus") != "AI-reviewed publication" or "translator" in metadata or "aggregateRating" in metadata):
                            problems.append("AI structured metadata implies an incorrect review or person/rating claim")
                        correction_bodies = [parse_qs(urlparse(link).query).get("body", [""])[0] for link in re.findall(r'href="(https://github\.com/streamentry/LitMundi/issues/new\?[^"]+)"', decoded)]
                        for record in [edition, *([source] if source else [])]:
                            for identifier in texts[record["id"]]:
                                if not any("Edition ID: " + record["id"] + "\n" in body and "Segment ID: " + identifier + "\n" in body for body in correction_bodies):
                                    problems.append("Missing source/target correction identity " + record["id"] + " / " + identifier)
                        if edition["provenance"]["citation"] not in decoded or edition["rights"]["basis"] not in decoded:
                            problems.append("Source attribution or rights assessment missing")
                    if kind == "legacy" and not re.search(r'name="robots"[^>]*noindex', text):
                        problems.append("Legacy/sample page is indexable")
                    if kind == "search":
                        found = json.loads(text)
                        if sorted(record["editionId"] for record in found) != sorted(published_by_id):
                            problems.append("Search does not contain exactly public editions")
                        for record in found:
                            target = published_by_id.get(record["editionId"])
                            if not target:
                                continue
                            expected_passages = [[identifier, texts[target["id"]][identifier]] for identifier in structures[target["work_id"]]]
                            if record["passages"] != expected_passages or record.get("reviewCategory") != review_category(target) or record.get("language") != target["language"]:
                                problems.append("Search differs from canonical text/review metadata: " + target["id"])
                            work = works_by_id[target["work_id"]]
                            if record.get("title") != edition_title(work, target) or record.get("originalTitle") != work["title"] or record.get("titleLanguage") != (target["language"] if target.get("title") else work["original_language"]):
                                problems.append("Search must preserve both edition and original titles: " + target["id"])
                    if kind in ("sitemap-index", "sitemap-child"):
                        if content_type not in ("application/xml", "text/xml"):
                            problems.append("Sitemap must be served as XML")
                        if data != (root / "dist" / route).read_bytes():
                            problems.append("Deployed sitemap differs from validated local bytes")
                        if kind == "sitemap-index":
                            if parse_index(data, canonical_base, languages) != sitemap_children:
                                problems.append("Deployed sitemap index references a different inventory")
                        else:
                            info = child_by_name[route]
                            found = parse_sitemap(data, canonical_base, info["locale"], route)
                            expected_entries = parse_sitemap((root / "dist" / route).read_bytes(), canonical_base, info["locale"], route)
                            if found != expected_entries:
                                problems.append("Deployed child sitemap differs from canonical routes/hreflang")
                    if kind == "download-manifest" and data != (root / "public/downloads/manifest.json").read_bytes():
                        problems.append("Download manifest differs from tested build")
                    if kind == "robots" and urljoin(canonical_base, "sitemap-index.xml") not in text:
                        problems.append("Sitemap declaration missing")
        except Exception as error:
            problems.append("Content verification failed: " + str(error))
        return {"url": url, "status": status, "expected_status": expected, "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest(), "passed": not problems, "problems": problems}

    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
        results = list(executor.map(check, jobs.items()))
    report = {
        "checked_at_utc": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "base_url": base,
        "canonical_base_url": canonical_base,
        "status": "passed" if all(result["passed"] for result in results) else "failed",
        "checks": len(results),
        "interface_locales": languages,
        "public_works": sorted(public_work_ids),
        "published_editions": [edition["id"] for edition in published],
        "ai_reviewed_editions": [edition["id"] for edition in published if review_category(edition) == "ai"],
        "seo": {"canonical_urls": len(seo_report["urls"]), "locale_counts": seo_report["locale_counts"],
                "sitemap_index": urljoin(canonical_base, "sitemap-index.xml"), "child_sitemaps": list(sitemap_children)},
        "limitations": ["Read-only HTTP/content verification; no human literary review or real reader-demand measurement.",
                        "Correction links are checked without submitting issues or impersonating readers.",
                        "The project-level robots.txt is a deployment template; the effective crawler policy is the origin-root /robots.txt. Publishing sitemaps does not prove search-engine submission, indexing or AI citation."],
        "results": results
    }
    rendered = json.dumps(report, ensure_ascii=False, indent=2) + "\n"
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(rendered, encoding="utf-8")
    print("HTTP/content verification:", report["status"], "-", len(results), "checks")
    for result in results:
        if not result["passed"]:
            print(result["url"], result.get("problems", result.get("error")))
    return 0 if report["status"] == "passed" else 1


if __name__ == "__main__":
    raise SystemExit(main())
