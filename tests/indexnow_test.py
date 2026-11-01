"""IndexNow safety and behavior checks. Every HTTP response is mocked."""

import copy
import io
import json
from pathlib import Path
import sys
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
import indexnow as indexnow


BASE = "https://books.example/library/"
TOKEN = "abc12345-def67890"
KEY_URL = BASE + TOKEN + ".txt"
NAMESPACE = indexnow.NAMESPACE[1:-1]


def page(url, text="A complete story.", title="Story", extra_head="", extra_body="", canonical=None):
    return (f'<!doctype html><html lang="vi"><head><title>{title}</title>'
            '<meta name="description" content="Read this edition.">'
            f'<link rel="canonical" href="{canonical or url}">{extra_head}</head>'
            f'<body><main><h1>{title}</h1><p>{text}</p>{extra_body}</main></body></html>').encode()


class MockClient:
    def __init__(self, pages, responses=(), retired=None, key=TOKEN.encode()):
        self.pages = pages
        self.responses = list(responses)
        self.calls = []
        self.retired = retired or {}
        self.key = key

    def request(self, method, url, data=None):
        self.calls.append((method, url, data))
        if method == "POST":
            result = self.responses.pop(0) if self.responses else 200
            if isinstance(result, Exception):
                raise result
            status, headers = result if isinstance(result, tuple) else (result, {})
            return indexnow.Response(status, url, headers, b"mock IndexNow response")
        if url == BASE + "sitemap-index.xml":
            body = (f'<sitemapindex xmlns="{NAMESPACE}"><sitemap><loc>{BASE}sitemap-vi.xml</loc>'
                    '</sitemap></sitemapindex>').encode()
            return indexnow.Response(200, url, {"content-type": "application/xml"}, body)
        if url == BASE + "sitemap-vi.xml":
            body = (f'<urlset xmlns="{NAMESPACE}">' + ''.join('<url><loc>' + value + '</loc></url>' for value in self.pages) + '</urlset>').encode()
            return indexnow.Response(200, url, {"content-type": "application/xml"}, body)
        if url == KEY_URL:
            return indexnow.Response(200, url, {"content-type": "text/plain"}, self.key)
        if url in self.retired:
            return self.retired[url]
        if url in self.pages:
            return indexnow.Response(200, url, {"content-type": "text/html; charset=utf-8"}, self.pages[url])
        raise AssertionError("Unexpected network operation: " + method + " " + url)

    @property
    def posts(self):
        return [json.loads(data) for method, _, data in self.calls if method == "POST"]


def capture(pages):
    return indexnow.snapshot(BASE, MockClient(pages))


