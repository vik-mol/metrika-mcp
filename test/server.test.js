import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

import {
  Client,
  StreamableHTTPClientTransport,
} from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { createMcpHandler } from '@modelcontextprotocol/server';

import { createApplication } from '../dist/app/create-application.js';
import { createServer } from '../dist/mcp/server.js';

const connect = async (t, apiClient) => {
  const application = apiClient.management ? apiClient : { counterId: 123, management: apiClient, reports: apiClient };
  const handler = createMcpHandler(() => createServer(application));
  const transport = new StreamableHTTPClientTransport(
    new URL('http://test.local/mcp'),
    {
      fetch: (url, init) => handler.fetch(new Request(url, init)),
    }
  );
  const client = new Client(
    { name: 'metrika-tests', version: '1.0.0' },
    { versionNegotiation: { mode: 'auto' } }
  );
  t.after(() => client.close());
  await client.connect(transport);
  return client;
};

test('exposes the complete toolkit and correctly marks writes', async (t) => {
  const client = await connect(t, {});
  const { tools } = await client.listTools();
  assert.deepEqual(tools.map(({ name }) => name).sort(), [
    'delete_goal',
    'ensure_event_goal',
    'export_report',
    'get_api_operation',
    'get_counter',
    'get_page_stats',
    'get_report',
    'list_api_operations',
    'list_goals',
    'query_report',
    'read_api',
    'search_report_fields',
    'search_report_reference',
    'update_goal',
    'write_api',
  ]);
  assert.equal(
    tools.find(({ name }) => name === 'list_goals').annotations.readOnlyHint,
    true
  );
  assert.equal(
    tools.find(({ name }) => name === 'update_goal').annotations.readOnlyHint,
    false
  );
  assert.equal(
    tools.find(({ name }) => name === 'update_goal').annotations
      .destructiveHint,
    true
  );
  assert.ok(
    tools.every((tool) => !JSON.stringify(tool.inputSchema).includes('token'))
  );
});

test('returns structured data through the MCP protocol', async (t) => {
  const client = await connect(t, {
    listGoals: async () => [{ id: 42, name: 'Goal' }],
  });
  const result = await client.callTool({ name: 'list_goals', arguments: {} });
  assert.deepEqual(result.structuredContent, {
    goals: [{ id: 42, name: 'Goal' }],
  });
});

test('invalid arguments cannot access another counter or reach the API', async (t) => {
  let calls = 0;
  const client = await connect(t, {
    getCounter: async () => {
      calls++;
    },
  });
  const result = await client.callTool({
    name: 'get_counter',
    arguments: { counterId: 1 },
  });
  assert.equal(result.isError, true);
  assert.equal(calls, 0);
});

test('tool errors do not expose arbitrary exceptions', async (t) => {
  const client = await connect(t, {
    listGoals: async () => {
      throw new Error('secret-token');
    },
  });
  const result = await client.callTool({ name: 'list_goals', arguments: {} });
  assert.equal(result.isError, true);
  assert.equal(JSON.stringify(result).includes('secret-token'), false);
});

test('creates an event goal through a real MCP call with a mocked Yandex response', async (t) => {
  const requests = [];
  const goal = {
    id: 42,
    type: 'action',
    name: 'Message sent',
    conditions: [{ type: 'exact', url: 'message_send_success' }],
  };
  const apiClient = createApplication({ counterId: 114014616,
    token: 'mock-token',
    fetchImpl: async (_url, init) => {
      requests.push(init);
      return Response.json(init.method === 'GET' ? { goals: [] } : { goal });
    },
  });
  const client = await connect(t, apiClient);
  const result = await client.callTool({
    name: 'ensure_event_goal',
    arguments: { event: 'message_send_success', name: 'Message sent' },
  });
  assert.deepEqual(result.structuredContent, { created: true, goal });
  assert.deepEqual(JSON.parse(requests[1].body), {
    goal: { type: 'action', name: goal.name, conditions: goal.conditions },
  });
});

test(
  'starts the actual stdio server and negotiates MCP without calling Yandex',
  { timeout: 15000 },
  async (t) => {
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: [fileURLToPath(new URL('../dist/index.js', import.meta.url))],
      env: { YANDEX_METRIKA_TOKEN: 'mock-token', YANDEX_METRIKA_COUNTER_ID: '114014616' },
      stderr: 'pipe',
    });
    const client = new Client(
      { name: 'stdio-smoke-test', version: '1.0.0' },
      { versionNegotiation: { mode: 'auto' } }
    );
    t.after(() => client.close());
    await client.connect(transport);
    const { tools } = await client.listTools();
    assert.equal(tools.length, 15);
  }
);

test('fails startup with invalid credentials and leaves stdout clean', () => {
  const result = spawnSync(
    process.execPath,
    [fileURLToPath(new URL('../dist/index.js', import.meta.url))],
    {
      env: { YANDEX_METRIKA_TOKEN: 'invalid token' },
      encoding: 'utf8',
      timeout: 5000,
    }
  );
  assert.equal(result.status, 1);
  assert.equal(result.stdout, '');
  assert.match(result.stderr, /YANDEX_METRIKA_TOKEN/);
});


