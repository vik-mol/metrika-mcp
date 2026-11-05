import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { loadLocalEnv, loadToken } from '../dist/config/credentials.js';

test('reads the environment token and trims surrounding whitespace', () => {
  assert.equal(loadToken({ env: { YANDEX_METRIKA_TOKEN: ' mock-token ' } }), 'mock-token');
});

test('rejects missing, empty and invalid tokens without exposing them', () => {
  for (const value of [undefined, '', '  ', 'secret token']) {
    assert.throws(() => loadToken({ env: { YANDEX_METRIKA_TOKEN: value } }),
      (error) => {
        assert.match(error.message, /YANDEX_METRIKA_TOKEN/);
        assert.equal(error.message.includes('secret token'), false);
        return true;
      });
  }
});

test('missing local file is optional but read errors are sanitized', () => {
  loadLocalEnv({ load: () => { throw Object.assign(new Error(), { code: 'ENOENT' }); } });
  assert.throws(() => loadLocalEnv({ load: () => { throw new Error('secret-token'); } }),
    (error) => {
      assert.match(error.message, /\.env/);
      assert.equal(error.message.includes('secret-token'), false);
      return true;
    });
});

test('loads a local env file from another working directory and preserves environment priority', (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'metrika-env-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const path = join(directory, '.env');
  writeFileSync(path, "YANDEX_METRIKA_TOKEN='mock#file-token'\n", { mode: 0o600 });
  const moduleUrl = new URL('../dist/config/credentials.js', import.meta.url).href;
  for (const inherited of [undefined, 'mock-environment-token']) {
    const env = { ...process.env };
    delete env.YANDEX_METRIKA_TOKEN;
    if (inherited) env.YANDEX_METRIKA_TOKEN = inherited;
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', `
      import { loadLocalEnv, loadToken } from ${JSON.stringify(moduleUrl)};
      loadLocalEnv({ path: ${JSON.stringify(path)} });
      if (loadToken() !== ${JSON.stringify(inherited ?? 'mock#file-token')}) process.exit(1);
    `], { cwd: tmpdir(), env, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, '');
  }
});
