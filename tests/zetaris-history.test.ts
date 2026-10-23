import assert from 'node:assert/strict';
import test, { type TestContext } from 'node:test';
import {
  appendZetarisHistory,
  historyRecordFromReport,
  readZetarisHistory,
} from '../src/tools/zetaris-history.ts';
import { MockProvider } from '../src/investigation/mock.ts';
import { ScriptedPlanner } from '../src/investigation/planner.ts';
import { runInvestigation } from '../src/investigation/run.ts';

const scope = { account_id: 'demo', region: 'us-east-1' };
async function record() {
  const report = await runInvestigation(
    {
      ...scope,
      max_candidates: 1,
      window: { from: '2026-09-01T00:00:00Z', to: '2026-09-29T00:00:00Z' },
    },
    { provider: new MockProvider(), planner: new ScriptedPlanner() },
  );
  return historyRecordFromReport(report);
}
function configure(t: TestContext) {
  const values = {
    ZETARIS_BASE_URL: 'https://zetaris.example',
    ZETARIS_AUTH_MODE: 'token',
    ZETARIS_API_KEY: 'app-key',
    ZETARIS_ORG_ID: 'test-org',
    ZETARIS_HISTORY_TABLE: 'CCI_HISTORY.investigations.records',
    ZETARIS_HISTORY_ALLOW_APPEND: 'true',
    NODE_TLS_REJECT_UNAUTHORIZED: '1',
  };
  const previous = Object.keys(values).map((k) => process.env[k]);
  Object.assign(process.env, values);
  t.after(() =>
    Object.keys(values).forEach((k, i) => {
      if (previous[i] === undefined) delete process.env[k];
      else process.env[k] = previous[i];
    }),
  );
}

test('history append encodes values, verifies readback, reads scoped history and reuses an identical ID', async (t) => {
  configure(t);
  const input = await record();
  const summary = JSON.parse(input.summary_json);
  summary.missing_checks.push("Don't \\' ; DROP TABLE records; --");
  input.summary_json = JSON.stringify(summary);
  const columns = Object.keys(input);
  const rows: unknown[][] = [];
  let inserts = 0;
  t.mock.method(
    globalThis,
    'fetch',
    async (_url: string | URL | Request, options?: RequestInit) => {
      const sql = JSON.parse(String(options?.body)).sql as string;
      assert.ok(!sql.includes(summary.missing_checks.at(-1)));
      if (sql.startsWith('DESCRIBE'))
        return Response.json({
          headers: ['col_name', 'data_type', 'comment'],
          data: columns.map((c) => [
            c,
            c === 'schema_version' ? 'int' : 'string',
            '',
          ]),
          total: columns.length,
        });
      if (sql.startsWith('INSERT INTO')) {
        inserts++;
        assert.ok(
          sql.startsWith(
            'INSERT INTO `CCI_HISTORY`.`investigations`.`records`',
          ),
        );
        assert.ok(!sql.includes('OVERWRITE'));
        const strings = [
          ...sql.matchAll(/decode\(unhex\('([0-9a-f]*)'\), 'UTF-8'\)/g),
        ].map((m) => Buffer.from(m[1], 'hex').toString('utf8'));
        const row: unknown[] = [strings[0], 1, ...strings.slice(1)];
        rows.push(row);
        return Response.json({ headers: [], data: [], total: 0 });
      }
      assert.ok(sql.includes('WHERE account_id = decode(unhex('));
      assert.ok(sql.includes('AND region = decode(unhex('));
      return Response.json({
        headers: columns,
        data: rows,
        total: rows.length,
      });
    },
  );
  const stored = await appendZetarisHistory(input);
  assert.equal(stored.historical, true);
  assert.equal(stored.context_id, `zetaris:${input.record_id}`);
  assert.deepEqual(stored.record, input);
  assert.deepEqual(await readZetarisHistory(scope), [stored]);
  assert.deepEqual(await appendZetarisHistory(input), stored);
  assert.equal(inserts, 1);
});

test('history schema mismatch prevents an insert', async (t) => {
  configure(t);
  const input = await record();
  const fetch = t.mock.method(globalThis, 'fetch', async () =>
    Response.json({
      headers: ['col_name', 'data_type'],
      data: [['unrelated', 'string']],
      total: 1,
    }),
  );
  await assert.rejects(appendZetarisHistory(input), {
    message: 'zetaris_history_schema_mismatch',
  });
  assert.equal(fetch.mock.callCount(), 1);
});

test('history rejects unexpected scope returned by server', async (t) => {
  configure(t);
  const input = await record();
  const columns = Object.keys(input);
  input.account_id = 'other-account';
  t.mock.method(
    globalThis,
    'fetch',
    async (_url: string | URL | Request, options?: RequestInit) => {
      const sql = JSON.parse(String(options?.body)).sql;
      return Response.json(
        sql.startsWith('DESCRIBE')
          ? {
              headers: ['col_name', 'data_type'],
              data: columns.map((c) => [
                c,
                c === 'schema_version' ? 'int' : 'string',
              ]),
              total: columns.length,
            }
          : { headers: columns, data: [Object.values(input)], total: 1 },
      );
    },
  );
  await assert.rejects(readZetarisHistory(scope), {
    message: 'zetaris_history_scope_mismatch',
  });
});

test('history insert failure is uncertain and never retried', async (t) => {
  configure(t);
  const input = await record(),
    columns = Object.keys(input);
  let inserts = 0;
  t.mock.method(
    globalThis,
    'fetch',
    async (_url: string | URL | Request, options?: RequestInit) => {
      const sql = JSON.parse(String(options?.body)).sql;
      if (sql.startsWith('DESCRIBE'))
        return Response.json({
          headers: ['col_name', 'data_type'],
          data: columns.map((c) => [
            c,
            c === 'schema_version' ? 'int' : 'string',
          ]),
          total: columns.length,
        });
      if (sql.startsWith('INSERT')) {
        inserts++;
        throw new Error('private transport details');
      }
      return Response.json({ headers: columns, data: [], total: 0 });
    },
  );
  await assert.rejects(appendZetarisHistory(input), {
    message: 'zetaris_history_append_unverified',
  });
  assert.equal(inserts, 1);
});

test('history rejects unapproved targets, invalid limits and disabled writes without network', async (t) => {
  configure(t);
  const input = await record();
  const fetch = t.mock.method(globalThis, 'fetch', async () => {
    throw new Error('must not fetch');
  });
  process.env.ZETARIS_HISTORY_TABLE = 'DEMO.investigations.records';
  await assert.rejects(appendZetarisHistory(input), {
    message: 'zetaris_history_table_invalid',
  });
  process.env.ZETARIS_HISTORY_TABLE = 'CCI_HISTORY.investigations.records';
  process.env.ZETARIS_HISTORY_ALLOW_APPEND = 'false';
  await assert.rejects(appendZetarisHistory(input), {
    message: 'zetaris_history_append_disabled',
  });
  await assert.rejects(readZetarisHistory(scope, 21));
  assert.equal(fetch.mock.callCount(), 0);
});
