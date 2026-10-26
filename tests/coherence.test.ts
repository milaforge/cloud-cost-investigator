import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import type { Observation } from '../src/contracts.ts';
import { MockProvider, type MockScenario } from '../src/investigation/mock.ts';
import { ScriptedPlanner } from '../src/investigation/planner.ts';
import { runInvestigation } from '../src/investigation/run.ts';
import { renderReport, validateReport } from '../src/investigation/report.ts';
import {
  prepareDecision,
  recordDecision,
  listFollowUps,
} from '../src/investigation/follow-up.ts';
import { mockZetarisLedger } from './helpers/zetaris-ledger.ts';
import { toolRetryClock } from './helpers/tool-retries.ts';

const request = {
  account_id: 'coherence-test',
  region: 'us-east-1',
  max_candidates: 1,
  window: { from: '2026-09-01T00:00:00Z', to: '2026-09-29T00:00:00Z' },
};
const run = (
  scenario: MockScenario,
  change?: (o: Observation) => void,
  onProgress?: Parameters<typeof runInvestigation>[1]['onProgress'],
) => {
  const base = new MockProvider(scenario);
  return runInvestigation(request, {
    planner: new ScriptedPlanner(),
    onProgress,
    provider: {
      mode: 'mock',
      async call(a, signal) {
        const o = (await base.call(a, signal)) as Observation;
        change?.(o);
        return o;
      },
    },
  });
};

test('new complete-clearance runs defer without inventing missing telemetry or savings; old reports stay valid', async () => {
  const report = await run('A');
  assert.equal(report.decision_policy, 'reject_or_defer');
  assert.equal(report.candidates[0].verdict, 'needs_verification');
  assert.equal(report.candidates[0].estimated_monthly_savings, null);
  assert.match(
    report.candidates[0].explanation,
    /Technical evidence is present/,
  );
  assert.match(
    renderReport(report, { verbose: false }),
    /Authorized human shutdown decision/,
  );
  report.candidates[0].verdict = 'conditional_recommendation';
  assert.throws(
    () => validateReport(report),
    /Unsupported conditional recommendation/,
  );
  const old = validateReport(
    JSON.parse(readFileSync('docs/evaluation/examples/A.json', 'utf8')),
  );
  assert.equal(old.candidates[0].verdict, 'conditional_recommendation');
});

test('rejection names the job and both windows even with daytime activity or absent spend', async () => {
  const report = await run('B', (o) => {
    if (o.data && 'peak_cpu_percent' in o.data) o.data.peak_cpu_percent = 95;
    if (o.data && 'costs' in o.data) o.data.costs = [];
  });
  assert.equal(report.candidates[0].verdict, 'not_recommended');
  assert.match(
    report.candidates[0].explanation,
    /mock-critical-daily-batch.*02:00–03:00.*00:00–06:00/,
  );
});

test('named dependency explains rejection; unnamed boolean remains an evidence gap', async () => {
  assert.match(
    (await run('C')).candidates[0].explanation,
    /shared-api-consumer.*continuous operation/,
  );
  const report = await run('C', (o) => {
    if (o.data && 'requires_continuous_operation' in o.data)
      delete o.data.continuous_operation_reason;
  });
  assert.equal(report.candidates[0].verdict, 'needs_verification');
  assert.match(
    report.candidates[0].missing_checks.join(' '),
    /Identify the dependency/,
  );
});

test('billing outage retries then preserves inventory-based conflict investigation', async (t) => {
  const report = await run(
    'B',
    (o) => {
      if (o.tool === 'get_ec2_billing') {
        o.status = 'unavailable';
        o.data = null;
        o.coverage = { complete: false, authoritative: false };
        o.missing_fields = ['BILLING_ACCESS_UNAVAILABLE'];
      }
    },
    toolRetryClock(t),
  );
  assert.equal(report.candidates[0].verdict, 'not_recommended');
  assert.equal(report.completion_status, 'partial');
  assert.ok(report.evidence.some((e) => e.tool === 'get_ec2_dependencies'));
});

test('rejections and evidence deferrals can schedule reviews, never acceptance', async (t) => {
  mockZetarisLedger(t);
  const report = await run('A');
  const decision = {
    kind: 'deferred',
    actor: 'engineer',
    reason: 'Obtain the external decision and revalidate evidence',
    review_at: new Date(Date.now() + 1000).toISOString(),
  };
  const saved = await recordDecision(report, 'i-mock-primary', decision);
  assert.equal(
    (
      await listFollowUps(
        { account_id: request.account_id, region: request.region },
        'i-mock-primary',
      )
    ).items[0].status,
    'deferred',
  );
  assert.ok(saved.decision.record.record_id);
  assert.throws(
    () =>
      prepareDecision(report, 'i-mock-primary', {
        kind: 'accepted',
        actor: 'engineer',
        reason: 'Not authorized',
      }),
    /completed_recommendation/,
  );
  const rejection = await run('B');
  assert.equal(
    prepareDecision(rejection, 'i-mock-primary', decision).event.kind,
    'deferred',
  );
});

test('absent billing does not invent a technical scheduling gap', async (t) => {
  const report = await run(
    'A',
    (o) => {
      if (o.tool === 'get_ec2_billing') {
        o.status = 'unavailable';
        o.data = null;
        o.coverage = { complete: false, authoritative: false };
        o.missing_fields = ['BILLING_ACCESS_UNAVAILABLE'];
      }
    },
    toolRetryClock(t),
  );
  assert.equal(report.candidates[0].verdict, 'needs_verification');
  assert.match(
    report.candidates[0].explanation,
    /Technical evidence is present/,
  );
  assert.equal(report.candidates[0].missing_checks.length, 1);
  assert.match(
    report.candidates[0].missing_checks[0],
    /Authorized human shutdown decision/,
  );
  assert.ok(
    report.discovery.gaps.some((gap) => gap.includes('get_ec2_billing')),
  );
});

test('invalid billing scope never falls back to inventory or downstream reads', async () => {
  const report = await run('B', (o) => {
    if (o.tool === 'get_ec2_billing') o.scope.account_id = 'wrong-account';
  });
  assert.equal(report.completion_status, 'failed');
  assert.equal(report.candidates.length, 0);
  assert.equal(report.stop_reason, 'required_tool_failed:get_ec2_billing');
  assert.equal(report.budget.discovery_attempts, 2);
  assert.equal(report.budget.candidate_attempts, 0);
});
