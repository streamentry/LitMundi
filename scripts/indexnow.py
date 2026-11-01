#!/usr/bin/env python3
"""Reviewable IndexNow snapshots, change plans and explicit post-deployment sends.

Python standard library only. Snapshot and plan never POST. There is deliberately
no scheduler, background retry, implicit whole-site submission or TLS bypass.
"""

import argparse
from dataclasses import dataclass
from datetime import datetime, timezone
import hashlib
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET


ENDPOINT = "https://api.indexnow.org/indexnow"
NAMESPACE = "{http://www.sitemaps.org/schemas/sitemap/0.9}"
MAX_URLS = 10_000
MAX_SITEMAPS = 32
MAX_RESPONSE_BYTES = 4 * 1024 * 1024
MAX_TOTAL_BYTES = 128 * 1024 * 1024
MAX_JSON_BYTES = 8 * 1024 * 1024
REQUEST_TIMEOUT = 20
OPERATION_TIMEOUT = 300
BATCH_SIZE = 10_000
SNAPSHOT_FORMAT = "litmundi-indexnow-snapshot-v1"
PLAN_FORMAT = "litmundi-indexnow-plan-v1"
REPORT_FORMAT = "litmundi-indexnow-report-v1"
HASH = re.compile(r"[a-f0-9]{64}\Z")
KEY = re.compile(r"[A-Za-z0-9-]{8,128}\Z")
VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"}
BLOCK = {"article", "aside", "blockquote", "br", "dd", "div", "dl", "dt", "footer", "h1", "h2", "h3", "h4", "h5", "h6", "header", "hr", "li", "main", "nav", "ol", "p", "pre", "section", "table", "td", "th", "tr", "ul"}
VOLATILE_JSON_KEYS = {"buildTimestamp", "buildTime", "generatedAt"}


class Failure(ValueError):
    """An invalid input or an operation that must not lead to a notification."""


def require(condition, message):
    if not condition:
        raise Failure(message)


def now():
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def sha(data):
    return hashlib.sha256(data).hexdigest()


def encoded(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2, allow_nan=False) + "\n").encode("utf-8")


def strict_json(data):
    def invalid(value):
        raise Failure("Non-finite JSON value: " + value)
    return json.loads(data, parse_constant=invalid)


def read_json(path):
    raw = Path(path).read_bytes()
    require(len(raw) <= MAX_JSON_BYTES, "JSON file exceeds size limit")
    return strict_json(raw), raw


def create_json(path, value):
    # Exclusive creation protects the reviewed evidence from accidental overwrite.
    with Path(path).open("xb") as handle:
        handle.write(encoded(value))


def update_report(path, value):
    # Reports are initialized exclusively, then replaced atomically after each batch.
    import tempfile
    destination = Path(path)
    with tempfile.NamedTemporaryFile(dir=destination.parent, prefix="indexnow-report-", delete=False) as handle:
        temporary = Path(handle.name)
        handle.write(encoded(value))
    try:
        temporary.replace(destination)
    finally:
        temporary.unlink(missing_ok=True)


def base_url(value):
    parsed = urllib.parse.urlsplit(value)
    require(parsed.scheme == "https" and parsed.hostname and not parsed.username and not parsed.password,
            "Base must be an HTTPS URL without credentials")
    require(parsed.port is None and not parsed.query and not parsed.fragment, "Base must not have a port, query or fragment")
    path = parsed.path or "/"
    require(path.startswith("/") and "//" not in path and "\\" not in path, "Invalid base path")
    require(not any(part in (".", "..") for part in path.split("/")) and "%" not in path, "Base must have an unambiguous literal path")
    return urllib.parse.urlunsplit(("https", parsed.netloc, path.rstrip("/") + "/", "", ""))


