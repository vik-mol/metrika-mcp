import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createApplication } from '../dist/app/create-application.js';

const token = 'mock-token-for-tests';
const base = 'https://api-metrika.yandex.net/management/v1/counter/114014616';
const goal = {
  id: 42,
  name: 'Успешная отправка сообщения',
  type: 'action',
  goal_source: 'user',
  conditions: [{ type: 'exact', url: 'message_send_success' }],
};

const fixture = (responses) => {
  const requests = [];
  const client = createApplication({ counterId: 114014616,
    token,
    fetchImpl: async (url, init) => {
      requests.push({ url, ...init });
      if (!responses.length) throw new Error('Unexpected request');
      const next = responses.shift();
      if (next instanceof Error) throw next;
      return next instanceof Response ? next : Response.json(next);
    },
  });
  return { client, requests };
};

test('requires a token without including it in error messages', () => {
  for (const value of [undefined, '', ' ', 'bad\ntoken']) {
    assert.throws(
      () => createApplication({ counterId: 114014616, token: value }),
      /YANDEX_METRIKA_TOKEN/
    );
  }
});

test('gets only the configured counter and sends OAuth in a header', async () => {
  const { client, requests } = fixture([
    {
      counter: {
        id: 114014616,
        name: 'Widget',
        permission: 'edit',
        owner_login: 'private',
      },
    },
  ]);
  assert.deepEqual(await client.management.getCounter(), {
    id: 114014616,
    name: 'Widget',
    permission: 'edit',
    owner_login: 'private',
  });
  assert.equal(requests[0].url, base);
  assert.equal(requests[0].headers.Authorization, `OAuth ${token}`);
  assert.equal(requests[0].redirect, 'error');
  assert.ok(requests[0].signal instanceof AbortSignal);
  assert.equal(requests[0].url.includes(token), false);
});

test('lists all goal types, including non-event conditions', async () => {
  const goals = [
    goal,
    {
      id: 43,
      name: 'Chat',
      type: 'chat',
      conditions: [{ platform: 'example' }, null],
    },
  ];
  const { client } = fixture([{ goals }]);
  assert.deepEqual(await client.management.listGoals(), goals);
});

test('accepts numeric favorite flags returned by the live API', async () => {
  const { client } = fixture([
    {
      goals: [
        { ...goal, is_favorite: 1 },
        { ...goal, id: 43, is_favorite: 0 },
      ],
    },
  ]);
  const goals = await client.management.listGoals();
  assert.equal(goals[0].is_favorite, true);
  assert.equal(goals[1].is_favorite, false);
});

test('creates an event goal using the documented action/exact structure', async () => {
  const { client, requests } = fixture([{ goals: [] }, { goal }]);
  const result = await client.management.ensureEventGoal({
    event: 'message_send_success',
    name: goal.name,
  });
  assert.equal(result.created, true);
  assert.equal(requests[1].url, `${base}/goals`);
  assert.equal(requests[1].method, 'POST');
  assert.deepEqual(JSON.parse(requests[1].body), {
    goal: { name: goal.name, type: 'action', conditions: goal.conditions },
  });
});

test('returns the existing event goal even when its display name differs', async () => {
  const { client, requests } = fixture([{ goals: [goal] }]);
  assert.deepEqual(
    await client.management.ensureEventGoal({
      event: 'message_send_success',
      name: 'Another name',
    }),
    {
      created: false,
      goal,
    }
  );
  assert.equal(requests.length, 1);
});

test('does not select arbitrarily between duplicate existing goals', async () => {
  const { client, requests } = fixture([
    { goals: [goal, { ...goal, id: 43 }] },
  ]);
  await assert.rejects(
    client.management.ensureEventGoal({ event: 'message_send_success', name: goal.name }),
    /несколькими/
  );
  assert.equal(requests.length, 1);
});

test('does not create a goal with an existing name and a different event', async () => {
  const { client, requests } = fixture([{ goals: [goal] }]);
  await assert.rejects(
    client.management.ensureEventGoal({ event: 'another_event', name: goal.name }),
    /названием/
  );
  assert.equal(requests.length, 1);
});

test('serializes concurrent creation to avoid creating the same event twice', async () => {
  const { client, requests } = fixture([
    { goals: [] },
    { goal },
    { goals: [goal] },
  ]);
  const results = await Promise.all([
    client.management.ensureEventGoal({ event: 'message_send_success', name: goal.name }),
    client.management.ensureEventGoal({ event: 'message_send_success', name: goal.name }),
  ]);
  assert.deepEqual(
    results.map((result) => result.created),
    [true, false]
  );
  assert.equal(
    requests.filter((request) => request.method === 'POST').length,
    1
  );
});

