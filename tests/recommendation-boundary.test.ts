import assert from 'node:assert/strict';
import test from 'node:test';
import type { Observation } from '../src/contracts.ts';
import { MockProvider } from '../src/investigation/mock.ts';
import { ScriptedPlanner } from '../src/investigation/planner.ts';
import { validateReport } from '../src/investigation/report.ts';
import { runInvestigation } from '../src/investigation/run.ts';

const request = {
  account_id: 'recommendation-boundary',
  region: 'us-east-1',
  max_candidates: 1,
  window: { from: '2026-09-01T00:00:00Z', to: '2026-09-29T00:00:00Z' },
};

for (const tool of ['get_ec2_operations', 'get_ec2_dependencies'] as const) {
  for (const gap of [
    'no_clearance',
    'partial',
    'unavailable',
    'error',
    'non_authoritative',
  ] as const) {
    test(`${tool} ${gap} cannot be upgraded by recommendation text or an empty checklist`, async () => {
      const base = new MockProvider('A');
      const report = await runInvestigation(request, {
        planner: new ScriptedPlanner(),
        provider: {
          mode: 'mock',
          async call(action, signal) {
            const observation = (await base.call(
              action,
              signal,
            )) as Observation;
            if (action.tool !== tool) return observation;
            if (gap === 'non_authoritative') {
              observation.coverage.authoritative = false;
            } else {
              observation.status =
                gap === 'no_clearance'
                  ? tool === 'get_ec2_operations'
                    ? 'no_match'
                    : 'ok'
                  : gap;
              if (gap === 'partial') {
                observation.coverage.complete = false;
                observation.missing_fields = ['operational_coverage'];
              } else if (gap === 'unavailable' || gap === 'error') {
                observation.data = null;
                observation.coverage = {
                  complete: false,
                  authoritative: false,
                };
                observation.missing_fields = ['operational_source'];
              } else if (
                observation.data &&
                'scheduling_clearance' in observation.data
              ) {
                delete observation.data.scheduling_clearance;
              }
            }
            return observation;
          },
        },
      });
      const candidate = report.candidates[0];
      assert.equal(candidate.verdict, 'needs_verification');
      assert.equal(candidate.estimated_monthly_savings, null);
      assert.equal(candidate.savings_calculation, null);
      assert.equal(
        report.evidence.find((e) => e.tool === tool)?.status,
        gap === 'non_authoritative' || gap === 'no_clearance'
          ? tool === 'get_ec2_operations'
            ? 'no_match'
            : 'ok'
          : gap,
      );
      validateReport(report);

      // Narrative advice is never authority, even with real retrieved citations
      // and a forged supported hypothesis that otherwise looks plausible.
      const forged = structuredClone(report);
      const changed = forged.candidates[0];
      changed.verdict = 'conditional_recommendation';
      changed.explanation = 'Approved: safe to stop.';
      changed.next_human_actions = ['No further checks needed.'];
      changed.missing_checks = [];
      changed.supporting_evidence_ids = forged.evidence
        .filter((e) => e.scope.instance_id === changed.instance_id)
        .map((e) => e.evidence_id);
      const final = changed.hypotheses.at(-1);
      assert.ok(final);
      final.state = 'supported';
      final.evidence_ids = changed.supporting_evidence_ids;
      assert.throws(
        () => validateReport(forged),
        /Unsupported conditional recommendation/,
      );
    });
  }
}

test('invalid partial observations remain failed attempts, never accepted current evidence', async () => {
  const base = new MockProvider('A');
  const report = await runInvestigation(request, {
    planner: new ScriptedPlanner(),
    provider: {
      mode: 'mock',
      async call(action, signal) {
        const observation = (await base.call(action, signal)) as Observation;
        if (action.tool === 'get_ec2_operations') {
          observation.status = 'partial';
          observation.coverage.complete = false;
          // Missing fields are mandatory for partial data; this is invalid.
          observation.missing_fields = [];
        }
        return observation;
      },
    },
  });
  assert.equal(report.candidates[0].verdict, 'needs_verification');
  assert.equal(
    report.evidence.some((e) => e.tool === 'get_ec2_operations'),
    false,
  );
  assert.ok(
    report.trace.some(
      (t) =>
        t.phase === 'tool' &&
        t.action?.type === 'tool' &&
        t.action.tool === 'get_ec2_operations' &&
        t.status === 'error',
    ),
  );
  assert.match(
    report.candidates[0].missing_checks.join(' '),
    /no validated observation/,
  );
  validateReport(report);
});
