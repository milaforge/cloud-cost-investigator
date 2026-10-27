import assert from 'node:assert/strict';
import test from 'node:test';
import { DemoHistory } from '../scripts/demo-history.ts';
import type { HistoryProgress } from '../src/investigation/history.ts';
import { MockProvider } from '../src/investigation/mock.ts';
import { ScriptedPlanner } from '../src/investigation/planner.ts';
import { runInvestigation } from '../src/investigation/run.ts';

test('preview history reads both mocks, stores only an ephemeral H-MEM summary, and reuses a scoped hint', async () => {
  const scope = { account_id: 'demo', region: 'us-east-1' };
  const events: HistoryProgress[] = [];
  const history = new DemoHistory(scope, 'B', (event) => events.push(event));
  const to = new Date();
  const request = {
    ...scope,
    max_candidates: 1,
    window: {
      from: new Date(+to - 14 * 86400000).toISOString(),
      to: to.toISOString(),
    },
  };
  const report = await runInvestigation(request, {
    provider: new MockProvider('B'),
    planner: new ScriptedPlanner(),
    historySession: history,
  });
  assert.equal(report.candidates[0].verdict, 'not_recommended');
  assert.deepEqual(
    events.map(({ source, operation, status }) => [source, operation, status]),
    [
      ['zetaris', 'read', 'ok'],
      ['hmem', 'read', 'ok'],
      ['zetaris', 'store', 'disabled'],
      ['hmem', 'store', 'ok'],
    ],
  );
  assert.equal(report.historical_context.comparisons?.length, 1);
  assert.equal(
    report.historical_context.comparisons?.[0].verdict,
    'needs_verification',
  );
  assert.equal(report.historical_context.context_ids.length, 2);
  assert.ok(
    report.historical_context.context_ids.some((id) =>
      id.startsWith('zetaris:'),
    ),
  );
  assert.ok(
    report.historical_context.context_ids.some((id) => id.startsWith('hmem:')),
  );
  assert.ok(
    report.trace.some(
      (entry) =>
        entry.action?.type === 'tool' &&
        entry.action.tool === 'get_ec2_operations' &&
        entry.reason.startsWith('Historical operational checks prioritize'),
    ),
  );
  assert.equal(report.historical_context.zetaris, 'ok');
  assert.equal(report.historical_context.hmem, 'ok');
  const hints = await history.recall(
    report.candidates[0].instance_id,
    new Date(Date.parse(report.finished_at) + 1000).toISOString(),
    new AbortController().signal,
    'mock',
  );
  assert.equal(hints.length, 1);
  assert.equal(hints[0].lesson?.check, 'critical_job_overlap');
  assert.equal(hints[0].priority, 'get_ec2_operations');
  await assert.rejects(
    history.recall(
      report.candidates[0].instance_id,
      report.finished_at,
      new AbortController().signal,
      'live',
    ),
    /requires mock evidence/,
  );
  await assert.rejects(
    runInvestigation(request, {
      provider: {
        mode: 'live',
        call: async () => {
          throw new Error('must not call current evidence');
        },
      },
      planner: new ScriptedPlanner(),
      historySession: history,
    }),
    /requires isolated mock evidence/,
  );
});

test('first-run and changed-history previews require fresh evidence and preserve the human decision boundary', async () => {
  const { generateDemoReports } = await import('../scripts/demo-web.ts');
  const { cold, changed, mixed } = await generateDemoReports();
  assert.deepEqual(cold.historical_context.context_ids, []);
  assert.deepEqual(cold.historical_context.comparisons, []);
  assert.equal(cold.candidates[0].verdict, 'not_recommended');
  assert.ok(
    !cold.trace.some((entry) =>
      entry.reason.startsWith('Historical operational checks prioritize'),
    ),
  );
  assert.equal(
    changed.historical_context.comparisons?.[0].verdict,
    'not_recommended',
  );
  assert.equal(changed.candidates[0].verdict, 'needs_verification');
  assert.deepEqual(changed.candidates[0].contradicting_evidence_ids, []);
  assert.ok(
    changed.trace.some((entry) =>
      entry.reason.includes(
        'dependency_continuous_operation not_observed by fresh evidence',
      ),
    ),
  );
  assert.deepEqual(
    mixed.candidates.map((candidate) => candidate.verdict),
    ['needs_verification', 'not_recommended', 'not_recommended'],
  );
  for (const report of [cold, changed, mixed]) {
    assert.equal(report.decision_policy, 'reject_or_defer');
    for (const candidate of report.candidates) {
      assert.equal(candidate.estimated_monthly_savings, null);
      for (const tool of [
        'get_ec2_metrics',
        'get_ec2_operations',
        'get_ec2_dependencies',
      ])
        assert.ok(
          report.evidence.some(
            (evidence) =>
              evidence.tool === tool &&
              evidence.scope.instance_id === candidate.instance_id,
          ),
        );
      for (const id of [
        ...candidate.supporting_evidence_ids,
        ...candidate.contradicting_evidence_ids,
      ])
        assert.ok(
          report.evidence.some((evidence) => evidence.evidence_id === id),
          'current citations never point to history',
        );
    }
  }
});