test('updates a goal while preserving conditions, price and favorite flag', async () => {
  const original = { ...goal, default_price: 10, is_favorite: true };
  const { client, requests } = fixture([
    { goal: original },
    { goals: [original] },
    { goal: { ...original, name: 'New' } },
  ]);
  await client.management.updateGoal({ goalId: 42, name: 'New' });
  assert.equal(requests[2].url, `${base}/goal/42`);
  assert.equal(requests[2].method, 'PUT');
  assert.deepEqual(JSON.parse(requests[2].body), {
    goal: {
      id: 42,
      name: 'New',
      type: 'action',
      conditions: goal.conditions,
      default_price: 10,
      is_favorite: 1,
    },
  });
});

test('allows explicit zero price, false favorite, and a new event', async () => {
  const { client, requests } = fixture([
    { goal: { ...goal, default_price: 10, is_favorite: true } },
    { goals: [goal] },
    { goal },
  ]);
  await client.management.updateGoal({
    goalId: 42,
    event: 'new_event',
    defaultPrice: 0,
    isFavorite: false,
  });
  const body = JSON.parse(requests[2].body).goal;
  assert.equal(body.id, 42);
  assert.equal(body.default_price, 0);
  assert.equal(body.is_favorite, 0);
  assert.deepEqual(body.conditions, [{ type: 'exact', url: 'new_event' }]);
});

test('serializes a non-favorite goal from the API as an integer during rename', async () => {
  const original = { ...goal, is_favorite: 0 };
  const { client, requests } = fixture([
    { goal: original },
    { goals: [original] },
    { goal: { ...original, name: 'Renamed' } },
  ]);
  await client.management.updateGoal({ goalId: 42, name: 'Renamed' });
  const body = JSON.parse(requests[2].body).goal;
  assert.equal(body.id, 42);
  assert.equal(body.is_favorite, 0);
});

test('rejects updates to automatic and non-event goals', async () => {
  for (const current of [
    { ...goal, goal_source: 'auto' },
    { ...goal, type: 'url' },
  ]) {
    const { client, requests } = fixture([{ goal: current }]);
    await assert.rejects(
      client.management.updateGoal({ goalId: 42, name: 'New' }),
      /пользовательские JavaScript/
    );
    assert.equal(requests.length, 1);
  }
});

test('rejects an event collision during update', async () => {
  const { client, requests } = fixture([
    { goal },
    {
      goals: [
        goal,
        { ...goal, id: 43, conditions: [{ type: 'exact', url: 'new_event' }] },
      ],
    },
  ]);
  await assert.rejects(
    client.management.updateGoal({ goalId: 42, event: 'new_event' }),
    /другой целью/
  );
  assert.equal(requests.length, 2);
});

test('validates input before any API request', () => {
  const { client, requests } = fixture([]);
  for (const event of [
    '',
    'bad/event',
    'bad?event',
    'bad+event',
    'bad event',
  ]) {
    assert.throws(() => client.management.ensureEventGoal({ event, name: 'Name' }));
  }
  assert.throws(() =>
    client.management.ensureEventGoal({ event: 'valid', name: 'Name', counterId: 1 })
  );
  assert.throws(() => client.management.updateGoal({ goalId: 42 }));
  assert.throws(() => client.management.updateGoal({ goalId: -1, name: 'Name' }));
  assert.equal(requests.length, 0);
});

test('handles auth, quota and server errors without exposing raw responses', async () => {
  for (const status of [401, 403, 404, 429, 500]) {
    const { client, requests } = fixture([
      new Response(`private ${token}`, { status }),
    ]);
    await assert.rejects(client.management.listGoals(), (error) => {
      assert.match(error.message, new RegExp(`HTTP ${status}`));
      assert.equal(error.message.includes(token), false);
      return true;
    });
    assert.equal(requests.length, 1);
  }
});

test('never retries a write when its result is unknown', async () => {
  const { client, requests } = fixture([
    { goals: [] },
    new Error(`private ${token}`),
  ]);
  await assert.rejects(
    client.management.ensureEventGoal({ event: 'message_send_success', name: goal.name }),
    (error) => {
      assert.match(error.message, /неизвестен/);
      assert.equal(error.message.includes(token), false);
      return true;
    }
  );
  assert.equal(requests.length, 2);
});

test('rejects malformed responses rather than creating from an unknown state', async () => {
  const { client, requests } = fixture([{}]);
  await assert.rejects(
    client.management.ensureEventGoal({ event: 'message_send_success', name: goal.name }),
    /формат/
  );
  assert.equal(requests.length, 1);
});


test('deletes only the goal with the expected exact event', async () => {
  const { client, requests } = fixture([{ goal }, { success: true }]);
  assert.deepEqual(await client.management.deleteGoal({ goalId: 42, event: 'message_send_success' }), {
    deleted: true, goalId: 42, event: 'message_send_success',
  });
  assert.equal(requests[1].url, `${base}/goal/42`);
  assert.equal(requests[1].method, 'DELETE');
  assert.equal(requests[1].body, undefined);
});

