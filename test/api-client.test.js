import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { createApplication } from '../dist/app/create-application.js';
import { catalog, listOperations, operationInfo, searchFields } from '../dist/modules/catalog/service.js';

const token = 'test-oauth-secret';
const clientFor = (fetchImpl, options = {}) => createApplication({ token, counterId: 123, fetchImpl, ...options });
const directoryFor = async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'metrika-export-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return directory;
};
const row = (name, n) => ({ dimensions: [{ id: name, name }], metrics: [n] });
const report = (data, overrides = {}) => ({ data, total_rows: 5, totals: [7], sampled: false,
  sample_share: 1, contains_sensitive_data: false, total_rows_rounded: false,
  query: { dimensions: ['ym:s:browser'], metrics: ['ym:s:users'] }, ...overrides });

test('catalog covers documented operations and searchable report fields', () => {
  assert.equal(catalog.operations.length, 108);
  assert.equal(new Set(catalog.operations.map((op) => op.id)).size, 108);
  assert.deepEqual([...new Set(catalog.operations.map((op) => op.category))].sort(), ['logs', 'management', 'stat']);
  assert.ok(listOperations({ search: 'счетчик' }).total > 0);
  assert.equal(listOperations({ category: 'logs' }).total, 7);
  assert.equal(searchFields({ search: 'ym:s:visits', kind: 'metric' }).fields[0].name, 'ym:s:visits');
  assert.ok(searchFields({ search: 'доход' }).total > 0);
  const info = operationInfo({ operationId: 'management_counter_addCounter', limit: 100 });
  assert.equal(info.method, 'POST');
  assert.equal(info.nextOffset, 100);
  assert.ok(info.bodyContentTypes.includes('application/json'));
});

test('every catalog operation dispatches to its documented route and HTTP method', async () => {
  const requests = [];
  const client = clientFor(async (url, init) => { requests.push({ url: new URL(url), ...init }); return Response.json({ ok: true }); });
  for (const operation of catalog.operations) {
    const path = Object.fromEntries([...operation.path.matchAll(/\{([^}]+)\}/g)].filter((m) => m[1] !== 'counterId').map((m) => [m[1], 42]));
    const input = { operationId: operation.id, path };
    await (operation.readOnly ? client.api.read(input) : client.api.write(input));
    const request = requests.at(-1);
    assert.equal(request.method, operation.method, operation.id);
    assert.equal(request.url.origin, 'https://api-metrika.yandex.net', operation.id);
    const expected = new URL(operation.path.replaceAll('{counterId}', '123').replace(/\{[^}]+\}/g, '42'), request.url.origin);
    assert.equal(request.url.href, expected.href, operation.id);
    assert.equal(request.headers.Authorization, `OAuth ${token}`);
    assert.equal(request.redirect, 'error');
  }
});

test('state-changing GET token generation is only available through write_api', async () => {
  let calls = 0;
  const client = clientFor(async () => { calls++; return Response.json({ token: 'new-measurement-token' }); });
  await assert.rejects(client.api.read({ operationId: 'management_measurement_generateToken' }), /write_api/);
  assert.equal(calls, 0);
  assert.deepEqual(await client.api.write({ operationId: 'management_measurement_generateToken' }), { token: 'new-measurement-token' });
  assert.equal(calls, 1);
  await assert.rejects(client.api.write({ operationId: 'management_counter_counters' }), /read_api/);
});

test('JSON mutations retain all fields, multipart uploads retain UTF-8, and 204 succeeds', async () => {
  const requests = [];
  const client = clientFor(async (url, init) => { requests.push({ url, ...init }); return new Response(null, { status: 204 }); });
  const body = { counter: { name: 'Новый', site: 'https://example.test', webvisor: { arch_enabled: true } } };
  assert.deepEqual(await client.api.write({ operationId: 'management_counter_editCounter', path: { counterId: 456 }, body }), { success: true });
  assert.deepEqual(JSON.parse(requests[0].body), body);
  assert.match(requests[0].url, /counter\/456$/);
  await client.api.write({ operationId: 'management_chats_upload_chats', files: [{ field: 'file', filename: 'chats.csv', content: 'ClientId,Target\n1,Чат' }] });
  const multipart = requests[1].body;
  assert.ok(multipart instanceof FormData);
  assert.equal(await multipart.get('file').text(), 'ClientId,Target\n1,Чат');
  assert.equal(new URL(requests[1].url).searchParams.get('type'), 'CHATS');
  assert.equal(requests[1].headers['Content-Type'], undefined);
});

test('rejects unknown operations, path traversal, credential overrides and read/write misuse before fetch', async () => {
  let calls = 0;
  const client = clientFor(async () => { calls++; return Response.json({}); });
  await assert.rejects(client.api.read({ operationId: 'https://other.test' }));
  for (const value of ['..', '.', '../1', '%2e%2e', '1?x=2', '1#hash', '1\\2']) {
    await assert.rejects(client.api.read({ operationId: 'management_goal_goal', path: { goalId: value } }));
  }
  for (const key of ['oauth_token', 'access_token', 'Authorization', 'callback']) {
    await assert.rejects(client.api.read({ operationId: 'management_counter_counters', query: { [key]: 'secret' } }));
  }
  await assert.rejects(client.api.read({ operationId: 'management_counter_deleteCounter' }));
  await assert.rejects(client.api.write({ operationId: 'management_counter_addCounter', files: [] }));
  await assert.rejects(client.api.read({ operationId: 'management_counter_counter', path: { counterId: -1 } }));
  assert.equal(calls, 0);
});

