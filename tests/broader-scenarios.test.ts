import { OpenAICompatiblePlanner } from '../src/investigation/model.ts';
import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { InvestigationRequest, Observation } from '../src/contracts.ts';
import {
  MockProvider,
  type MockScenario,
  type CurrentEvidenceProvider,
} from '../src/investigation/mock.ts';
import { ScriptedPlanner } from '../src/investigation/planner.ts';
import { runInvestigation } from '../src/investigation/run.ts';
import { renderReport, validateReport } from '../src/investigation/report.ts';
import {
  reasoningSummaryFromReport,
  HmemReasoningMemory,
} from '../src/investigation/memory.ts';
import { historyRecordFromReport } from '../src/tools/zetaris-history.ts';
import { parseArgs } from '../cli.ts';

const request: InvestigationRequest = {
  account_id: 'broader-demo',
  region: 'us-east-1',
  max_candidates: 1,
  window: { from: '2026-09-01T00:00:00Z', to: '2026-09-29T00:00:00Z' },
};
function provider(
  scenario: MockScenario,
  change?: (o: Observation) => void,
): CurrentEvidenceProvider {
  const base = new MockProvider(scenario);
  return {
    mode: 'mock',
    async call(a, signal) {
      const o = (await base.call(a, signal)) as Observation;
      change?.(o);
      return o;
    },
  };
}
const run = (
  scenario: MockScenario,
  change?: (o: Observation) => void,
  input = request,
) =>
  runInvestigation(input, {
    provider: provider(scenario, change),
    planner: new ScriptedPlanner(),
  });

test('A supports conditional approval only after both challenges, with reproducible compute savings', async () => {
  const r = await run('A');
  const c = r.candidates[0];
  assert.equal(r.completion_status, 'complete');
  assert.equal(c.verdict, 'conditional_recommendation');
  assert.deepEqual(
    c.hypotheses.map((h) => h.state),
    ['proposed', 'supported'],
  );
  assert.equal(c.estimated_monthly_savings, 75); // October: (31 - 1 excluded) * floor((360 - 30)/60) * 0.50
  assert.equal(c.savings_calculation?.avoided_hours, 150);
  assert.equal(c.savings_calculation?.eligible_days, 30);
  assert.equal(c.savings_calculation?.period.from, '2026-10-01T00:00:00.000Z');
  assert.match(c.next_human_actions.join(' '), /human approval/);
  assert.match(renderReport(r), /75 USD/);
});

test('C explains continuous operation from newly retrieved dependency evidence', async () => {
  const r = await run('C');
  assert.equal(r.completion_status, 'complete');
  const c = r.candidates[0];
  assert.equal(c.verdict, 'not_recommended');
  assert.match(c.explanation, /continuous operation/);
  assert.equal(
    r.evidence.find((e) => e.evidence_id === c.contradicting_evidence_ids[0])
      ?.tool,
    'get_ec2_dependencies',
  );
  assert.equal(c.estimated_monthly_savings, null);
  assert.equal(
    (await run('missing')).candidates[0].verdict,
    'needs_verification',
  );
});

for (const condition of [
  'missing_clearance',
  'non_authoritative',
  'partial',
  'owner_unknown',
  'calendar_unknown',
  'recovery_unknown',
  'expired',
  'mismatch',
  'noncritical_job',
  'coarse_metrics',
  'high_peak',
] as const) {
  test(`A fails closed for ${condition}`, async () => {
    const r = await run('A', (o) => {
      if (
        o.tool === 'get_ec2_metrics' &&
        o.data &&
        'aggregation_minutes' in o.data
      ) {
        if (condition === 'coarse_metrics') o.data.aggregation_minutes = 60;
        if (condition === 'high_peak') o.data.peak_cpu_percent = 60;
      }
      if (o.tool !== 'get_ec2_operations' || !o.data || !('jobs' in o.data))
        return;
      const c = o.data.scheduling_clearance;
      assert.ok(c);
      if (condition === 'missing_clearance') delete o.data.scheduling_clearance;
      if (condition === 'non_authoritative') o.coverage.authoritative = false;
      if (condition === 'partial') {
        o.status = 'partial';
        o.coverage.complete = false;
      }
      if (condition === 'owner_unknown') c.owner_confirmed = false;
      if (condition === 'calendar_unknown') c.calendar_reviewed = false;
      if (condition === 'recovery_unknown') c.recovery_verified = false;
      if (condition === 'expired') c.valid_window.to = '2026-10-02T00:00:00Z';
      if (condition === 'mismatch') c.overhead_minutes++;
      if (condition === 'noncritical_job') {
        o.status = 'ok';
        o.data.jobs.push({
          job_id: 'routine',
          critical: false,
          window: { start_hour_utc: 1, end_hour_utc: 2 },
        });
      }
    });
    assert.equal(r.candidates[0].verdict, 'needs_verification');
    assert.equal(r.candidates[0].estimated_monthly_savings, null);
  });
}
for (const condition of [
  'unknown_commitments',
  'commitment_rate',
  'missing_rate',
  'retained_costs',
  'expired_price',
  'other_currency',
] as const) {
  test(`supported scheduling keeps savings unknown for ${condition}`, async () => {
    const r = await run('A', (o) => {
      if (!o.data || !('costs' in o.data)) return;
      const p = o.data.costs[0].pricing;
      assert.ok(p);
      if (condition === 'unknown_commitments')
        o.data.commitment_coverage_known = false;
      if (condition === 'commitment_rate') p.purchase_option = 'commitment';
      if (condition === 'missing_rate') delete o.data.costs[0].pricing;
      if (condition === 'retained_costs') p.retained_costs_excluded = false;
      if (condition === 'expired_price')
        p.valid_window.to = '2026-10-02T00:00:00Z';
      if (condition === 'other_currency') o.data.currency = 'JPY';
    });
    assert.equal(r.candidates[0].verdict, 'conditional_recommendation');
    assert.equal(r.candidates[0].estimated_monthly_savings, null);
    assert.equal(r.candidates[0].savings_calculation, null);
  });
}