def scoped_url(value, base):
    require(isinstance(value, str), "URL must be a string")
    parsed, origin = urllib.parse.urlsplit(value), urllib.parse.urlsplit(base)
    require(parsed.scheme == origin.scheme and parsed.netloc == origin.netloc and not parsed.username and not parsed.password,
            "URL is outside the configured HTTPS origin: " + value)
    require(not parsed.query and not parsed.fragment and parsed.path.startswith(origin.path),
            "URL is outside the project path or has a query/fragment: " + value)
    decoded = urllib.parse.unquote(parsed.path)
    require("\\" not in decoded and "//" not in decoded and not any(part in (".", "..") for part in decoded.split("/")),
            "Ambiguous URL path: " + value)
    require(not any(ord(character) < 33 or ord(character) == 127 for character in value), "Control character or whitespace in URL")
    return value


@dataclass
class Response:
    status: int
    url: str
    headers: dict
    body: bytes


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, request, response, code, message, headers, new_url):
        return None


class Client:
    def __init__(self, base):
        self.base = base
        self.opener = urllib.request.build_opener(NoRedirect())
        self.deadline = time.monotonic() + OPERATION_TIMEOUT
        self.total_bytes = 0

    def request(self, method, url, data=None):
        require(method == "GET" or (method == "POST" and url == ENDPOINT), "Unexpected HTTP operation")
        if method == "GET":
            scoped_url(url, self.base)
        remaining = self.deadline - time.monotonic()
        require(remaining > 0, "Operation exceeded its time budget")
        headers = {"User-Agent": "LitMundi-IndexNow/1.0", "Cache-Control": "no-cache", "Accept-Encoding": "identity"}
        if method == "POST":
            headers["Content-Type"] = "application/json; charset=utf-8"
        request = urllib.request.Request(url, data=data, headers=headers, method=method)
        try:
            response = self.opener.open(request, timeout=min(REQUEST_TIMEOUT, remaining))
        except urllib.error.HTTPError as error:
            response = error
        except (OSError, urllib.error.URLError) as error:
            raise Failure("HTTP request failed for " + url + ": " + str(error)) from error
        with response:
            chunks, count = [], 0
            while True:
                require(time.monotonic() < self.deadline, "Operation exceeded its time budget")
                chunk = response.read(64 * 1024)
                if not chunk:
                    break
                count += len(chunk)
                self.total_bytes += len(chunk)
                require(count <= MAX_RESPONSE_BYTES, "HTTP response exceeds byte limit: " + url)
                require(self.total_bytes <= MAX_TOTAL_BYTES, "Operation exceeds total byte limit")
                chunks.append(chunk)
            return Response(response.code, response.geturl(), {key.lower(): value for key, value in response.headers.items()}, b"".join(chunks))


def normalized_text(value):
    return re.sub(r"\s+", " ", value).strip()


def clean_structured(value):
    if isinstance(value, dict):
        return {key: clean_structured(item) for key, item in value.items() if key not in VOLATILE_JSON_KEYS}
    if isinstance(value, list):
        return [clean_structured(item) for item in value]
    return value


