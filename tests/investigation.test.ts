import assert from 'node:assert/strict';
import test from 'node:test';
import { runInvestigation, type RunOptions } from '../src/investigation/run.ts';
import {
  MockProvider,
  type CurrentEvidenceProvider,
} from '../src/investigation/mock.ts';
import {
  ScriptedPlanner,
  type Planner,
  type PlannerState,
} from '../src/investigation/planner.ts';
import type {
  Action,
  InvestigationRequest,
  Observation,
  ToolAction,
} from '../src/contracts.ts';

const request: InvestigationRequest = {
  account_id: 'demo',
  region: 'us-east-1',
  max_candidates: 1,
  window: { from: '2026-09-01T00:00:00Z', to: '2026-09-29T00:00:00Z' },
};
const run = (options: Partial<RunOptions> = {}) =>
  runInvestigation(structuredClone(request), {
    planner: new ScriptedPlanner(),
    provider: new MockProvider(),
    ...options,
  });
function modify(
  fn: (value: Observation, action: ToolAction) => void,
): CurrentEvidenceProvider {
  const base = new MockProvider();
  return {
    mode: 'mock',
    async call(action, signal) {
      const observation = (await base.call(action, signal)) as Observation;
      fn(observation, action);
      return observation;
    },
  };
}
function planner(fn: (state: PlannerState, next: Action) => unknown): Planner {
  const base = new ScriptedPlanner();
  return {
    mode: 'scripted',
    model: null,
    async next(state, signal) {
      return fn(state, await base.next(state, signal));
    },
  };
}

test('B discovers highest-cost running instance, proposes then rejects on a genuinely later conflict', async () => {
  const r = await run();
  assert.equal(r.completion_status, 'complete');
  const c = r.candidates[0];
  assert.equal(c.instance_id, 'i-mock-primary');
  assert.equal(c.verdict, 'not_recommended');
  assert.deepEqual(
    c.hypotheses.map((h) => h.state),
    ['proposed', 'contradicted'],
  );
  const proposed = r.trace.find((t) => t.action?.type === 'propose');
  assert.ok(proposed);
  const conflict = r.trace.find(
    (t) =>
      t.phase === 'tool' &&
      t.action?.type === 'tool' &&
      t.action.tool === 'get_ec2_operations',
  );
  assert.ok(conflict);
  assert.ok(conflict.step > proposed.step);
  assert.deepEqual(c.contradicting_evidence_ids, conflict.evidence_ids);
  assert.equal(c.estimated_monthly_savings, null);
  assert.deepEqual(r.budget.discovery_attempts, 2);
  assert.equal(r.budget.candidate_attempts, 2);
  assert.equal(r.planner.mode, 'scripted');
  assert.deepEqual(r.historical_context.context_ids, []);
});

test('different operational evidence changes verdict and next query rather than narrating a fixed rejection', async () => {
  const r = await run({ provider: new MockProvider('clear') });
  assert.equal(r.candidates[0].verdict, 'needs_verification');
  assert.equal(r.completion_status, 'partial');
  assert.ok(r.evidence.some((e) => e.tool === 'get_ec2_dependencies'));
  assert.equal(
    r.evidence.find((e) => e.tool === 'get_ec2_operations')?.status,
    'no_match',
  );
});

test('metrics window controls the targeted query, rather than hard-coded overnight narration', async () => {
  const r = await run({
    provider: modify((o) => {
      if (
        o.tool === 'get_ec2_metrics' &&
        o.data &&
        'suggested_window' in o.data
      )
        o.data.suggested_window = { start_hour_utc: 8, end_hour_utc: 12 };
    }),
  });
  const action = r.trace.find(
    (t) =>
      t.phase === 'tool' &&
      t.action?.type === 'tool' &&
      t.action.tool === 'get_ec2_operations',
  )?.action;
  assert.equal(action?.type, 'tool');
  if (action?.type === 'tool')
    assert.deepEqual(action.args.proposed_window, {
      start_hour_utc: 8,
      end_hour_utc: 12,
    });
  assert.equal(r.candidates[0].verdict, 'needs_verification'); // 02:00 batch does not overlap
});

test('unavailable operational data is distinct from no_match and never becomes safety', async () => {
  const r = await run({ provider: new MockProvider('missing') });
  assert.equal(r.completion_status, 'partial');
  assert.equal(r.candidates[0].verdict, 'needs_verification');
  assert.equal(
    r.evidence.find((e) => e.tool === 'get_ec2_operations')?.status,
    'unavailable',
  );
  assert.ok(
    r.candidates[0].missing_checks.some((s) =>
      s.includes('get_ec2_operations'),
    ),
  );
  assert.match(
    r.candidates[0].next_human_actions.join(' '),
    /get_ec2_operations \(unavailable\): Ask the workload owner.*timezones and exceptions/,
  );
  assert.match(
    r.candidates[0].next_human_actions.join(' '),
    /get_ec2_dependencies: Obtain owner, calendar and recovery clearance/,
  );
});