test('calendar arithmetic handles leap February, reviewed exclusions, overhead and billing units', async () => {
  const r = await run('A', undefined, {
    ...request,
    window: { from: '2024-01-01T00:00:00Z', to: '2024-01-29T00:00:00Z' },
  });
  assert.equal(r.candidates[0].savings_calculation?.eligible_days, 28);
  assert.equal(r.candidates[0].estimated_monthly_savings, 70);
});

test('mixed top three isolate identical proposed windows, share discovery, and retain rank order', async () => {
  const r = await run('mixed', undefined, { ...request, max_candidates: 3 });
  assert.equal(r.completion_status, 'complete');
  assert.equal(r.discovery.discovered_count, 4);
  assert.deepEqual(
    r.candidates.map((c) => c.instance_id),
    ['i-mock-primary', 'i-mock-secondary', 'i-mock-third'],
  );
  assert.deepEqual(
    r.candidates.map((c) => c.verdict),
    ['conditional_recommendation', 'not_recommended', 'not_recommended'],
  );
  assert.equal(r.budget.discovery_attempts, 2);
  assert.equal(r.budget.candidate_attempts, 8);
  assert.equal(r.budget.planner_calls, 13);
  for (let i = 0; i < 3; i++) {
    const summary = reasoningSummaryFromReport(r, i);
    const record = historyRecordFromReport(r, i);
    assert.equal(summary.instance_id, r.candidates[i].instance_id);
    assert.equal(record.instance_id, r.candidates[i].instance_id);
    for (const id of summary.provenance.evidence_ids)
      assert.ok(
        r.evidence.some(
          (e) =>
            e.evidence_id === id &&
            (!e.scope.instance_id ||
              e.scope.instance_id === r.candidates[i].instance_id),
        ),
      );
  }
  assert.throws(() =>
    validateReport({ ...r, candidates: [...r.candidates].reverse() }),
  );
  const forged = structuredClone(r);
  forged.candidates[2].contradicting_evidence_ids =
    forged.candidates[1].contradicting_evidence_ids;
  assert.throws(() => validateReport(forged));
});

test('a later candidate tool failure preserves earlier supported recommendation', async () => {
  const r = await run(
    'mixed',
    (o) => {
      if (
        o.scope.instance_id === 'i-mock-secondary' &&
        o.tool === 'get_ec2_operations'
      )
        throw new Error('private provider failure');
    },
    { ...request, max_candidates: 3 },
  );
  assert.equal(r.completion_status, 'partial');
  assert.deepEqual(
    r.candidates.map((c) => c.verdict),
    ['conditional_recommendation', 'needs_verification', 'not_recommended'],
  );
  assert.doesNotMatch(JSON.stringify(r), /private provider failure/);
});

test('aggregate planner exhaustion retains finished candidates and explicitly defers remainder', async () => {
  const r = await runInvestigation(
    { ...request, max_candidates: 3 },
    {
      provider: new MockProvider('mixed'),
      planner: new ScriptedPlanner(),
      limits: { planner_calls: 6 },
    },
  );
  assert.deepEqual(
    r.candidates.map((c) => c.verdict),
    ['conditional_recommendation', 'needs_verification', 'needs_verification'],
  );
  assert.equal(r.completion_status, 'partial');
  assert.equal(r.budget.planner_calls, 6);
});

