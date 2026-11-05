import assert from 'node:assert/strict';
import { test } from 'node:test';
import { defaultExportDir, defaultImportDir } from '../dist/config/paths.js';
import { loadConfig } from '../dist/config/env.js';

const env = { YANDEX_METRIKA_TOKEN: 'mock-token', YANDEX_METRIKA_COUNTER_ID: '123456' };

test('loads individual counter and optional timeout from environment', () => {
  assert.deepEqual(loadConfig({ env }), { token: 'mock-token', counterId: 123456, timeoutMs: 15000, exportDir: defaultExportDir, importDir: defaultImportDir, maxImportBytes: 1073741824, maxInlineBytes: 10485760, maxExportBytes: 1073741824, maxExportPages: 10000 });
  assert.equal(loadConfig({ env: { ...env, YANDEX_METRIKA_TIMEOUT_MS: '5000' } }).timeoutMs, 5000);
});

test('requires a valid counter ID without exposing the invalid value', () => {
  for (const value of [undefined, '', '0', '-1', '1.2', '1e3', 'Infinity', '9007199254740992', 'private-value']) {
    assert.throws(() => loadConfig({ env: { ...env, YANDEX_METRIKA_COUNTER_ID: value } }), (error) => {
      assert.match(error.message, /YANDEX_METRIKA_COUNTER_ID/);
      assert.equal(error.message.includes('private-value'), false);
      return true;
    });
  }
});

test('rejects invalid timeout settings', () => {
  for (const value of ['', '0', '-1', '1.5', '2147483648', 'private-value']) {
    assert.throws(() => loadConfig({ env: { ...env, YANDEX_METRIKA_TIMEOUT_MS: value } }), /YANDEX_METRIKA_TIMEOUT_MS/);
  }
});

test('loads configurable export limits and resolves relative paths from the project', () => {
  const config = loadConfig({ env: { ...env, YANDEX_METRIKA_EXPORT_DIR: 'reports', YANDEX_METRIKA_MAX_INLINE_BYTES: '100', YANDEX_METRIKA_MAX_EXPORT_BYTES: '200', YANDEX_METRIKA_MAX_EXPORT_PAGES: '3' } });
  assert.ok(config.exportDir.endsWith('/metrika-mcp/reports'));
  assert.equal(config.maxInlineBytes, 100);
  assert.equal(config.maxExportBytes, 200);
  assert.equal(config.maxExportPages, 3);
  for (const name of ['YANDEX_METRIKA_MAX_INLINE_BYTES', 'YANDEX_METRIKA_MAX_EXPORT_BYTES', 'YANDEX_METRIKA_MAX_EXPORT_PAGES']) {
    assert.throws(() => loadConfig({ env: { ...env, [name]: '0' } }), new RegExp(name));
  }
});
