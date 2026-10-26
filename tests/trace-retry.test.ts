import assert from 'node:assert/strict';
import test from 'node:test';
import type { Observation } from '../src/contracts.ts';
import { MockProvider } from '../src/investigation/mock.ts';
import { ScriptedPlanner } from '../src/investigation/planner.ts';
import { validateReport } from '../src/investigation/report.ts';
import {
  runInvestigation,
  type InvestigationProgress,
} from '../src/investigation/run.ts';

const request = {
  account_id: 'trace-test',
  region: 'us-east-1',
  max_candidates: 1,
  window: { from: '2026-09-01T00:00:00Z', to: '2026-09-29T00:00:00Z' },
};

test('every new step has correlated trace metadata; legacy counters remain unknown', async () => {
  const events: InvestigationProgress[] = [];
  const report = await runInvestigation(request, {
    planner: new ScriptedPlanner(),
    provider: new MockProvider(),
    onProgress: (event) => events.push(event),
  });
  for (const step of report.trace) {
    assert.equal(step.trace_id, report.investigation_id);
    assert.equal(step.retry_count, 0);
    assert.equal(
      step.confidence,
      step.evidence_ids.length ? 'supported' : 'unassessed',
    );
  }
  for (const event of events.filter((e) => e.event === 'trace')) {
    assert.equal(event.trace_id, report.investigation_id);
    assert.equal(event.retry_count, 0);
  }
  const legacy = JSON.parse(JSON.stringify(report));
  for (const step of legacy.trace) {
    delete step.trace_id;
    delete step.confidence;
    delete step.retry_count;
  }
  assert.ok(validateReport(legacy).trace.every((s) => s.retry_count === null));
  for (const mutate of [
    (r: typeof report) => {
      r.trace[0].trace_id = 'different-run';
    },
    (r: typeof report) => {
      r.trace[0].retry_count = 4;
    },
    (r: typeof report) => {
      r.trace[0].confidence = 'supported';
    },
    (r: typeof report) => {
      r.trace[0].retry_count = 1;
    },
  ]) {
    const changed = structuredClone(report);
    mutate(changed);
    assert.throws(() => validateReport(changed));
  }
});

for (const failure of ['error', 'unavailable', 'throw', 'timeout'] as const) {
  test(`${failure}: read-only tool recovers on third retry without another planner decision`, async (t) => {
    t.mock.timers.enable({
      apis: ['Date', 'setTimeout', 'setInterval'],
      now: Date.now(),
    });
    t.mock.method(Math, 'random', () => 0);
    const base = new MockProvider();
    let calls = 0;
    const delays: number[] = [];
    const report = await runInvestigation(request, {
      planner: new ScriptedPlanner(),
      limits: { tool_timeout_ms: 100 },
      provider: {
        mode: 'mock',
        async call(action, signal) {
          if (action.tool === 'get_ec2_operations' && ++calls < 4) {
            if (failure === 'throw') throw new Error('secret-provider-detail');
            if (failure === 'timeout') {
              t.mock.timers.tick(100);
              return new Promise(() => {});
            }
            const observation = (await base.call(
              action,
              signal,
            )) as Observation;
            observation.status = failure;
            observation.data = null;
            observation.coverage = { complete: false, authoritative: false };
            observation.missing_fields = ['job_schedule'];
            return observation;
          }
          return base.call(action, signal);
        },
      },
      onProgress(event) {
        if (event.event === 'tool_retry') {
          delays.push(event.delay_ms);
          queueMicrotask(() => t.mock.timers.tick(event.delay_ms));
        }
      },
    });
    assert.equal(calls, 4);
    assert.deepEqual(delays, [2000, 4000, 8000]);
    const attempts = report.trace.filter(
      (s) =>
        s.phase === 'tool' &&
        s.action?.type === 'tool' &&
        s.action.tool === 'get_ec2_operations',
    );
    assert.deepEqual(
      attempts.map((s) => s.retry_count),
      [0, 1, 2, 3],
    );
    assert.deepEqual(
      attempts.map((s) => s.confidence),
      ['insufficient', 'insufficient', 'insufficient', 'supported'],
    );
    assert.equal(report.budget.candidate_attempts, 5);
    assert.equal(report.budget.planner_calls, 4);
    assert.equal(report.candidates[0].verdict, 'not_recommended');
    assert.equal(report.completion_status, 'complete');
    assert.ok(!JSON.stringify(report).includes('secret-provider-detail'));
    assert.equal(
      report.evidence.filter((s) => s.tool === 'get_ec2_operations').length,
      1,
    );
  });
}

test('inventory exhaustion records four calls and stops before billing or another planner call', async (t) => {
  t.mock.timers.enable({
    apis: ['Date', 'setTimeout', 'setInterval'],
    now: Date.now(),
  });
  t.mock.method(Math, 'random', () => 0);
  let calls = 0;
  const report = await runInvestigation(request, {
    planner: new ScriptedPlanner(),
    provider: {
      mode: 'mock',
      async call() {
        calls++;
        throw new Error('private');
      },
    },
    onProgress(event) {
      if (event.event === 'tool_retry')
        queueMicrotask(() => t.mock.timers.tick(event.delay_ms));
    },
  });
  assert.equal(calls, 4);
  assert.equal(report.budget.discovery_attempts, 4);
  assert.equal(report.budget.planner_calls, 0);
  assert.equal(report.stop_reason, 'required_tool_failed:list_ec2_instances');
  assert.equal(report.completion_status, 'failed');
});