test('preserves API response fields and sanitizes API and network errors without retries', async () => {
  const response = { counter: { unknown_future_setting: true, owner_login: 'owner' }, request_id: 'request' };
  assert.deepEqual(await clientFor(async () => Response.json(response)).api.read({ operationId: 'management_counter_counter' }), response);
  let calls = 0;
  for (const fail of [() => { throw new Error(token); }, () => new Response(token, { status: 400 })]) {
    const client = clientFor(async () => { calls++; return fail(); });
    await assert.rejects(client.api.write({ operationId: 'management_counter_addCounter', body: {} }), (error) => !error.message.includes(token));
  }
  assert.equal(calls, 2);
});

test('supports all six report forms, multiple counters, parameterization and unmodified metadata', async () => {
  const requests = [];
  const result = { data: [], totals: [[1]], time_intervals: [['2026-01-01', '2026-01-02']], sampled: true,
    sample_share: 0.2, contains_sensitive_data: true, total_rows_rounded: true, min: [1], future_metadata: 'keep' };
  const client = clientFor(async (url) => { requests.push(new URL(url)); return Response.json(result); });
  for (const [kind, path] of [['table', ''], ['bytime', '/bytime'], ['drilldown', '/drilldown'], ['comparison', '/comparison'], ['comparison_drilldown', '/comparison/drilldown'], ['pivot', '/pivot']]) {
    assert.deepEqual(await client.reports.query({ kind, parameters: { ids: [123, 456], metrics: ['ym:s:visits'], attribution: 'last', timezone: '+04:00', date1: '30daysAgo', filters: "ym:s:UTMSource=='x&y'", row_ids: '[["organic"]]', group: 'day' } }), result);
    const url = requests.at(-1);
    assert.equal(url.pathname, `/stat/v1/data${path}`);
    assert.equal(url.searchParams.get('ids'), '123,456');
    assert.equal(url.searchParams.get('accuracy'), 'full');
    assert.equal(url.searchParams.get('timezone'), '+04:00');
    assert.equal(url.searchParams.get('filters'), "ym:s:UTMSource=='x&y'");
    assert.equal(url.searchParams.get('row_ids'), '[["organic"]]');
  }
});

test('exports every table page and retains API totals instead of summing unique visitors', async (t) => {
  const directory = await directoryFor(t);
  const requests = [];
  const pages = [report([row('A', 3), row('B', 4)]), report([row('C', 5), row('D', 6)]), report([row('E', 7)])];
  const client = clientFor(async (url) => { requests.push(new URL(url)); return Response.json(pages.shift()); }, { exportDir: directory });
  const result = await client.exporter.exportReport({ parameters: { metrics: ['ym:s:users'], dimensions: ['ym:s:browser'] }, pageSize: 2 });
  assert.equal(result.complete, true);
  assert.equal(result.rows, 5);
  assert.equal(result.pages, 3);
  assert.equal(result.nextOffset, null);
  assert.deepEqual(result.firstPage.totals, [7]);
  assert.deepEqual(requests.map((url) => url.searchParams.get('offset')), ['1', '3', '5']);
  const lines = (await readFile(result.file, 'utf8')).trim().split('\n').map(JSON.parse);
  assert.equal(lines.length, 5);
  assert.deepEqual(lines[4], row('E', 7));
  assert.equal((await stat(result.file)).mode & 0o777, 0o600);
  const meta = JSON.parse(await readFile(result.metadataFile, 'utf8'));
  assert.equal(meta.pageMetadata.length, 3);
  assert.deepEqual(meta.pageMetadata[2].totals, [7]);
});

test('marks partial exports and preserves sampling/privacy/rounded-total warnings', async (t) => {
  const directory = await directoryFor(t);
  const client = clientFor(async () => Response.json(report([row('A', 1)], { sampled: true, sample_share: 0.2, contains_sensitive_data: true, total_rows_rounded: true })), { exportDir: directory });
  const result = await client.exporter.exportReport({ parameters: { metrics: 'ym:s:users' }, pageSize: 1, maxRows: 1 });
  assert.equal(result.complete, false);
  assert.equal(result.stopReason, 'max_rows');
  assert.equal(result.nextOffset, 2);
  assert.deepEqual(result.warnings.sort(), ['contains_sensitive_data', 'sampled', 'total_rows_rounded']);
});

test('does not label an unexpectedly short page as a complete export', async (t) => {
  const directory = await directoryFor(t);
  const client = clientFor(async () => Response.json(report([row('A', 1)])), { exportDir: directory });
  const result = await client.exporter.exportReport({ parameters: { metrics: 'ym:s:users' }, pageSize: 2 });
  assert.equal(result.complete, false);
  assert.equal(result.stopReason, 'unexpected_short_page');
});

