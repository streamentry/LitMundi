"""Negative cases for the independent deployed-XML/HTML verifier."""
import datetime
import json
import sys
import unittest
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
        self.assertEqual(len(inventory["routes"]), 14)
        source = next((url, record) for url, record in inventory["routes"].items()
                      if record.get("edition", {}).get("id") == "source")
        self.assertIn("/en/read/", source[0])
        self.assertEqual(set(source[1]["alternates"]), {"pt", "vi", "x-default"})
        self.assertEqual(source[1]["alternates"]["pt"], source[0])
        self.assertEqual({url for url in source[1]["alternates"].values()},
                         {source[0], BASE + "vi/read/fable/translation/"})


if __name__ == "__main__":
    unittest.main()
