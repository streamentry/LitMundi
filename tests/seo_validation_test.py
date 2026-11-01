"""Negative cases for the independent deployed-XML/HTML verifier."""
import datetime
import copy
import importlib.util
import json
import struct
import sys
import unittest
import zlib
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from lib import seo_validation as seo

BASE = "https://books.example/library/"
NS = seo.SITEMAP_NS
XHTML = seo.XHTML_NS


def index(*names):
    return (f'<sitemapindex xmlns="{NS}">' + "".join(f"<sitemap><loc>{BASE}{name}</loc></sitemap>" for name in names) + "</sitemapindex>").encode()


def sitemap(body):
    return f'<urlset xmlns="{NS}" xmlns:alternate="{XHTML}">{body}</urlset>'.encode()


def entry(url=BASE + "vi/", language="vi", href=None, extra=""):
    return f'<url><loc>{url}</loc><alternate:link rel="alternate" hreflang="{language}" href="{href or url}"/>{extra}</url>'


class SitemapParserTests(unittest.TestCase):
    def test_valid_namespaces_escaping_and_shards(self):
        children = seo.parse_index(index("sitemap-en.xml", "sitemap-vi-1.xml", "sitemap-vi-2.xml"), BASE, ["en", "vi"])
        self.assertEqual(len(children), 3)
        escaped = BASE + "vi/works/a&amp;b/"
        found = seo.parse_sitemap(sitemap(entry(escaped)), BASE, "vi", "sitemap-vi.xml")
        self.assertEqual(found, {BASE + "vi/works/a&b/": {"vi": BASE + "vi/works/a&b/"}})

    def test_rejects_invalid_index_inventory(self):
        for names in [("sitemap-en.xml",), ("sitemap-en.xml", "sitemap-vi.xml", "sitemap-vi.xml"),
                      ("sitemap-en.xml", "sitemap-vi-1.xml", "sitemap-vi-3.xml"),
                      ("sitemap-en.xml", "sitemap-vi.xml", "sitemap-vi-1.xml"),
                      ("sitemap-en.xml", "nested/sitemap-vi.xml")]:
            with self.subTest(names=names), self.assertRaises(ValueError):
                seo.parse_index(index(*names), BASE, ["en", "vi"])

    def test_rejects_duplicate_and_wrong_locale_urls(self):
        for body in [entry() + entry(), entry(BASE + "en/"), entry(BASE + "vi/?q=x"),
                     entry(BASE + "vi/#passage"), entry("https://other.example/library/vi/"),
                     entry(BASE + "vi/../en/")]:
            with self.subTest(body=body), self.assertRaises(ValueError):
                seo.parse_sitemap(sitemap(body), BASE, "vi", "sitemap-vi.xml")

    def test_rejects_broken_hreflang_and_namespaces(self):
        bad = [sitemap(entry(href=BASE + "en/")),
               sitemap(entry(extra=f'<alternate:link rel="alternate" hreflang="vi" href="{BASE}vi/"/>')),
               sitemap(entry()).replace(XHTML.encode(), b"urn:wrong"),
               sitemap(entry()).replace(NS.encode(), b"urn:wrong"),
               sitemap(entry(extra="<priority>1</priority>"))]
        for data in bad:
            with self.subTest(data=data), self.assertRaises(ValueError):
                seo.parse_sitemap(data, BASE, "vi", "sitemap-vi.xml")

    def test_rejects_invalid_future_and_duplicate_dates(self):
        future = (datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=1)).isoformat()
        for extra in ["<lastmod>2026-99-01</lastmod>", f"<lastmod>{future}</lastmod>",
                      "<lastmod>2026-01-01</lastmod><lastmod>2026-01-01</lastmod>"]:
            with self.subTest(extra=extra), self.assertRaises(ValueError):
                seo.parse_sitemap(sitemap(entry(extra=extra)), BASE, "vi", "sitemap-vi.xml")

    def test_enforces_byte_and_entry_limits(self):
        with patch.object(seo, "MAX_ENTRIES", 1), self.assertRaises(ValueError):
            seo.parse_index(index("sitemap-en.xml", "sitemap-vi.xml"), BASE, ["en", "vi"])
        with patch.object(seo, "MAX_ENTRIES", 1), self.assertRaises(ValueError):
            seo.parse_sitemap(sitemap(entry() + entry(BASE + "vi/other/")), BASE, "vi", "sitemap-vi.xml")
        document = sitemap(entry())
        with patch.object(seo, "MAX_BYTES", len(document) - 1), self.assertRaises(ValueError):
            seo.parse_sitemap(document, BASE, "vi", "sitemap-vi.xml")

    def test_head_parser_excludes_body_navigation_hreflang(self):
        head = seo.PageHead(f'<html lang="vi"><head><meta name="robots" content="follow, noindex">'
                            f'<link rel="canonical" href="{BASE}vi/"></head><body>'
                            f'<link rel="alternate" hreflang="en" href="{BASE}en/"></body></html>')
        self.assertTrue(head.noindex)
        self.assertEqual(head.alternates, {})
        self.assertEqual(head.canonicals, [BASE + "vi/"])

    def test_inventory_uses_published_text_languages_and_excludes_drafts(self):
        with TemporaryDirectory() as folder:
            root = Path(folder)
            (root / "src/lib").mkdir(parents=True)
            (root / "corpus/catalog").mkdir(parents=True)
            (root / "src/lib/locales.json").write_text(json.dumps({"en": "English", "vi": "Vietnamese", "fr": "French", "es": "Spanish"}))
            (root / "corpus/catalog/works.json").write_text(json.dumps([{"id": "fable", "visibility": "public"}]))
            editions = [
                {"id": "source", "work_id": "fable", "kind": "source", "language": "pt", "status": "published", "content_path": "pt.json"},
                {"id": "translation", "work_id": "fable", "kind": "translation", "source_edition_id": "source", "language": "vi", "status": "published", "content_path": "vi.json"},
                {"id": "draft", "work_id": "fable", "kind": "translation", "source_edition_id": "source", "language": "fr", "status": "draft", "content_path": "fr.json"},
            ]
            (root / "corpus/catalog/editions.json").write_text(json.dumps(editions))
            inventory = seo.expected_inventory(root, BASE)
        self.assertEqual(len(inventory["routes"]), 22)
        source = next((url, record) for url, record in inventory["routes"].items()
                      if record.get("edition", {}).get("id") == "source")
        self.assertIn("/en/read/", source[0])
        self.assertEqual(set(source[1]["alternates"]), {"pt", "vi", "x-default"})
        self.assertEqual(source[1]["alternates"]["pt"], source[0])
        self.assertEqual({url for url in source[1]["alternates"].values()},
                         {source[0], BASE + "vi/read/fable/translation/"})


