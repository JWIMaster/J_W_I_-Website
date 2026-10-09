"""Check external markup, escaping, private-page rejection and failure retention."""
import importlib.util
import json
from pathlib import Path
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location('photography_sync', ROOT/'scripts/sync-photography.py')
sync = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sync)

class FeedTests(unittest.TestCase):
    def test_homepage_order_not_invented_dates(self):
        html = '''<div class="collection-item text-center"><a href="/portraits/"><div class="image-holder" style="background-image:url(//images.pixieset.com/a-large.jpg)"></div><p class="name">Portraits &amp; people</p></a></div>
        <div class="collection-item"><a href="/older/"><div class="image-holder" style="background-image:url(//images.pixieset.com/b-large.jpg)"></div><p class="name">Older</p><p class="date">July 10th, 2026</p></a></div>'''
        albums = sync.homepage_albums(html)
        self.assertEqual([a['title'] for a in albums], ['Portraits & people','Older'])
        self.assertIsNone(albums[0]['date'])
        self.assertEqual(albums[1]['date'], 'July 10th, 2026')

    def test_protected_or_changed_pages_rejected(self):
        for html in ['<h1>Enter password</h1>', '<title>Just a moment...</title>', '<div class="collection-item"></div>']:
            with self.assertRaises(ValueError):
                sync.homepage_albums(html)
        with self.assertRaises(ValueError):
            sync.album_metadata({'title':'Private'}, '<meta property="og:title" content="Private"><form><input type="password"></form>')

    def test_external_content_escaped_and_urls_restricted(self):
        snapshot = json.loads((ROOT/'data/photography.json').read_text())
        snapshot['albums'][0]['title'] = '<img src=x onerror=alert(1)>'
        html=sync.render(snapshot)
        self.assertNotIn('<img src=x', html)
        self.assertIn('&lt;img src=x onerror=alert(1)&gt;', html)
        for url in ['javascript:alert(1)', 'https://evil.example/album/', 'https://jwi.pixieset.com.evil.example/album/', 'https://user:pass@jwi.pixieset.com/album/']:
            snapshot['albums'][0]['url']=url
            with self.assertRaises(ValueError):
                sync.render(snapshot)

    def test_fetch_failure_never_writes_snapshot(self):
        with patch.object(sync, 'fetch', side_effect=RuntimeError('HTTP 403')), patch.object(sync, 'write') as writer, patch('sys.argv', ['sync-photography.py']):
            with self.assertRaises(RuntimeError):
                sync.main()
            writer.assert_not_called()

if __name__ == '__main__':
    unittest.main()
