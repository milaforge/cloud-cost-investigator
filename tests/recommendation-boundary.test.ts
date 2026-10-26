import assert from 'node:assert/strict';
import test from 'node:test';
import type { Observation } from '../src/contracts.ts';
import { MockProvider } from '../src/investigation/mock.ts';
import { ScriptedPlanner } from '../src/investigation/planner.ts';
import { nextHumanActions } from '../src/investigation/policy.ts';
import { validateReport } from '../src/investigation/report.ts';
import { runInvestigation } from '../src/investigation/run.ts';

const request = {
  account_id: 'recommendation-boundary',
  region: 'us-east-1',
  max_candidates: 1,
  window: { from: '2026-09-01T00:00:00Z', to: '2026-09-29T00:00:00Z' },
};

test('human actions combine history gaps and omit diagnostic-only statements', () => {
  const checks = [
    'get_ec2_metrics: The agent could not establish a supported UTC window from the available utilization history.',
    'get_ec2_metrics (partial; sample_count): Utilization coverage is incomplete for the requested period.',
    'get_ec2_operations (partial; jobs): Ask the workload owner to supply an authoritative job schedule, including timezones and exceptions, for this instance and proposed window.',
    'get_ec2_dependencies (partial; consumers): Ask service owners to verify upstream/downstream consumers and continuous-availability obligations for this instance.',
    'get_ec2_metrics: Insufficient history for a recurring schedule: at least seven days of utilization are required by policy.',
  ];
  const actions = nextHumanActions(checks);
  assert.equal(actions.length, 3);
  assert.match(
    actions[0],
    /^Select a period with at least seven complete days/,
  );
  assert.match(actions[1], /^Ask the workload owner/);
  assert.match(actions[2], /^Ask service owners/);
  assert.ok(actions.every((action) => !/get_ec2_|partial/.test(action)));
  assert.equal(checks.length, 5, 'diagnostic evidence stays intact');
});

test('expected native AWS coverage limits stay diagnostic, not operator tasks', () => {
  const checks = [
    'get_ec2_operations (partial; JOBS_OUTSIDE_SSM_UNKNOWN, OWNER_CALENDAR_RECOVERY_CLEARANCE_REQUIRED): Ask the workload owner to supply an authoritative job schedule, including timezones and exceptions, for this instance and proposed window.',
    'get_ec2_dependencies (partial; DEPENDENCIES_OUTSIDE_ELBV2_UNKNOWN, OWNER_CALENDAR_RECOVERY_CLEARANCE_REQUIRED): Ask service owners to verify upstream/downstream consumers and continuous-availability obligations for this instance.',
  ];
  assert.deepEqual(nextHumanActions(checks), []);
  assert.equal(
    nextHumanActions([
      ...checks,
      'get_ec2_operations (partial; JOBS_OUTSIDE_SSM_UNKNOWN, OWNER_CALENDAR_RECOVERY_CLEARANCE_REQUIRED, TRUNCATED): Review truncated evidence.',
    ])[0],
    'Review truncated evidence.',
  );
});

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

test('partial CPU observations describe measured activity without implying complete history or safety', async () => {
  for (const peak of [5, 60]) {
    const base = new MockProvider('A');
    const report = await runInvestigation(request, {
      planner: new ScriptedPlanner(),
      history: {},
      provider: {
        mode: 'mock',
        async call(action, signal) {
          const observation = (await base.call(action, signal)) as Observation;
          if (
            action.tool === 'get_ec2_metrics' &&
            observation.data &&
            'peak_cpu_percent' in observation.data
          ) {
            observation.status = 'partial';
            observation.coverage.complete = false;
            observation.missing_fields = ['INCOMPLETE_COVERAGE:cpu_max'];
            observation.data.peak_cpu_percent = peak;
          }
          return observation;
        },
      },
    });
    const candidate = report.candidates[0];
    assert.equal(candidate.verdict, 'needs_verification');
    assert.equal(candidate.estimated_monthly_savings, null);
    assert.match(candidate.explanation, /incomplete coverage/);
    assert.match(
      candidate.explanation,
      /does not prove absence of jobs or dependencies/,
    );
    assert.match(candidate.explanation, /Decision deferred/);
    const metrics = report.evidence.find((e) => e.tool === 'get_ec2_metrics');
    assert.ok(metrics);
    assert.ok(candidate.supporting_evidence_ids.includes(metrics.evidence_id));
    assert.ok(
      !candidate.next_human_actions.some((action) =>
        action.includes('Retrieve complete CPU'),
      ),
    );
    validateReport(report);
  }
});
