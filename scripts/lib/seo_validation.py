"""Independent XML/HTML checks for the public search inventory (standard library only)."""
import datetime
import json
import re
import xml.etree.ElementTree as ET
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urljoin, urlsplit

SITEMAP_NS = "http://www.sitemaps.org/schemas/sitemap/0.9"
XHTML_NS = "http://www.w3.org/1999/xhtml"
MAX_ENTRIES = 50_000
MAX_BYTES = 52_428_800


def require(condition, message):
    if not condition:
        raise ValueError(message)


def expected_inventory(root, canonical_base):
    """Derive expectations from the corpus, independently of the JavaScript renderer."""
    read = lambda name: json.loads((Path(root) / name).read_text(encoding="utf-8"))
    locales = list(read("src/lib/locales.json"))
    fallback = "en" if "en" in locales else sorted(locales)[0]
    works = {work["id"]: work for work in read("corpus/catalog/works.json")}
    published = [edition for edition in read("corpus/catalog/editions.json")
                 if edition["status"] == "published" and edition["content_path"]
                 and works[edition["work_id"]]["visibility"] == "public"]
    editions = {edition["id"]: edition for edition in published}
    visible = sorted({edition["work_id"] for edition in published})
    routes, wrappers = {}, {}

    def reader_url(edition):
        locale = edition["language"] if edition["language"] in locales else fallback
        return urljoin(canonical_base, "/".join([locale, "read", edition["work_id"], edition["id"], ""]))

    for suffix in ["", "quality/", *("works/" + work + "/" for work in visible)]:
        alternates = {locale: urljoin(canonical_base, locale + "/" + suffix) for locale in locales}
        alternates["x-default"] = alternates[fallback]
        for locale in locales:
            url = alternates[locale]
            routes[url] = {"locale": locale, "alternates": alternates, "kind": "page"}

    for edition in published:
        source = edition if edition["kind"] == "source" else editions.get(edition.get("source_edition_id"))
        require(source is not None and source["kind"] == "source" and source["work_id"] == edition["work_id"],
                "Published reader lacks its exact public source: " + edition["id"])
        family = [source, *(candidate for candidate in published if candidate["kind"] == "translation"
                            and candidate.get("source_edition_id") == source["id"])]
        counts = Counter(member["language"] for member in family)
        canonical = reader_url(edition)
        # Multiple editions in one language do not define a unique language alternate.
        if any(count > 1 for count in counts.values()):
            alternates = {edition["language"]: canonical, "x-default": canonical}
        else:
            alternates = {member["language"]: reader_url(member) for member in family}
            alternates["x-default"] = reader_url(source)
        locale = edition["language"] if edition["language"] in locales else fallback
        routes[canonical] = {"locale": locale, "alternates": alternates, "kind": "reader", "edition": edition}
        for interface in locales:
            wrapper = urljoin(canonical_base, "/".join([interface, "read", edition["work_id"], edition["id"], ""]))
            wrappers[wrapper] = canonical
    return {"locales": locales, "routes": routes, "wrappers": wrappers, "editions": editions}


def validate_url(value, canonical_base, *, page=False):
    require(isinstance(value, str) and value == value.strip() and value, "Missing or padded sitemap URL")
    parsed, base = urlsplit(value), urlsplit(canonical_base)
    require(parsed.scheme == "https" and parsed.netloc == base.netloc and not parsed.username and not parsed.password,
            "Sitemap URL must use the canonical HTTPS origin: " + value)
    require(parsed.path.startswith(base.path) and not parsed.query and not parsed.fragment,
            "Sitemap URL escapes the project base or contains query/fragment: " + value)
    decoded = unquote(parsed.path)
    require(not any(part in (".", "..") for part in decoded.split("/")) and "//" not in decoded,
            "Sitemap URL contains an ambiguous path: " + value)
    if page:
        require(parsed.path.endswith("/"), "Canonical HTML URL needs a trailing slash: " + value)
    return parsed


def parse_xml(data, expected_tag, label):
    require(len(data) <= MAX_BYTES, "Sitemap exceeds 50 MiB: " + label)
    text = data.decode("utf-8")
    require("<!DOCTYPE" not in text.upper() and "<!ENTITY" not in text.upper(), "XML declarations are not allowed: " + label)
    root = ET.fromstring(text)
    require(root.tag == "{" + SITEMAP_NS + "}" + expected_tag, "Incorrect sitemap root/namespace: " + label)
    return root


