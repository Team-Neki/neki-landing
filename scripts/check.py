"""Dependency-free static contracts for the shipped NEKI pages."""
import json
import re
import sys
import xml.etree.ElementTree as ET
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
errors = []


def require(ok, message):
    if not ok:
        errors.append(message)


class Page(HTMLParser):
    def __init__(self, path):
        super().__init__(convert_charrefs=True)
        self.path = path
        self.tags = []
        self.ids = []
        self.schemas = []
        self.texts = {}
        self.stack = []
        self.script = None
        self.feed(path.read_text())

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        self.tags.append((tag, attrs))
        if attrs.get('id'):
            self.ids.append(attrs['id'])
        if tag not in {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr', 'use', 'path'}:
            self.stack.append((tag, attrs.get('id')))
        if tag == 'script' and attrs.get('type') == 'application/ld+json':
            self.script = []

    def handle_endtag(self, tag):
        if tag == 'script' and self.script is not None:
            try:
                self.schemas.append(json.loads(''.join(self.script)))
            except ValueError as exc:
                errors.append(f'{self.path.name}: invalid JSON-LD: {exc}')
            self.script = None
        for i in range(len(self.stack) - 1, -1, -1):
            if self.stack[i][0] == tag:
                del self.stack[i:]
                break

    def handle_data(self, data):
        if self.script is not None:
            self.script.append(data)
        for _, ident in self.stack:
            if ident:
                self.texts[ident] = self.texts.get(ident, '') + data


pages = {name: Page(ROOT / name) for name in ('index.html', 'app.html')}
for name, page in pages.items():
    require(not [key for key, n in Counter(page.ids).items() if n > 1], f'{name}: duplicate IDs')
    for tag, attrs in page.tags:
        if tag == 'img':
            require('alt' in attrs, f'{name}: image missing alt: {attrs.get("src")}')
        for key in ('aria-controls', 'aria-labelledby'):
            for ident in attrs.get(key, '').split():
                require(ident in page.ids, f'{name}: {key} target missing: {ident}')
        for key in ('src', 'href'):
            value = attrs.get(key, '')
            if not value:
                continue
            url = urlsplit(value)
            if url.scheme or url.netloc:
                continue
            target = ROOT / unquote(url.path).lstrip('/') if url.path else page.path
            require(target.exists(), f'{name}: missing {key}: {value}')
            if url.fragment and target.suffix == '.html' and target.name in pages:
                require(unquote(url.fragment) in pages[target.name].ids, f'{name}: missing anchor: {value}')
    require('SITE_URL' not in page.path.read_text(), f'{name}: unresolved SITE_URL')

page = pages['index.html']
require(sum(tag == 'h1' for tag, _ in page.tags) == 1, 'index.html: expected one h1')
for ident in ('top', 'why', 'map', 'pose', 'archive', 'faq', 'download'):
    require(ident in page.ids, f'index.html: missing section {ident}')
canonical = next((a.get('href') for t, a in page.tags if t == 'link' and a.get('rel') == 'canonical'), None)
og = next((a.get('content') for t, a in page.tags if t == 'meta' and a.get('property') == 'og:url'), None)
require(bool(canonical) and canonical.startswith('https://'), 'canonical must be HTTPS')
require(canonical == og, 'canonical and og:url differ')
try:
    sitemap = ET.parse(ROOT / 'sitemap.xml')
    locations = [e.text for e in sitemap.iter() if e.tag.endswith('}loc') or e.tag == 'loc']
    require(canonical in locations, 'sitemap does not contain canonical')
except ET.ParseError as exc:
    errors.append(f'invalid sitemap XML: {exc}')
require(f'{canonical}sitemap.xml' in (ROOT / 'robots.txt').read_text(), 'robots sitemap differs from canonical')
faq = next((s for s in page.schemas if s.get('@type') == 'FAQPage'), None)
require(faq is not None, 'FAQPage JSON-LD missing')
normalize = lambda text: re.sub(r'\s+', '', text).removeprefix('Q.').removeprefix('A.')
buttons = [a for t, a in page.tags if t == 'button' and 'qa__q' in a.get('class', '').split()]
entities = faq.get('mainEntity', []) if faq else []
require(len(buttons) == len(entities) and len(buttons) > 0, 'FAQ HTML/JSON-LD count differs')
for button, entity in zip(buttons, entities):
    require(normalize(page.texts.get(button.get('id'), '')) == normalize(entity.get('name', '')), 'FAQ question differs from JSON-LD')
    require(normalize(page.texts.get(button.get('aria-controls'), '')) == normalize(entity.get('acceptedAnswer', {}).get('text', '')), 'FAQ answer differs from JSON-LD')

if errors:
    print('\n'.join(f'FAIL {e}' for e in errors))
    sys.exit(1)
print('PASS static references, anchors, accessibility links, JSON-LD, FAQ and site URLs')
