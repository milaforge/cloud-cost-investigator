import assert from 'node:assert/strict';
import test from 'node:test';
import {
  citationCounts,
  evaluate,
  evaluationMain,
  score,
  executionSummary,
  evaluationPassed,
} from '../scripts/evaluate.ts';
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
  assert.deepEqual(results.execution, {
    cases: 8,
    complete: 4,
    partial: 4,
    failed: 0,
    planner_failure_cases: 0,
    matching_dispositions_with_planner_failure: 0,
    failure_code_counts: {},
  });
  assert.equal(evaluationPassed(results), true); // Correct deferrals remain partial, not failures.
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
  const progress: string[] = [];
  t.mock.method(console, 'error', (message: string) => progress.push(message));
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
    // Progress must be visible while the provider call is still pending.
    assert.match(progress.at(-1) ?? '', /planner call 1 waiting/);
    return new Response('PRIVATE provider error', { status: 403 });
  });
  const result = await evaluate('model', { verbose: true, delay_ms: 0 });
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
  assert.ok(progress.some((line) => line.includes('[model_http_403]')));
  assert.ok(
    progress.some((line) => line.includes('case 8/8 unknown_commitments')),
  );
  assert.ok(progress.some((line) => line.includes('failed; verdict=none')));
  assert.ok(!progress.join('\n').match(/PRIVATE|test-key|model\.example/));
  assert.deepEqual(result.execution, {
    cases: 8,
    complete: 0,
    partial: 0,
    failed: 8,
    planner_failure_cases: 8,
    matching_dispositions_with_planner_failure: 0,
    failure_code_counts: { model_http_403: 8 },
  });
  assert.equal(evaluationPassed(result), false);
  assert.ok(
    result.rows.every(
      (r) => r.investigation.planner_failures[0]?.code === 'model_http_403',
    ),
  );
});

test('evaluation CLI keeps verbose progress on stderr and stdout as final JSON', async (t) => {
  const stdout: string[] = [];
  const stderr: string[] = [];
  t.mock.method(console, 'log', (message: string) => stdout.push(message));
  t.mock.method(console, 'error', (message: string) => stderr.push(message));
  for (const args of [
    [],
    ['--verbose', '--planner', 'scripted'],
    ['--planner', 'scripted', '--verbose'],
  ]) {
    stdout.length = 0;
    stderr.length = 0;
    assert.equal(await evaluationMain(args), 0);
    assert.equal(stdout.length, 1);
    assert.equal(JSON.parse(stdout[0]).investigation.disposition_correct, 8);
    const progress = stderr.join('\n');
    if (args.length) {
      assert.match(progress, /Starting 8 cases/);
      assert.match(progress, /case 1\/8 A: planner call 1 waiting/);
      assert.match(progress, /tool get_ec2_metrics ok/);
      assert.match(progress, /case 8\/8 unknown_commitments: complete/);
      assert.match(progress, /All cases finished; writing JSON/);
    } else assert.equal(progress, '');
  }
});

test('evaluation CLI rejects invalid verbose arguments without provider details', async (t) => {
  const stdout: string[] = [];
  const stderr: string[] = [];
  t.mock.method(console, 'log', (message: string) => stdout.push(message));
  t.mock.method(console, 'error', (message: string) => stderr.push(message));
  for (const args of [
    ['--verbose', '--verbose'],
    ['--verbose', '--unknown'],
    ['--case'],
    ['--case', 'does-not-exist'],
    ['--case', 'A', '--case', 'B'],
    ['--delay-ms', '-1'],
    ['--delay-ms', '60001'],
    ['--delay-ms', '1.5'],
  ]) {
    stderr.length = 0;
    assert.equal(await evaluationMain(args), 1);
    assert.deepEqual(stdout, []);
    assert.deepEqual(stderr, [
      'Evaluation failed; provider details suppressed.',
    ]);
  }
});

test('matching labels after planner failure cannot pass the evaluation gate', () => {
  const execution = executionSummary([
    {
      expected: 'needs_verification',
      investigation: {
        verdict: 'needs_verification',
        completion: 'partial',
        planner_failures: [{ step: 4, code: 'model_invalid_choice' }],
      },
    },
  ]);
  assert.equal(execution.matching_dispositions_with_planner_failure, 1);
  assert.equal(execution.partial, 1);
  assert.equal(
    evaluationPassed({
      investigation: {
        ...score([
          {
            expected: 'needs_verification',
            verdict: 'needs_verification',
            safety: 'unknown',
          },
        ]),
      },
      execution,
    }),
    false,
  );
});

test('single-case evaluation measures only the requested case and keeps honest denominators', async (t) => {
  const stdout: string[] = [];
  t.mock.method(console, 'log', (message: string) => stdout.push(message));
  assert.equal(
    await evaluationMain([
      '--case',
      'missing',
      '--planner',
      'scripted',
      '--delay-ms',
      '0',
    ]),
    0,
  );
  const result = JSON.parse(stdout[0]);
  assert.deepEqual(result.selected_cases, ['missing']);
  assert.equal(result.rows.length, 1);
  assert.equal(result.cpu_baseline.cases, 1);
  assert.equal(result.investigation.cases, 1);
  assert.equal(result.execution.partial, 1);
  assert.equal(result.planner_delay_ms, 0);
  assert.equal(result.planner_timeout_ms, 15_000);
  await assert.rejects(evaluate('scripted', { case: 'unknown' }));
  await assert.rejects(evaluate('scripted', { delay_ms: NaN }));
});
