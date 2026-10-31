#!/usr/bin/env python3
"""Read-only production verification against the local canonical corpus."""
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
from urllib.parse import urljoin

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base", default="https://streamentry.github.io/LitMundi/")
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    base = args.base.rstrip("/") + "/"
    root = Path(__file__).resolve().parent.parent
    read = lambda name: json.loads((root / name).read_text(encoding="utf-8"))
    works = read("corpus/catalog/works.json")
    editions = read("corpus/catalog/editions.json")
    languages = ["en", "vi", "fr", "es"]
    public_ids = {w["id"] for w in works if w["visibility"] == "public"}
    published = [e for e in editions if e["status"] == "published" and e["work_id"] in public_ids]
    jobs = {}
    for lang in languages:
        for route in [lang + "/", lang + "/quality/"]:
            jobs[route] = (200, "page", None)
        for work in works:
            if work["id"] in public_ids:
                jobs[lang + "/works/" + work["id"] + "/"] = (200, "page", None)
        for e in published:
            jobs[lang + "/read/" + e["work_id"] + "/" + e["id"] + "/"] = (200, "reader", e)
        for e in editions:
            if e["status"] in ("draft", "planned", "withdrawn"):
                jobs[lang + "/read/" + e["work_id"] + "/" + e["id"] + "/"] = (404, "excluded", None)
        jobs[lang + "/read/demo-proust/fr/"] = (200, "legacy", None)
    for e in published:
        for extension in ("json", "txt", "epub", "tsv"):
            jobs["downloads/" + e["id"] + "." + extension] = (200, "download", e)
    for route, kind in [("", "root"), ("sitemap.xml", "sitemap"), ("robots.txt", "robots"), ("search-index.json", "search"), ("downloads/manifest.json", "download-manifest")]:
        jobs[route] = (200, kind, None)
    jobs["this-route-must-not-exist/"] = (404, "excluded", None)

    def check(item):
        route, (expected, kind, edition) = item
        url = urljoin(base, route)
        request = urllib.request.Request(url, headers={"User-Agent": "LitMundi-release-verification/1.0", "Cache-Control": "no-cache"})
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
        if status == 200:
            if kind == "download":
                local = (root / "public" / route).read_bytes()
                if data != local:
                    problems.append("Deployed download differs from validated local bytes")
            else:
                text = data.decode("utf-8")
                if kind in ("page", "reader"):
                    if 'href="' + url + '"' not in text or 'rel="canonical"' not in text:
                        problems.append("Canonical URL missing")
                    if 'hreflang="vi"' not in text or 'href="#main"' not in text:
                        problems.append("Language alternatives or skip navigation missing")
                    if "reader-feedback.yml" not in text:
                        problems.append("Reader feedback template missing")
                if kind == "reader":
                    decoded = html.unescape(text)
                    for identifier, passage in read(edition["content_path"]).items():
                        if 'id="' + identifier + '"' not in decoded or passage not in decoded:
                            problems.append("Missing canonical passage " + identifier)
                    if edition["provenance"]["citation"] not in decoded:
                        problems.append("Source attribution missing")
                    if "https://github.com/streamentry/LitMundi/issues/new?" not in decoded:
                        problems.append("Correction link missing")
                    if edition["rights"]["basis"] not in decoded:
                        problems.append("Rights assessment missing")
                if kind == "legacy" and "noindex" not in text:
                    problems.append("Legacy sample is indexable")
                if kind == "search":
                    found = json.loads(text)
                    if sorted(x["editionId"] for x in found) != sorted(e["id"] for e in published):
                        problems.append("Search does not contain exactly published editions")
                if kind == "sitemap":
                    for edition in editions:
                        if edition["status"] != "published" and edition["id"] in text:
                            problems.append("Unpublished edition leaked into sitemap")
                if kind == "download-manifest":
                    if data != (root / "public/downloads/manifest.json").read_bytes():
                        problems.append("Download manifest differs from tested build")
                if kind == "robots" and urljoin(base, "sitemap.xml") not in text:
                    problems.append("Sitemap declaration missing")
        return {"url": url, "status": status, "expected_status": expected, "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest(), "passed": not problems, "problems": problems}

    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
        results = list(executor.map(check, jobs.items()))
    report = {
        "checked_at_utc": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "base_url": base,
        "status": "passed" if all(r["passed"] for r in results) else "failed",
        "checks": len(results),
        "published_editions": [e["id"] for e in published],
        "limitations": ["Read-only production HTTP/content verification; no human literary review or real reader-demand measurement.", "The correction links are checked without submitting test issues or impersonating readers."],
        "results": results
    }
    rendered = json.dumps(report, ensure_ascii=False, indent=2) + "\n"
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(rendered, encoding="utf-8")
    print("Production verification:", report["status"], "-", len(results), "HTTP/content checks")
    for result in results:
        if not result["passed"]:
            print(result["url"], result.get("problems", result.get("error")))
    return 0 if report["status"] == "passed" else 1

if __name__ == "__main__":
    raise SystemExit(main())