for (const mutation of [
  'scope',
  'period',
  'collected',
  'units',
  'malformed',
  'secret',
  'duplicate',
  'false_no_match',
] as const) {
  test(`rejects ${mutation} evidence without joining or exposing its payload`, async () => {
    let firstId = '';
    const provider = modify((o) => {
      if (o.tool === 'list_ec2_instances') firstId = o.evidence_id;
      if (o.tool !== 'get_ec2_operations') return;
      if (mutation === 'scope') o.scope.account_id = 'other';
      if (mutation === 'period')
        o.observed_window.from = '2026-08-31T00:00:00Z';
      if (mutation === 'collected') o.collected_at = '2026-09-01T00:00:00Z';
      if (mutation === 'units') o.units = 'percent';
      if (mutation === 'malformed') o.data = { jobs: 'secret-marker' } as never;
      if (mutation === 'secret')
        (o as unknown as Record<string, unknown>).raw_response =
          'secret-marker';
      if (mutation === 'duplicate') o.evidence_id = firstId;
      if (mutation === 'false_no_match') o.status = 'no_match';
    });
    const r = await run({ provider });
    assert.equal(r.completion_status, 'partial');
    assert.equal(r.candidates[0].verdict, 'needs_verification');
    assert.ok(!r.evidence.some((e) => e.tool === 'get_ec2_operations'));
    assert.ok(!JSON.stringify(r).includes('secret-marker'));
    assert.ok(r.trace.some((t) => t.phase === 'tool' && t.status === 'error'));
  });
}

test('partial operational observation retains status and a positive conflict, while overall completeness remains partial', async () => {
  const r = await run({
    provider: modify((o) => {
      if (o.tool === 'get_ec2_operations') {
        o.status = 'partial';
        o.coverage.complete = false;
        o.missing_fields = ['other_jobs'];
      }
    }),
  });
  assert.equal(r.completion_status, 'partial');
  assert.equal(r.candidates[0].verdict, 'not_recommended');
  assert.equal(r.evidence.at(-1)?.status, 'partial');
});

test('low averages with high peaks never support an initial hypothesis', async () => {
  const r = await run({
    provider: modify((o) => {
      if (
        o.tool === 'get_ec2_metrics' &&
        o.data &&
        'peak_cpu_percent' in o.data
      )
        o.data.peak_cpu_percent = 95;
    }),
  });
  assert.equal(r.candidates[0].verdict, 'needs_verification');
  assert.equal(r.candidates[0].proposed_window, null);
  assert.ok(!r.evidence.some((e) => e.tool === 'get_ec2_operations'));
});

test('a confirmed dependency can independently refute the window after no matching jobs', async () => {
  const base = new MockProvider('clear');
  const provider: CurrentEvidenceProvider = {
    mode: 'mock',
    async call(a, s) {
      const o = (await base.call(a, s)) as Observation;
      if (o.tool === 'get_ec2_dependencies')
        o.data = { requires_continuous_operation: true };
      return o;
    },
  };
  const r = await run({ provider });
  assert.equal(r.candidates[0].verdict, 'not_recommended');
  assert.equal(
    r.evidence.find(
      (e) => e.evidence_id === r.candidates[0].contradicting_evidence_ids[0],
    )?.tool,
    'get_ec2_dependencies',
  );
});

test('repeated identical actions terminate without another provider attempt', async () => {
  const r = await run({
    planner: planner(
      (state, next) =>
        state.trace.find(
          (t) => t.phase === 'planner' && t.action?.type === 'tool',
        )?.action ?? next,
    ),
  });
  assert.equal(r.stop_reason, 'repeated_action');
  assert.equal(r.budget.discovery_attempts, 1);
  assert.equal(r.completion_status, 'partial');
});

test('budget exhaustion preserves already retrieved evidence and unknown savings', async () => {
  const r = await run({ limits: { candidate_attempts: 1 } });
  assert.equal(r.stop_reason, 'tool_budget_exhausted');
  assert.equal(r.budget.candidate_attempts, 1);
  assert.equal(r.candidates[0].verdict, 'needs_verification');
  assert.equal(r.candidates[0].estimated_monthly_savings, null);
});

test('planner budget stops before first call when exhausted after finite calls', async () => {
  const r = await run({ limits: { planner_calls: 1 } });
  assert.equal(r.stop_reason, 'planner_budget_exhausted');
  assert.equal(r.budget.planner_calls, 1);
  assert.equal(r.budget.discovery_attempts, 1);
});

