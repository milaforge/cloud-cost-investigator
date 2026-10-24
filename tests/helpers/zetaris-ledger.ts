import type { TestContext } from 'node:test';
import type { HistoryRecord } from '../../src/tools/zetaris-history.ts';

/** Exercises real adapter SQL/readback logic against a bounded in-memory HTTP fixture. */
export function mockZetarisLedger(t: TestContext) {
  const settings = {
    ZETARIS_BASE_URL: 'https://zetaris.example',
    ZETARIS_AUTH_MODE: 'token',
    ZETARIS_API_KEY: 'fixture-key',
    ZETARIS_ORG_ID: 'fixture-org',
    ZETARIS_HISTORY_TABLE: 'CCI_HISTORY.investigations.records',
    ZETARIS_HISTORY_ALLOW_APPEND: 'true',
    NODE_TLS_REJECT_UNAUTHORIZED: '1',
  };
  const previous = Object.keys(settings).map((k) => process.env[k]);
  Object.assign(process.env, settings);
  t.after(() =>
    Object.keys(settings).forEach((k, i) => {
      if (previous[i] === undefined) delete process.env[k];
      else process.env[k] = previous[i];
    }),
  );
  const columns = [
    'record_id',
    'schema_version',
    'investigation_id',
    'account_id',
    'region',
    'instance_id',
    'recorded_at_utc',
    'observed_from_utc',
    'observed_to_utc',
    'source_mode',
    'verdict',
    'summary_json',
  ] as const;
  const records: HistoryRecord[] = [];
  const sqlLog: string[] = [];
  t.mock.method(
    globalThis,
    'fetch',
    async (_url: unknown, options?: RequestInit) => {
      const sql = JSON.parse(String(options?.body)).sql as string;
      sqlLog.push(sql);
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
        const version = Number(
          sql.match(
            /SELECT decode\(unhex\('[0-9a-f]*'\), 'UTF-8'\), ([12]),/,
          )?.[1],
        );
        const values = [strings[0], version, ...strings.slice(1)];
        records.push(
          Object.fromEntries(
            columns.map((c, i) => [c, values[i]]),
          ) as unknown as HistoryRecord,
        );
        return Response.json({ headers: [], data: [], total: 0 });
      }
      if (!sql.startsWith('SELECT')) throw new Error('Unexpected SQL');
      const selected = records
        .filter((r) => {
          for (const c of [
            'record_id',
            'account_id',
            'region',
            'instance_id',
          ] as const) {
            const m = sql.match(
              new RegExp(`${c} = decode\\(unhex\\('([0-9a-f]*)'`),
            );
            if (m && r[c] !== Buffer.from(m[1], 'hex').toString('utf8'))
              return false;
          }
          const version = sql.match(/AND schema_version = ([12])/);
          return !version || r.schema_version === Number(version[1]);
        })
        .sort(
          (a, b) =>
            b.recorded_at_utc.localeCompare(a.recorded_at_utc) ||
            a.record_id.localeCompare(b.record_id),
        )
        .slice(0, Number(sql.match(/LIMIT (\d+)/)?.[1]));
      return Response.json({
        headers: columns,
        data: selected.map((r) => columns.map((c) => r[c])),
        total: selected.length,
      });
    },
  );
  return { records, sqlLog };
}
