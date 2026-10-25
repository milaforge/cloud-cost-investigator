import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { reliabilityChecks } from '../scripts/probe-model-reliability.ts';
import { validateReport } from '../src/investigation/report.ts';

// These are local gate-assessment tests, not evidence of real inference.
function fixture(scenario: 'A' | 'B' | 'C', live = true) {
  const report = validateReport(
    JSON.parse(
      readFileSync(
        new URL(
          `../docs/evaluation/examples/${scenario}.json`,
          import.meta.url,
        ),
        'utf8',
      ),
    ),
  );
  if (live) report.planner = { mode: 'live', model: 'test-model' };
  return report;
}

test('reliability gate accepts complete, cited A/B/C reports with live metadata', () => {
  for (const scenario of ['A', 'B', 'C'] as const)
    assert.ok(
      Object.values(reliabilityChecks(fixture(scenario), scenario, 0)).every(
        Boolean,
      ),
    );
});

test('reliability gate rejects scripted fallback and a nonzero CLI exit', () => {
  assert.equal(
    reliabilityChecks(fixture('B', false), 'B', 0).real_model,
    false,
  );
  assert.equal(reliabilityChecks(fixture('B'), 'B', 2).cli_completed, false);
});

test('a matching rejection does not pass with the wrong contradiction source', () => {
  const checks = reliabilityChecks(fixture('C'), 'B', 0);
  assert.equal(checks.expected_verdict, true);
  assert.equal(checks.evidence_driven_revision, false);
});

test('reliability gate rejects a fabricated citation before counting a pass', () => {
  const report = fixture('B');
  report.candidates[0].contradicting_evidence_ids = ['not-retrieved'];
  assert.throws(() => reliabilityChecks(report, 'B', 0));
});