class FingerprintTests(unittest.TestCase):
    def test_style_script_analytics_and_build_timestamp_do_not_trigger_changes(self):
        url = BASE + "vi/"
        original = page(url, extra_head='<link rel="stylesheet" href="/assets/old.css">'
                        '<script src="/assets/old.js"></script><script>track("old")</script>',
                        extra_body='<span data-build-timestamp>yesterday</span>')
        changed = original.replace(b'old', b'new').replace(b'yesterday', b'today').replace(b'<p>', b'<p class="new-theme" style="color:red">')
        before, after = capture({url: original}), capture({url: changed})
        self.assertNotEqual(before["pages"][0]["html_sha256"], after["pages"][0]["html_sha256"])
        self.assertEqual(indexnow.changes(before, after), {"added": [], "changed": [], "retired": []})

    def test_visible_text_metadata_hreflang_links_and_jsonld_are_detected(self):
        url = BASE + "vi/"
        original = page(url, extra_head=f'<link rel="alternate" hreflang="en" href="{BASE}en/">'
                        '<script type="application/ld+json">{"name":"Story","generatedAt":"old"}</script>',
                        extra_body='<a href="source-a/">Source</a>')
        for old, new in [(b'A complete story.', b'A corrected story.'), (b'Read this edition.', b'Read the corrected edition.'),
                         (b'hreflang="en"', b'hreflang="fr"'), (b'source-a/', b'source-b/'), (b'"name":"Story"', b'"name":"New title"')]:
            with self.subTest(old=old):
                plan = indexnow.make_plan(capture({url: original}), capture({url: original.replace(old, new)}))
                self.assertEqual(plan["changes"]["changed"], [url])
        timestamp_only = original.replace(b'"generatedAt":"old"', b'"generatedAt":"new"')
        self.assertEqual(capture({url: original})["pages"][0]["semantic_sha256"], capture({url: timestamp_only})["pages"][0]["semantic_sha256"])

    def test_canonical_inventory_rejects_noindex_duplicates_and_body_canonical(self):
        url = BASE + "vi/"
        invalid = [page(url, canonical=BASE + "en/"), page(url, extra_head='<meta name="robots" content="noindex,follow">'),
                   page(url, extra_head=f'<link rel="canonical" href="{url}">'),
                   page(url).replace(f'<link rel="canonical" href="{url}">'.encode(), b'').replace(b'</main>', f'<link rel="canonical" href="{url}"></main>'.encode()),
                   page(url, extra_head='<base href="https://other.example/">'),
                   page(url, extra_head='<script type="application/ld+json">not json</script>')]
        for content in invalid:
            with self.subTest(content=content[:80]), self.assertRaises(indexnow.Failure):
                capture({url: content})


class InventoryTests(unittest.TestCase):
    def test_valid_snapshot_and_plan_never_post(self):
        old, new = BASE + "vi/old/", BASE + "vi/new/"
        client = MockClient({old: page(old)})
        before = indexnow.snapshot(BASE, client)
        after = capture({new: page(new)})
        plan = indexnow.make_plan(before, after)
        self.assertEqual(plan["changes"], {"added": [new], "changed": [], "retired": [old]})
        self.assertEqual(client.posts, [])

    def test_external_query_fragment_and_path_escape_are_rejected(self):
        for url in ["https://other.example/library/vi/", BASE + "vi/?q=x", BASE + "vi/#a", BASE + "../other/",
                    BASE + "%2e%2e/other/", BASE + "vi/\\other", BASE + "vi/\nother"]:
            with self.subTest(url=url), self.assertRaises(indexnow.Failure):
                capture({url: page(url)})
        for base in ["http://books.example/library/", "https://user:pass@books.example/library/", BASE + "?x=1", BASE + "../", "https://books.example:443/library/"]:
            with self.subTest(base=base), self.assertRaises(indexnow.Failure):
                indexnow.base_url(base)

    def test_sitemap_duplicates_dtd_and_count_limits_fail_closed(self):
        url = BASE + "vi/"
        for body in [f'<urlset xmlns="{NAMESPACE}"><url><loc>{url}</loc></url><url><loc>{url}</loc></url></urlset>'.encode(),
                     f'<!DOCTYPE x [<!ENTITY e "bad">]><urlset xmlns="{NAMESPACE}"></urlset>'.encode(),
                     b'<not-a-sitemap/>']:
            client = MockClient({url: page(url)})
            original = client.request
            client.request = lambda method, target, data=None: indexnow.Response(200, target, {}, body) if target.endswith('sitemap-vi.xml') else original(method, target, data)
            with self.subTest(body=body), self.assertRaises(indexnow.Failure):
                indexnow.snapshot(BASE, client)
        with patch.object(indexnow, 'MAX_URLS', 1), self.assertRaises(indexnow.Failure):
            capture({url: page(url), BASE + 'en/': page(BASE + 'en/')})

    def test_plan_validation_and_exclusive_output(self):
        url = BASE + 'vi/'
        before = capture({url: page(url)})
        after = capture({url: page(url, text='Changed')})
        plan = indexnow.make_plan(before, after)
        bad = copy.deepcopy(plan)
        bad['changes']['changed'] = []
        with self.assertRaises(indexnow.Failure):
            indexnow.validate_plan(bad)
        with TemporaryDirectory() as folder:
            path = Path(folder) / 'plan.json'
            indexnow.create_json(path, plan)
            with self.assertRaises(FileExistsError):
                indexnow.create_json(path, bad)
            self.assertEqual(indexnow.read_json(path)[0], plan)


