"""Independent XML/HTML checks for the public search inventory (standard library only)."""
import datetime
import json
import re
import struct
import xml.etree.ElementTree as ET
import zlib
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urljoin, urlsplit

SITEMAP_NS = "http://www.sitemaps.org/schemas/sitemap/0.9"
XHTML_NS = "http://www.w3.org/1999/xhtml"
MAX_ENTRIES = 50_000
MAX_BYTES = 52_428_800
GOOGLE_SITE_VERIFICATION = "fqsbgZCRj4E4_HtMh3iAsSBMFqS8AbUtMqOvRveOYOQ"
GOOGLE_ANALYTICS_ID = "G-W96CDG1RZV"
GOOGLE_ANALYTICS_SCRIPT = "https://www.googletagmanager.com/gtag/js?id=" + GOOGLE_ANALYTICS_ID


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

    for suffix in ["", "quality/", "authors/", "about/", *("works/" + work + "/" for work in visible)]:
        alternates = {locale: urljoin(canonical_base, locale + "/" + suffix) for locale in locales}
        alternates["x-default"] = alternates[fallback]
        for locale in locales:
            url = alternates[locale]
            routes[url] = {"locale": locale, "alternates": alternates,
                           "kind": "work" if suffix.startswith("works/") else suffix.rstrip("/") or "home"}
            if suffix.startswith("works/"):
                routes[url]["work_id"] = suffix.split("/")[1]

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
        routes[canonical] = {"locale": locale, "alternates": alternates, "kind": "reader", "edition": edition, "work_id": edition["work_id"]}
        for interface in locales:
            wrapper = urljoin(canonical_base, "/".join([interface, "read", edition["work_id"], edition["id"], ""]))
            wrappers[wrapper] = canonical
    discovery_path = Path(root) / "src/lib/discovery.json"
    return {"locales": locales, "routes": routes, "wrappers": wrappers, "editions": editions,
            "works": {identifier: works[identifier] for identifier in visible},
            "discovery": json.loads(discovery_path.read_text(encoding="utf-8")) if discovery_path.exists() else {}}


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
        self.capture_summary = None
        self.summaries, self.ids = [], set()
        self.capture_citation_source = None
        self.citations, self.citation_sources, self.citation_links = [], [], []
        self.scripts, self.capture_script = [], None
        self.feed(markup)

    def handle_starttag(self, tag, attrs):
        values = dict(attrs)
        if values.get("id"):
            self.ids.add(values["id"])
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
        elif self.in_head and tag == "script":
            self.capture_script = {"attributes": values, "text": ""}
        if not self.in_head and tag == "p" and "data-work-summary" in values:
            self.capture_summary = {"work_id": values["data-work-summary"], "language": values.get("lang"), "text": ""}
        if tag == "details" and "data-citation-edition" in values:
            self.citations.append(values)
        if tag == "a" and "data-citation-url" in values:
            self.citation_links.append(values.get("href"))
        if tag == "p" and "data-citation-source" in values:
            self.capture_citation_source = {"edition_id": values["data-citation-source"], "text": ""}

    def handle_data(self, data):
        if self.capture_json is not None:
            self.capture_json += data
        if self.capture_summary is not None:
            self.capture_summary["text"] += data
        if self.capture_citation_source is not None:
            self.capture_citation_source["text"] += data
        if self.capture_script is not None:
            self.capture_script["text"] += data

    def handle_endtag(self, tag):
        if tag == "script" and self.capture_json is not None:
            require("<" not in self.capture_json, "Structured data must escape HTML-significant characters")
            self.structured.append(json.loads(self.capture_json))
            self.capture_json = None
        if tag == "script" and self.capture_script is not None:
            self.scripts.append(self.capture_script)
            self.capture_script = None
        if tag == "p" and self.capture_summary is not None:
            self.summaries.append(self.capture_summary)
            self.capture_summary = None
        if tag == "p" and self.capture_citation_source is not None:
            self.citation_sources.append(self.capture_citation_source)
            self.capture_citation_source = None
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


