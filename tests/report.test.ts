import assert from 'node:assert/strict';
import test from 'node:test';
import { main, parseArgs } from '../cli.ts';
import { validateReport } from '../src/investigation/report.ts';

// Exercise the real entry point without subprocesses (restricted environments can deny spawning).
async function cli(...args: string[]) {
  let stdout = '';
  let stderr = '';
  const originalOut = process.stdout.write;
  const originalErr = process.stderr.write;
  const originalKey = process.env.NVIDIA_API_KEY;
  process.stdout.write = ((chunk: string | Uint8Array) => {
    stdout += chunk.toString();
    return true;
  }) as typeof process.stdout.write;
  process.stderr.write = ((chunk: string | Uint8Array) => {
    stderr += chunk.toString();
    return true;
  }) as typeof process.stderr.write;
  process.env.NVIDIA_API_KEY = '';
  try {
    return { status: await main(args), stdout, stderr };
  } finally {
    process.stdout.write = originalOut;
    process.stderr.write = originalErr;
    if (originalKey === undefined) delete process.env.NVIDIA_API_KEY;
    else process.env.NVIDIA_API_KEY = originalKey;
  }
}
const args = ['investigate', '--account', 'demo', '--region', 'us-east-1'];

test('CLI discovers a candidate and emits validated mock/scripted JSON only', async () => {
  const result = await cli(...args, '--json');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  const report = validateReport(JSON.parse(result.stdout));
  assert.equal(report.integration_mode, 'mock');
  assert.deepEqual(report.planner, { mode: 'scripted', model: null });
  assert.equal(report.candidates[0].verdict, 'not_recommended');
  assert.deepEqual(
    report.candidates[0].hypotheses.map((h) => h.state),
    ['proposed', 'contradicted'],
  );
  assert.equal(report.candidates[0].estimated_monthly_savings, null);
  assert.equal(report.historical_context.zetaris, 'not_configured');
});

test('readable report explains rejection, provenance, trace, uncertainty and history modes', async () => {
  const result = await cli(...args);
  assert.equal(result.status, 0, result.stderr);
  for (const text of [
    'MOCK',
    'scripted',
    'Rejected shutdown window:',
    'Observed:',
    'collected=',
    'authoritative=',
    'units=',
    'Validated action:',
    'Estimated monthly savings: null',
    'Zetaris not configured',
    'H-MEM not configured',
    'Missing check:',
  ]) {
    assert.ok(result.stdout.includes(text), text);
  }
});

test('missing evidence produces partial report and status 2', async () => {
  const result = await cli(...args, '--scenario', 'missing', '--json');
  assert.equal(result.status, 2, result.stderr);
  const report = validateReport(JSON.parse(result.stdout));
  assert.equal(report.completion_status, 'partial');
  assert.equal(report.candidates[0].verdict, 'needs_verification');
  assert.ok(report.evidence.some((e) => e.status === 'unavailable'));
});

test('CLI rejects unknown, duplicate, missing, and out-of-range arguments', async () => {
  for (const extra of [
    ['--unknown'],
    ['--account', 'other'],
    ['--json', '--json'],
    ['--region'],
    ['--lookback-days', '0'],
    ['--lookback-days', '91'],
    ['--lookback-days', '1.5'],
    ['--max-candidates', '3'],
    ['--planner', 'other'],
  ]) {
    const result = await cli(...args, ...extra);
    assert.equal(result.status, 1);
    assert.equal(result.stdout, '');
    assert.match(result.stderr, /^Invalid invocation\./);
  }
});

test('lookback uses a UTC interval without a prior investigation', async () => {
  const parsed = parseArgs(args, Date.parse('2026-10-23T12:00:00Z'));
  assert.notEqual(parsed, 'help');
  if (parsed === 'help') return;
  assert.deepEqual(parsed.request.window, {
    from: '2026-09-25T12:00:00.000Z',
    to: '2026-10-23T12:00:00.000Z',
  });
});


test('report rejects forged citations, historical IDs, scope/window mismatches, invalid transitions and false contradictions', async () => {
  const result = await cli(...args, '--json');
  assert.equal(result.status, 0, result.stderr);
  const report = validateReport(JSON.parse(result.stdout));
  const mutations: ((r: typeof report) => void)[] = [
    (r) => {
      r.candidates[0].supporting_evidence_ids.push('never-retrieved');
    },
    (r) => {
      r.historical_context.context_ids.push(r.evidence[0].evidence_id);
    },
    (r) => {
      r.evidence[0].scope.account_id = 'other';
    },
    (r) => {
      r.evidence[0].observed_window.from = '2026-01-01T00:00:00Z';
    },
    (r) => {
      r.evidence[1].evidence_id = r.evidence[0].evidence_id;
    },
    (r) => {
      r.candidates[0].hypotheses.reverse();
    },
    (r) => {
      r.candidates[0].proposed_window = {
        start_hour_utc: 12,
        end_hour_utc: 15,
      };
    },
    (r) => {
      const e = r.evidence.find((e) => e.tool === 'get_ec2_operations');
      assert.ok(e);
      e.data = { jobs: [] };
    },
    (r) => {
      const e = r.evidence.find((e) => e.tool === 'get_ec2_metrics');
      assert.ok(e);
      if (e.data && 'peak_cpu_percent' in e.data) e.data.peak_cpu_percent = 99;
    },
    (r) => {
      r.trace = r.trace.filter((t) => t.phase !== 'tool');
    },
    (r) => {
      r.candidates[0].estimated_monthly_savings = 123 as never;
    },
    (r) => {
      r.budget.discovery_attempts = 1;
    },
    (r) => {
      r.budget.candidate_attempts = 7;
    },
    (r) => {
      r.budget.planner_calls = 10;
    },
  ];
  for (const mutate of mutations) {
    const changed = structuredClone(report);
    mutate(changed);
    assert.throws(() => validateReport(changed));
  }
});
