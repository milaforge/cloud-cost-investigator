import assert from 'node:assert/strict';
import test from 'node:test';
import { MockProvider } from '../../../src/investigation/mock.ts';
import { ScriptedPlanner } from '../../../src/investigation/planner.ts';
import { runInvestigation } from '../../../src/investigation/run.ts';

// Local simulated latency only: no network, real model, history or elapsed-hour wait.
test('allowed slow three-candidate investigation returns its completed report', async (t) => {
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: Date.now() });
  const scripted = new ScriptedPlanner();
  const started = Date.now();
  let calls = 0;
  let elapsed = 0;
  t.after(() =>
    t.diagnostic(
      JSON.stringify({ planner_calls: calls, simulated_elapsed_ms: elapsed }),
    ),
  );
  const report = await runInvestigation(
    {
      account_id: 'audit-synthetic',
      region: 'us-east-1',
      max_candidates: 3,
      window: { from: '2026-09-01T00:00:00Z', to: '2026-09-29T00:00:00Z' },
    },
    {
      provider: new MockProvider('mixed'),
      planner: {
        mode: 'live',
        model: 'simulated-slow-planner',
        async next(state, signal) {
          // Each call remains below the supported 300-second per-call deadline.
          t.mock.timers.tick(290_000);
          calls++;
          elapsed = Date.now() - started;
          return scripted.next(state, signal);
        },
      },
    },
  );
  assert.equal(report.completion_status, 'complete');
  assert.equal(report.candidates.length, 3);
  assert.equal(report.budget.elapsed_ms, 13 * 290_000);
});
