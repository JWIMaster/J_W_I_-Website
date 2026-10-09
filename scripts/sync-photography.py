#!/usr/bin/env python3
"""Refresh three public Pixieset collections; render an ordinary static page.

No account cookies, private API, CORS proxy, or challenge-solving service.
A rejected or incomplete fetch fails before changing the last good snapshot.
"""
import argparse
from datetime import datetime, timezone
from html import escape
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import sys
from urllib.parse import urljoin, urlsplit
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parent.parent
SOURCE = 'https://jwi.pixieset.com/'
ARROW = '<svg class="action-arrow" aria-hidden="true" focusable="false" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7M7 7h10v10"/></svg>'

class Node:
    def __init__(self, tag='', attrs=()):
        self.tag, self.attrs, self.children = tag, dict(attrs), []
    def text(self):
        return ''.join(c.text() if isinstance(c, Node) else c for c in self.children)
    def find(self, predicate):
        for child in self.children:
            if isinstance(child, Node):
                if predicate(child):
                    yield child
                yield from child.find(predicate)
    def has_class(self, name):
        return name in self.attrs.get('class', '').split()

class Document(HTMLParser):
    VOID = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'}
    def __init__(self, html):
        super().__init__(convert_charrefs=True)
        self.root = Node()
        self.stack = [self.root]
        self.feed(html)
    def handle_starttag(self, tag, attrs):
        node = Node(tag, attrs)
        self.stack[-1].children.append(node)
        if tag not in self.VOID:
            self.stack.append(node)
    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in self.VOID:
            self.handle_endtag(tag)
    def handle_endtag(self, tag):
        for i in range(len(self.stack)-1, 0, -1):
            if self.stack[i].tag == tag:
                del self.stack[i:]
                break
    def handle_data(self, data):
        self.stack[-1].children.append(data)
    def nodes(self, predicate):
        return self.root.find(predicate)
    def meta(self, name):
        return next((n.attrs.get('content', '') for n in self.nodes(lambda n: n.tag == 'meta' and (n.attrs.get('property') == name or n.attrs.get('name') == name))), '')

def clean(text):
    return ' '.join(text.split())

def safe_url(value, image=False):
    url = urljoin(SOURCE, value)
    parts = urlsplit(url)
    hosts = {'images.pixieset.com'} if image else {'jwi.pixieset.com'}
    if parts.scheme != 'https' or parts.hostname not in hosts or parts.username or parts.password or parts.port or parts.query or parts.fragment:
        raise ValueError('Unexpected Pixieset URL')
    if not image and not re.fullmatch(r'/[a-zA-Z0-9_-]+/', parts.path):
        raise ValueError('Unexpected collection path')
    return url

def homepage_albums(html):
    doc = Document(html)
    albums, seen = [], set()
    for item in doc.nodes(lambda n: n.has_class('collection-item')):
        link = next(item.find(lambda n: n.tag == 'a' and 'href' in n.attrs), None)
        name = next(item.find(lambda n: n.has_class('name')), None)
        cover = next(item.find(lambda n: n.has_class('image-holder')), None)
        if not link or not name or not cover:
            raise ValueError('Incomplete collection markup')
        url = safe_url(link.attrs['href'])
        match = re.search(r'url\([\s\"\']*([^\)\"\']+)', cover.attrs.get('style', ''))
        title = clean(name.text())
        if not match or not title:
            raise ValueError('Missing collection title or cover')
        date = next(item.find(lambda n: n.has_class('date')), None)
        if url in seen:
            continue
        seen.add(url)
        albums.append({'title': title, 'url': url, 'thumbnail': safe_url(match[1].strip(), image=True), 'date': clean(date.text()) if date else None})
    if not albums:
        raise ValueError('No public collections found; Pixieset may have blocked the request or changed its markup')
    return albums

def album_metadata(album, html):
    doc = Document(html)
    scripts = '\n'.join(n.text() for n in doc.nodes(lambda n: n.tag == 'script' and not n.attrs.get('src')))
    count = re.search(r"['\"]collectionPhotoCount['\"]\s*:\s*(\d+)", scripts)
    # Do not probe password-protected pages or infer their private contents.
    if not count or not doc.meta('og:image'):
        raise ValueError('Collection details are unavailable or protected; retaining the previous snapshot')
    result = dict(album)
    result.update({
        'title': doc.meta('og:title') or album['title'],
        'description': doc.meta('og:description') or doc.meta('description'),
        'photoCount': int(count.group(1)),
        'photographer': 'JWI Photography',
        'cover': safe_url(doc.meta('og:image'), image=True),
        'coverWidth': int(doc.meta('og:image:width') or 0),
        'coverHeight': int(doc.meta('og:image:height') or 0),
    })
    return result