test('insufficient retry time preserves the finalization reserve and does not send another call', async (t) => {
  t.mock.timers.enable({
    apis: ['Date', 'setTimeout', 'setInterval'],
    now: Date.now(),
  });
  const report = await runInvestigation(request, {
    planner: new ScriptedPlanner(),
    provider: {
      mode: 'mock',
      async call() {
        throw new Error('private');
      },
    },
    limits: { total_timeout_ms: 1000 },
  });
  assert.equal(report.budget.discovery_attempts, 1);
  assert.equal(report.stop_reason, 'total_runtime_exhausted');
  assert.ok(report.budget.elapsed_ms < 900);
});

for (const invalid of ['malformed', 'scope', 'cancelled'] as const) {
  test(`${invalid} output is terminal without retry or unsafe payload registration`, async () => {
    const base = new MockProvider();
    let calls = 0;
    const report = await runInvestigation(request, {
      planner: new ScriptedPlanner(),
      provider: {
        mode: 'mock',
        async call(action, signal) {
          calls++;
          if (invalid === 'cancelled')
            throw new DOMException('private', 'AbortError');
          if (invalid === 'malformed') return { secret: 'private' };
          const observation = (await base.call(action, signal)) as Observation;
          observation.scope.account_id = 'another-account';
          return observation;
        },
      },
    });
    assert.equal(calls, 1);
    assert.equal(report.completion_status, 'failed');
    assert.equal(report.trace.find((s) => s.phase === 'tool')?.retry_count, 0);
    assert.equal(report.evidence.length, 0);
    assert.ok(!JSON.stringify(report).includes('private'));
  });
}

test('all three candidate tools can each recover on retry three within the aggregate attempt cap', async (t) => {
  t.mock.timers.enable({
    apis: ['Date', 'setTimeout', 'setInterval'],
    now: Date.now(),
  });
  t.mock.method(Math, 'random', () => 0);
  const base = new MockProvider('A');
  const calls = new Map<string, number>();
  const report = await runInvestigation(request, {
    planner: new ScriptedPlanner(),
    provider: {
      mode: 'mock',
      async call(action, signal) {
        if (action.args.instance_id) {
          const count = (calls.get(action.tool) ?? 0) + 1;
          calls.set(action.tool, count);
          if (count < 4) throw new Error('synthetic outage');
        }
        return base.call(action, signal);
      },
    },
    onProgress(event) {
      if (event.event === 'tool_retry')
        queueMicrotask(() => t.mock.timers.tick(event.delay_ms));
    },
  });
  assert.deepEqual([...calls.values()], [4, 4, 4]);
  assert.equal(report.budget.candidate_attempts, 12);
  assert.equal(report.candidates[0].verdict, 'conditional_recommendation');
  assert.equal(report.completion_status, 'complete');
});

test('partial and no_match responses never trigger retries or claim unsupported safety', async () => {
  const base = new MockProvider('clear');
  const report = await runInvestigation(request, {
    planner: new ScriptedPlanner(),
    provider: {
      mode: 'mock',
      async call(action, signal) {
        const observation = (await base.call(action, signal)) as Observation;
        if (action.tool === 'get_ec2_dependencies') {
          observation.status = 'partial';
          observation.coverage.complete = false;
          observation.missing_fields = ['owner_clearance'];
        }
        return observation;
      },
    },
    onProgress(event) {
      assert.notEqual(event.event, 'tool_retry');
    },
  });
  assert.equal(report.candidates[0].verdict, 'needs_verification');
  assert.ok(
    report.trace.some(
      (s) =>
        s.status === 'partial' &&
        s.confidence === 'insufficient' &&
        s.retry_count === 0,
    ),
  );
  assert.ok(
    report.trace.some((s) => s.status === 'no_match' && s.retry_count === 0),
  );
});

test('a terminal planner failure on one candidate does not corrupt retry counters on the next', async (t) => {
  t.mock.timers.enable({
    apis: ['Date', 'setTimeout', 'setInterval'],
    now: Date.now(),
  });
  const scripted = new ScriptedPlanner();
  const report = await runInvestigation(
    { ...request, max_candidates: 3 },
    {
      planner: {
        mode: 'live',
        model: 'fixture',
        async next(state, signal) {
          if (state.candidate_id === 'i-mock-primary')
            throw new Error('model_http_500');
          return scripted.next(state, signal);
        },
      },
      provider: new MockProvider('mixed'),
      onProgress(event) {
        if (event.event === 'planner_retry')
          queueMicrotask(() => t.mock.timers.tick(event.delay_ms));
      },
    },
  );
  assert.deepEqual(
    report.candidates.map((c) => c.verdict),
    ['needs_verification', 'not_recommended', 'not_recommended'],
  );
  assert.equal(report.completion_status, 'partial');
});

test('candidate-tool cancellation stops subsequent candidates and historical persistence', async () => {
  const base = new MockProvider('mixed');
  const calls: string[] = [];
  const report = await runInvestigation(
    { ...request, max_candidates: 3 },
    {
      planner: new ScriptedPlanner(),
      provider: {
        mode: 'mock',
        async call(action, signal) {
          calls.push(action.tool);
          if (action.tool === 'get_ec2_operations')
            throw new DOMException('private', 'AbortError');
          return base.call(action, signal);
        },
      },
      onProgress(event) {
        assert.notEqual(event.event, 'tool_retry');
      },
    },
  );
  assert.deepEqual(calls, [
    'list_ec2_instances',
    'get_ec2_billing',
    'get_ec2_metrics',
    'get_ec2_operations',
  ]);
  assert.equal(report.stop_reason, 'tool_cancelled');
  assert.ok(report.candidates.every((c) => c.verdict === 'needs_verification'));
  assert.ok(
    report.historical_context.limitations.includes(
      'History persistence skipped: investigation cancelled.',
    ),
  );
});
