#!/usr/bin/env python3
"""Build indexable language pages using only the Python standard library."""
import csv
import html
import json
import re
from html.parser import HTMLParser
from pathlib import Path
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
BASE = 'https://mcgm78.github.io/casa-pomar-silves/'
LANGUAGES = {'pt': ('pt-PT', 'pt_PT', ''), 'en': ('en', 'en_GB', 'en.html'),
             'de': ('de', 'de_DE', 'de.html'), 'fr': ('fr', 'fr_FR', 'fr.html')}
translations = {}
with (ROOT / 'translations.tsv').open(newline='', encoding='utf-8') as source:
    for row in csv.reader(source, delimiter='\t'):
        if not row or row[0].startswith('#'):
            continue
        assert len(row) == 4 and all(row), f'Invalid translation row: {row[:1]}'
        assert row[0] not in translations, f'Duplicate translation: {row[0]}'
        translations[row[0]] = dict(zip(('en', 'de', 'fr'), row[1:]))

def translate(text, language):
    core = text.strip()
    replacement = translations.get(core, {}).get(language)
    return text.replace(core, replacement, 1) if replacement is not None else text

class Localize(HTMLParser):
    def __init__(self, language):
        super().__init__(convert_charrefs=False)
        self.language, self.output, self.raw = language, [], False

    def handle_starttag(self, tag, attrs):
        source = self.get_starttag_text()
        source = re.sub(r'\b(alt|aria-label|title|placeholder|data-intent|value|content)="([^"]*)"',
                        lambda m: f'{m[1]}="{html.escape(translate(html.unescape(m[2]), self.language), quote=True)}"', source)
        if tag == 'html':
            source = re.sub(r'lang="[^"]+"', f'lang="{LANGUAGES[self.language][0]}"', source)
        if tag == 'script' or tag == 'style':
            self.raw = True
        self.output.append(source)

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)

    def handle_endtag(self, tag):
        self.output.append(f'</{tag}>')
        if tag in ('script', 'style'):
            self.raw = False

    def handle_data(self, data):
        self.output.append(data if self.raw else html.escape(translate(data, self.language), quote=False))

    def handle_entityref(self, name):
        self.output.append(f'&{name};')

    def handle_charref(self, name):
        self.output.append(f'&#{name};')

    def handle_comment(self, data):
        self.output.append(f'<!--{data}-->')

    def handle_decl(self, data):
        self.output.append(f'<!{data}>')

def localize_json(value, language):
    if isinstance(value, str):
        return translate(value, language)
    if isinstance(value, list):
        return [localize_json(v, language) for v in value]
    if isinstance(value, dict):
        return {k: localize_json(v, language) for k, v in value.items()}
    return value

source = (ROOT / 'index.html').read_text(encoding='utf-8')
source = re.sub(r'\s*<link rel="alternate"[^>]+>', '', source)
alternates = '\n'.join(f'  <link rel="alternate" hreflang="{lang}" href="{BASE}{spec[2]}">' for lang, spec in LANGUAGES.items())
alternates += f'\n  <link rel="alternate" hreflang="x-default" href="{BASE}">'

for language, (html_language, locale, filename) in LANGUAGES.items():
    parser = Localize(language)
    parser.feed(source)
    page = ''.join(parser.output)
    url = BASE + filename
    page = re.sub(r'<link rel="canonical"[^>]+>', f'<link rel="canonical" href="{url}">\n{alternates}', page)
    page = re.sub(r'<meta property="og:url"[^>]+>', f'<meta property="og:url" content="{url}">', page)
    page = re.sub(r'<meta property="og:locale"[^>]+>', f'<meta property="og:locale" content="{locale}">', page)
    def structured_data(match):
        data = localize_json(json.loads(match[1]), language)
        data['url'], data['inLanguage'] = url, html_language
        return '<script type="application/ld+json">\n  ' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + '\n  </script>'
    page = re.sub(r'<script type="application/ld\+json">([\s\S]*?)</script>', structured_data, page)
    # Keep language names in their own language and mark the current version.
    page = re.sub(r'(<a href="(?:\./|en\.html|de\.html|fr\.html)" lang="[a-z]+" hreflang="([a-z]+)")(?: aria-current="page")?',
                  lambda m: m[1] + (' aria-current="page"' if m[2] == language else ''), page)
    (ROOT / (filename or 'index.html')).write_text(page, encoding='utf-8')

runtime = """(() => {
  'use strict';
  const language = document.documentElement.lang.split('-')[0];
  const dictionary = DICTIONARY;
  function t(source, values = {}) {
    const translated = dictionary[source]?.[language] || source;
    return translated.replace(/\\{(\\w+)\\}/g, (match, key) => Object.hasOwn(values, key) ? String(values[key]) : match);
  }
  window.HOUSE_I18N = {language, t};
  window.PROPERTY_CONFIG.photos.forEach(photo => { photo.alt = t(photo.alt); });
  Object.values(window.HOUSE_TOUR.scenes).forEach(scene => {
    scene.title = t(scene.title);
    scene.hotSpots.forEach(hotspot => { hotspot.text = t(hotspot.text); });
  });
})();
""".replace('DICTIONARY', json.dumps(translations, ensure_ascii=False, separators=(',', ':')))
(ROOT / 'i18n.js').write_text(runtime, encoding='utf-8')

ET.register_namespace('', 'http://www.sitemaps.org/schemas/sitemap/0.9')
ET.register_namespace('image', 'http://www.google.com/schemas/sitemap-image/1.1')
ns = '{http://www.sitemaps.org/schemas/sitemap/0.9}'
im = '{http://www.google.com/schemas/sitemap-image/1.1}'
sitemap = ET.Element(ns + 'urlset')
for language, (_, _, filename) in LANGUAGES.items():
    entry = ET.SubElement(sitemap, ns + 'url')
    ET.SubElement(entry, ns + 'loc').text = BASE + filename
    # Omit lastmod rather than publish a date that could become misleading.
    for number in range(1, 51):
        image = ET.SubElement(entry, im + 'image')
        ET.SubElement(image, im + 'loc').text = f'{BASE}images/large/{number:02}.webp'
ET.indent(sitemap, space='  ')
ET.ElementTree(sitemap).write(ROOT / 'sitemap.xml', encoding='utf-8', xml_declaration=True)
print(f'Built 4 language pages, 50 photo captions per language and {len(translations)} translation entries.')
