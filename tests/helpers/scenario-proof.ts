import assert from 'node:assert/strict';
import { appendFileSync } from 'node:fs';
import type { TestContext } from 'node:test';
import type { InvestigationReport } from '../../src/contracts.ts';
import { validateReport } from '../../src/investigation/report.ts';

// Fixed, complete UTC days keep offline evidence reproducible. These are not live telemetry.
export const SCENARIO_WINDOW = {
  from: '2026-09-15T00:00:00Z',
  to: '2026-09-29T00:00:00Z',
};
export const PRIOR_SCENARIO_WINDOW = {
  from: '2026-09-01T00:00:00Z',
  to: '2026-09-15T00:00:00Z',
};

/** Shared provenance checks and a compact, evidence-derived demo receipt. */
export function scenarioProof(
  t: TestContext,
  input: InvestigationReport,
  previous?: InvestigationReport,
) {
  const report = validateReport(input);
  const { from, to } = report.request.window;
  assert.equal(Date.parse(to) - Date.parse(from), 14 * 86400000);
  for (const date of [from, to]) assert.equal(Date.parse(date) % 86400000, 0);
  assert.equal(report.integration_mode, 'mock');
  assert.equal(report.planner.mode, 'scripted');
  assert.equal(report.candidates.length, 1);
  assert.ok(!report.trace.some((entry) => entry.failure_code));
  const candidate = report.candidates[0];
  const citations = [
    ...candidate.selection_evidence_ids,
    ...candidate.supporting_evidence_ids,
    ...candidate.contradicting_evidence_ids,
    ...candidate.hypotheses.flatMap((h) => h.evidence_ids),
  ];
  for (const id of citations) {
    const observation = report.evidence.find((e) => e.evidence_id === id);
    assert.ok(observation, `Unretrieved current citation: ${id}`);
    assert.equal(observation.integration_mode, 'mock');
    assert.deepEqual(observation.observed_window, report.request.window);
    assert.equal(observation.scope.account_id, report.request.account_id);
    assert.equal(observation.scope.region, report.request.region);
    assert.ok(
      !observation.scope.instance_id ||
        observation.scope.instance_id === candidate.instance_id,
    );
    assert.ok(!report.historical_context.context_ids.includes(id));
  }
  // Only the offline export subprocess sets this scratch-file path. Normal tests
  // have no export side effects; the parent publishes only after all tests pass.
  if (process.env.CCI_SCENARIO_EXPORT_FILE) {
    assert.match(t.name, /^EC2 [1-6]:/);
    appendFileSync(
      process.env.CCI_SCENARIO_EXPORT_FILE,
      `${JSON.stringify({
        scenario_number: Number(t.name.match(/^EC2 ([1-6]):/)?.[1]),
        source_test: t.name,
        report,
        previous_report: previous ? validateReport(previous) : null,
      })}\n`,
      'utf8',
    );
  }
  const citedTools = (ids: string[]) =>
    ids.map((id) => report.evidence.find((e) => e.evidence_id === id)?.tool);
  t.diagnostic(
    [
      'SYNTHETIC current evidence | scripted planner | no live AWS/model calls',
      `14 complete UTC days: ${from} -> ${to}`,
      `Result: ${candidate.verdict} (${report.completion_status})`,
      `Hypothesis: ${candidate.hypotheses.map((h) => h.state).join(' -> ') || 'not established'}`,
      `Fresh sources: ${report.evidence.map((e) => `${e.tool}=${e.status}`).join(', ')}`,
      `Hypothesis/support citations: ${citedTools(candidate.supporting_evidence_ids).join(', ') || 'none'}`,
      `Conflict citations: ${citedTools(candidate.contradicting_evidence_ids).join(', ') || 'none'}`,
      ...report.evidence.flatMap((o) => {
        if (o.data && 'peak_cpu_percent' in o.data)
          return [
            `CPU: average ${o.data.average_cpu_percent}%, peak ${o.data.peak_cpu_percent}%; evidence ${o.evidence_id}`,
          ];
        if (o.data && 'jobs' in o.data)
          return [
            `Jobs: ${o.data.jobs.map((job) => `${job.job_id} critical=${job.critical} ${job.window.start_hour_utc}:00-${job.window.end_hour_utc}:00 UTC`).join(', ') || 'no matches'}; positive clearance=${!!o.data.scheduling_clearance}; evidence ${o.evidence_id}`,
          ];
        if (o.data && 'requires_continuous_operation' in o.data)
          return [
            `Continuous operation: ${o.data.requires_continuous_operation}; positive clearance=${!!o.data.scheduling_clearance}; evidence ${o.evidence_id}`,
          ];
        return [];
      }),
      `Missing checks: ${candidate.missing_checks.join('; ') || 'none; human approval still required'}`,
      ...(report.historical_context.comparisons ?? []).map(
        (prior) =>
          `Historical only (Zetaris HTTP fixture): ${prior.verdict} -> current ${candidate.verdict}; prior window ${JSON.stringify(prior.proposed_window)}`,
      ),
      `Savings: ${candidate.estimated_monthly_savings ?? 'unknown'}${candidate.savings_calculation ? ` ${candidate.savings_calculation.currency} / estimate month (synthetic rate)` : ''}`,
    ].join('\n'),
  );
}
