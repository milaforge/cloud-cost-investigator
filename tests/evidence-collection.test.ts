import assert from 'node:assert/strict';
import test from 'node:test';
import type { Observation } from '../src/contracts.ts';
import { validateAction } from '../src/contracts.ts';
import { MockProvider } from '../src/investigation/mock.ts';
import { ScriptedPlanner } from '../src/investigation/planner.ts';
import { OpenAICompatiblePlanner } from '../src/investigation/model.ts';
import { validateReport } from '../src/investigation/report.ts';
import { runInvestigation } from '../src/investigation/run.ts';

const request = {
  account_id: 'collection-test',
  region: 'us-east-1',
  max_candidates: 1,
  window: { from: '2026-09-01T00:00:00Z', to: '2026-09-15T00:00:00Z' },
};
function provider(peak: number, scenario: 'A' | 'B' = 'A') {
  const base = new MockProvider(scenario);
  return {
    mode: 'mock' as const,
    async call(
      action: Parameters<MockProvider['call']>[0],
      signal: AbortSignal,
    ) {
      const o = (await base.call(action, signal)) as Observation;
      if (
        o.tool === 'get_ec2_metrics' &&
        o.data &&
        'peak_cpu_percent' in o.data
      ) {
        o.status = 'partial';
        o.coverage.complete = false;
        o.missing_fields = ['INCOMPLETE_COVERAGE:cpu_max'];
        o.data.peak_cpu_percent = peak;
      }
      return o;
    },
  };
}
for (const peak of [5, 60]) {
  test(`partial metrics with peak ${peak} still collect both operational sources`, async () => {
    const report = await runInvestigation(request, {
      provider: provider(peak),
      planner: new ScriptedPlanner(),
      history: {},
    });
    assert.equal(report.candidates[0].verdict, 'needs_verification');
    assert.equal(report.candidates[0].estimated_monthly_savings, null);
    assert.equal(!!report.candidates[0].proposed_window, peak === 5);
    for (const tool of [
      'get_ec2_metrics',
      'get_ec2_operations',
      'get_ec2_dependencies',
    ])
      assert.equal(report.evidence.filter((e) => e.tool === tool).length, 1);
    const operation = report.trace.find(
      (t) =>
        t.phase === 'tool' &&
        t.action?.type === 'tool' &&
        t.action.tool === 'get_ec2_operations',
    );
    assert.ok(operation?.action?.type === 'tool');
    assert.equal(!!operation.action.args.proposed_window, peak === 5);
    validateReport(report);
    if (peak === 5) {
      const forged = structuredClone(report);
      forged.candidates[0].verdict = 'conditional_recommendation';
      assert.throws(
        () => validateReport(forged),
        /Unsupported conditional recommendation/,
      );
    }
  });
}

test('a partial-metric hypothesis can be rejected but remaining checks still run', async () => {
  const report = await runInvestigation(request, {
    provider: provider(5, 'B'),
    planner: new ScriptedPlanner(),
    history: {},
  });
  assert.equal(report.candidates[0].verdict, 'not_recommended');
  assert.equal(report.completion_status, 'partial');
  assert.ok(report.evidence.some((e) => e.tool === 'get_ec2_dependencies'));
  assert.equal(report.candidates[0].hypotheses.length, 2);
  validateReport(report);
});

test('collection stops at the existing tool budget without upgrading partial evidence', async () => {
  const report = await runInvestigation(request, {
    provider: provider(5),
    planner: new ScriptedPlanner(),
    history: {},
    limits: { candidate_attempts: 1 },
  });
  assert.equal(report.stop_reason, 'tool_budget_exhausted');
  assert.equal(report.candidates[0].verdict, 'needs_verification');
  assert.equal(report.budget.candidate_attempts, 1);
  validateReport(report);
});

test('model choices expose remaining reads with no window and exclude premature finish', async (t) => {
  const previous = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '1';
  t.after(() => {
    if (previous === undefined) delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    else process.env.NODE_TLS_REJECT_UNAUTHORIZED = previous;
  });
  const seen: string[][] = [];
  t.mock.method(
    globalThis,
    'fetch',
    async (_url: unknown, init: RequestInit) => {
      const body = JSON.parse(String(init.body));
      const state = JSON.parse(
        body.messages[1].content.split('\n').slice(1).join('\n'),
      );
      const choices: string[] = state.available_actions;
      seen.push(choices);
      return Response.json({
        choices: [
          {
            finish_reason: 'stop',
            message: {
              content: JSON.stringify({
                action: choices[0],
                reason: 'Collect remaining scoped evidence.',
              }),
            },
          },
        ],
      });
    },
  );
  const report = await runInvestigation(request, {
    provider: provider(60),
    history: {},
    planner: new OpenAICompatiblePlanner({
      baseUrl: 'https://fixture.example/v1',
      model: 'fixture',
      apiKey: 'fixture',
    }),
  });
  assert.ok(
    seen.some(
      (c) =>
        c.includes('get_ec2_operations') &&
        c.includes('get_ec2_dependencies') &&
        !c.includes('finish'),
    ),
  );
  assert.ok(report.evidence.some((e) => e.tool === 'get_ec2_operations'));
  assert.ok(report.evidence.some((e) => e.tool === 'get_ec2_dependencies'));
  assert.equal(report.candidates[0].verdict, 'needs_verification');
  validateReport(report);
});

test('untargeted operational reads accept no window but still reject malformed supplied windows', () => {
  const action = {
    type: 'tool',
    tool: 'get_ec2_operations',
    args: { ...request, max_candidates: undefined, instance_id: 'i-test' },
    reason: 'Read schedules.',
  };
  const { max_candidates: _unused, ...args } = action.args;
  assert.equal(validateAction({ ...action, args }).type, 'tool');
  assert.throws(() =>
    validateAction({
      ...action,
      args: {
        ...args,
        proposed_window: { start_hour_utc: 9, end_hour_utc: 2 },
      },
    }),
  );
});

test('exhausted unavailable metrics still allow independent operational reads', async () => {
  const base = new MockProvider('A');
  let metricAttempts = 0;
  const report = await runInvestigation(request, {
    planner: new ScriptedPlanner(),
    history: {},
    provider: {
      mode: 'mock',
      async call(action, signal) {
        const o = (await base.call(action, signal)) as Observation;
        if (o.tool === 'get_ec2_metrics') {
          metricAttempts++;
          o.status = 'unavailable';
          o.data = null;
          o.coverage = { complete: false, authoritative: false };
          o.missing_fields = ['SOURCE_UNAVAILABLE'];
        }
        return o;
      },
    },
  });
  assert.equal(metricAttempts, 4);
  assert.equal(report.candidates[0].proposed_window, null);
  assert.equal(report.candidates[0].verdict, 'needs_verification');
  for (const tool of ['get_ec2_operations', 'get_ec2_dependencies'])
    assert.ok(report.evidence.some((e) => e.tool === tool));
  assert.equal(report.budget.candidate_attempts, 6);
  validateReport(report);
});

test('budget exhaustion after a rejection retains the finding but marks collection partial', async () => {
  const report = await runInvestigation(request, {
    provider: new MockProvider('B'),
    planner: new ScriptedPlanner(),
    history: {},
    limits: { candidate_attempts: 2 },
  });
  assert.equal(report.stop_reason, 'tool_budget_exhausted');
  assert.equal(report.candidates[0].verdict, 'not_recommended');
  assert.equal(report.completion_status, 'partial');
  assert.ok(
    report.candidates[0].missing_checks.some((c) =>
      c.includes('get_ec2_dependencies: not queried'),
    ),
  );
  validateReport(report);
});