test('CSV correctly quotes names with commas, quotes and newlines', async (t) => {
  const directory = await directoryFor(t);
  const client = clientFor(async () => Response.json(report([row('A,"B"\nC', 3)], { total_rows: 1 })), { exportDir: directory });
  const result = await client.exporter.exportReport({ parameters: { metrics: 'ym:s:users' }, format: 'csv' });
  const text = await readFile(result.file, 'utf8');
  assert.match(text, /^"ym:s:browser.id","ym:s:browser.name","ym:s:users"\r\n/);
  assert.ok(text.includes('"A,""B""\nC"'));
});

test('cleans incomplete files after network or byte-limit failure', async (t) => {
  const directory = await directoryFor(t);
  for (const maxExportBytes of [1, 100000]) {
    let calls = 0;
    const client = clientFor(async () => {
      if (calls++) throw new Error(token);
      return Response.json(report([row('A', 1)]));
    }, { exportDir: directory, maxExportBytes });
    await assert.rejects(client.exporter.exportReport({ parameters: { metrics: 'ym:s:users' }, pageSize: 1 }), (error) => !error.message.includes(token));
    assert.deepEqual(await readdir(directory), []);
  }
});

test('streams Logs downloads to a private file and enforces inline size limits', async (t) => {
  const directory = await directoryFor(t);
  const data = 'visitId\tclientId\n1\t2\n';
  const client = clientFor(async () => new Response(data, { headers: { 'content-type': 'text/tab-separated-values' } }), { exportDir: directory, maxInlineBytes: 3 });
  const input = { operationId: 'logs_download', path: { requestId: 1, partNumber: 0 } };
  await assert.rejects(client.api.read(input), /output=file/);
  const result = await client.api.read({ ...input, output: 'file' });
  assert.equal(await readFile(result.file, 'utf8'), data);
  assert.equal(result.bytes, Buffer.byteLength(data));
  assert.equal((await stat(result.file)).mode & 0o777, 0o600);
});

test('retains useful API validation diagnostics while redacting OAuth credentials', async () => {
  const client = clientFor(async () => Response.json({ errors: [{ message: `Invalid metric ym:s:unknown; ${token}` }], debug: token }, { status: 400 }));
  await assert.rejects(client.api.read({ operationId: 'stat_data_1' }), (error) => {
    assert.match(error.message, /Invalid metric/);
    assert.equal(error.message.includes(token), false);
    return true;
  });
});

test('export page limit and changed statistics are visible, not silently treated as complete', async (t) => {
  const directory = await directoryFor(t);
  let calls = 0;
  const client = clientFor(async () => Response.json(report([row(String(calls), 1)], { totals: [++calls] })), { exportDir: directory, maxExportPages: 2 });
  const result = await client.exporter.exportReport({ parameters: { metrics: 'ym:s:users' }, pageSize: 1 });
  assert.equal(result.complete, false);
  assert.equal(result.stopReason, 'max_pages');
  assert.ok(result.warnings.includes('data_changed_between_pages'));
});

test('streams uploads only from the configured import directory', async (t) => {
  const directory = await directoryFor(t);
  const { writeFile, symlink } = await import('node:fs/promises');
  await writeFile(join(directory, 'data.csv'), 'ClientId,Target\n1,sale');
  await symlink(new URL('../package.json', import.meta.url), join(directory, 'outside.csv'));
  const requests = [];
  const client = clientFor(async (_url, init) => { requests.push(init); return Response.json({ success: true }); }, { importDir: directory });
  const input = { operationId: 'management_offline_conversions_upload_1', files: [{ field: 'file', filename: 'data.csv', filePath: 'data.csv' }] };
  await client.api.write(input);
  assert.equal(await requests[0].body.get('file').text(), 'ClientId,Target\n1,sale');
  for (const filePath of ['outside.csv', '../outside.csv', join(directory, 'data.csv')]) {
    await assert.rejects(client.api.write({ ...input, files: [{ ...input.files[0], filePath }] }), /IMPORT_DIR/);
  }
  await assert.rejects(client.api.write({ ...input, files: [{ ...input.files[0], content: 'also inline' }] }));
  assert.equal(requests.length, 1);
});

test('empty report exports cleanly and rounded totals are exhausted by actual pages', async (t) => {
  const directory = await directoryFor(t);
  const empty = await clientFor(async () => Response.json(report([], { total_rows: 0 })), { exportDir: directory })
    .exporter.exportReport({ parameters: { metrics: 'ym:s:users' } });
  assert.equal(empty.complete, true);
  assert.equal(empty.rows, 0);
  let calls = 0;
  const client = clientFor(async () => Response.json(report(calls++ ? [] : [row('A', 1)], { total_rows: 0, total_rows_rounded: true })), { exportDir: directory });
  const result = await client.exporter.exportReport({ parameters: { metrics: 'ym:s:users' }, pageSize: 1 });
  assert.equal(result.complete, true);
  assert.equal(result.pages, 2);
  assert.equal(result.rows, 1);
  assert.ok(result.warnings.includes('total_rows_rounded'));
});