def fetch(url):
    request = Request(url, headers={'User-Agent': 'JWI-Photography-Sync/1.0 (+https://j-w-i.org/)', 'Accept': 'text/html'})
    with urlopen(request, timeout=25) as response:
        body = response.read(5_000_001)
        if len(body) > 5_000_000:
            raise ValueError('Pixieset response exceeds the expected size')
        return body.decode('utf-8')

def validate(snapshot):
    albums = snapshot.get('albums', [])
    if not 1 <= len(albums) <= 3:
        raise ValueError('Expected one to three public collections')
    seen = set()
    for album in albums:
        for field in ['url', 'thumbnail', 'cover']:
            safe_url(album[field], image=field != 'url')
        if album['url'] in seen or not isinstance(album['title'], str) or not album['title'].strip():
            raise ValueError('Duplicate or invalid collection')
        seen.add(album['url'])
        for field in ['photoCount', 'coverWidth', 'coverHeight']:
            if type(album[field]) is not int or album[field] < 0:
                raise ValueError('Invalid collection metadata')
    return snapshot

def render(snapshot):
    cards = []
    for i, album in enumerate(validate(snapshot)['albums']):
        a = {k: escape(str(v), quote=True) for k, v in album.items() if v is not None}
        rows = [('Date', a.get('date', 'Not listed')), ('Photographs', str(album['photoCount'])), ('Photographer', a['photographer'])]
        if album.get('description'):
            rows.append(('Description', a['description']))
        if album['coverWidth'] and album['coverHeight']:
            rows.append(('Cover size', f"{album['coverWidth']:,} × {album['coverHeight']:,} px"))
        dl = ''.join(f'<div><dt>{label}</dt><dd>{value}</dd></div>' for label, value in rows)
        loading = 'eager' if i == 0 else 'lazy'
        cards.append(f'''      <article class="photo-album fade-io" aria-labelledby="album-{i+1}">
        <a class="photo-link" href="{a['url']}" target="_blank" rel="noopener" aria-label="View {a['title']} on Pixieset (opens in a new tab)">
          <div class="photo-cover">
            <img src="{a['thumbnail']}" srcset="{a['thumbnail']} 640w, {a['cover']} 1600w" sizes="(max-width: 599px) calc(100vw - 40px), (max-width: 899px) calc((100vw - 100px) / 2), 360px" width="{a['coverWidth']}" height="{a['coverHeight']}" alt="" loading="{loading}" decoding="async">
            <span class="photo-unavailable">Cover unavailable</span>
          </div>
          <div class="photo-caption"><span class="photo-number" aria-hidden="true">0{i+1}</span><h2 id="album-{i+1}">{a['title']}</h2>{ARROW}</div>
        </a>
        <details class="photo-details">
          <summary>Album details<svg aria-hidden="true" focusable="false" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="m6 9 6 6 6-6"/></svg></summary>
          <div class="photo-detail-body"><dl>{dl}</dl>
            <a class="photo-source" href="{a['cover']}" target="_blank" rel="noopener">View full cover<span class="visually-hidden"> (opens in a new tab)</span>{ARROW}</a>
          </div>
        </details>
      </article>''')
    template = (ROOT/'scripts/photography.template.html').read_text()
    return template.replace('<!-- ALBUMS -->', '\n'.join(cards))

def write(snapshot):
    page = render(snapshot)
    for path, content in [(ROOT/'data/photography.json', json.dumps(snapshot, indent=2, ensure_ascii=False)+'\n'), (ROOT/'photography.html', page)]:
        temp = path.with_suffix(path.suffix+'.tmp')
        temp.write_text(content)
        temp.replace(path)

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--render', action='store_true', help='Render the existing verified snapshot without fetching')
    args = parser.parse_args()
    if args.render:
        snapshot = json.loads((ROOT/'data/photography.json').read_text())
    else:
        albums = homepage_albums(fetch(SOURCE))[:3]
        # Fetch and validate every album before writing either output file.
        snapshot = {'source': SOURCE, 'ordering': 'pixieset-homepage', 'checkedAt': datetime.now(timezone.utc).isoformat(), 'albums': [album_metadata(a, fetch(a['url'])) for a in albums]}
    write(snapshot)
    print(f"Rendered {len(snapshot['albums'])} public albums")

if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print(f'Photography refresh failed; existing files were kept: {error}', file=sys.stderr)
        sys.exit(1)