def parse_index(data, canonical_base, locales):
    root = parse_xml(data, "sitemapindex", "sitemap-index.xml")
    require(0 < len(root) <= MAX_ENTRIES, "Invalid sitemap-index child count")
    children, names_by_locale = {}, {locale: [] for locale in locales}
    for item in root:
        require(item.tag == "{" + SITEMAP_NS + "}sitemap", "Unexpected sitemap-index element")
        require([child.tag for child in item] == ["{" + SITEMAP_NS + "}loc"], "Index entries must contain one loc and no invented lastmod")
        url = item[0].text
        parsed = validate_url(url, canonical_base)
        require(url not in children, "Duplicate child sitemap: " + url)
        name = parsed.path.removeprefix(urlsplit(canonical_base).path)
        matched = re.fullmatch(r"sitemap-(" + "|".join(map(re.escape, locales)) + r")(?:-([1-9][0-9]*))?\.xml", name)
        require(matched is not None, "Child sitemap must be a locale XML file at project root: " + url)
        locale, shard = matched.groups()
        children[url] = {"name": name, "locale": locale}
        names_by_locale[locale].append(int(shard) if shard else None)
    for locale, shards in names_by_locale.items():
        require(bool(shards), "Locale missing from sitemap index: " + locale)
        require(shards == [None] or (None not in shards and len(shards) > 1 and sorted(shards) == list(range(1, len(shards) + 1))),
                "Sitemap shards must be contiguous or a single unnumbered locale file: " + locale)
    return children


def validate_lastmod(value, label):
    require(value is not None and bool(re.fullmatch(r"\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))?", value)),
            "Invalid W3C lastmod: " + label)
    moment = datetime.datetime.fromisoformat(value.replace("Z", "+00:00"))
    if moment.tzinfo is None:
        moment = moment.replace(tzinfo=datetime.timezone.utc)
    require(moment <= datetime.datetime.now(datetime.timezone.utc), "Future lastmod: " + label)


def parse_sitemap(data, canonical_base, locale, label):
    root = parse_xml(data, "urlset", label)
    require(0 < len(root) <= MAX_ENTRIES, "Invalid URL count in " + label)
    entries = {}
    for item in root:
        require(item.tag == "{" + SITEMAP_NS + "}url", "Unexpected urlset element: " + label)
        locations = item.findall("{" + SITEMAP_NS + "}loc")
        dates = item.findall("{" + SITEMAP_NS + "}lastmod")
        require(len(locations) == 1 and len(dates) <= 1, "URL needs one loc and at most one lastmod: " + label)
        url = locations[0].text
        parsed = validate_url(url, canonical_base, page=True)
        require(parsed.path.startswith(urlsplit(canonical_base).path + locale + "/"), "URL is in the wrong locale sitemap: " + url)
        require(url not in entries, "Duplicate URL in sitemap: " + url)
        if dates:
            validate_lastmod(dates[0].text, url)
        alternates = {}
        for child in item:
            if child.tag in ("{" + SITEMAP_NS + "}loc", "{" + SITEMAP_NS + "}lastmod"):
                continue
            require(child.tag == "{" + XHTML_NS + "}link", "Unexpected sitemap extension/namespace: " + url)
            require(set(child.attrib) == {"rel", "hreflang", "href"} and child.get("rel") == "alternate", "Malformed hreflang element: " + url)
            language, href = child.get("hreflang"), child.get("href")
            require(language and language not in alternates, "Duplicate or missing hreflang: " + url)
            validate_url(href, canonical_base, page=True)
            alternates[language] = href
        require(url in alternates.values(), "Hreflang must include its own URL: " + url)
        entries[url] = alternates
    return entries


class PageHead(HTMLParser):
    def __init__(self, markup):
        super().__init__(convert_charrefs=True)
        self.in_head = False
        self.links, self.metas, self.structured = [], [], []
        self.document_language = None
        self.capture_json = None
        self.feed(markup)

    def handle_starttag(self, tag, attrs):
        values = dict(attrs)
        if tag == "html":
            self.document_language = values.get("lang")
        if tag == "head":
            self.in_head = True
        if self.in_head and tag == "link":
            self.links.append(values)
        if self.in_head and tag == "meta":
            self.metas.append(values)
        if self.in_head and tag == "script" and values.get("type") == "application/ld+json":
            self.capture_json = ""

    def handle_data(self, data):
        if self.capture_json is not None:
            self.capture_json += data

    def handle_endtag(self, tag):
        if tag == "script" and self.capture_json is not None:
            self.structured.append(json.loads(self.capture_json))
            self.capture_json = None
        if tag == "head":
            self.in_head = False

    @property
    def noindex(self):
        return any(meta.get("name", "").lower() == "robots" and "noindex" in re.split(r"[,\s]+", meta.get("content", "").lower())
                   for meta in self.metas)

    @property
    def canonicals(self):
        return [link.get("href") for link in self.links if link.get("rel") == "canonical"]

    @property
    def alternates(self):
        links = [link for link in self.links if link.get("rel") == "alternate" and "hreflang" in link]
        result = {link["hreflang"]: link.get("href") for link in links}
        require(len(result) == len(links), "Duplicate HTML hreflang language")
        return result