class DiscoveryMetadataTests(unittest.TestCase):
    def fixture(self):
        canonical = BASE + "vi/about/"
        record = {"kind": "about", "locale": "vi"}
        inventory = {"routes": {BASE + "vi/": {}, canonical: record}, "works": {"fable": {"author": "A known author"}}, "editions": {}, "discovery": {}}
        metadata = {
            "description": "Nguồn văn bản, đánh giá và cách góp ý cho thư viện.",
            "google-site-verification": seo.GOOGLE_SITE_VERIFICATION,
            "og:description": "Nguồn văn bản, đánh giá và cách góp ý cho thư viện.",
            "twitter:description": "Nguồn văn bản, đánh giá và cách góp ý cho thư viện.",
            "og:title": "Về thư viện · LitMundi", "twitter:title": "Về thư viện · LitMundi",
            "og:site_name": "LitMundi", "twitter:card": "summary_large_image",
            "og:image": BASE + "social/site.png", "twitter:image": BASE + "social/site.png",
            "og:image:type": "image/png", "og:image:width": "1200", "og:image:height": "630",
            "og:image:alt": "LitMundi", "twitter:image:alt": "LitMundi",
        }
        graph = [
            {"@type": "Organization", "@id": BASE + "#publisher", "name": "LitMundi", "url": BASE,
             "logo": {"@type": "ImageObject", "url": BASE + "social/logo.png", "width": 512, "height": 512}},
            {"@type": "WebSite", "@id": BASE + "#website", "url": BASE, "publisher": {"@id": BASE + "#publisher"}},
            {"@type": "BreadcrumbList", "itemListElement": [
                {"position": 1, "name": "Tủ sách", "item": BASE + "vi/"},
                {"position": 2, "name": "Về thư viện", "item": canonical},
            ]},
        ]
        return canonical, record, inventory, metadata, graph

    def validate_fixture(self, fixture):
        canonical, record, inventory, metadata, graph = fixture
        head = seo.PageHead('<html lang="vi"><head><script async src="' + seo.GOOGLE_ANALYTICS_SCRIPT + '"></script>'
                            '<script>gtag("config", "' + seo.GOOGLE_ANALYTICS_ID + '");</script></head><body></body></html>')
        head.metas = [{"property" if key.startswith("og:") else "name": key, "content": value} for key, value in metadata.items()]
        head.structured = [{"@context": "https://schema.org", "@graph": graph}]
        return seo.validate_discovery(head, canonical, canonical, record, inventory, BASE)

    def test_rejects_invented_people_ratings_and_planned_breadcrumb_pages(self):
        fixture = self.fixture()
        self.assertEqual(self.validate_fixture(fixture), fixture[3]["description"])
        for mutation in [lambda data: data[4].append({"@type": "Person", "name": "Invented reviewer"}),
                         lambda data: data[4][0].update({"aggregateRating": {"ratingValue": 8.6}}),
                         lambda data: data[4][-1]["itemListElement"][-1].update({"item": BASE + "vi/works/unpublished-queue-entry/"}),
                         lambda data: data[4][-1]["itemListElement"][-1].update({"item": BASE + "vi/"})]:
            damaged = copy.deepcopy(fixture)
            mutation(damaged)
            with self.subTest(mutation=mutation), self.assertRaises(ValueError):
                self.validate_fixture(damaged)

    def test_rejects_lost_verification_or_misleading_social_metadata(self):
        for key, value in [("google-site-verification", "changed-token"), ("twitter:description", "An untranslated description"),
                           ("og:image", "https://wrong.example/image.png"), ("og:image:width", "0"), ("og:image:alt", "")]:
            damaged = self.fixture()
            damaged[3][key] = value
            with self.subTest(key=key), self.assertRaises(ValueError):
                self.validate_fixture(damaged)

    def test_png_signature_dimensions_crc_and_truncation(self):
        def chunk(kind, payload):
            return struct.pack(">I", len(payload)) + kind + payload + struct.pack(">I", zlib.crc32(kind + payload) & 0xffffffff)
        data = (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", 1, 1, 8, 2, 0, 0, 0))
                + chunk(b"IDAT", zlib.compress(b"\x00\x00\x00\x00")) + chunk(b"IEND", b""))
        self.assertEqual(seo.png_dimensions(data, "fixture.png"), (1, 1))
        for damaged in [b"not png", data[:-1], data[:-1] + bytes([data[-1] ^ 1]), data + b"trailing"]:
            with self.subTest(damaged=damaged), self.assertRaises(ValueError):
                seo.png_dimensions(damaged, "fixture.png")

    def test_structured_data_requires_safe_script_serialization(self):
        dangerous = {"description": "</script><img src=x onerror=alert(1)>"}
        safe = json.dumps(dangerous).replace("<", "\\u003c")
        head = seo.PageHead('<html><head><script type="application/ld+json">' + safe + '</script></head></html>')
        self.assertEqual(head.structured, [dangerous])
        with self.assertRaises(ValueError):
            seo.PageHead('<html><head><script type="application/ld+json">' + json.dumps(dangerous) + '</script></head></html>')

    def test_preserves_upstream_async_analytics_loader_and_configuration(self):
        markup = ('<html><head><script async src="' + seo.GOOGLE_ANALYTICS_SCRIPT + '"></script>'
                  '<script>gtag("config", "' + seo.GOOGLE_ANALYTICS_ID + '");</script></head></html>')
        seo.validate_analytics(seo.PageHead(markup), BASE)
        for damaged in [markup.replace(' async', ''), markup.replace(seo.GOOGLE_ANALYTICS_ID, 'G-CHANGED', 1),
                        markup.replace('gtag("config", "' + seo.GOOGLE_ANALYTICS_ID + '");', ''),
                        markup.replace('gtag("config", "' + seo.GOOGLE_ANALYTICS_ID + '");', 'gtag("config", "G-CHANGED");')]:
            with self.subTest(damaged=damaged), self.assertRaises(ValueError):
                seo.validate_analytics(seo.PageHead(damaged), BASE)

    def test_payload_reports_async_external_script_without_fetching_or_counting_its_bytes(self):
        spec = importlib.util.spec_from_file_location("payload", Path(__file__).resolve().parents[1] / "scripts/check-payload.py")
        payload = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(payload)
        markup = '<html><head><script async src="' + seo.GOOGLE_ANALYTICS_SCRIPT + '"></script></head></html>'
        with TemporaryDirectory() as folder:
            root = Path(folder)
            (root / "index.html").write_text(markup)
            (root / "second.html").write_text(markup)
            report = payload.analyze(root, BASE)
        self.assertEqual(report["external_render_or_parser_blocking_resources"], [])
        self.assertEqual(report["external_async_resources"], [{"url": seo.GOOGLE_ANALYTICS_SCRIPT, "kind": "script", "async": True, "blocking": False, "referenced_by_pages": 2}])
        self.assertEqual(report["assets"][".js"]["bytes"], 0)


if __name__ == "__main__":
    unittest.main()
