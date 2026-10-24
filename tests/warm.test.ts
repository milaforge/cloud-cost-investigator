import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import test, { type TestContext } from 'node:test';
import { MockProvider } from '../src/investigation/mock.ts';
import { OpenAICompatiblePlanner } from '../src/investigation/model.ts';
import { ScriptedPlanner } from '../src/investigation/planner.ts';
import { validateReport } from '../src/investigation/report.ts';
import { runInvestigation } from '../src/investigation/run.ts';
import { historyRecordFromReport } from '../src/tools/zetaris-history.ts';

const request = {
  account_id: 'warm-demo',
  region: 'us-east-1',
  max_candidates: 1 as const,
  window: { from: '2026-09-01T00:00:00Z', to: '2026-09-29T00:00:00Z' },
};
async function directory(t: TestContext) {
  const dir = await mkdtemp('/tmp/cci-warm-');
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
) =>
  runInvestigation(request, {
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
  assert.deepEqual(checks(cold), ['get_ec2_operations']);
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
  assert.deepEqual(checks(warm), ['get_ec2_operations']);
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
  assert.deepEqual(checks(memoryOnly), ['get_ec2_operations']);
  const blocked = `${dir}/blocked`;
  await writeFile(blocked, 'file');
  const neither = await run(blocked, true);
  assert.equal(neither.historical_context.hmem, 'unavailable');
  assert.equal(neither.candidates[0].verdict, 'not_recommended');
  assert.ok(!JSON.stringify(neither).includes('PRIVATE'));
});

test('Zetaris alone can prioritize fresh checks when H-MEM is unavailable', async (t) => {
  const dir = await directory(t);
  await zetaris(t);
  await run(undefined, true);
  const blocked = `${dir}/blocked`;
  await writeFile(blocked, 'file');
  const warm = await run(blocked, true);
  assert.equal(warm.historical_context.hmem, 'unavailable');
  assert.equal(warm.historical_context.zetaris, 'ok');
  assert.deepEqual(checks(warm), [
    'get_ec2_dependencies',
    'get_ec2_operations',
  ]);
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
  assert.deepEqual(checks(report), ['get_ec2_operations']);
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
  assert.deepEqual(checks(report), ['get_ec2_operations']);
  assert.equal(report.candidates[0].verdict, 'not_recommended');
});