class Page(HTMLParser):
    """A conservative content fingerprint; not a browser or an SEO score."""
    def __init__(self, url):
        super().__init__(convert_charrefs=True)
        self.url = url
        self.stack = []
        self.title = []
        self.text = []
        self.canonicals = []
        self.alternates = []
        self.metadata = []
        self.links = []
        self.languages = []
        self.images = []
        self.structured = []
        self.json_buffer = None
        self.robots = []
        self.base_elements = []

    def handle_starttag(self, tag, attributes):
        attrs = dict(attributes)
        tags = [entry[0] for entry in self.stack]
        hidden = any(entry[1] for entry in self.stack) or "hidden" in attrs or attrs.get("aria-hidden") == "true"
        hidden = hidden or "data-build-timestamp" in attrs or "data-generated-at" in attrs
        if tag == "script" and attrs.get("type", "").lower() == "application/ld+json":
            self.json_buffer = []
        if tag == "base" and attrs.get("href"):
            self.base_elements.append(attrs["href"])
        if tag == "link" and "head" in tags:
            rel = attrs.get("rel", "").lower().split()
            if "canonical" in rel:
                self.canonicals.append(attrs.get("href", ""))
            if "alternate" in rel and attrs.get("hreflang"):
                self.alternates.append([attrs["hreflang"], attrs.get("href", "")])
        if tag == "meta" and "head" in tags:
            key = (attrs.get("name") or attrs.get("property") or "").lower()
            if key in ("description", "author", "robots", "googlebot", "bingbot") or key.startswith(("og:", "twitter:")):
                self.metadata.append([key, attrs.get("content", "")])
            if key in ("robots", "googlebot", "bingbot"):
                self.robots.append(attrs.get("content", ""))
        if not hidden:
            if attrs.get("lang"):
                self.languages.append([tag, attrs["lang"]])
            if "body" in tags:
                if tag in BLOCK:
                    self.text.append("\n")
                if tag == "a" and attrs.get("href"):
                    self.links.append(urllib.parse.urljoin(self.url, attrs["href"]))
                if tag == "img":
                    self.images.append([attrs.get("alt", ""), urllib.parse.urljoin(self.url, attrs.get("src", ""))])
        if tag not in VOID:
            self.stack.append((tag, hidden))

    def handle_startendtag(self, tag, attributes):
        self.handle_starttag(tag, attributes)
        if tag not in VOID:
            self.handle_endtag(tag)

    def handle_endtag(self, tag):
        if tag == "script" and self.json_buffer is not None:
            try:
                self.structured.append(clean_structured(strict_json("".join(self.json_buffer))))
            except (ValueError, TypeError) as error:
                raise Failure("Invalid JSON-LD at " + self.url) from error
            self.json_buffer = None
        if tag in BLOCK:
            self.text.append("\n")
        for index in range(len(self.stack) - 1, -1, -1):
            if self.stack[index][0] == tag:
                del self.stack[index:]
                break

    def handle_data(self, data):
        tags = [entry[0] for entry in self.stack]
        if self.json_buffer is not None:
            self.json_buffer.append(data)
        if "title" in tags and "head" in tags:
            self.title.append(data)
        if "body" in tags and not any(entry[1] for entry in self.stack) and not any(tag in tags for tag in ("script", "style", "template")):
            self.text.append(data)

    def noindex(self, headers):
        values = self.robots + [headers.get("x-robots-tag", "")]
        return any(re.search(r"(?:^|[\s,:])(?:noindex|none)(?:$|[\s,;])", value.lower()) for value in values)

    def semantic(self, headers):
        return {"title": normalized_text("".join(self.title)), "text": normalized_text("".join(self.text)),
                "canonical": self.canonicals, "hreflang": sorted(self.alternates), "metadata": sorted(self.metadata),
                "links": self.links, "languages": self.languages, "images": self.images,
                "json_ld": self.structured, "x_robots_tag": headers.get("x-robots-tag", "")}


def parse_page(response):
    require(response.headers.get("content-type", "").split(";", 1)[0].lower() in ("text/html", "application/xhtml+xml"),
            "Expected HTML response: " + response.url)
    page = Page(response.url)
    page.feed(response.body.decode("utf-8", errors="strict"))
    page.close()
    require(page.json_buffer is None, "Unclosed JSON-LD script: " + response.url)
    require(not page.base_elements, "HTML base elements are not supported: " + response.url)
    return page


def canonical_record(response, url, base):
    require(response.status == 200 and response.url == url, "Canonical page must return direct HTTP 200: " + url)
    page = parse_page(response)
    require(page.canonicals == [url], "Sitemap page does not have exactly one self canonical: " + url)
    require(not page.noindex(response.headers), "Sitemap page is noindex: " + url)
    require(normalized_text("".join(page.title)) and normalized_text("".join(page.text)), "Empty title or reading content: " + url)
    for _, target in page.alternates:
        scoped_url(target, base)
    return {"url": url, "semantic_sha256": sha(encoded(page.semantic(response.headers))), "html_sha256": sha(response.body)}