def meta_value(head, name, *, property=False):
    values = [meta.get("content") for meta in head.metas if meta.get("property" if property else "name") == name]
    require(len(values) == 1 and isinstance(values[0], str) and bool(values[0].strip()), "Missing, empty or duplicate metadata: " + name)
    return values[0]


def validate_analytics(head, url):
    """Preserve the async Google tag explicitly added upstream in b17dddd."""
    loaders = [script["attributes"] for script in head.scripts if script["attributes"].get("src", "").startswith("https://www.googletagmanager.com/gtag/js")]
    require(len(loaders) == 1 and loaders[0].get("src") == GOOGLE_ANALYTICS_SCRIPT and "async" in loaders[0], "Upstream async Analytics tag is missing or changed: " + url)
    configurations = [identifier for script in head.scripts if not script["attributes"].get("src")
                      for identifier in re.findall(r"\bgtag\(\s*['\"]config['\"]\s*,\s*['\"]([^'\"]+)['\"]", script["text"])]
    require(configurations == [GOOGLE_ANALYTICS_ID], "Upstream Analytics configuration ID is missing, duplicated or changed: " + url)


def json_objects(value):
    if isinstance(value, dict):
        yield value
        for child in value.values():
            yield from json_objects(child)
    elif isinstance(value, list):
        for child in value:
            yield from json_objects(child)


def png_dimensions(data, label):
    """Read PNG dimensions and verify chunk integrity without a browser/library."""
    require(data[:8] == b"\x89PNG\r\n\x1a\n", "Social image is not a PNG: " + label)
    offset, dimensions, seen_data, ended = 8, None, False, False
    while offset < len(data):
        require(offset + 12 <= len(data), "Truncated PNG chunk: " + label)
        length = struct.unpack(">I", data[offset:offset + 4])[0]
        kind = data[offset + 4:offset + 8]
        end = offset + 12 + length
        require(end <= len(data), "Truncated PNG payload: " + label)
        payload = data[offset + 8:end - 4]
        require(zlib.crc32(kind + payload) & 0xffffffff == struct.unpack(">I", data[end - 4:end])[0], "PNG chunk checksum mismatch: " + label)
        if offset == 8:
            require(kind == b"IHDR" and length == 13, "PNG lacks its first IHDR chunk: " + label)
            dimensions = struct.unpack(">II", payload[:8])
            require(all(dimensions), "PNG dimensions must be positive: " + label)
        elif kind == b"IHDR":
            raise ValueError("Duplicate PNG header: " + label)
        if kind == b"IDAT":
            seen_data = True
        offset = end
        if kind == b"IEND":
            require(length == 0 and offset == len(data), "Invalid PNG end/trailing data: " + label)
            ended = True
            break
    require(ended and seen_data, "PNG lacks image data or its end marker: " + label)
    return dimensions