class SubmitTests(unittest.TestCase):
    def setUp(self):
        self.temp = TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.key = self.root / (TOKEN + '.txt')
        self.key.write_text(TOKEN)
        self.url = BASE + 'vi/'

    def prepare(self, before, after):
        plan = indexnow.make_plan(capture(before), capture(after))
        path = self.root / ('plan-' + str(len(list(self.root.glob('plan-*')))) + '.json')
        indexnow.create_json(path, plan)
        return path

    def send(self, plan, client, resume=None):
        output = self.root / ('report-' + str(len(list(self.root.glob('report-*')))) + '.json')
        return indexnow.submit(plan, self.key, output, resume, client), output

    def test_explicit_send_verifies_production_then_reports_200_and_202_honestly(self):
        after = {self.url: page(self.url, text='Corrected story')}
        plan = self.prepare({self.url: page(self.url)}, after)
        for code, status in [(200, 'received'), (202, 'key_validation_pending')]:
            client = MockClient(after, [code])
            report, _ = self.send(plan, client)
            self.assertEqual(report['status'], status)
            self.assertEqual(report['verification'], 'passed')
            self.assertEqual(report['indexing'], 'not_measured')
            self.assertEqual(client.posts, [{'host': 'books.example', 'key': TOKEN, 'keyLocation': KEY_URL, 'urlList': [self.url]}])
            self.assertEqual(client.calls[-1][0], 'POST')

    def test_no_changes_makes_no_network_requests(self):
        pages = {self.url: page(self.url)}
        plan = self.prepare(pages, pages)
        client = MockClient(pages)
        report, _ = self.send(plan, client)
        self.assertEqual(report['status'], 'no_changes')
        self.assertEqual(client.calls, [])

    def test_stale_bytes_or_wrong_live_key_blocks_all_posts_and_retains_report(self):
        after = {self.url: page(self.url, text='Changed')}
        plan = self.prepare({self.url: page(self.url)}, after)
        clients = [MockClient({self.url: after[self.url].replace(b'<main>', b'<main class="new-style">')}),
                   MockClient(after, key=b'wrong-key')]
        for client in clients:
            report, output = self.send(plan, client)
            self.assertEqual(report['status'], 'failed')
            self.assertEqual(client.posts, [])
            self.assertEqual(indexnow.read_json(output)[0], report)

    def test_retired_404_redirect_changed_canonical_and_noindex_are_allowed(self):
        old = BASE + 'vi/retired/'
        after = {self.url: page(self.url)}
        plan = self.prepare({**after, old: page(old)}, after)
        responses = [indexnow.Response(404, old, {}, b'gone'), indexnow.Response(410, old, {}, b'gone'),
                     indexnow.Response(301, old, {'location': self.url}, b''),
                     indexnow.Response(200, old, {'content-type': 'text/html'}, page(old, canonical=self.url)),
                     indexnow.Response(200, old, {'content-type': 'text/html'}, page(old, extra_head='<meta name="robots" content="noindex">'))]
        for response in responses:
            with self.subTest(status=response.status):
                client = MockClient(after, retired={old: response})
                report, _ = self.send(plan, client)
                self.assertEqual(report['status'], 'received')
                self.assertEqual(client.posts[0]['urlList'], [old])

    def test_retired_selfcanonical_or_unsafe_redirect_blocks_submission(self):
        old = BASE + 'vi/retired/'
        after = {self.url: page(self.url)}
        plan = self.prepare({**after, old: page(old)}, after)
        for response in [indexnow.Response(200, old, {'content-type': 'text/html'}, page(old)),
                         indexnow.Response(301, old, {'location': 'https://other.example/'}, b''),
                         indexnow.Response(503, old, {}, b'temporary')]:
            client = MockClient(after, retired={old: response})
            report, _ = self.send(plan, client)
            self.assertEqual(report['status'], 'failed')
            self.assertEqual(client.posts, [])

    def test_partial_failure_resume_skips_only_acknowledged_exact_plan_batches(self):
        urls = [BASE + 'vi/' + name + '/' for name in ('one', 'two', 'three')]
        before = {url: page(url) for url in urls}
        after = {url: page(url, text='Changed') for url in urls}
        plan = self.prepare(before, after)
        with patch.object(indexnow, 'BATCH_SIZE', 1):
            first = MockClient(after, [202, (429, {'retry-after': '600'})])
            report, output = self.send(plan, first)
            self.assertEqual(report['status'], 'failed')
            self.assertEqual(len(first.posts), 2)
            self.assertEqual(report['batches'][1]['retry_after'], '600')
            resumed = MockClient(after, [200, 200])
            result, _ = self.send(plan, resumed, output)
            self.assertEqual(result['status'], 'key_validation_pending')
            self.assertEqual([item['urlList'] for item in resumed.posts], [[urls[2]], [urls[1]]])
            self.assertTrue(result['batches'][0]['resumed_acknowledgment'])
            changed_bytes = self.root / 'changed-plan.json'
            changed_bytes.write_bytes(plan.read_bytes() + b'\n')
            with self.assertRaisesRegex(indexnow.Failure, 'exact plan bytes'):
                self.send(changed_bytes, MockClient(after), output)

    def test_permanent_and_network_failures_never_retry_automatically(self):
        after = {self.url: page(self.url, text='Changed')}
        plan = self.prepare({self.url: page(self.url)}, after)
        for failure in [400, 403, 422, 500, indexnow.Failure('network timeout')]:
            client = MockClient(after, [failure])
            report, output = self.send(plan, client)
            self.assertEqual(report['status'], 'failed')
            self.assertEqual(len(client.posts), 1)
            self.assertTrue(output.is_file())
            self.assertTrue(plan.is_file())

    def test_batch_limit_and_fake_acknowledgments(self):
        urls = ['https://books.example/library/' + str(number) + '/' for number in range(20_001)]
        batches = indexnow.batches_for({'changes': {'added': urls, 'changed': [], 'retired': []}})
        self.assertEqual([len(batch['urls']) for batch in batches], [10_000, 10_000, 1])
        after = {self.url: page(self.url, text='Changed')}
        plan = self.prepare({self.url: page(self.url)}, after)
        report, output = self.send(plan, MockClient(after, [400]))
        report['batches'][0]['status'] = 'received'
        indexnow.update_report(output, report)
        client = MockClient(after)
        result, _ = self.send(plan, client, output)
        self.assertEqual(result['status'], 'received')
        self.assertEqual(len(client.posts), 1)


class TransportTests(unittest.TestCase):
    def test_no_redirects_and_bounded_reads(self):
        self.assertIsNone(indexnow.NoRedirect().redirect_request(None, None, 302, '', {}, 'https://other.example/'))
        class Stream(io.BytesIO):
            code = 200
            headers = {'content-type': 'text/html'}
            def geturl(self):
                return BASE + 'vi/'
        client = indexnow.Client(BASE)
        with patch.object(client.opener, 'open', return_value=Stream(b'too much content')), patch.object(indexnow, 'MAX_RESPONSE_BYTES', 5):
            with self.assertRaisesRegex(indexnow.Failure, 'byte limit'):
                client.request('GET', BASE + 'vi/')
        with self.assertRaises(indexnow.Failure):
            client.request('POST', 'https://other.example/')


if __name__ == '__main__':
    unittest.main()
