import assert from 'node:assert/strict';
import test from 'node:test';
import { citationCounts, evaluate, score } from '../scripts/evaluate.ts';
import { MockProvider } from '../src/investigation/mock.ts';
import { ScriptedPlanner } from '../src/investigation/planner.ts';
import { runInvestigation } from '../src/investigation/run.ts';

test('evaluation preserves all denominators and exposes heuristic unsafe and unknown positives', async () => {
  const results = await evaluate('scripted');
  assert.deepEqual(results.cpu_baseline, {
    disposition_correct: 2,
    cases: 8,
    unsafe_positives: 3,
    unsafe_cases: 3,
    unverified_positives: 3,
    unknown_cases: 3,
  });
  assert.deepEqual(results.investigation, {
    disposition_correct: 8,
    cases: 8,
    unsafe_positives: 0,
    unsafe_cases: 3,
    unverified_positives: 0,
    unknown_cases: 3,
  });
  assert.ok(
    results.rows.every(
      (r) =>
        r.investigation.citations.total > 0 &&
        r.investigation.citations.valid === r.investigation.citations.total,
    ),
  );
  assert.equal(
    results.rows.find((r) => r.case === 'unknown_commitments')?.investigation
      .savings,
    null,
  );
  assert.ok(results.rows.every((r) => r.cpu_baseline.tool_attempts === 3));
  assert.equal(results.model_cost, null);
});

test('missing predictions remain incorrect; forged citations fail measurement', async () => {
  assert.equal(
    score([{ expected: 'not_recommended', verdict: null, safety: 'unsafe' }])
      .disposition_correct,
    0,
  );
  const report = await runInvestigation(
    {
      account_id: 'eval-test',
      region: 'us-east-1',
      max_candidates: 1,
      window: { from: '2026-09-01T00:00:00Z', to: '2026-09-29T00:00:00Z' },
    },
    { provider: new MockProvider(), planner: new ScriptedPlanner() },
  );
  report.candidates[0].contradicting_evidence_ids = ['unretrieved'];
  assert.throws(() => citationCounts(report));
});

test('real-model failure remains in every denominator without scripted fallback or history access', async (t) => {
  const configuration = {
    LLM_BASE_URL: 'https://model.example/v1',
    LLM_MODEL: 'evaluation-test',
    LLM_API_KEY: 'test-key',
    LLM_RESPONSE_FORMAT: 'text',
    LLM_EXTRA_BODY: '{}',
    NODE_TLS_REJECT_UNAUTHORIZED: '1',
    ZETARIS_HISTORY_TABLE: 'CCI_HISTORY.investigations.records',
    ZETARIS_HISTORY_ALLOW_APPEND: 'true',
  };
  const previous = Object.keys(configuration).map((key) => process.env[key]);
  Object.assign(process.env, configuration);
  t.after(() =>
    Object.keys(configuration).forEach((key, i) => {
      if (previous[i] === undefined) delete process.env[key];
      else process.env[key] = previous[i];
    }),
  );
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async (url: unknown) => {
    assert.equal(url, 'https://model.example/v1/chat/completions');
    calls++;
    return new Response('PRIVATE provider error', { status: 403 });
  });
  const result = await evaluate('model');
  assert.equal(calls, 8);
  assert.equal(result.investigation.cases, 8);
  assert.equal(result.investigation.disposition_correct, 0);
  assert.ok(
    result.rows.every(
      (r) =>
        r.investigation.verdict === null &&
        r.investigation.planner.mode === 'live' &&
        r.investigation.tool_attempts === 0,
    ),
  );
  assert.ok(!JSON.stringify(result).includes('PRIVATE'));
});
