import assert from 'node:assert/strict';
import test from 'node:test';
import { OpenAICompatiblePlanner } from '../src/investigation/model.ts';
import { MockProvider } from '../src/investigation/mock.ts';
import { runInvestigation } from '../src/investigation/run.ts';
import { renderReport, validateReport } from '../src/investigation/report.ts';
import type {
  InvestigationRequest,
  PlannerFailureCode,
} from '../src/contracts.ts';

const request: InvestigationRequest = {
  account_id: 'diagnostic-test',
  region: 'us-east-1',
  max_candidates: 1,
  window: { from: '2026-09-01T00:00:00Z', to: '2026-09-29T00:00:00Z' },
};

test('live planner gets sixty seconds per call', async (t) => {
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: Date.now() });
  const deadlines: number[] = [];
  const report = await runInvestigation(request, {
    provider: new MockProvider(),
    planner: {
      mode: 'live',
      model: 'slow-test',
      async next() {
        t.mock.timers.tick(59_000);
        return { type: 'finish', reason: 'No further questions' };
      },
    },
    onProgress(event) {
      if (event.event === 'planner_start') deadlines.push(event.timeout_ms);
    },
  });
  assert.deepEqual(deadlines, [60_000]);
  assert.equal(report.stop_reason, 'planner_finished');
  assert.equal(report.budget.elapsed_ms, 59_000);
  assert.ok(!report.trace.some((entry) => entry.failure_code));
});

test('pacing waits before calls and cannot exceed the aggregate deadline', async () => {
  for (const total of [1000, 1]) {
    const started = Date.now();
    let calls = 0;
    const report = await runInvestigation(request, {
      provider: new MockProvider(),
      planner: {
        mode: 'live',
        model: 'paced-test',
        async next() {
          calls++;
          assert.ok(Date.now() - started >= 5);
          return { type: 'finish', reason: 'No further questions' };
        },
      },
      limits: { planner_interval_ms: 5, total_timeout_ms: total },
    });
    assert.equal(calls, total === 1 ? 0 : 1);
    assert.equal(
      report.stop_reason,
      total === 1 ? 'total_runtime_exhausted' : 'planner_finished',
    );
  }
});
const content = (value: string, finish_reason = 'stop') =>
  Response.json({
    choices: [{ finish_reason, message: { content: value } }],
  });
const cases: { code: PlannerFailureCode; response: () => Response | never }[] =
  [
    ...[400, 401, 403, 405, 429, 500, 503].map((status) => ({
      code: `model_http_${status}` as PlannerFailureCode,
      response: () => new Response('Upstream service unavailable', { status }),
    })),
    {
      code: 'model_transport_unavailable',
      response: () => {
        throw new Error('PRIVATE connection detail');
      },
    },
    {
      code: 'model_invalid_response',
      response: () => Response.json({ choices: [] }),
    },
    {
      code: 'model_incomplete_response',
      response: () => content('{}', 'length'),
    },
    {
      code: 'model_invalid_action_json',
      response: () => content('PRIVATE non-JSON content'),
    },
    {
      code: 'model_invalid_choice',
      response: () =>
        content(
          '{"action":"stop_instances","reason":"PRIVATE invalid action"}',
        ),
    },
  ];

for (const fixture of cases) {
  test(`full investigation exposes only sanitized ${fixture.code}`, async (t) => {
    const previous = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '1';
    t.after(() => {
      if (previous === undefined)
        delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
      else process.env.NODE_TLS_REJECT_UNAUTHORIZED = previous;
    });
    const mocked = t.mock.method(globalThis, 'fetch', async () =>
      fixture.response(),
    );
    const report = await runInvestigation(request, {
      planner: new OpenAICompatiblePlanner({
        baseUrl: 'https://model.example/v1',
        model: 'test-model',
        apiKey: 'PRIVATE-key',
      }),
      provider: new MockProvider(),
    });
    assert.equal(
      report.trace.find((t) => t.failure_code)?.failure_code,
      fixture.code,
    );
    assert.equal(report.stop_reason, 'planner_unavailable_or_invalid');
    assert.equal(report.budget.discovery_attempts, 0);
    assert.equal(mocked.mock.callCount(), 1);
    assert.equal(validateReport(report).trace[0].failure_code, fixture.code);
    assert.ok(renderReport(report).includes(`[${fixture.code}]`));
    assert.ok(!JSON.stringify(report).includes('PRIVATE'));
    assert.ok(!renderReport(report).includes('PRIVATE'));
  });
}

test('unknown exceptions and invalid executor actions have distinct public codes', async () => {
  for (const [value, code] of [
    [null, 'planner_invalid_action'],
    [new Error('model_http_403 PRIVATE'), 'planner_unknown_failure'],
  ] as const) {
    const report = await runInvestigation(request, {
      provider: new MockProvider(),
      planner: {
        mode: 'live',
        model: 'test',
        async next() {
          if (value instanceof Error) throw value;
          return value;
        },
      },
    });
    assert.equal(report.trace[0].failure_code, code);
    assert.ok(!JSON.stringify(report).includes('PRIVATE'));
  }
});

test('report validator rejects arbitrary codes and failure codes attached to successful actions', async () => {
  const report = await runInvestigation(request, {
    provider: new MockProvider(),
    planner: {
      mode: 'live',
      model: 'test',
      async next() {
        throw new Error('model_http_403');
      },
    },
  });
  for (const code of ['PRIVATE', 'model_http_403 PRIVATE', 'model_http_999']) {
    const forged = structuredClone(report);
    Object.assign(forged.trace[0], { failure_code: code });
    assert.throws(() => validateReport(forged));
  }
  const wrongPhase = structuredClone(report);
  wrongPhase.trace[0].phase = 'finish';
  assert.throws(() => validateReport(wrongPhase));
  const action = structuredClone(report);
  action.trace[0].action = {
    type: 'finish',
    reason: 'Cannot attach a failure to a successful action',
  };
  assert.throws(() => validateReport(action));
  // Historical reports without the new optional field still validate.
  delete report.trace[0].failure_code;
  delete report.trace[0].provider_error;
  assert.doesNotThrow(() => validateReport(report));
});