def validate_page(markup, url, inventory, canonical_base):
    head = PageHead(markup)
    canonical = inventory["wrappers"].get(url, url)
    record = inventory["routes"].get(canonical)
    require(record is not None, "Unknown public page: " + url)
    require(not head.noindex, "Public page is noindex: " + url)
    require(head.canonicals == [canonical], "Incorrect canonical URL: " + url)
    expected = record["alternates"] if canonical == url else {}
    require(head.alternates == expected, "HTML hreflang differs from published language family: " + url)
    require(head.document_language == url.removeprefix(canonical_base).split("/")[0], "Incorrect interface language: " + url)
    og_urls = [meta.get("content") for meta in head.metas if meta.get("property") == "og:url"]
    require(og_urls == [canonical], "Open Graph URL differs from canonical: " + url)
    sitemap_links = [urljoin(url, link.get("href", "")) for link in head.links if link.get("rel") == "sitemap"]
    require(sitemap_links == [urljoin(canonical_base, "sitemap-index.xml")], "HTML does not advertise the sitemap index: " + url)
    if record["kind"] == "reader":
        edition = record["edition"]
        data = [item for item in head.structured if item.get("@type") == "CreativeWork"]
        require(len(data) == 1, "Reader must expose one CreativeWork: " + url)
        require(data[0].get("url") == canonical and data[0].get("@id") == canonical + "#edition", "Structured edition URLs differ from canonical: " + url)
        require(data[0].get("inLanguage") == edition["language"] and data[0].get("identifier") == edition["id"], "Structured text language/edition differs: " + url)
    return head


def verify_build(root, canonical_base):
    root = Path(root)
    dist = root / "dist"
    inventory = expected_inventory(root, canonical_base)
    index = (dist / "sitemap-index.xml").read_bytes()
    require((dist / "sitemap.xml").read_bytes() == index, "Legacy sitemap.xml must remain an identical index alias")
    children = parse_index(index, canonical_base, inventory["locales"])
    actual, contents = {}, {}
    for info in children.values():
        data = (dist / info["name"]).read_bytes()
        contents[info["name"]] = data
        entries = parse_sitemap(data, canonical_base, info["locale"], info["name"])
        require(not set(entries).intersection(actual), "Duplicate canonical URL across child sitemaps")
        actual.update(entries)
    require(set(actual) == set(inventory["routes"]), "Sitemaps do not contain exactly canonical public routes; missing="
            + repr(sorted(set(inventory["routes"]) - set(actual))) + "; unexpected=" + repr(sorted(set(actual) - set(inventory["routes"]))))
    expected_files = {"sitemap-index.xml", "sitemap.xml", *(info["name"] for info in children.values())}
    require({path.name for path in dist.glob("sitemap*.xml")} == expected_files, "Stale or unreferenced sitemap output")
    for url, alternates in actual.items():
        require(alternates == inventory["routes"][url]["alternates"], "XML hreflang differs from published language family: " + url)
        for href in alternates.values():
            require(href in actual and actual[href] == alternates, "Hreflang cluster is not canonical and reciprocal: " + url)
    checked = set()
    for path in dist.rglob("*.html"):
        relative = path.relative_to(dist).as_posix().removesuffix("index.html")
        url = urljoin(canonical_base, relative)
        text = path.read_text(encoding="utf-8")
        head = PageHead(text)
        if url in inventory["routes"] or url in inventory["wrappers"]:
            validate_page(text, url, inventory, canonical_base)
            checked.add(url)
        else:
            require(head.noindex, "Unexpected indexable HTML page outside public inventory: " + url)
            require(not head.alternates, "Noindex pages must not emit hreflang: " + url)
    require(set(inventory["routes"]) <= checked and set(inventory["wrappers"]) <= checked, "Canonical or interface reader route missing from build")
    robots = (dist / "robots.txt").read_text(encoding="utf-8")
    require("Sitemap: " + urljoin(canonical_base, "sitemap-index.xml") in robots, "Project robots template must advertise the index")
    return {"urls": sorted(actual), "child_sitemaps": [info["name"] for info in children.values()],
            "locale_counts": {locale: sum(record["locale"] == locale for record in inventory["routes"].values()) for locale in inventory["locales"]},
            "checked_html_pages": len(checked)}