def sitemap_inventory(base, client):
    first = base + "sitemap-index.xml"
    queue, visited, urls = [first], [], set()
    while queue:
        url = queue.pop(0)
        require(url not in visited and len(visited) < MAX_SITEMAPS, "Duplicate sitemap or sitemap count limit exceeded")
        visited.append(url)
        response = client.request("GET", scoped_url(url, base))
        require(response.status == 200 and response.url == url, "Sitemap must return direct HTTP 200: " + url)
        require(not re.search(br"<!\s*(?:DOCTYPE|ENTITY)", response.body, re.I), "DTD/entity declarations are not allowed")
        try:
            root = ET.fromstring(response.body)
        except ET.ParseError as error:
            raise Failure("Invalid sitemap XML: " + url) from error
        require(root.tag in (NAMESPACE + "sitemapindex", NAMESPACE + "urlset"), "Unexpected sitemap root or namespace")
        if root.tag == NAMESPACE + "sitemapindex":
            require(url == first, "Nested sitemap indexes are not supported")
            items, target = root.findall(NAMESPACE + "sitemap"), queue
        else:
            items, target = root.findall(NAMESPACE + "url"), None
        require(len(items) == len(root), "Unexpected elements in sitemap inventory: " + url)
        require(items, "Empty sitemap: " + url)
        for item in items:
            locations = item.findall(NAMESPACE + "loc")
            require(len(locations) == 1 and locations[0].text, "Each sitemap entry needs exactly one loc")
            value = scoped_url(locations[0].text.strip(), base)
            if target is not None:
                require(value not in target and value not in visited, "Repeated sitemap URL")
                require(len(target) + len(visited) < MAX_SITEMAPS, "Sitemap count limit exceeded")
                target.append(value)
            else:
                require(value not in urls, "Repeated canonical sitemap URL: " + value)
                urls.add(value)
                require(len(urls) <= MAX_URLS, "Canonical URL count limit exceeded")
    require(urls, "No canonical URLs in sitemap")
    return sorted(urls), sorted(visited)


def snapshot(base, client=None):
    base = base_url(base)
    client = client or Client(base)
    urls, maps = sitemap_inventory(base, client)
    pages = [canonical_record(client.request("GET", url), url, base) for url in urls]
    return {"format": SNAPSHOT_FORMAT, "base": base, "captured_at": now(), "sitemaps": maps, "pages": pages}


def validate_snapshot(value):
    require(isinstance(value, dict) and value.get("format") == SNAPSHOT_FORMAT, "Unknown snapshot format")
    base = base_url(value.get("base", ""))
    require(value["base"] == base, "Snapshot base is not normalized")
    require(isinstance(value.get("captured_at"), str), "Snapshot timestamp is missing")
    pages = value.get("pages")
    require(isinstance(pages, list) and 0 < len(pages) <= MAX_URLS, "Invalid snapshot page count")
    seen = set()
    for page in pages:
        require(isinstance(page, dict) and set(page) == {"url", "semantic_sha256", "html_sha256"}, "Invalid page record")
        url = scoped_url(page["url"], base)
        require(url not in seen, "Repeated URL in snapshot")
        seen.add(url)
        require(all(isinstance(page[key], str) and HASH.fullmatch(page[key]) for key in ("semantic_sha256", "html_sha256")), "Invalid page digest")
    require([page["url"] for page in pages] == sorted(seen), "Snapshot pages must be sorted")
    return base


def changes(before, after):
    old, new = ({page["url"]: page for page in snap["pages"]} for snap in (before, after))
    return {"added": sorted(new.keys() - old.keys()),
            "changed": sorted(url for url in new.keys() & old.keys() if new[url]["semantic_sha256"] != old[url]["semantic_sha256"]),
            "retired": sorted(old.keys() - new.keys())}


