import assert from 'node:assert/strict';
import test from 'node:test';
import { SCENARIO_WINDOW, scenarioProof } from './helpers/scenario-proof.ts';
import { toolRetryClock } from './helpers/tool-retries.ts';
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
  window: SCENARIO_WINDOW,
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

test('EC2 2: critical job rejects the window after a genuinely later safety challenge', async (t) => {
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
  assert.equal(r.budget.candidate_attempts, 3);
  assert.equal(r.planner.mode, 'scripted');
  assert.deepEqual(r.historical_context.context_ids, []);
  const operations = r.evidence.find((e) => e.tool === 'get_ec2_operations');
  assert.ok(operations?.data && 'jobs' in operations.data && c.proposed_window);
  const window = c.proposed_window;
  assert.ok(
    operations.data.jobs.some(
      (job) =>
        job.critical &&
        job.window.start_hour_utc < window.end_hour_utc &&
        job.window.end_hour_utc > window.start_hour_utc,
    ),
  );
  assert.ok(r.evidence.some((e) => e.tool === 'get_ec2_dependencies'));
  scenarioProof(t, r);
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

test('unavailable operational data is distinct from no_match and never becomes safety', async (t) => {
  const r = await run({
    onProgress: toolRetryClock(t),
    provider: new MockProvider('missing'),
  });
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

for (const unavailableTool of [
  'get_ec2_operations',
  'get_ec2_dependencies',
] as const) {
  test(`EC2 3: unavailable ${unavailableTool} cannot become safety`, async (t) => {
    const base = new MockProvider('A');
    const r = await run({
      provider: {
        mode: 'mock',
        async call(action, signal) {
          const observation = (await base.call(action, signal)) as Observation;
          if (action.tool === unavailableTool) {
            observation.status = 'unavailable';
            observation.data = null;
            observation.coverage = { complete: false, authoritative: false };
            observation.missing_fields = ['source_unavailable'];
          }
          return observation;
        },
      },
    });
    assert.equal(r.completion_status, 'partial');
    assert.equal(r.candidates[0].verdict, 'needs_verification');
    assert.equal(
      r.evidence.find((e) => e.tool === unavailableTool)?.status,
      'unavailable',
    );
    assert.ok(
      r.candidates[0].missing_checks.some((s) => s.includes(unavailableTool)),
    );
    assert.deepEqual(r.candidates[0].contradicting_evidence_ids, []);
    assert.deepEqual(r.candidates[0].supporting_evidence_ids, [
      r.evidence.find((e) => e.tool === 'get_ec2_metrics')?.evidence_id,
    ]); // Supports the initial hypothesis only, never the unavailable safety check.
    assert.equal(r.candidates[0].estimated_monthly_savings, null);
    assert.deepEqual(
      r.candidates[0].hypotheses.map((h) => h.state),
      ['proposed', 'unresolved'],
    );
    const availableTool =
      unavailableTool === 'get_ec2_operations'
        ? 'get_ec2_dependencies'
        : 'get_ec2_operations';
    assert.ok(
      r.evidence.some(
        (e) =>
          e.tool === availableTool &&
          e.data &&
          'scheduling_clearance' in e.data &&
          e.data.scheduling_clearance,
      ),
    );
    scenarioProof(t, r);
  });
}

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
  assert.equal(
    r.evidence.find((e) => e.tool === 'get_ec2_operations')?.status,
    'partial',
  );
});

for (const tool of ['list_ec2_instances', 'get_ec2_billing'] as const) {
  for (const failure of [
    'unavailable',
    'error',
    'malformed',
    'throw',
  ] as const) {
    test(`${tool} ${failure} stops discovery after bounded retries without another planner or different tool`, async (t) => {
      const calls: string[] = [];
      const base = new MockProvider();
      const r = await run({
        onProgress: toolRetryClock(t),
        provider: {
          mode: 'mock',
          async call(action, signal) {
            calls.push(action.tool);
            const o = (await base.call(action, signal)) as Observation;
            if (action.tool === tool) {
              if (failure === 'throw') throw new Error('private-detail');
              if (failure === 'malformed') return { private: 'private-detail' };
              o.status = failure;
              o.data = null;
              o.coverage = { complete: false, authoritative: false };
              o.missing_fields = ['ACCESS_DENIED'];
            }
            return o;
          },
        },
      });
      const expected =
        tool === 'list_ec2_instances'
          ? Array(failure === 'malformed' ? 1 : 4).fill(tool)
          : [
              'list_ec2_instances',
              ...Array(failure === 'malformed' ? 1 : 4).fill(tool),
            ];
      assert.deepEqual(calls, expected);
      assert.equal(
        r.budget.planner_calls,
        tool === 'list_ec2_instances' ? 0 : 1,
      );
      assert.equal(r.completion_status, 'failed');
      assert.equal(r.stop_reason, `required_tool_failed:${tool}`);
      assert.deepEqual(r.candidates, []);
      assert.ok(
        r.discovery.gaps.some(
          (gap) => gap.includes(`${tool} failed`) && gap.includes('stopped'),
        ),
      );
      assert.ok(!JSON.stringify(r).includes('private-detail'));
    });
  }
}

test('authenticated empty inventory finishes without billing or another planner call', async () => {
  const r = await run({
    provider: modify((o) => {
      if (o.tool === 'list_ec2_instances') {
        o.status = 'no_match';
        o.data = { instances: [] };
      }
    }),
  });
  assert.equal(r.completion_status, 'complete');
  assert.equal(r.stop_reason, 'no_eligible_candidates');
  assert.equal(r.budget.planner_calls, 0);
  assert.equal(r.evidence.length, 1);
});

test('required inventory precedes the first planner turn and cannot be skipped by finish', async () => {
  let calls = 0;
  const r = await run({
    planner: {
      mode: 'scripted',
      model: null,
      async next(state) {
        calls++;
        assert.equal(state.observations.length, 1);
        assert.equal(state.observations[0].tool, 'list_ec2_instances');
        assert.equal(state.observations[0].status, 'ok');
        assert.ok(
          state.trace.some(
            (entry) =>
              entry.phase === 'tool' &&
              entry.evidence_ids.includes(state.observations[0].evidence_id),
          ),
        );
        return { type: 'finish', reason: 'No further checks requested.' };
      },
    },
  });
  assert.equal(calls, 1);
  assert.equal(r.budget.discovery_attempts, 1);
  assert.equal(r.budget.planner_calls, 1);
  assert.equal(r.completion_status, 'partial');
  assert.equal(r.stop_reason, 'planner_finished');
  assert.equal(r.trace[0].phase, 'evaluator');
  assert.ok(
    !r.trace.some(
      (entry) =>
        entry.phase === 'planner' &&
        entry.action?.type === 'tool' &&
        entry.action.tool === 'list_ec2_instances',
    ),
  );
});

test('initial inventory retries stay in the executor and recovered evidence reaches the first planner', async (t) => {
  const base = new MockProvider();
  let attempts = 0;
  let plannerCalls = 0;
  const r = await run({
    onProgress: toolRetryClock(t),
    provider: {
      mode: 'mock',
      async call(action, signal) {
        assert.equal(action.tool, 'list_ec2_instances');
        attempts++;
        if (attempts < 3) throw new Error('private source failure');
        return base.call(action, signal);
      },
    },
    planner: {
      mode: 'scripted',
      model: null,
      async next(state) {
        plannerCalls++;
        assert.equal(attempts, 3);
        assert.equal(state.observations.length, 1);
        assert.equal(state.observations[0].status, 'ok');
        assert.deepEqual(
          state.trace
            .filter((entry) => entry.phase === 'tool')
            .map((entry) => entry.retry_count),
          [0, 1, 2],
        );
        return { type: 'finish', reason: 'Inspect recovered inventory only.' };
      },
    },
  });
  assert.equal(plannerCalls, 1);
  assert.equal(r.budget.planner_calls, 1);
  assert.equal(r.budget.discovery_attempts, 3);
  assert.ok(!JSON.stringify(r).includes('private source failure'));
});

test('usable partial inventory continues and retains long missing-fields lists without overflowing trace validation', async () => {
  const missing = Array.from(
    { length: 30 },
    (_, i) => `${i}-${'x'.repeat(97)}`,
  );
  let firstTurn = true;
  const r = await run({
    planner: planner((state, next) => {
      if (firstTurn) {
        firstTurn = false;
        assert.equal(state.observations.length, 1);
        assert.equal(state.observations[0].status, 'partial');
        assert.deepEqual(state.observations[0].missing_fields, missing);
      }
      return next;
    }),
    provider: modify((o) => {
      if (o.tool === 'list_ec2_instances') {
        o.status = 'partial';
        o.coverage.complete = false;
        o.missing_fields = missing;
      }
    }),
  });
  assert.equal(r.completion_status, 'partial');
  assert.ok(r.evidence.some((o) => o.tool === 'get_ec2_billing'));
  assert.ok(r.candidates.length > 0);
  assert.deepEqual(r.evidence[0].missing_fields, missing);
  const trace = r.trace.find((t) => t.phase === 'tool');
  assert.ok(trace);
  assert.match(trace.reason, /list_ec2_instances: partial.*Missing fields:/);
  assert.ok(trace.reason.length <= 400);
  assert.ok(trace.reason.endsWith('….'));
});

test('EC2 4: an unexplained high CPU peak defers without inventing a conflict', async (t) => {
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
  assert.ok(r.evidence.some((e) => e.tool === 'get_ec2_operations'));
  assert.ok(r.evidence.some((e) => e.tool === 'get_ec2_dependencies'));
  const metrics = r.evidence.find((e) => e.tool === 'get_ec2_metrics');
  assert.ok(metrics?.data && 'peak_cpu_percent' in metrics.data);
  assert.equal(metrics.data.average_cpu_percent, 2);
  assert.equal(metrics.data.peak_cpu_percent, 95);
  assert.deepEqual(r.candidates[0].contradicting_evidence_ids, []);
  assert.deepEqual(r.candidates[0].supporting_evidence_ids, [
    metrics.evidence_id,
  ]);
  assert.equal(r.candidates[0].estimated_monthly_savings, null);
  assert.ok(
    r.candidates[0].missing_checks.includes(
      'get_ec2_metrics: The agent could not establish a supported UTC window from the available utilization history.',
    ),
  );
  assert.ok(r.evidence.some((e) => e.tool === 'get_ec2_operations'));
  assert.ok(
    r.trace.some(
      (entry) =>
        entry.phase === 'tool' &&
        entry.evidence_ids.includes(metrics.evidence_id),
    ),
  );
  scenarioProof(t, r);
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
        state.trace.find((t) => t.phase === 'tool' && t.action?.type === 'tool')
          ?.action ?? next,
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
  assert.equal(r.budget.discovery_attempts, 2);
});

test('model failure retains discovered inventory with an explicit partial result and no fallback', async () => {
  const r = await run({
    planner: {
      mode: 'live',
      model: 'test-model',
      async next() {
        throw new Error('secret-marker');
      },
    },
  });
  assert.equal(r.completion_status, 'partial');
  assert.equal(r.stop_reason, 'planner_unavailable_or_invalid');
  assert.equal(r.planner.mode, 'live');
  assert.equal(r.budget.discovery_attempts, 1);
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
  assert.equal(r.budget.discovery_attempts, 1);
  assert.equal(r.budget.planner_calls, 0);
  assert.equal(r.stop_reason, 'total_runtime_exhausted');
});

test('planner timeout without enough retry time stops without tools or late results', async () => {
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
  assert.equal(r.stop_reason, 'total_runtime_exhausted');
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
  assert.equal(r.budget.discovery_attempts, 1);
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

test('provider error status is retained independently of unavailable or partial', async (t) => {
  const r = await run({
    onProgress: toolRetryClock(t),
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
