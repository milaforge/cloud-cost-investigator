import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test, { type TestContext } from 'node:test';
import type { Observation } from '../src/contracts.ts';
import { MockProvider } from '../src/investigation/mock.ts';
import { OpenAICompatiblePlanner } from '../src/investigation/model.ts';
import { ScriptedPlanner } from '../src/investigation/planner.ts';
import { renderReport, validateReport } from '../src/investigation/report.ts';
import { runInvestigation } from '../src/investigation/run.ts';
import { historyRecordFromReport } from '../src/tools/zetaris-history.ts';
import {
  SCENARIO_WINDOW,
  PRIOR_SCENARIO_WINDOW,
  scenarioProof,
} from './helpers/scenario-proof.ts';

const request = {
  account_id: 'warm-demo',
  region: 'us-east-1',
  max_candidates: 1 as const,
  window: SCENARIO_WINDOW,
};
async function directory(t: TestContext) {
  const dir = await mkdtemp(join(tmpdir(), 'cci-warm-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  return dir;
}
const checks = (report: Awaited<ReturnType<typeof runInvestigation>>) =>
  report.evidence
    .map((e) => e.tool)
    .filter(
      (tool) =>
        tool === 'get_ec2_operations' || tool === 'get_ec2_dependencies',
    );
const run = (
  dir?: string,
  zetaris = false,
  scenario: 'A' | 'B' | 'C' | 'clear' | 'missing' = 'B',
  input = request,
) =>
  runInvestigation(input, {
    planner: new ScriptedPlanner(),
    provider: new MockProvider(scenario),
    history: { hmem_directory: dir, zetaris },
  });

async function zetaris(t: TestContext) {
  const values = {
    ZETARIS_BASE_URL: 'https://zetaris.example',
    ZETARIS_AUTH_MODE: 'token',
    ZETARIS_API_KEY: 'test-key',
    ZETARIS_ORG_ID: 'test-org',
    ZETARIS_HISTORY_TABLE: 'CCI_HISTORY.investigations.records',
    ZETARIS_HISTORY_ALLOW_APPEND: 'true',
    NODE_TLS_REJECT_UNAUTHORIZED: '1',
  };
  const previous = Object.keys(values).map((key) => process.env[key]);
  Object.assign(process.env, values);
  t.after(() =>
    Object.keys(values).forEach((key, i) => {
      if (previous[i] === undefined) delete process.env[key];
      else process.env[key] = previous[i];
    }),
  );
  const seed = historyRecordFromReport(await run());
  const columns = Object.keys(seed);
  const rows: unknown[][] = [];
  t.mock.method(
    globalThis,
    'fetch',
    async (_url: unknown, options?: RequestInit) => {
      const sql = JSON.parse(String(options?.body)).sql as string;
      if (sql.startsWith('DESCRIBE'))
        return Response.json({
          headers: ['col_name', 'data_type'],
          data: columns.map((c) => [
            c,
            c === 'schema_version' ? 'int' : 'string',
          ]),
          total: columns.length,
        });
      if (sql.startsWith('INSERT INTO')) {
        const strings = [
          ...sql.matchAll(/decode\(unhex\('([0-9a-f]*)'\), 'UTF-8'\)/g),
        ].map((m) => Buffer.from(m[1], 'hex').toString('utf8'));
        rows.push([strings[0], 1, ...strings.slice(1)]);
        return Response.json({ headers: [], data: [], total: 0 });
      }
      assert.ok(sql.startsWith('SELECT'));
      const record = sql.match(/AND record_id = decode\(unhex\('([0-9a-f]*)'/);
      const selected = record
        ? rows.filter(
            (r) => r[0] === Buffer.from(record[1], 'hex').toString('utf8'),
          )
        : rows;
      return Response.json({
        headers: columns,
        data: selected,
        total: selected.length,
      });
    },
  );
  return rows;
}

test('D: learned conflict takes priority over unqueried checks and keeps current citations separate', async (t) => {
  const dir = await directory(t);
  const rows = await zetaris(t);
  const cold = await run(dir, true);
  assert.deepEqual(cold.historical_context.context_ids, []);
  assert.deepEqual(checks(cold), [
    'get_ec2_operations',
    'get_ec2_dependencies',
  ]);
  assert.equal(rows.length, 1);
  const warm = await run(dir, true);
  assert.equal(warm.historical_context.zetaris, 'ok');
  assert.equal(warm.historical_context.hmem, 'ok');
  assert.ok(
    warm.historical_context.context_ids.some((id) => id.startsWith('hmem:')),
  );
  assert.ok(
    warm.historical_context.context_ids.some((id) => id.startsWith('zetaris:')),
  );
  assert.deepEqual(checks(warm), [
    'get_ec2_operations',
    'get_ec2_dependencies',
  ]);
  assert.equal(warm.candidates[0].verdict, 'not_recommended');
  assert.equal(rows.length, 2);
  assert.ok(
    warm.evidence.every(
      (e) => !cold.evidence.some((old) => old.evidence_id === e.evidence_id),
    ),
  );
  const forged = structuredClone(warm);
  forged.candidates[0].contradicting_evidence_ids = [
    warm.historical_context.context_ids[0],
  ];
  assert.throws(() => validateReport(forged), /current citation/);
});

test('stale rejection cannot survive fresh cleared jobs or missing operational evidence', async (t) => {
  const dir = await directory(t);
  await run(dir);
  const clear = await run(dir, false, 'clear');
  assert.deepEqual(checks(clear), [
    'get_ec2_operations',
    'get_ec2_dependencies',
  ]);
  assert.equal(clear.candidates[0].verdict, 'needs_verification');
  assert.deepEqual(clear.candidates[0].contradicting_evidence_ids, []);
  const missing = await run(dir, false, 'missing');
  assert.equal(missing.candidates[0].verdict, 'needs_verification');
});

test('history services fail independently and disclose no provider errors', async (t) => {
  const dir = await directory(t);
  await run(dir);
  await zetaris(t);
  t.mock.method(globalThis, 'fetch', async () => {
    throw new Error('PRIVATE provider secret');
  });
  const memoryOnly = await run(dir, true);
  assert.equal(memoryOnly.historical_context.zetaris, 'unavailable');
  assert.equal(memoryOnly.historical_context.hmem, 'ok');
  assert.deepEqual(checks(memoryOnly), [
    'get_ec2_operations',
    'get_ec2_dependencies',
  ]);
  const blocked = `${dir}/blocked`;
  await writeFile(blocked, 'file');
  const neither = await run(blocked, true);
  assert.equal(neither.historical_context.hmem, 'unavailable');
  assert.deepEqual(neither.historical_context.comparisons, []);
  assert.equal(neither.candidates[0].verdict, 'not_recommended');
  assert.ok(!JSON.stringify(neither).includes('PRIVATE'));
});

test('Zetaris audit history does not dictate query order when H-MEM is unavailable', async (t) => {
  const dir = await directory(t);
  await zetaris(t);
  await run(undefined, true);
  const blocked = `${dir}/blocked`;
  await writeFile(blocked, 'file');
  const warm = await run(blocked, true);
  assert.equal(warm.historical_context.hmem, 'unavailable');
  assert.equal(warm.historical_context.zetaris, 'ok');
  assert.deepEqual(checks(warm), [
    'get_ec2_operations',
    'get_ec2_dependencies',
  ]);
  assert.ok(
    warm.historical_context.context_ids.some((id) => id.startsWith('zetaris:')),
  );
});

test('future historical records cannot influence current query order; disabled appends do not write', async (t) => {
  const rows = await zetaris(t);
  await run(undefined, true);
  const columns = Object.keys(historyRecordFromReport(await run()));
  rows[0][columns.indexOf('recorded_at_utc')] = new Date(
    Date.now() + 86400000,
  ).toISOString();
  process.env.ZETARIS_HISTORY_ALLOW_APPEND = 'false';
  const report = await run(undefined, true);
  assert.deepEqual(report.historical_context.context_ids, []);
  assert.deepEqual(checks(report), [
    'get_ec2_operations',
    'get_ec2_dependencies',
  ]);
  assert.equal(rows.length, 1);
  assert.ok(
    report.historical_context.limitations.includes(
      'Zetaris append disabled; no historical record written.',
    ),
  );
});

test('model adapter receives bounded historical hints and binds fresh prioritized queries', async (t) => {
  const dir = await directory(t);
  const cold = await run(dir);
  const previous = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '1';
  t.after(() => {
    if (previous === undefined) delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    else process.env.NODE_TLS_REJECT_UNAUTHORIZED = previous;
  });
  let sawHints = false;
  t.mock.method(
    globalThis,
    'fetch',
    async (_url: unknown, options?: RequestInit) => {
      const body = JSON.parse(String(options?.body));
      const context = JSON.parse(
        body.messages[1].content.split('\n').slice(1).join('\n'),
      );
      const hints = context.historical_hints;
      if (hints.length) {
        sawHints = true;
        assert.deepEqual(Object.keys(hints[0]).sort(), [
          'context_id',
          'lesson',
          'priority',
          'recorded_at',
          'source_mode',
        ]);
        assert.ok(
          cold.evidence.every(
            (e) => !JSON.stringify(hints).includes(e.evidence_id),
          ),
        );
      }
      const priority = hints[0]?.priority;
      const action = context.available_actions.includes(priority)
        ? priority
        : context.available_actions[0];
      return Response.json({
        choices: [
          {
            finish_reason: 'stop',
            message: {
              content: JSON.stringify({
                action,
                reason: 'Select the next fresh check.',
              }),
            },
          },
        ],
      });
    },
  );
  const report = await runInvestigation(request, {
    provider: new MockProvider(),
    planner: new OpenAICompatiblePlanner({
      baseUrl: 'https://model.example/v1',
      model: 'test-model',
    }),
    history: { hmem_directory: dir },
  });
  assert.ok(sawHints);
  assert.deepEqual(checks(report), [
    'get_ec2_operations',
    'get_ec2_dependencies',
  ]);
  assert.equal(report.candidates[0].verdict, 'not_recommended');
});

for (const [prior, current, previousVerdict, currentVerdict, name] of [
  [
    'A',
    'B',
    'conditional_recommendation',
    'not_recommended',
    'Zetaris A -> B: fresh batch overrides prior approval',
  ],
  [
    'B',
    'A',
    'not_recommended',
    'conditional_recommendation',
    'EC2 6: resolved batch and fresh clearances overturn a Zetaris rejection',
  ],
  [
    'A',
    'C',
    'conditional_recommendation',
    'not_recommended',
    'EC2 5: fresh continuous-operation dependency overturns a Zetaris recommendation',
  ],
  [
    'C',
    'A',
    'not_recommended',
    'conditional_recommendation',
    'Zetaris C -> A: resolved dependency and fresh clearances overturn rejection',
  ],
] as const) {
  test(name, async (t) => {
    const rows = await zetaris(t);
    const previous = await run(undefined, true, prior, {
      ...request,
      window: PRIOR_SCENARIO_WINDOW,
    });
    assert.equal(previous.candidates[0].verdict, previousVerdict);
    assert.equal(rows.length, 1);
    const report = validateReport(await run(undefined, true, current));
    const record = historyRecordFromReport(previous);
    assert.equal(rows.length, 2); // Both append operations completed the existing exact readback.
    assert.deepEqual(
      rows.map((row) => row[Object.keys(record).indexOf('verdict')]),
      [previousVerdict, currentVerdict],
    );
    assert.equal(report.historical_context.zetaris, 'ok');
    assert.equal(report.historical_context.hmem, 'not_configured');
    assert.deepEqual(report.request.window, SCENARIO_WINDOW);
    assert.deepEqual(previous.request.window, PRIOR_SCENARIO_WINDOW);
    assert.deepEqual(report.historical_context.comparisons, [
      {
        historical: true,
        context_id: `zetaris:${record.record_id}`,
        record_id: record.record_id,
        investigation_id: previous.investigation_id,
        recorded_at: rows[0][Object.keys(record).indexOf('recorded_at_utc')],
        scope: { account_id: request.account_id, region: request.region },
        instance_id: 'i-mock-primary',
        source_mode: 'mock',
        verdict: previousVerdict,
        proposed_window: previous.candidates[0].proposed_window,
        rejected_windows: JSON.parse(record.summary_json).rejected_windows,
      },
    ]);
    assert.equal(report.candidates[0].verdict, currentVerdict);
    assert.match(
      renderReport(report),
      /Historical comparison .*previous verdict=/,
    );
    assert.deepEqual(checks(report), [
      'get_ec2_operations',
      'get_ec2_dependencies',
    ]);
    const candidate = report.candidates[0];
    const dependency = report.evidence.find(
      (e) => e.tool === 'get_ec2_dependencies',
    );
    if (current === 'C') {
      assert.ok(
        dependency?.data && 'requires_continuous_operation' in dependency.data,
      );
      assert.equal(dependency.data.requires_continuous_operation, true);
      assert.deepEqual(candidate.contradicting_evidence_ids, [
        dependency.evidence_id,
      ]);
      assert.deepEqual(
        candidate.hypotheses.map((h) => h.state),
        ['proposed', 'contradicted'],
      );
      assert.deepEqual(candidate.missing_checks, [
        'Other shutdown windows have not been evaluated.',
      ]);
      assert.equal(candidate.estimated_monthly_savings, null);
    }
    if (current === 'A') {
      const operations = report.evidence.find(
        (e) => e.tool === 'get_ec2_operations',
      );
      assert.ok(operations?.data && 'jobs' in operations.data);
      assert.ok(
        dependency?.data && 'requires_continuous_operation' in dependency.data,
      );
      assert.deepEqual(operations.data.jobs, []);
      assert.equal(dependency.data.requires_continuous_operation, false);
      assert.ok(operations.data.scheduling_clearance);
      assert.deepEqual(
        operations.data.scheduling_clearance,
        dependency.data.scheduling_clearance,
      );
      assert.deepEqual(candidate.missing_checks, []);
      assert.deepEqual(candidate.contradicting_evidence_ids, []);
      assert.deepEqual(
        candidate.hypotheses.map((h) => h.state),
        ['proposed', 'supported'],
      );
      assert.ok(
        candidate.supporting_evidence_ids.includes(operations.evidence_id),
      );
      assert.ok(
        candidate.supporting_evidence_ids.includes(dependency.evidence_id),
      );
      assert.match(candidate.next_human_actions.join(' '), /human approval/);
    }
    assert.ok(
      report.evidence.every(
        (e) =>
          !previous.evidence.some((old) => old.evidence_id === e.evidence_id),
      ),
    );
    const legacy = structuredClone(report);
    delete legacy.historical_context.comparisons;
    assert.doesNotThrow(() => validateReport(legacy));
    for (const change of [
      { historical: false },
      { record_id: 'unretrieved' },
      { instance_id: 'other-instance' },
      { scope: { account_id: 'other-account', region: request.region } },
      { scope: { account_id: request.account_id, region: 'us-west-2' } },
      { source_mode: 'live' },
      {
        recorded_at: new Date(
          Date.parse(report.started_at) + 86400000,
        ).toISOString(),
      },
      { proposed_window: { start_hour_utc: 6, end_hour_utc: 2 } },
      { rejected_windows: [{ start_hour_utc: -1, end_hour_utc: 2 }] },
      { verdict: 'approved' },
    ]) {
      const forged = structuredClone(report);
      const comparison = forged.historical_context.comparisons?.[0];
      assert.ok(comparison);
      Object.assign(comparison, change);
      assert.throws(() => validateReport(forged));
    }
    const duplicate = structuredClone(report);
    const comparisons = duplicate.historical_context.comparisons;
    assert.ok(comparisons);
    comparisons.push(comparisons[0]);
    assert.throws(
      () => validateReport(duplicate),
      /Duplicate historical comparison/,
    );
    const uncited = structuredClone(report);
    uncited.historical_context.context_ids = [];
    assert.throws(
      () => validateReport(uncited),
      /Unretrieved historical comparison/,
    );
    const forgedCitation = structuredClone(report);
    forgedCitation.candidates[0].supporting_evidence_ids.push(
      `zetaris:${record.record_id}`,
    );
    assert.throws(() => validateReport(forgedCitation), /current citation/);
    if (name.startsWith('EC2')) scenarioProof(t, report, previous);
  });
}

for (const prior of ['A', 'B'] as const) {
  test(`Zetaris ${prior} history cannot replace unavailable fresh dependency clearance`, async (t) => {
    await zetaris(t);
    const previous = await run(undefined, true, prior, {
      ...request,
      window: PRIOR_SCENARIO_WINDOW,
    });
    const base = new MockProvider('A');
    const report = await runInvestigation(request, {
      planner: new ScriptedPlanner(),
      history: { zetaris: true },
      provider: {
        mode: 'mock',
        async call(action, signal) {
          const o = (await base.call(action, signal)) as Observation;
          if (action.tool === 'get_ec2_dependencies') {
            o.status = 'unavailable';
            o.data = null;
            o.coverage = { complete: false, authoritative: false };
            o.missing_fields = ['dependency_source_unavailable'];
          }
          return o;
        },
      },
    });
    assert.equal(
      report.historical_context.comparisons?.[0].verdict,
      previous.candidates[0].verdict,
    );
    assert.equal(report.candidates[0].verdict, 'needs_verification');
    assert.equal(report.completion_status, 'partial');
    assert.equal(report.candidates[0].estimated_monthly_savings, null);
    assert.deepEqual(report.candidates[0].contradicting_evidence_ids, []);
    assert.ok(
      report.candidates[0].missing_checks.some((s) =>
        s.includes('get_ec2_dependencies'),
      ),
    );
    assert.ok(
      report.evidence.every(
        (e) =>
          !previous.evidence.some((old) => old.evidence_id === e.evidence_id),
      ),
    );
  });
}

test('future and mismatched-mode Zetaris records never become comparison context', async (t) => {
  const rows = await zetaris(t);
  await run(undefined, true);
  process.env.ZETARIS_HISTORY_ALLOW_APPEND = 'false';
  const columns = Object.keys(historyRecordFromReport(await run()));
  const recordedIndex = columns.indexOf('recorded_at_utc');
  const original = rows[0][recordedIndex];
  rows[0][recordedIndex] = new Date(Date.now() + 86400000).toISOString();
  assert.deepEqual(
    (await run(undefined, true)).historical_context.comparisons,
    [],
  );
  rows[0][recordedIndex] = original;
  rows[0][columns.indexOf('source_mode')] = 'live';
  assert.deepEqual(
    (await run(undefined, true)).historical_context.comparisons,
    [],
  );
});