def make_plan(before, after):
    require(validate_snapshot(before) == validate_snapshot(after), "Cannot plan across different site bases")
    return {"format": PLAN_FORMAT, "created_at": now(), "base": before["base"], "before": before, "after": after,
            "changes": changes(before, after)}


def validate_plan(plan):
    require(isinstance(plan, dict) and plan.get("format") == PLAN_FORMAT, "Unknown plan format")
    require(validate_snapshot(plan.get("before")) == validate_snapshot(plan.get("after")) == plan.get("base"), "Plan bases differ")
    require(plan.get("changes") == changes(plan["before"], plan["after"]), "Plan changes do not match snapshots")
    return plan["base"]


def batches_for(plan):
    urls = sorted(set(url for group in plan["changes"].values() for url in group))
    return [{"id": sha(encoded(urls[index:index + BATCH_SIZE])), "urls": urls[index:index + BATCH_SIZE]}
            for index in range(0, len(urls), BATCH_SIZE)]


def verify_retired(url, base, current_urls, client):
    response = client.request("GET", url)
    require(response.url == url, "Retired URL unexpectedly followed a redirect")
    if response.status in (404, 410):
        return
    if response.status in (301, 302, 303, 307, 308):
        target = urllib.parse.urljoin(url, response.headers.get("location", ""))
        require(scoped_url(target, base) in current_urls, "Retired URL redirects outside current canonical inventory")
        return
    require(response.status == 200, "Unexpected retired URL status: " + str(response.status))
    page = parse_page(response)
    if page.noindex(response.headers):
        return
    require(len(page.canonicals) == 1 and page.canonicals[0] != url and page.canonicals[0] in current_urls,
            "Retired URL is still indexable/self-canonical or has no valid replacement: " + url)