test('refuses deletion when goal identity or exact condition differs', async () => {
  for (const candidate of [
    { ...goal, id: 43 },
    { ...goal, type: 'chat' },
    { ...goal, goal_source: 'auto' },
    { ...goal, conditions: [{ type: 'exact', url: 'other_event' }] },
    { ...goal, conditions: [{ type: 'contain', url: 'message_send_success' }] },
    { ...goal, conditions: [...goal.conditions, { type: 'exact', url: 'other_event' }] },
  ]) {
    const { client, requests } = fixture([{ goal: candidate }]);
    await assert.rejects(client.management.deleteGoal({ goalId: 42, event: 'message_send_success' }), /отменено/);
    assert.equal(requests.length, 1);
  }
});

test('validates deletion arguments before accessing the API', () => {
  const { client, requests } = fixture([]);
  assert.throws(() => client.management.deleteGoal({ goalId: 42 }));
  assert.throws(() => client.management.deleteGoal({ goalId: -1, event: 'message_send_success' }));
  assert.throws(() => client.management.deleteGoal({ goalId: 42, event: 'message_send_success', counterId: 1 }));
  assert.equal(requests.length, 0);
});

test('never retries a deletion with an unknown outcome', async () => {
  const { client, requests } = fixture([{ goal }, new Error('timeout')]);
  await assert.rejects(client.management.deleteGoal({ goalId: 42, event: 'message_send_success' }), /неизвестен/);
  assert.equal(requests.length, 2);
});

test('does not report a rejected deletion as successful', async () => {
  const { client } = fixture([{ goal }, { success: false }]);
  await assert.rejects(client.management.deleteGoal({ goalId: 42, event: 'message_send_success' }), /формат/);
});


const pageReport = {
  data: [{ dimensions: [{ name: 'https://example.test/#chat-widget/main' }], metrics: [12, 2] }],
  totals: [12, 2], total_rows: 1, sampled: false, sample_share: 1,
};

test('reads page statistics from the fixed counter and preserves hash and completeness metadata', async () => {
  const { client, requests } = fixture([pageReport]);
  assert.deepEqual(await client.reports.getPageStats({ dateFrom: '2026-10-04', dateTo: '2026-11-03' }), pageReport);
  const url = new URL(requests[0].url);
  assert.equal(url.origin + url.pathname, 'https://api-metrika.yandex.net/stat/v1/data');
  assert.equal(url.searchParams.get('ids'), '114014616');
  assert.equal(url.searchParams.get('dimensions'), 'ym:pv:URLHash');
  assert.equal(url.searchParams.get('metrics'), 'ym:pv:pageviews,ym:pv:users');
  assert.equal(url.searchParams.get('accuracy'), 'full');
  assert.equal(requests[0].method, 'GET');
  assert.equal(requests[0].url.includes(token), false);
});

for (const [breakdown, dimensions] of [
  ['referrers', 'ym:pv:URL,ym:pv:referer'],
  ['daily', 'ym:pv:date,ym:pv:URL'],
]) {
  test(`reads ${breakdown} without arbitrary dimensions`, async () => {
    const { client, requests } = fixture([pageReport]);
    await client.reports.getPageStats({ dateFrom: '2026-11-03', dateTo: '2026-11-03', breakdown, includeHash: false, limit: 10, offset: 11 });
    const url = new URL(requests[0].url);
    assert.equal(url.searchParams.get('dimensions'), dimensions);
    assert.equal(url.searchParams.get('limit'), '10');
    assert.equal(url.searchParams.get('offset'), '11');
  });
}

test('rejects invalid report dates, bounds and arbitrary API targets before network access', async () => {
  for (const input of [
    { dateFrom: '2026-11-04', dateTo: '2026-11-03' },
    { dateFrom: '2026-02-30', dateTo: '2026-11-03' },
    { dateFrom: '2026-11-03', dateTo: '2026-11-03', limit: 1001 },
    { dateFrom: '2026-11-03', dateTo: '2026-11-03', counterId: 1 },
    { dateFrom: '2026-11-03', dateTo: '2026-11-03', reportUrl: 'https://other.test' },
  ]) {
    const { client, requests } = fixture([]);
    await assert.rejects(client.reports.getPageStats(input));
    assert.equal(requests.length, 0);
  }
});