test('model failure emits explicit failed model-dependent result without scripted fallback', async () => {
  const r = await run({
    planner: {
      mode: 'live',
      model: 'test-model',
      async next() {
        throw new Error('secret-marker');
      },
    },
  });
  assert.equal(r.completion_status, 'failed');
  assert.equal(r.stop_reason, 'planner_unavailable_or_invalid');
  assert.equal(r.planner.mode, 'live');
  assert.equal(r.budget.discovery_attempts, 0);
  assert.ok(!JSON.stringify(r).includes('secret-marker'));
  assert.equal(
    r.trace.find((t) => t.failure_code)?.failure_code,
    'planner_unknown_failure',
  );
});

for (const bad of ['write', 'scope', 'instance', 'fake_citation'] as const) {
  test(`invalid planner ${bad} cannot cross executor boundary`, async () => {
    const r = await run({
      planner: planner((state, next) => {
        if (bad === 'write')
          return {
            type: 'tool',
            tool: 'stop_instances',
            args: request,
            reason: 'bad',
          };
        if (bad === 'scope' && next.type === 'tool')
          next.args.account_id = 'other';
        if (bad === 'instance' && next.type === 'tool' && state.candidate_id)
          next.args.instance_id = 'i-other';
        if (bad === 'fake_citation' && next.type === 'propose')
          next.evidence_ids = ['invented-evidence'];
        return next;
      }),
    });
    assert.notEqual(r.completion_status, 'complete');
    assert.ok(
      !r.evidence.some(
        (e) =>
          e.scope.account_id === 'other' || e.scope.instance_id === 'i-other',
      ),
    );
    assert.ok(!JSON.stringify(r).includes('invented-evidence'));
  });
}

test('tool timeout cancels signal and terminates a noncooperative provider in bounded time', async () => {
  let signal: AbortSignal | undefined;
  const start = Date.now();
  const r = await run({
    provider: {
      mode: 'mock',
      call(_a, s) {
        signal = s;
        return new Promise(() => {});
      },
    },
    limits: { tool_timeout_ms: 10, total_timeout_ms: 100 },
  });
  assert.equal(r.completion_status, 'failed');
  assert.ok(signal?.aborted);
  assert.ok(Date.now() - start < 1000);
  assert.equal(r.budget.discovery_attempts, 2);
});

test('planner timeout stops without tools or late results', async () => {
  const r = await run({
    planner: {
      mode: 'live',
      model: 'test-model',
      next() {
        return new Promise(() => {});
      },
    },
    limits: { planner_timeout_ms: 10, total_timeout_ms: 100 },
  });
  assert.equal(r.stop_reason, 'planner_unavailable_or_invalid');
  assert.equal(r.budget.planner_calls, 1);
  assert.equal(
    r.trace.find((t) => t.failure_code)?.failure_code,
    'planner_timeout',
  );
});

test('aggregate planner deadline has a distinct sanitized failure code', async () => {
  const r = await run({
    planner: {
      mode: 'live',
      model: 'test-model',
      next: () => new Promise(() => {}),
    },
    limits: { planner_timeout_ms: 500, total_timeout_ms: 10 },
  });
  assert.equal(r.stop_reason, 'total_runtime_exhausted');
  assert.equal(
    r.trace.find((t) => t.failure_code)?.failure_code,
    'investigation_deadline_exceeded',
  );
  assert.equal(r.budget.discovery_attempts, 0);
});

test('total runtime bound applies across individual calls', async () => {
  const r = await run({
    provider: {
      mode: 'mock',
      call() {
        return new Promise(() => {});
      },
    },
    limits: { total_timeout_ms: 10, tool_timeout_ms: 500 },
  });
  assert.equal(r.stop_reason, 'total_runtime_exhausted');
  assert.equal(r.budget.discovery_attempts, 1);
});

test('planner mutation cannot alter caller scope or proposed window', async () => {
  const input = structuredClone(request);
  const r = await runInvestigation(input, {
    provider: new MockProvider(),
    planner: planner((state, next) => {
      state.request.account_id = 'other';
      if (state.proposed_window) state.proposed_window.start_hour_utc = 12;
      // Rebuild using the original scope, proving mutation of state cannot change internal request.
      if (next.type === 'tool') next.args.account_id = 'demo';
      return next;
    }),
  });
  assert.equal(input.account_id, 'demo');
  assert.equal(r.request.account_id, 'demo');
  assert.deepEqual(r.candidates[0].proposed_window, {
    start_hour_utc: 0,
    end_hour_utc: 6,
  });
});

test('provider error status is retained independently of unavailable or partial', async () => {
  const r = await run({
    provider: modify((o) => {
      if (o.tool === 'get_ec2_operations') {
        o.status = 'error';
        o.data = null;
        o.coverage = { complete: false, authoritative: false };
        o.missing_fields = ['job_schedule'];
      }
    }),
  });
  assert.equal(
    r.evidence.find((e) => e.tool === 'get_ec2_operations')?.status,
    'error',
  );
  assert.equal(r.candidates[0].verdict, 'needs_verification');
  assert.equal(r.completion_status, 'partial');
});
