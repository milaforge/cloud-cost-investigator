import assert from 'node:assert/strict';
import test from 'node:test';
import { MockProvider } from '../src/investigation/mock.ts';
import { ScriptedPlanner } from '../src/investigation/planner.ts';
import { ModelHttpError } from '../src/investigation/provider-error.ts';
import { OpenAICompatiblePlanner } from '../src/investigation/model.ts';
import {
  runInvestigation,
  type InvestigationProgress,
} from '../src/investigation/run.ts';

const request = {
  account_id: 'retry-test',
  region: 'us-east-1',
  max_candidates: 1,
  window: { from: '2026-09-01T00:00:00Z', to: '2026-09-29T00:00:00Z' },
};

test('transient planner failure after metrics recovers with evidence retained and no repeated tool', async (t) => {
  t.mock.timers.enable({
    apis: ['Date', 'setTimeout', 'setInterval'],
    now: Date.now(),
  });
  t.mock.method(Math, 'random', () => 0);
  const scripted = new ScriptedPlanner();
  let calls = 0;
  const tools: string[] = [];
  const base = new MockProvider('B');
  const events: InvestigationProgress[] = [];
  const report = await runInvestigation(request, {
    planner: {
      mode: 'live',
      model: 'fixture',
      async next(state, signal) {
        calls++;
        if (calls === 4 || calls === 5) throw new Error('model_http_500');
        if (calls === 6) assert.equal(state.observations.length, 3);
        return scripted.next(state, signal);
      },
    },
    provider: {
      mode: 'mock',
      async call(action, signal) {
        tools.push(action.tool);
        return base.call(action, signal);
      },
    },
    onProgress(event) {
      events.push(event);
      if (event.event === 'planner_retry')
        queueMicrotask(() => t.mock.timers.tick(event.delay_ms));
    },
  });
  assert.equal(report.candidates[0].verdict, 'not_recommended');
  assert.equal(report.completion_status, 'complete');
  assert.equal(report.budget.planner_calls, calls);
  assert.equal(tools.length, new Set(tools).size);
  assert.deepEqual(
    events.filter((e) => e.event === 'planner_retry').map((e) => e.delay_ms),
    [2000, 4000],
  );
  assert.ok(
    events.some(
      (e) =>
        e.event === 'activity' &&
        e.message.includes('retry') &&
        e.elapsed_ms === 2000,
    ),
  );
  assert.equal(
    report.trace.filter((e) => e.failure_code === 'model_http_500').length,
    2,
  );
  assert.ok(report.trace.some((e) => e.reason.includes('recovered')));
});

for (const code of [
  'model_http_408',
  'model_http_429',
  'model_http_502',
  'model_http_503',
  'model_http_504',
  'model_transport_unavailable',
  'model_timeout',
]) {
  test(`${code} stops after three attempts with increasing bounded waits`, async (t) => {
    t.mock.timers.enable({
      apis: ['Date', 'setTimeout', 'setInterval'],
      now: Date.now(),
    });
    const delays: number[] = [];
    let calls = 0;
    const report = await runInvestigation(request, {
      provider: new MockProvider(),
      planner: {
        mode: 'live',
        model: 'fixture',
        async next() {
          calls++;
          throw new Error(code);
        },
      },
      onProgress(event) {
        if (event.event === 'planner_retry') {
          delays.push(event.delay_ms);
          queueMicrotask(() => t.mock.timers.tick(event.delay_ms));
        }
      },
    });
    assert.equal(calls, 3);
    assert.ok(delays[0] >= 2000 && delays[0] <= 2500);
    assert.ok(delays[1] >= 4000 && delays[1] <= 5000);
    assert.equal(report.stop_reason, 'planner_unavailable_or_invalid');
    assert.equal(report.budget.planner_calls, 3);
    assert.equal(report.budget.discovery_attempts, 0);
    assert.ok(report.trace.some((e) => e.reason.includes('budget exhausted')));
  });
}

test('per-attempt timeout retries but never exceeds the shared deadline or finalization reserve', async (t) => {
  t.mock.timers.enable({
    apis: ['Date', 'setTimeout', 'setInterval'],
    now: Date.now(),
  });
  t.mock.method(Math, 'random', () => 0);
  let calls = 0;
  const signals: AbortSignal[] = [];
  const report = await runInvestigation(request, {
    provider: new MockProvider(),
    planner: {
      mode: 'live',
      model: 'hung',
      async next(_state, signal) {
        calls++;
        signals.push(signal);
        t.mock.timers.tick(100);
        return new Promise(() => {});
      },
    },
    limits: { planner_timeout_ms: 100, total_timeout_ms: 4000 },
    onProgress(event) {
      if (event.event === 'planner_retry')
        queueMicrotask(() => t.mock.timers.tick(event.delay_ms));
    },
  });
  assert.equal(calls, 2);
  assert.ok(signals.every((s) => s.aborted));
  assert.equal(report.stop_reason, 'total_runtime_exhausted');
  assert.ok(report.budget.elapsed_ms < 3600);
});