test('report boundary rejects forged positive verdicts and arithmetic', async () => {
  const a = await run('A');
  const forged = structuredClone(a);
  forged.candidates[0].estimated_monthly_savings = 999;
  assert.throws(() => validateReport(forged));
  const unknown = await run('clear');
  unknown.candidates[0].verdict = 'conditional_recommendation';
  unknown.candidates[0].hypotheses[1].state = 'supported';
  assert.throws(() => validateReport(unknown));
});

test('multi-candidate local memory stores and recalls every verdict without cross-instance provenance', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'cci-broader-'));
  try {
    const input = { ...request, max_candidates: 3 };
    const first = await runInvestigation(input, {
      provider: new MockProvider('mixed'),
      planner: new ScriptedPlanner(),
      history: { hmem_directory: directory },
    });
    assert.equal(first.historical_context.hmem, 'ok');
    const memory = await HmemReasoningMemory.open(directory, {
      account_id: request.account_id,
      region: request.region,
    });
    for (const c of first.candidates)
      assert.ok(memory.retrieve(c.instance_id).length);
    const second = await runInvestigation(input, {
      provider: new MockProvider('mixed'),
      planner: new ScriptedPlanner(),
      history: { hmem_directory: directory },
    });
    assert.equal(second.historical_context.context_ids.length, 3);
    assert.deepEqual(
      second.candidates.map((c) => c.verdict),
      first.candidates.map((c) => c.verdict),
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('CLI accepts A/C/mixed and bounds candidate count at three', () => {
  for (const scenario of ['A', 'C', 'mixed']) {
    const options = parseArgs([
      'investigate',
      '--account',
      'demo',
      '--region',
      'us-east-1',
      '--scenario',
      scenario,
      '--max-candidates',
      '3',
    ]);
    assert.notEqual(options, 'help');
    if (options !== 'help') assert.equal(options.request.max_candidates, 3);
  }
  assert.throws(() => parseArgs(['investigate', '--max-candidates', '4']));
});

test('aggregate deadline does not restart for later candidates', async () => {
  const base = new MockProvider('mixed');
  let stalled = false;
  let thirdCalls = 0;
  const r = await runInvestigation(
    { ...request, max_candidates: 3 },
    {
      planner: new ScriptedPlanner(),
      provider: {
        mode: 'mock',
        async call(a, signal) {
          if (a.args.instance_id === 'i-mock-third') thirdCalls++;
          if (a.args.instance_id === 'i-mock-secondary') {
            stalled = true;
            return new Promise(() => {});
          }
          return base.call(a, signal);
        },
      },
      limits: { total_timeout_ms: 50 },
    },
  );
  assert.ok(stalled);
  assert.equal(thirdCalls, 0);
  assert.deepEqual(
    r.candidates.map((c) => c.verdict),
    ['conditional_recommendation', 'needs_verification', 'needs_verification'],
  );
  assert.equal(r.stop_reason, 'total_runtime_exhausted');
});

test('positive safety requires at least a full week of utilization coverage', async () => {
  const r = await run('A', undefined, {
    ...request,
    window: { from: '2026-09-28T00:00:00Z', to: '2026-09-29T00:00:00Z' },
  });
  assert.equal(r.candidates[0].verdict, 'needs_verification');
});

test('model transport uses candidate-specific choices and observations across all three candidates', async (t) => {
  const priorTls = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '1';
  t.after(() => {
    if (priorTls === undefined) delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    else process.env.NODE_TLS_REJECT_UNAUTHORIZED = priorTls;
  });
  let calls = 0;
  t.mock.method(
    globalThis,
    'fetch',
    async (_url: unknown, options?: RequestInit) => {
      calls++;
      const body = JSON.parse(String(options?.body));
      const state = JSON.parse(
        body.messages[1].content.split('\n').slice(1).join('\n'),
      );
      for (const o of state.observations)
        assert.ok(
          !o.scope.instance_id || o.scope.instance_id === state.candidate_id,
        );
      const action =
        state.available_actions.find((a: string) => a !== 'finish') ?? 'finish';
      return Response.json({
        choices: [
          {
            finish_reason: 'stop',
            message: {
              content: JSON.stringify({
                action,
                reason: 'Inspect fresh candidate evidence.',
              }),
            },
          },
        ],
      });
    },
  );
  const r = await runInvestigation(
    { ...request, max_candidates: 3 },
    {
      provider: new MockProvider('mixed'),
      planner: new OpenAICompatiblePlanner({
        baseUrl: 'https://model.example/v1',
        model: 'offline-transport-fixture',
        apiKey: 'fixture-key',
      }),
    },
  );
  assert.equal(r.completion_status, 'complete');
  assert.equal(calls, 13);
  assert.deepEqual(
    r.candidates.map((c) => c.verdict),
    ['conditional_recommendation', 'not_recommended', 'not_recommended'],
  );
});