test('exposes deletion through MCP with destructive annotation and exact identity', async (t) => {
  const goal = { id: 42, name: 'Old goal', type: 'action', goal_source: 'user', conditions: [{ type: 'exact', url: 'old_event' }] };
  const requests = [];
  const api = createApplication({ counterId: 114014616, token: 'mock-token', fetchImpl: async (url, init) => {
    requests.push({ url, ...init });
    return Response.json(init.method === 'GET' ? { goal } : { success: true });
  } });
  const client = await connect(t, api);
  const { tools } = await client.listTools();
  assert.equal(tools.find(({ name }) => name === 'delete_goal').annotations.destructiveHint, true);
  const result = await client.callTool({ name: 'delete_goal', arguments: { goalId: 42, event: 'old_event' } });
  assert.deepEqual(result.structuredContent, { deleted: true, goalId: 42, event: 'old_event' });
  assert.equal(requests[1].method, 'DELETE');
});


test('page report MCP tool is read-only and returns API metadata', async (t) => {
  const report = { data: [], totals: [0, 0], total_rows: 0, sampled: false };
  const client = await connect(t, { getPageStats: async () => report });
  const { tools } = await client.listTools();
  assert.equal(tools.find(({ name }) => name === 'get_page_stats').annotations.readOnlyHint, true);
  const result = await client.callTool({ name: 'get_page_stats', arguments: { dateFrom: '2026-11-03', dateTo: '2026-11-03' } });
  assert.deepEqual(result.structuredContent, report);
});


test('universal statistics MCP tool is read-only and returns report data', async (t) => {
  const report = { data: [], totals: [0], total_rows: 0, sampled: false };
  const client = await connect(t, { getReport: async () => report });
  const { tools } = await client.listTools();
  assert.equal(tools.find(({ name }) => name === 'get_report').annotations.readOnlyHint, true);
  const result = await client.callTool({ name: 'get_report', arguments: { dateFrom: '2026-11-03', dateTo: '2026-11-03', metrics: ['ym:s:visits'] } });
  assert.deepEqual(result.structuredContent, report);
});

test('exposes catalog, report field discovery and full report data through MCP', async (t) => {
  const report = { data: [], totals: [[5]], time_intervals: [['2026-01-01', '2026-01-02']], sampled: true, sample_share: 0.5, contains_sensitive_data: true };
  const api = createApplication({ token: 'mock-token', counterId: 123, fetchImpl: async () => Response.json(report) });
  const client = await connect(t, api);
  const { tools } = await client.listTools();
  assert.equal(tools.find((tool) => tool.name === 'write_api').annotations.readOnlyHint, false);
  assert.equal(tools.find((tool) => tool.name === 'write_api').annotations.destructiveHint, true);
  const catalog = await client.callTool({ name: 'list_api_operations', arguments: { category: 'logs' } });
  assert.equal(catalog.structuredContent.total, 7);
  const fields = await client.callTool({ name: 'search_report_fields', arguments: { search: 'просмотр' } });
  assert.ok(fields.structuredContent.total > 0);
  const result = await client.callTool({ name: 'query_report', arguments: { kind: 'bytime', parameters: { metrics: ['ym:s:users'], group: 'day' } } });
  assert.deepEqual(result.structuredContent, report);
  const prohibited = await client.callTool({ name: 'read_api', arguments: { operationId: 'management_measurement_generateToken' } });
  assert.equal(prohibited.isError, true);
});

test('imports multipart data through a real MCP call with mocked API', async (t) => {
  const requests = [];
  const api = createApplication({ token: 'mock-token', counterId: 123, fetchImpl: async (url, init) => {
    requests.push({ url, ...init });
    return Response.json({ uploading: { id: 42, status: 'UPLOADED' } });
  } });
  const client = await connect(t, api);
  const result = await client.callTool({ name: 'write_api', arguments: {
    operationId: 'management_offline_conversions_upload_1',
    files: [{ field: 'file', filename: 'conversions.csv', content: 'ClientId,Target,DateTime\n1,sale,1600000000' }],
  } });
  assert.equal(result.isError, undefined);
  assert.equal(result.structuredContent.uploading.id, 42);
  assert.equal(await requests[0].body.get('file').text(), 'ClientId,Target,DateTime\n1,sale,1600000000');
});

test('legacy src/index.js launch remains compatible from another working directory', { timeout: 15000 }, async (t) => {
  const { tmpdir } = await import('node:os');
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [fileURLToPath(new URL('../src/index.js', import.meta.url))],
    cwd: tmpdir(),
    env: { YANDEX_METRIKA_TOKEN: 'mock-token', YANDEX_METRIKA_COUNTER_ID: '123' },
    stderr: 'pipe',
  });
  const client = new Client({ name: 'compatibility-test', version: '1.0.0' }, { versionNegotiation: { mode: 'auto' } });
  t.after(() => client.close());
  await client.connect(transport);
  assert.equal((await client.listTools()).tools.length, 15);
});