def validate_discovery(head, url, canonical, record, inventory, canonical_base):
    description = meta_value(head, "description")
    validate_analytics(head, url)
    require(meta_value(head, "google-site-verification") == GOOGLE_SITE_VERIFICATION, "Google verification token changed: " + url)
    require(meta_value(head, "og:description", property=True) == description and meta_value(head, "twitter:description") == description,
            "Social descriptions differ from the localized page description: " + url)
    require(meta_value(head, "twitter:title") == meta_value(head, "og:title", property=True), "Social titles differ: " + url)
    require(meta_value(head, "og:site_name", property=True) == "LitMundi" and meta_value(head, "twitter:card") == "summary_large_image", "Incorrect social site/card metadata: " + url)
    image = urljoin(canonical_base, "social/" + record.get("work_id", "site") + ".png")
    require(meta_value(head, "og:image", property=True) == image and meta_value(head, "twitter:image") == image, "Incorrect canonical social image: " + url)
    require(meta_value(head, "og:image:type", property=True) == "image/png" and
            meta_value(head, "og:image:width", property=True) == "1200" and meta_value(head, "og:image:height", property=True) == "630",
            "Social-image type/dimensions are incorrect: " + url)
    require(meta_value(head, "og:image:alt", property=True) == meta_value(head, "twitter:image:alt"), "Social-image alternatives differ: " + url)
    authors = {work["author"] for work in inventory["works"].values() if work.get("author")}
    contributors = set(authors)
    for edition in inventory["editions"].values():
        credits = edition.get("credits", {})
        if edition.get("review", {}).get("status") in ("bilingual_reviewed", "literary_edited", "expert_reviewed"):
            contributors.update(credits.get("editors", []))
            if credits.get("translator"):
                contributors.add(credits["translator"])
    for node in json_objects(head.structured):
        types = node.get("@type", [])
        types = types if isinstance(types, list) else [types]
        require(not {"aggregateRating", "ratingValue", "reviewRating"}.intersection(node), "Editorial AI scores must not become public ratings: " + url)
        require(not {"Review", "Rating", "AggregateRating"}.intersection(types), "Editorial assessments must not become reader reviews: " + url)
        if "Person" in types:
            require(node.get("name") in contributors, "Structured data invents a person or unpublished author: " + url)
    graphs = [item["@graph"] for item in head.structured if isinstance(item, dict) and "@graph" in item]
    require(len(graphs) == 1 and isinstance(graphs[0], list), "Expected one site-identity graph: " + url)
    graph = graphs[0]
    organizations = [item for item in graph if item.get("@type") == "Organization"]
    websites = [item for item in graph if item.get("@type") == "WebSite"]
    require(len(organizations) == 1 and len(websites) == 1, "Missing or duplicate site/publisher identities: " + url)
    organization, website = organizations[0], websites[0]
    require(organization.get("@id") == canonical_base + "#publisher" and organization.get("name") == "LitMundi" and organization.get("url") == canonical_base,
            "Publisher identity differs from LitMundi: " + url)
    require(website.get("@id") == canonical_base + "#website" and website.get("url") == canonical_base and website.get("publisher", {}).get("@id") == organization["@id"],
            "WebSite/publisher relationship differs: " + url)
    logo = organization.get("logo", {})
    require(logo.get("@type") == "ImageObject" and logo.get("url") == urljoin(canonical_base, "social/logo.png") and logo.get("width") == 512 and logo.get("height") == 512,
            "Publisher logo metadata differs: " + url)
    breadcrumbs = [item for item in graph if item.get("@type") == "BreadcrumbList"]
    require(len(breadcrumbs) == (0 if record["kind"] == "home" else 1), "Incorrect breadcrumb presence: " + url)
    if breadcrumbs:
        items = breadcrumbs[0].get("itemListElement", [])
        require(len(items) >= 2, "Breadcrumb trail is incomplete: " + url)
        targets = []
        for position, item in enumerate(items, 1):
            target = item.get("item")
            if isinstance(target, dict):
                target = target.get("@id") or target.get("url")
            require(item.get("position") == position and bool(item.get("name")) and target in inventory["routes"], "Breadcrumb references a noncanonical/missing page: " + url)
            targets.append(target)
        require(targets[-1] == canonical and len(targets) == len(set(targets)), "Breadcrumbs must end at the canonical page without repeated ancestors: " + url)
    if record["kind"] in ("work", "reader", "home", "authors"):
        expected_ids = [record["work_id"]] if "work_id" in record else sorted(inventory["works"])
        require(sorted(summary["work_id"] for summary in head.summaries) == sorted(expected_ids), "Visible work summaries differ from the public inventory: " + url)
        for summary in head.summaries:
            work = inventory["works"][summary["work_id"]]
            translated = inventory["discovery"].get("summaries", {}).get(summary["work_id"], {})
            language = head.document_language if head.document_language in translated else "en"
            text = translated.get(head.document_language, work.get("description"))
            require(summary["text"].strip() == text and summary["language"] == language, "Summary wording/language differs from the declared localized content: " + url)
    if record["kind"] in ("home", "work", "authors"):
        collections = [item for item in head.structured if item.get("@type") == "CollectionPage"]
        require(len(collections) == 1, "Public collection needs one CollectionPage: " + url)
        collection = collections[0]
        require(collection.get("url") == canonical and collection.get("description") == description, "Collection metadata differs from its canonical page: " + url)
        listing = collection.get("mainEntity", {})
        items = listing.get("itemListElement", [])
        require(listing.get("@type") == "ItemList" and listing.get("numberOfItems") == len(items), "Collection list count differs: " + url)
        require([item.get("position") for item in items] == list(range(1, len(items) + 1)), "Collection positions are incomplete: " + url)
        if record["kind"] == "authors":
            require(sorted(item.get("item", {}).get("name", "") for item in items) == sorted(authors), "Author directory includes unpublished or duplicate authors: " + url)
        else:
            expected_ids = set(inventory["works"]) if record["kind"] == "home" else {edition["id"] for edition in inventory["editions"].values() if edition["work_id"] == record["work_id"]}
            require(sorted(item.get("item", {}).get("identifier", "") for item in items) == sorted(expected_ids), "Collection includes missing/unpublished/duplicate works or editions: " + url)
            for item in items:
                require(item.get("item", {}).get("url") in inventory["routes"], "Collection item points to a noncanonical page: " + url)
    if record["kind"] == "reader":
        edition = record["edition"]
        source = inventory["editions"].get(edition.get("source_edition_id")) if edition["kind"] == "translation" else edition
        require(len(head.citations) == 1 and head.citations[0].get("data-citation-edition") == edition["id"] and head.citation_links == [canonical],
                "Edition citation must identify its exact canonical publication: " + url)
        require(head.citation_sources == [{"edition_id": source["id"], "text": source["provenance"]["citation"]}], "Edition citation differs from its actual source witness: " + url)
        primary = next(item for item in head.structured if item.get("@type") == "CreativeWork")
        require(primary.get("description") == head.summaries[0]["text"], "CreativeWork summary differs from visible content: " + url)
    return description


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
    validate_discovery(head, url, canonical, record, inventory, canonical_base)
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
    checked, descriptions = set(), {}
    for path in dist.rglob("*.html"):
        relative = path.relative_to(dist).as_posix().removesuffix("index.html")
        url = urljoin(canonical_base, relative)
        text = path.read_text(encoding="utf-8")
        head = PageHead(text)
        if url in inventory["routes"] or url in inventory["wrappers"]:
            head = validate_page(text, url, inventory, canonical_base)
            descriptions[url] = meta_value(head, "description")
            checked.add(url)
        else:
            require(head.noindex, "Unexpected indexable HTML page outside public inventory: " + url)
            require(not head.alternates, "Noindex pages must not emit hreflang: " + url)
            if path.name != "404.html":
                require(meta_value(head, "google-site-verification") == GOOGLE_SITE_VERIFICATION, "Google verification token changed on a nonindexable page: " + url)
                validate_analytics(head, url)
    require(set(inventory["routes"]) <= checked and set(inventory["wrappers"]) <= checked, "Canonical or interface reader route missing from build")
    for locale in inventory["locales"]:
        values = [descriptions[url] for url, record in inventory["routes"].items() if record["locale"] == locale]
        require(len(values) == len(set(values)), "Canonical descriptions must be unique within interface locale: " + locale)
    for suffix in ["", "quality/", "about/", "authors/", *("works/" + identifier + "/" for identifier in inventory["works"])]:
        values = [descriptions[urljoin(canonical_base, locale + "/" + suffix)] for locale in inventory["locales"]]
        require(len(values) == len(set(values)), "Localized pages reuse an untranslated description: " + suffix)
    social_images = {"site.png": (1200, 630), "logo.png": (512, 512), **{identifier + ".png": (1200, 630) for identifier in inventory["works"]}}
    for name, dimensions in social_images.items():
        require(png_dimensions((dist / "social" / name).read_bytes(), name) == dimensions, "Wrong social PNG dimensions: " + name)
    robots = (dist / "robots.txt").read_text(encoding="utf-8")
    require("Sitemap: " + urljoin(canonical_base, "sitemap-index.xml") in robots, "Project robots template must advertise the index")
    return {"urls": sorted(actual), "child_sitemaps": [info["name"] for info in children.values()],
            "locale_counts": {locale: sum(record["locale"] == locale for record in inventory["routes"].values()) for locale in inventory["locales"]},
            "checked_html_pages": len(checked), "social_images": {"social/" + name: list(dimensions) for name, dimensions in social_images.items()},
            "unique_descriptions": len(set(descriptions.values()))}
