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
import xml.etree.ElementTree as ET
from pathlib import Path
from urllib.parse import parse_qs, urljoin, urlparse


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


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base", default="https://streamentry.github.io/LitMundi/")
    parser.add_argument("--canonical-base", help="Expected canonical site URL, if --base points to a local preview")
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    base = args.base.rstrip("/") + "/"
    canonical_base = (args.canonical_base or args.base).rstrip("/") + "/"
    root = Path(__file__).resolve().parent.parent
    read = lambda name: json.loads((root / name).read_text(encoding="utf-8"))
    works = read("corpus/catalog/works.json")
    editions = read("corpus/catalog/editions.json")
    languages = list(read("src/lib/locales.json"))
    works_by_id = {work["id"]: work for work in works}
    published = [edition for edition in editions if edition["status"] == "published" and edition["content_path"] and works_by_id[edition["work_id"]]["visibility"] == "public"]
    published_by_id = {edition["id"]: edition for edition in published}
    public_work_ids = {edition["work_id"] for edition in published}
    samples = [edition for edition in editions if edition["status"] == "sample" and works_by_id[edition["work_id"]]["visibility"] == "demo"]
    excluded = [edition for edition in editions if edition not in published and edition not in samples]
    texts = {edition["id"]: read(edition["content_path"]) for edition in published}
    structures = {work_id: read("corpus/structure/" + work_id + ".json")["segment_ids"] for work_id in public_work_ids}
    jobs, canonical_routes = {}, set()
    for lang in languages:
        for route in [lang + "/", lang + "/quality/", *[lang + "/works/" + work_id + "/" for work_id in sorted(public_work_ids)]]:
            jobs[route] = (200, "page", None)
            canonical_routes.add(urljoin(canonical_base, route))
        for edition in published:
            route = lang + "/read/" + edition["work_id"] + "/" + edition["id"] + "/"
            jobs[route] = (200, "reader", edition)
            canonical_routes.add(urljoin(canonical_base, route))
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
    for route, kind in [("", "root"), ("sitemap.xml", "sitemap"), ("robots.txt", "robots"), ("search-index.json", "search"), ("downloads/manifest.json", "download-manifest")]:
        jobs[route] = (200, kind, None)
    jobs["this-route-must-not-exist/"] = (404, "excluded", None)

    def check(item):
        route, (expected, kind, edition) = item
        url = urljoin(base, route)
        request = urllib.request.Request(url, headers={"User-Agent": "LitMundi-release-verification/2.0", "Cache-Control": "no-cache"})
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                status, data = response.status, response.read()
        except urllib.error.HTTPError as error:
            status, data = error.code, error.read()
        except Exception as error:
            return {"url": url, "expected_status": expected, "error": str(error), "passed": False}
        problems = []
        if status != expected:
            problems.append("Expected HTTP " + str(expected) + ", received " + str(status))
        try:
            if status == 200:
                if kind == "download":
                    if data != (root / "public" / route).read_bytes():
                        problems.append("Deployed download differs from validated local bytes")
                else:
                    text = data.decode("utf-8")
                    decoded = html.unescape(text)
                    if kind in ("page", "reader"):
                        links = [attributes(tag) for tag in re.findall(r"<link\b([^>]*)>", text)]
                        canonicals = [link.get("href") for link in links if link.get("rel") == "canonical"]
                        if canonicals != [urljoin(canonical_base, route)]:
                            problems.append("Incorrect canonical URL")
                        alternatives = {link.get("hreflang") for link in links if link.get("rel") == "alternate"}
                        if not {*languages, "x-default"}.issubset(alternatives) or 'href="#main"' not in text:
                            problems.append("Language alternatives or skip navigation missing")
                        if "reader-feedback.yml" not in text:
                            problems.append("Reader feedback template missing")
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
                    if kind == "sitemap":
                        entries = [node.text for node in ET.fromstring(text).findall("{http://www.sitemaps.org/schemas/sitemap/0.9}url/{http://www.sitemaps.org/schemas/sitemap/0.9}loc")]
                        if set(entries) != canonical_routes or len(entries) != len(canonical_routes):
                            problems.append("Sitemap does not contain exactly canonical public routes")
                    if kind == "download-manifest" and data != (root / "public/downloads/manifest.json").read_bytes():
                        problems.append("Download manifest differs from tested build")
                    if kind == "robots" and urljoin(canonical_base, "sitemap.xml") not in text:
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
        "limitations": ["Read-only HTTP/content verification; no human literary review or real reader-demand measurement.", "Correction links are checked without submitting issues or impersonating readers."],
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
