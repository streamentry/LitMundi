#!/usr/bin/env python3
"""Read-only lab inventory of generated HTML and directly linked CSS/JavaScript.

These are local byte counts and gzip estimates, not browser timings, HTTP
transfer measurements, Core Web Vitals, CrUX data, or search-ranking evidence.
"""
import argparse
import gzip
import json
import re
import statistics
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urljoin, urlsplit


class Resources(HTMLParser):
    def __init__(self, markup):
        super().__init__(convert_charrefs=True)
        self.resources = []
        self.inline_scripts = 0
        self.feed(markup)

    def handle_starttag(self, tag, attrs):
        values = dict(attrs)
        if tag == "link" and "stylesheet" in values.get("rel", "").split() and values.get("href"):
            self.resources.append({"url": values["href"], "kind": "stylesheet", "blocking": True})
        if tag == "script" and values.get("type") != "application/ld+json":
            if values.get("src"):
                self.resources.append({"url": values["src"], "kind": "script", "async": "async" in values,
                                       "blocking": values.get("type") != "module" and "async" not in values and "defer" not in values})
            else:
                self.inline_scripts += 1


def analyze(dist, canonical_base):
    dist = Path(dist).resolve()
    base = urlsplit(canonical_base)
    files = sorted(path for path in dist.rglob("*") if path.is_file())
    sizes = {}

    def size(path):
        if path not in sizes:
            data = path.read_bytes()
            sizes[path] = {"bytes": len(data), "gzip_estimate_bytes": len(gzip.compress(data, mtime=0))}
        return sizes[path]

    pages, blocking, external = [], [], {}
    for path in (file for file in files if file.suffix == ".html"):
        relative = path.relative_to(dist).as_posix()
        page_url = urljoin(canonical_base, relative.removesuffix("index.html"))
        document = Resources(path.read_text(encoding="utf-8"))
        dependencies = set()
        for resource in document.resources:
            absolute = urljoin(page_url, resource["url"])
            parsed = urlsplit(absolute)
            if (parsed.scheme, parsed.netloc) != (base.scheme, base.netloc):
                identity = (absolute, resource["kind"], bool(resource.get("async")), resource["blocking"])
                if identity not in external:
                    external[identity] = {"url": absolute, "kind": resource["kind"], "async": bool(resource.get("async")),
                                          "blocking": resource["blocking"], "referenced_by_pages": set()}
                external[identity]["referenced_by_pages"].add(relative)
                if resource["blocking"]:
                    blocking.append({"page": relative, "url": absolute, "kind": resource["kind"]})
                continue
            if not parsed.path.startswith(base.path):
                raise ValueError("Resource escapes the project base: " + absolute)
            target = (dist / unquote(parsed.path.removeprefix(base.path))).resolve()
            if not target.is_relative_to(dist) or not target.is_file():
                raise ValueError("Missing or unsafe linked resource: " + absolute)
            dependencies.add(target)
        pages.append({"path": relative, "html": size(path), "direct_css_js": {
            "scope": "local files only", "files": len(dependencies), "bytes": sum(size(item)["bytes"] for item in dependencies),
            "gzip_estimate_bytes": sum(size(item)["gzip_estimate_bytes"] for item in dependencies)},
            "inline_executable_script_elements": document.inline_scripts})
    for css in (file for file in files if file.suffix == ".css"):
        for match in re.finditer(r"@import\s+(?:url\(\s*)?[\"']?(https?://[^\s\"')]+|//[^\s\"')]+)", css.read_text(encoding="utf-8"), re.IGNORECASE):
            blocking.append({"stylesheet": css.relative_to(dist).as_posix(), "url": match.group(1), "kind": "CSS import"})
    counts = [page["html"]["bytes"] for page in pages]
    assets = {}
    for extension in (".html", ".css", ".js", ".json", ".png"):
        selected = [file for file in files if file.suffix == extension]
        assets[extension] = {"files": len(selected), "bytes": sum(size(file)["bytes"] for file in selected),
                             "gzip_estimate_bytes": sum(size(file)["gzip_estimate_bytes"] for file in selected)}
    external_resources = [{**resource, "referenced_by_pages": len(resource["referenced_by_pages"])} for resource in external.values()]
    return {"measurement": "Local build payload inventory", "html_pages": len(pages),
            "html_bytes_median": statistics.median(counts) if counts else 0,
            "html_bytes_max": max(counts, default=0), "assets": assets,
            "external_render_or_parser_blocking_resources": blocking,
            "external_resources": external_resources,
            "external_async_resources": [resource for resource in external_resources if resource["async"]],
            "largest_pages": sorted(pages, key=lambda page: page["html"]["bytes"], reverse=True)[:10],
            "limitations": ["Gzip sizes are local compression estimates; the deployed server's transfer encoding was not measured.",
                            "Inline scripts are included in HTML bytes. Direct dependencies exclude later fetches, dynamic imports and caching effects.",
                            "External script bodies, including Google Analytics, are listed but are not downloaded or included in local byte totals.",
                            "No timing, Core Web Vitals, CrUX, indexing, ranking or AI-citation claims can be inferred from these counts."],
            "pages": pages}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dist", type=Path, default=Path(__file__).resolve().parent.parent / "dist")
    parser.add_argument("--canonical-base", default="https://streamentry.github.io/LitMundi/")
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    report = analyze(args.dist, args.canonical_base.rstrip("/") + "/")
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({key: value for key, value in report.items() if key != "pages"}, ensure_ascii=False, indent=2))
    return 1 if report["external_render_or_parser_blocking_resources"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
