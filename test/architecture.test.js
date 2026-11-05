import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createApplication } from '../dist/app/create-application.js';
import { ReportExporter } from '../dist/modules/reports/exporter.js';

// These tests protect module boundaries introduced by the refactor.
test('generic writes share the same queue as read-check-write goal workflows', async () => {
  const requests = [];
  const goal = { id: 42, name: 'Goal', type: 'action', conditions: [{ type: 'exact', url: 'event' }] };
  const application = createApplication({ token: 'mock-token', counterId: 123, fetchImpl: async (url, init) => {
    requests.push({ path: new URL(url).pathname, method: init.method });
    await new Promise((resolve) => setImmediate(resolve));
    return Response.json(init.method === 'GET' ? { goals: [] } : { goal });
  } });
  await Promise.all([
    application.management.ensureEventGoal({ event: 'event', name: 'Goal' }),
    application.api.write({ operationId: 'management_counter_editCounter', body: { counter: { name: 'New name' } } }),
  ]);
  assert.deepEqual(requests.map(({ method }) => method), ['GET', 'POST', 'PUT']);
  assert.ok(requests[1].path.endsWith('/goals'));
  assert.ok(requests[2].path.endsWith('/counter/123'));
});

test('failed generic mutation releases the shared queue for following workflows', async () => {
  let calls = 0;
  const application = createApplication({ token: 'mock-token', counterId: 123, fetchImpl: async () => {
    if (++calls === 1) throw new Error('unavailable');
    return Response.json({ success: true });
  } });
  const input = { operationId: 'management_counter_undeleteCounter' };
  const failed = application.api.write(input);
  const next = application.api.write(input);
  await assert.rejects(failed, /неизвестен/);
  assert.deepEqual(await next, { success: true });
  assert.equal(calls, 2);
});

test('exporter rolls back data and metadata when metadata publication fails', async () => {
  const events = [];
  let sequence = 0;
  const storage = { create: async () => {
    const id = ++sequence;
    return {
      path: `/virtual/${id}`, bytes: 0,
      write: async () => { events.push(`write:${id}`); },
      commit: async () => { events.push(`commit:${id}`); if (id === 2) throw new Error('disk unavailable'); },
      abort: async () => { events.push(`abort:${id}`); },
    };
  } };
  const reports = { query: async () => ({ data: [], totals: [0], total_rows: 0, sampled: false }) };
  const exporter = new ReportExporter(reports, storage, 10);
  await assert.rejects(exporter.exportReport({ parameters: { metrics: 'ym:s:users' } }), /Незавершённые файлы удалены/);
  assert.ok(events.includes('commit:1'));
  assert.ok(events.includes('abort:1'));
  assert.ok(events.includes('abort:2'));
});
