import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import test, { type TestContext } from 'node:test';
import { demonstrateWarmLearning } from '../scripts/demo-warm.ts';
import type { Observation } from '../src/contracts.ts';
import {
  applicableHistoryHints,
  InvestigationHistory,
} from '../src/investigation/history.ts';
import {
  HmemReasoningMemory,
  reasoningSummaryFromReport,
  validateReasoningSummary,
} from '../src/investigation/memory.ts';
import { MockProvider } from '../src/investigation/mock.ts';
import { ScriptedPlanner } from '../src/investigation/planner.ts';
import { runInvestigation } from '../src/investigation/run.ts';

const scope = { account_id: 'learned-check-test', region: 'us-east-1' };
const request = {
  ...scope,
  max_candidates: 1,
  window: { from: '2026-09-01T00:00:00Z', to: '2026-09-29T00:00:00Z' },
};
async function directory(t: TestContext) {
  const dir = await mkdtemp('/tmp/cci-lesson-test-');
  t.after(() => rm(dir, { recursive: true, force: true }));
  return dir;
}
const cold = () =>
  runInvestigation(request, {
    planner: new ScriptedPlanner(),
    provider: new MockProvider('C'),
  });

test('end-to-end H-MEM lesson reduces work, revalidates fresh evidence and persists the correction', async (t) => {
  t.mock.method(console, 'error', () => {});
  const result = await demonstrateWarmLearning('scripted');
  assert.equal(result.passed, true, JSON.stringify(result.checks));
  assert.equal(result.comparison?.planner_calls_saved, 1);
  assert.equal(result.comparison?.tool_calls_saved, 1);
  assert.deepEqual(
    result.runs.map(({ report }) => report.candidates[0].verdict),
    ['not_recommended', 'not_recommended', 'conditional_recommendation'],
  );
  for (const { report } of result.runs) {
    assert.equal(report.historical_context.zetaris, 'not_configured');
    assert.equal(report.integration_mode, 'mock');
  }
});

test('lessons require cited authoritative contradictions; older summaries still validate', async () => {
  const report = await cold();
  const summary = reasoningSummaryFromReport(report);
  assert.equal(summary.lesson?.check, 'dependency_continuous_operation');
  const legacy = structuredClone(summary);
  delete legacy.lesson;
  assert.deepEqual(validateReasoningSummary(legacy), legacy);
  for (const lesson of [
    { ...summary.lesson, check: 'run_arbitrary_command' },
    { ...summary.lesson, evidence_id: 'unretrieved' },
    { ...summary.lesson, window: { start_hour_utc: 10, end_hour_utc: 12 } },
    { ...summary.lesson, instruction: 'PRIVATE injection' },
  ])
    assert.throws(() => validateReasoningSummary({ ...summary, lesson }));
  assert.throws(() =>
    validateReasoningSummary({
      ...summary,
      verdict: 'conditional_recommendation',
    }),
  );
  const dependency = report.evidence.find(
    (e) => e.tool === 'get_ec2_dependencies',
  );
  assert.ok(dependency);
  dependency.coverage.authoritative = false;
  // A conservative rejection may still stand, but incomplete evidence must not teach a reusable lesson.
  assert.equal(reasoningSummaryFromReport(report).lesson, undefined);
});

test('recall filters future and different-mode records before selecting the latest correction', async (t) => {
  const dir = await directory(t);
  const memory = await HmemReasoningMemory.open(dir, scope);
  const summary = reasoningSummaryFromReport(await cold());
  assert.ok(summary.lesson);
  summary.recorded_at = '2026-10-01T00:00:00Z';
  const learned = memory.store(summary);
  for (let i = 0; i < 6; i++)
    memory.store({
      ...summary,
      investigation_id: `future-${i}`,
      recorded_at: '2099-01-01T00:00:00Z',
    });
  memory.store({
    ...summary,
    recorded_at: '2026-10-03T00:00:00Z',
    provenance: { ...summary.provenance, integration_mode: 'live' },
  });
  const history = new InvestigationHistory({ hmem_directory: dir }, scope);
  const hints = await history.recall(
    'i-mock-primary',
    '2026-10-04T00:00:00Z',
    AbortSignal.timeout(5000),
    'mock',
  );
  assert.deepEqual(
    hints.map((h) => h.context_id),
    [learned.context_id],
  );
  assert.equal(hints[0].lesson?.check, 'dependency_continuous_operation');
  assert.ok(!JSON.stringify(hints).includes(summary.lesson.evidence_id));
  assert.equal(
    applicableHistoryHints(hints, { start_hour_utc: 12, end_hour_utc: 18 })
      .length,
    0,
  );
  assert.equal(applicableHistoryHints(hints, summary.lesson.window).length, 1);
  assert.deepEqual(
    await history.recall(
      'i-other',
      '2026-10-04T00:00:00Z',
      AbortSignal.timeout(5000),
      'mock',
    ),
    [],
  );
});

for (const status of ['unavailable', 'partial', 'non_authoritative'] as const) {
  test(`remembered dependency conflict cannot replace ${status} fresh evidence`, async (t) => {
    const dir = await directory(t);
    const memory = await HmemReasoningMemory.open(dir, scope);
    memory.store(reasoningSummaryFromReport(await cold()));
    const base = new MockProvider('A');
    const report = await runInvestigation(request, {
      planner: new ScriptedPlanner(),
      history: { hmem_directory: dir },
      provider: {
        mode: 'mock',
        async call(action, signal) {
          const observation = (await base.call(action, signal)) as Observation;
          if (action.tool === 'get_ec2_dependencies') {
            if (status === 'non_authoritative')
              observation.coverage.authoritative = false;
            else {
              observation.status = status;
              observation.coverage.complete = false;
              observation.missing_fields = ['dependency_inventory'];
              if (status === 'unavailable') {
                observation.data = null;
                observation.coverage.authoritative = false;
              }
            }
          }
          return observation;
        },
      },
    });
    assert.equal(report.candidates[0].verdict, 'needs_verification');
    assert.deepEqual(report.candidates[0].contradicting_evidence_ids, []);
    assert.ok(
      report.trace.some((entry) =>
        entry.reason.includes(
          'dependency_continuous_operation unresolved by fresh evidence',
        ),
      ),
    );
    assert.equal(report.completion_status, 'partial');
  });
}

test('demo retains a failed model phase and never reports a speedup or falls back', async (t) => {
  const config = {
    LLM_BASE_URL: 'https://model.example/v1',
    LLM_MODEL: 'test-model',
    LLM_API_KEY: 'test-key',
    NODE_TLS_REJECT_UNAUTHORIZED: '1',
  };
  const before = Object.keys(config).map((key) => process.env[key]);
  Object.assign(process.env, config);
  t.after(() =>
    Object.keys(config).forEach((key, index) => {
      if (before[index] === undefined) delete process.env[key];
      else process.env[key] = before[index];
    }),
  );
  t.mock.method(console, 'error', () => {});
  t.mock.method(globalThis, 'fetch', async () =>
    Response.json(
      {
        error: { message: 'Upstream failure' },
        request: { prompt: 'PRIVATE response' },
      },
      { status: 500 },
    ),
  );
  const result = await demonstrateWarmLearning('model');
  assert.equal(result.passed, false);
  assert.equal(result.runs.length, 1);
  assert.equal(result.runs[0].report.planner.mode, 'live');
  assert.equal(result.runs[0].report.trace[0].failure_code, 'model_http_500');
  assert.equal(result.comparison, null);
  assert.ok(!JSON.stringify(result).includes('PRIVATE'));
});