test('universal report uses fixed API/counter and safely encodes filters and pagination', async () => {
  const { client, requests } = fixture([pageReport]);
  const filters = "ym:s:regionCountry=='Россия'";
  await client.reports.getReport({ dateFrom: '2026-10-04', dateTo: '2026-11-03',
    dimensions: ['ym:s:deviceCategory', 'ym:s:regionCity'],
    metrics: ['ym:s:visits', 'ym:s:users'], filters,
    sort: ['-ym:s:visits'], limit: 10, offset: 11 });
  const url = new URL(requests[0].url);
  assert.equal(url.origin + url.pathname, 'https://api-metrika.yandex.net/stat/v1/data');
  assert.equal(url.searchParams.get('ids'), '114014616');
  assert.equal(url.searchParams.get('dimensions'), 'ym:s:deviceCategory,ym:s:regionCity');
  assert.equal(url.searchParams.get('filters'), filters);
  assert.equal(url.searchParams.get('offset'), '11');
  assert.equal(url.searchParams.get('accuracy'), 'full');
  assert.equal(requests[0].method, 'GET');
});

test('universal report supports totals without dimensions and nullable metrics', async () => {
  const report = { data: [{ metrics: [0, null] }], totals: [0, null], total_rows: 1, sampled: false, data_lag: 60 };
  const { client, requests } = fixture([report]);
  assert.deepEqual(await client.reports.getReport({ dateFrom: '2026-11-03', dateTo: '2026-11-03', metrics: ['ym:s:visits', 'ym:s:avgVisitDurationSeconds'] }), report);
  assert.equal(new URL(requests[0].url).searchParams.has('dimensions'), false);
});

test('universal report rejects arbitrary targets, invalid fields and excessive sizes', async () => {
  const baseInput = { dateFrom: '2026-11-03', dateTo: '2026-11-03', metrics: ['ym:s:visits'] };
  for (const extra of [
    { ids: '1' }, { counterId: 1 }, { reportUrl: 'https://other.test' },
    { dateFrom: '2026-11-04' }, { metrics: [] }, { metrics: ['visits'] },
    { dimensions: ['ym:s:browser&ids=1'] }, { offset: 0 },
    { dimensions: Array(11).fill('ym:s:browser') },
  ]) {
    const { client, requests } = fixture([]);
    await assert.rejects(client.reports.getReport({ ...baseInput, ...extra }));
    assert.equal(requests.length, 0);
  }
});

test('isolates clients with different configured counters across all API endpoints', async () => {
  for (const counterId of [123456, 987654]) {
    const requests = [];
    const client = createApplication({ counterId, token, timeoutMs: 5000, fetchImpl: async (url) => {
      requests.push(new URL(url));
      if (url.includes('/management/')) return Response.json({ counter: { id: counterId, name: 'Own counter' }, goals: [] });
      return Response.json({ data: [], totals: [], total_rows: 0, sampled: false });
    } });
    assert.equal(client.counterId, counterId);
    assert.equal((await client.management.getCounter()).id, counterId);
    await client.management.listGoals();
    await client.reports.getPageStats({ dateFrom: '2026-11-01', dateTo: '2026-11-02' });
    await client.reports.getReport({ dateFrom: '2026-11-01', dateTo: '2026-11-02', metrics: ['ym:s:visits'] });
    assert.equal(requests[0].pathname, `/management/v1/counter/${counterId}`);
    assert.equal(requests[1].pathname, `/management/v1/counter/${counterId}/goals`);
    assert.equal(requests[2].searchParams.get('ids'), String(counterId));
    assert.equal(requests[3].searchParams.get('ids'), String(counterId));
  }
});

test('rejects a response for another counter', async () => {
  const client = createApplication({ counterId: 123456, token, fetchImpl: async () => Response.json({ counter: { id: 987654, name: 'Other' } }) });
  await assert.rejects(client.management.getCounter(), /другой счётчик/);
});

test('does not construct a client with a missing or invalid counter', () => {
  for (const counterId of [undefined, 0, -1, 1.5, '123456', Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => createApplication({ token, counterId }), /YANDEX_METRIKA_COUNTER_ID/);
  }
});

test('expanded reports preserve disclosure flags and additional row and dimension metadata', async () => {
  const report = { data: [{ dimensions: [{ name: 'Organic', id: 'organic', extra: 'keep' }], metrics: [1], future_row_field: true }],
    totals: [1], total_rows: 1, sampled: false, contains_sensitive_data: true, total_rows_rounded: false, min: [1], max: [1] };
  const { client, requests } = fixture([report]);
  const result = await client.reports.getReport({ dateFrom: '30daysAgo', dateTo: 'yesterday', metrics: ['ym:s:users'], dimensions: ['ym:s:trafficSource'], timezone: '+04:00', attribution: 'last', limit: 100000 });
  assert.deepEqual(result, report);
  const query = new URL(requests[0].url).searchParams;
  assert.equal(query.get('timezone'), '+04:00');
  assert.equal(query.get('attribution'), 'last');
  assert.equal(query.get('limit'), '100000');
});
