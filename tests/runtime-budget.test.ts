import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { InvestigationHistory } from '../src/investigation/history.ts';
import { MockProvider } from '../src/investigation/mock.ts';
import { ScriptedPlanner } from '../src/investigation/planner.ts';
import { validateReport } from '../src/investigation/report.ts';
import { runInvestigation } from '../src/investigation/run.ts';

const request = {
  account_id: 'runtime-test',
  region: 'us-east-1',
  max_candidates: 3,
  window: { from: '2026-09-01T00:00:00Z', to: '2026-09-29T00:00:00Z' },
};

test('runtime above fifteen minutes is rejected before any work', async () => {
  await assert.rejects(
    runInvestigation(request, {
      provider: {
        mode: 'mock',
        async call() {
          assert.fail('must not call a tool');
        },
      },
      planner: {
        mode: 'live',
        model: 'simulated',
        async next() {
          return { type: 'finish', reason: 'No work' };
        },
      },
      limits: { total_timeout_ms: 900_001 },
    }),
    /Invalid investigation limit/,
  );
});

test('shared deadline preserves completed candidates and defers the rest before fifteen minutes', async (t) => {
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: Date.now() });
  const base = new MockProvider('mixed');
  const scripted = new ScriptedPlanner();
  let plannerDeadline = 0;
  const deadlines: number[] = [];
  const report = await runInvestigation(request, {
    provider: {
      mode: 'mock',
      async call(action, signal) {
        t.mock.timers.tick(20_000);
        return base.call(action, signal);
      },
    },
    planner: {
      mode: 'live',
      model: 'simulated',
      async next(state, signal) {
        t.mock.timers.tick(Math.min(59_000, plannerDeadline));
        if (signal.aborted) return new Promise(() => {});
        return scripted.next(state, signal);
      },
    },
    limits: { tool_timeout_ms: 25_000 },
    onProgress(event) {
      if (event.event === 'planner_start') {
        plannerDeadline = event.timeout_ms;
        deadlines.push(plannerDeadline);
      }
    },
  });
  assert.equal(report.stop_reason, 'total_runtime_exhausted');
  assert.equal(report.completion_status, 'partial');
  assert.deepEqual(
    report.candidates.map((c) => c.verdict),
    ['conditional_recommendation', 'not_recommended', 'needs_verification'],
  );
  assert.equal(report.budget.elapsed_ms, 895_000);
  assert.ok(deadlines.every((ms) => ms <= 60_000));
  assert.ok(
    report.trace.some(
      (entry) => entry.failure_code === 'investigation_deadline_exceeded',
    ),
  );
  assert.ok(
    report.historical_context.limitations.some((s) =>
      s.includes('persistence skipped'),
    ),
  );
  assert.doesNotThrow(() => validateReport(report));
});

for (const phase of ['recall', 'persist'] as const) {
  test(`noncooperative history ${phase} cannot consume report finalization time`, async (t) => {
    t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: Date.now() });
    let started!: () => void;
    const entered = new Promise<void>((resolve) => {
      started = resolve;
    });
    let activeSignal: AbortSignal | undefined;
    let calls = 0;
    let completeLate!: () => void;
    if (phase === 'recall') {
      t.mock.method(
        InvestigationHistory.prototype,
        'recall',
        function (
          this: InvestigationHistory,
          _instance: string,
          _at: string,
          signal: AbortSignal,
        ) {
          calls++;
          activeSignal = signal;
          started();
          return new Promise((resolve) => {
            completeLate = () => {
              this.result.limitations.push('Late history mutation');
              resolve([]);
            };
          });
        },
      );
    } else {
      t.mock.method(
        InvestigationHistory.prototype,
        'persist',
        function (
          this: InvestigationHistory,
          report: Awaited<ReturnType<typeof runInvestigation>>,
          signal: AbortSignal,
        ) {
          calls++;
          activeSignal = signal;
          started();
          return new Promise<void>((resolve) => {
            completeLate = () => {
              this.result.limitations.push('Late history mutation');
              report.limitations.push('Late persistence mutation');
              resolve();
            };
          });
        },
      );
    }
    if (phase === 'persist')
      t.mock.method(InvestigationHistory.prototype, 'recall', async () => []);
    const pending = runInvestigation(
      { ...request, max_candidates: 1 },
      {
        provider: new MockProvider('C'),
        planner: new ScriptedPlanner(),
        history: { zetaris: true, zetaris_append: false },
        limits: { total_timeout_ms: 1000 },
      },
    );
    await entered;
    t.mock.timers.tick(900);
    const report = await pending;
    assert.equal(calls, 1);
    assert.equal(activeSignal?.aborted, true);
    assert.equal(report.stop_reason, 'total_runtime_exhausted');
    assert.equal(report.completion_status, 'partial');
    assert.equal(report.budget.elapsed_ms, 900);
    assert.equal(
      report.candidates[0].verdict,
      phase === 'persist' ? 'not_recommended' : 'needs_verification',
    );
    assert.doesNotThrow(() => validateReport(report));
    const snapshot = JSON.stringify(report);
    completeLate();
    await Promise.resolve();
    assert.equal(JSON.stringify(report), snapshot);
  });
}

test('report validation accepts truthful historical elapsed time without imposing a second runtime policy', () => {
  const report = JSON.parse(
    readFileSync(
      new URL('../docs/evaluation/examples/A.json', import.meta.url),
      'utf8',
    ),
  );
  report.budget.elapsed_ms = 3_770_000;
  report.finished_at = new Date(
    Date.parse(report.started_at) + report.budget.elapsed_ms,
  ).toISOString();
  assert.doesNotThrow(() => validateReport(report));
  for (const invalid of [-1, 0.5, Number.MAX_SAFE_INTEGER + 1]) {
    report.budget.elapsed_ms = invalid;
    assert.throws(() => validateReport(report));
  }
});