test('Retry-After is honored; an excessive delay defers without another call', async (t) => {
  t.mock.timers.enable({
    apis: ['Date', 'setTimeout', 'setInterval'],
    now: Date.now(),
  });
  const previousTls = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '1';
  t.after(() => {
    if (previousTls === undefined)
      delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    else process.env.NODE_TLS_REJECT_UNAUTHORIZED = previousTls;
  });
  const fetch = t.mock.method(
    globalThis,
    'fetch',
    async () =>
      new Response('{}', { status: 429, headers: { 'Retry-After': '10' } }),
  );
  const delays: number[] = [];
  const report = await runInvestigation(request, {
    provider: new MockProvider(),
    planner: new OpenAICompatiblePlanner({
      baseUrl: 'https://fixture.example/v1',
      model: 'fixture',
    }),
    limits: { total_timeout_ms: 15000 },
    onProgress(event) {
      if (event.event === 'planner_retry') {
        delays.push(event.delay_ms);
        queueMicrotask(() => t.mock.timers.tick(event.delay_ms));
      }
    },
  });
  assert.deepEqual(delays, [10000]);
  assert.equal(fetch.mock.callCount(), 2);
  assert.equal(report.stop_reason, 'total_runtime_exhausted');
});

for (const code of [
  'model_http_401',
  'model_http_403',
  'model_invalid_response',
  'model_cancelled',
  'planner_unknown_failure',
]) {
  test(`${code} is terminal without retry`, async () => {
    const report = await runInvestigation(request, {
      provider: new MockProvider(),
      planner: {
        mode: 'live',
        model: 'fixture',
        async next() {
          throw new Error(code);
        },
      },
    });
    assert.equal(report.budget.planner_calls, 1);
    assert.ok(report.trace.some((e) => e.reason.includes('not retryable')));
  });
}

test('call budget prevents retry multiplication', async () => {
  const report = await runInvestigation(request, {
    provider: new MockProvider(),
    limits: { planner_calls: 1 },
    planner: {
      mode: 'live',
      model: 'fixture',
      async next() {
        throw new ModelHttpError(500, { body: 'safe', truncated: false });
      },
    },
  });
  assert.equal(report.budget.planner_calls, 1);
});

test('slow evidence receives periodic activity and timers stop after completion', async (t) => {
  t.mock.timers.enable({
    apis: ['Date', 'setTimeout', 'setInterval'],
    now: Date.now(),
  });
  const events: InvestigationProgress[] = [];
  const base = new MockProvider();
  let calls = 0;
  await runInvestigation(request, {
    planner: {
      mode: 'live',
      model: 'fixture',
      async next(state, signal) {
        calls++;
        t.mock.timers.tick(2000);
        t.mock.timers.tick(2000);
        return calls === 1
          ? new ScriptedPlanner().next(state, signal)
          : { type: 'finish', reason: 'Done' };
      },
    },
    provider: {
      mode: 'mock',
      async call(action, signal) {
        t.mock.timers.tick(2000);
        t.mock.timers.tick(2000);
        return base.call(action, signal);
      },
    },
    onProgress: (e) => events.push(e),
  });
  for (const stage of ['Waiting for planner', 'Collecting current evidence']) {
    assert.ok(
      events.some(
        (e) =>
          e.event === 'activity' &&
          e.message.startsWith(stage) &&
          e.elapsed_ms === 2000,
      ),
    );
    assert.ok(
      events.some(
        (e) =>
          e.event === 'activity' &&
          e.message.startsWith(stage) &&
          e.elapsed_ms === 4000,
      ),
    );
  }
  const count = events.length;
  t.mock.timers.tick(100000);
  assert.equal(events.length, count);
});

test('model adapter parses Retry-After seconds and dates without exposing headers in report data', async (t) => {
  const now = Date.parse('2026-10-25T10:00:00Z');
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now });
  const previousTls = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '1';
  t.after(() => {
    if (previousTls === undefined)
      delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    else process.env.NODE_TLS_REJECT_UNAUTHORIZED = previousTls;
  });
  let header = '';
  t.mock.method(
    globalThis,
    'fetch',
    async () =>
      new Response('{}', { status: 503, headers: { 'Retry-After': header } }),
  );
  const model = new OpenAICompatiblePlanner({
    baseUrl: 'https://fixture.example/v1',
    model: 'fixture',
  });
  for (const [value, expected] of [
    ['3', 3000],
    [new Date(now + 10000).toUTCString(), 10000],
    ['garbage', undefined],
    ['-1', undefined],
  ] as const) {
    header = value;
    await assert.rejects(
      model.next(
        {
          request,
          candidate_id: null,
          proposed_window: null,
          observations: [],
          trace: [],
        },
        new AbortController().signal,
      ),
      (error) => {
        assert.ok(error instanceof ModelHttpError);
        assert.equal(error.retry_after_ms, expected);
        return true;
      },
    );
  }
});