def submit(plan_path, key_path, output_path, resume_path=None, client=None):
    plan, plan_bytes = read_json(plan_path)
    base = validate_plan(plan)
    batches = batches_for(plan)
    report = {"format": REPORT_FORMAT, "plan_sha256": sha(plan_bytes), "base": base, "started_at": now(),
              "status": "pending", "indexing": "not_measured", "verification": "not_run",
              "batches": [{**batch, "status": "pending"} for batch in batches]}
    previous = None
    if resume_path:
        previous, _ = read_json(resume_path)
        require(previous.get("format") == REPORT_FORMAT and previous.get("plan_sha256") == report["plan_sha256"],
                "Resume report does not match the exact plan bytes")
        require([{key: batch.get(key) for key in ("id", "urls")} for batch in previous.get("batches", [])] == batches,
                "Resume report batches differ from the reviewed plan")
    create_json(output_path, report)
    try:
        if not batches:
            report["status"] = "no_changes"
        else:
            key_bytes = Path(key_path).read_bytes()
            require(len(key_bytes) <= 129, "Key file exceeds expected size")
            key = key_bytes.decode("ascii").removesuffix("\n")
            require(KEY.fullmatch(key) and Path(key_path).name == key + ".txt", "Key must match its <key>.txt filename")
            key_location = base + key + ".txt"
            report["key_location"] = key_location
            report["key_body_sha256"] = sha(key_bytes)
            if previous:
                require(previous.get("key_location") == key_location and previous.get("key_body_sha256") == sha(key_bytes),
                        "Resume key differs from previous report")
            client = client or Client(base)
            key_response = client.request("GET", key_location)
            require(key_response.status == 200 and key_response.url == key_location and key_response.body == key_bytes,
                    "Live ownership key must match local bytes at the exact project URL")
            live = snapshot(base, client)
            require(live["pages"] == plan["after"]["pages"], "Production inventory/content differs from reviewed after-snapshot; capture and review a new plan")
            current_urls = {page["url"] for page in live["pages"]}
            for url in plan["changes"]["retired"]:
                verify_retired(url, base, current_urls, client)
            report["verification"] = "passed"
            update_report(output_path, report)
            for index, batch in enumerate(report["batches"]):
                prior = previous["batches"][index] if previous else None
                if prior and ((prior.get("http_status") == 200 and prior.get("status") == "received") or
                              (prior.get("http_status") == 202 and prior.get("status") == "key_validation_pending")):
                    batch.update({"status": prior["status"], "http_status": prior["http_status"], "resumed_acknowledgment": True})
                    update_report(output_path, report)
                    continue
                payload = {"host": urllib.parse.urlsplit(base).netloc, "key": key, "keyLocation": key_location, "urlList": batch["urls"]}
                batch["attempted_at"] = now()
                update_report(output_path, report)
                try:
                    response = client.request("POST", ENDPOINT, encoded(payload))
                except (Failure, OSError) as error:
                    batch["status"] = "unconfirmed"
                    batch["error"] = str(error)
                    raise
                batch["http_status"] = response.status
                require(response.url == ENDPOINT, "IndexNow endpoint redirected unexpectedly")
                if response.status in (200, 202):
                    batch["status"] = "received" if response.status == 200 else "key_validation_pending"
                    batch["acknowledged_at"] = now()
                    update_report(output_path, report)
                else:
                    batch["status"] = "failed"
                    batch["response_excerpt"] = response.body.decode("utf-8", errors="replace")[:300]
                    if response.headers.get("retry-after"):
                        batch["retry_after"] = response.headers["retry-after"]
                    raise Failure("IndexNow HTTP " + str(response.status) + "; no automatic retry; retain this plan and report")
            report["status"] = "key_validation_pending" if any(batch["status"] == "key_validation_pending" for batch in report["batches"]) else "received"
    except (Failure, OSError, UnicodeError, ValueError, KeyError, TypeError) as error:
        report["status"] = "failed"
        report["error"] = str(error)
    report["finished_at"] = now()
    update_report(output_path, report)
    return report


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    subparsers = parser.add_subparsers(dest="command", required=True)
    capture = subparsers.add_parser("snapshot", help="Read a live canonical sitemap inventory; never POST")
    capture.add_argument("--base", required=True)
    capture.add_argument("--output", type=Path, required=True)
    plan = subparsers.add_parser("plan", help="Write an immutable reviewable diff; no HTTP")
    plan.add_argument("--before", type=Path, required=True)
    plan.add_argument("--after", type=Path, required=True)
    plan.add_argument("--output", type=Path, required=True)
    send = subparsers.add_parser("submit", help="Explicitly verify production and POST the reviewed changes")
    send.add_argument("--plan", type=Path, required=True)
    send.add_argument("--key-file", type=Path, required=True)
    send.add_argument("--output", type=Path, required=True)
    send.add_argument("--resume-report", "--report", type=Path, help="Skip acknowledged batches only when this report matches the exact plan")
    args = parser.parse_args(argv)
    try:
        if args.command == "snapshot":
            result = snapshot(args.base)
            create_json(args.output, result)
            print("Captured", len(result["pages"]), "canonical URLs; no notifications sent.")
        elif args.command == "plan":
            result = make_plan(read_json(args.before)[0], read_json(args.after)[0])
            create_json(args.output, result)
            print("Plan:", ", ".join(str(len(urls)) + " " + kind for kind, urls in result["changes"].items()), "; no notifications sent.")
        else:
            result = submit(args.plan, args.key_file, args.output, args.resume_report)
            print("IndexNow:", result["status"] + "; indexing not measured. Report:", args.output)
            if result["status"] == "failed":
                print(result.get("error", "Submission failed"), file=sys.stderr)
                return 1
    except (Failure, OSError, UnicodeError, ValueError, KeyError, TypeError) as error:
        print("IndexNow stopped:", str(error), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
