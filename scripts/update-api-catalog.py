"""Refresh the checked-in catalog from the official Yandex Metrica documentation."""
import concurrent.futures
import datetime
import hashlib
import tempfile
from html import unescape
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import time
from urllib.request import urlopen

BASE = 'https://yandex.ru/dev/metrika/'
ROOT = Path(__file__).resolve().parents[1]

class Text(HTMLParser):
    def __init__(self):
        super().__init__()
        self.parts = []
    def handle_starttag(self, tag, attrs):
        if tag in ('p', 'li', 'tr', 'h1', 'h2', 'h3', 'pre'): self.parts.append('\n')
    def handle_endtag(self, tag):
        if tag in ('p', 'li', 'tr', 'h1', 'h2', 'h3', 'pre'): self.parts.append('\n')
    def handle_data(self, data): self.parts.append(data)

def plain(html):
    parser = Text()
    parser.feed(html)
    return re.sub(r'\n(?:[ \t]*\n)+', '\n\n', ''.join(parser.parts)).strip()

def fetch(href):
    cache = Path(tempfile.gettempdir()) / 'metrika-api-docs'
    cache.mkdir(exist_ok=True)
    target = cache / (hashlib.sha256(href.encode()).hexdigest() + '.json')
    if target.exists() and time.time() - target.stat().st_mtime < 3600: return json.loads(target.read_text())
    for attempt in range(3):
        try:
            with urlopen(BASE + href, timeout=45) as response:
                html = response.read().decode('utf-8')
            page = json.JSONDecoder().raw_decode(html.split('__DATA__ = ', 1)[1])[0]['props']['pageProps']['data']
            target.write_text(json.dumps(page, ensure_ascii=False))
            return page
        except Exception:
            if attempt == 2: raise
            time.sleep(attempt + 1)

def walk(node):
    if isinstance(node, dict):
        if 'href' in node: yield node
        for value in node.values(): yield from walk(value)
    elif isinstance(node, list):
        for item in node: yield from walk(item)

def operation(entry):
    page = fetch(entry['href'])
    html = page['html']
    method_match = re.search(r'class="openapi__method">(\w+)', html)
    if not method_match: method_match = re.search(r'(GET|POST|PUT|DELETE) https://api-metrika', plain(html))
    if not method_match: raise ValueError('Missing method: ' + entry['href'] + ': ' + plain(html)[:800])
    method = method_match.group(1)
    endpoint = unescape(re.search(r'https://api-metrika\.yandex\.net[^\s<]+', html.split('id="request"', 1)[1]).group(0))
    request = re.split(r'<h2 id="responses"', html)[0]
    parameters = {}
    for location in ['path', 'query']:
        match = re.search(r'<h3 id="'+location+r'-parameters".*?(?=<h[23] |$)', request, re.S)
        parameters[location] = []
        if match:
            for row in re.findall(r'<tr>(.*?)</tr>', match.group(), re.S):
                name = re.search(r'<em class="([^"]*json-schema-property[^"]*)">(.*?)</em>', row)
                if name:
                    description = plain(row)
                    parameters[location].append({'name': plain(name.group(2)), 'required': 'json-schema-required' in name.group(1), 'description': description})
    body = re.search(r'<h3 id="body".*', request, re.S)
    body_text = plain(body.group()) if body else ''
    content_types = [value for value in ['multipart/form-data', 'application/json', 'text/csv', 'application/x-www-form-urlencoded'] if value in (body_text or plain(request))]
    return {
        'id': entry['href'].replace('ru/', '', 1).replace('/openapi/', '_').replace('/', '_'),
        'category': entry['href'].split('/')[1],
        'name': entry['name'], 'method': method,
        'readOnly': method == 'GET' and not entry['href'].endswith('/measurement/generateToken'),
        'path': endpoint.removeprefix('https://api-metrika.yandex.net'),
        'documentationUrl': BASE + entry['href'], 'parameters': parameters,
        'bodyContentTypes': content_types, 'documentation': plain(html),
    }

def report_fields():
    href = 'ru/stat/attrandmetr/dim_all'
    html = fetch(href)['html']
    metric_start = html.index('id="metrics"')
    fields = []
    for match in re.finditer(r'<h3 id="([^"]+)">(.*?)</h3>(.*?)(?=<h[23] |$)', html, re.S):
        name = plain(match.group(2))
        if name.startswith('ym:'):
            fields.append({'name': name, 'kind': 'metric' if match.start() > metric_start else 'dimension',
                           'description': plain(match.group(3)), 'url': BASE + href + '#' + match.group(1)})
    return fields

def main():
    index = fetch('ru/')
    entries = [entry for entry in walk(index['toc']) if '/openapi/' in entry['href']]
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        operations = list(pool.map(operation, entries))
    # The chats list page mistakenly appends an uploadingId to the collection.
    # Chats share the offline-conversion collection documented in findAll_1.
    by_id = {op['id']: op for op in operations}
    chats = by_id['management_chats_findAll_chats']
    chats['path'] = by_id['management_offline_conversions_findAll_1']['path']
    chats['parameters'] = by_id['management_offline_conversions_findAll_1']['parameters']
    chats['note'] = 'Исправлена опечатка в пути списка чатов: используется общий список offline_conversions/uploadings.'
    assert len({op['id'] for op in operations}) == len(operations)
    references = [{'name': e.get('name', ''), 'url': BASE + e['href']} for e in walk(index['toc']) if '/stat/' in e['href'] or '/logs/fields/' in e['href']]
    result = {'source': BASE+'ru/', 'revision': index['revision'], 'retrievedAt': datetime.date.today().isoformat(), 'operations': operations, 'references': references, 'fields': report_fields()}
    target = ROOT / 'src' / 'api-catalog.json'
    target.write_text(json.dumps(result, ensure_ascii=False, indent=2)+'\n')
    coverage = [
        '# Покрытие API Яндекс Метрики', '',
        'Снимок официального справочника: ' + result['retrievedAt'] + ', revision `' + result['revision'] + '`.',
        '', 'Всего: ' + str(len(operations)) + ' методов. Методы доступны через `read_api` / `write_api`;',
        'контракт и параметры — через `get_api_operation`. Новые методы после даты снимка требуют обновления каталога.',
        '', 'Проверка маршрутизации выполняется на подставном HTTP-клиенте; доступность для реального аккаунта определяется правами и квотами API.', '',
        '| operationId | Метод | Действие | Чтение / запись | Документация |',
        '| --- | --- | --- | --- | --- |',
    ]
    for op in operations:
        coverage.append('| `' + op['id'] + '` | ' + op['method'] + ' | ' + op['name'] + ' | ' + ('чтение' if op['readOnly'] else 'запись') + ' | [Источник](' + op['documentationUrl'] + ') |')
    (ROOT / 'API-COVERAGE.md').write_text('\n'.join(coverage) + '\n')
    print('Catalog:', len(operations), 'operations,', len(references), 'references')

if __name__ == '__main__': main()
