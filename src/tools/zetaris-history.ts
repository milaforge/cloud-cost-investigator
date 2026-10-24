import { createHash } from 'node:crypto';
import { loadProjectEnv } from '../config.ts';
import {
  array,
  exact,
  type InvestigationReport,
  identifier,
  integer,
  member,
  type Scope,
  textValue,
  utc,
  validateSchedule,
  validateScope,
  validateWindow,
} from '../contracts.ts';
import { validateFollowUpEvent } from '../investigation/follow-up-contract.ts';
import { validateReport } from '../investigation/report.ts';
import { parseZetarisTable, queryZetaris } from './zetaris.ts';

const COLUMNS = [
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
export interface HistoryRecord {
  record_id: string;
  schema_version: 1 | 2;
  investigation_id: string;
  account_id: string;
  region: string;
  instance_id: string;
  recorded_at_utc: string;
  observed_from_utc: string;
  observed_to_utc: string;
  source_mode: 'mock' | 'fixture' | 'live' | 'stub';
  verdict:
    | 'not_recommended'
    | 'needs_verification'
    | 'conditional_recommendation';
  summary_json: string;
}
export interface HistoricalRecord {
  context_id: string;
  historical: true;
  record: HistoryRecord;
}
const iso = (value: unknown) => new Date(utc(value)).toISOString();

function validateRecord(value: unknown): HistoryRecord {
  try {
    const r = exact(value, [...COLUMNS]);
    if (r.schema_version !== 1 && r.schema_version !== 2) throw new Error();
    const scope = validateScope({ account_id: r.account_id, region: r.region });
    const summaryText = textValue(r.summary_json, 4096);
    const summary =
      r.schema_version === 2
        ? validateFollowUpEvent(JSON.parse(summaryText))
        : (() => {
            const s = exact(JSON.parse(summaryText), [
              'proposed_window',
              'rejected_windows',
              'evidence_ids',
              'missing_checks',
            ]);
            return {
              proposed_window:
                s.proposed_window === null
                  ? null
                  : validateSchedule(s.proposed_window),
              rejected_windows: array(s.rejected_windows, 8).map(
                validateSchedule,
              ),
              evidence_ids: array(s.evidence_ids, 15).map(identifier),
              missing_checks: array(s.missing_checks, 8).map((v) =>
                textValue(v),
              ),
            };
          })();
    const window = validateWindow({
      from: r.observed_from_utc,
      to: r.observed_to_utc,
    });
    const recorded = iso(r.recorded_at_utc);
    if (Date.parse(recorded) < Date.parse(window.to)) throw new Error();
    if ('kind' in summary) {
      if (
        (summary.kind === 'deferred' ||
          summary.kind === 'accepted' ||
          summary.kind === 'outcome') &&
        r.verdict !== 'conditional_recommendation'
      )
        throw new Error();
      if (
        summary.kind === 'deferred' &&
        Date.parse(summary.review_at) < Date.parse(recorded)
      )
        throw new Error();
      if (
        summary.kind === 'outcome' &&
        Date.parse(summary.observed_at) > Date.parse(recorded)
      )
        throw new Error();
    }
    return {
      record_id: identifier(r.record_id),
      schema_version: r.schema_version,
      investigation_id: identifier(r.investigation_id),
      ...scope,
      instance_id: identifier(r.instance_id),
      recorded_at_utc: recorded,
      observed_from_utc: iso(window.from),
      observed_to_utc: iso(window.to),
      source_mode: member(r.source_mode, ['mock', 'fixture', 'live', 'stub']),
      verdict: member(r.verdict, [
        'not_recommended',
        'needs_verification',
        'conditional_recommendation',
      ]),
      summary_json: JSON.stringify(summary),
    };
  } catch {
    throw new Error('zetaris_history_record_invalid');
  }
}

export function historyRecordFromReport(
  input: InvestigationReport,
  candidateIndex = 0,
): HistoryRecord {
  const report = validateReport(input);
  const candidate = report.candidates[candidateIndex];
  if (!candidate) throw new Error('zetaris_history_candidate_required');
  const recordId = createHash('sha256')
    .update(JSON.stringify([report.investigation_id, candidate.instance_id]))
    .digest('hex');
  return validateRecord({
    record_id: recordId,
    schema_version: 1,
    investigation_id: report.investigation_id,
    account_id: report.request.account_id,
    region: report.request.region,
    instance_id: candidate.instance_id,
    recorded_at_utc: report.finished_at,
    observed_from_utc: report.request.window.from,
    observed_to_utc: report.request.window.to,
    source_mode: report.integration_mode,
    verdict: candidate.verdict,
    summary_json: JSON.stringify({
      proposed_window: candidate.proposed_window,
      rejected_windows: candidate.hypotheses
        .filter((h) => h.state === 'contradicted')
        .map((h) => h.window),
      evidence_ids: report.evidence
        .filter(
          (e) =>
            e.scope.instance_id === undefined ||
            e.scope.instance_id === candidate.instance_id,
        )
        .map((e) => e.evidence_id),
      missing_checks: candidate.missing_checks.slice(0, 8),
    }),
  });
}

function target(): string {
  loadProjectEnv();
  const table = process.env.ZETARIS_HISTORY_TABLE;
  // Explicitly restricted to this app's dedicated history lakehouse, never demo/AWS tables.
  if (
    !table ||
    !/^CCI_HISTORY\.[A-Za-z][A-Za-z0-9_]{0,63}\.[A-Za-z][A-Za-z0-9_]{0,63}$/.test(
      table,
    )
  )
    throw new Error('zetaris_history_table_invalid');
  return table
    .split('.')
    .map((part) => `\`${part}\``)
    .join('.');
}
// Hex-encoded UTF-8 literals avoid dependence on Spark quote/backslash escaping settings.
const literal = (value: string) =>
  `decode(unhex('${Buffer.from(value, 'utf8').toString('hex')}'), 'UTF-8')`;
const context = (record: HistoryRecord): HistoricalRecord => ({
  context_id: `zetaris:${record.record_id}`,
  historical: true,
  record,
});

async function verifySchema(table: string, signal: AbortSignal): Promise<void> {
  const result = parseZetarisTable(
    await queryZetaris(`DESCRIBE ${table}`, signal),
  );
  const nameIndex = result.headers.indexOf('col_name'),
    typeIndex = result.headers.indexOf('data_type');
  const rows = result.data.filter(
    (row) =>
      typeof row[nameIndex] === 'string' &&
      !String(row[nameIndex]).startsWith('#') &&
      row[nameIndex] !== '',
  );
  if (
    nameIndex < 0 ||
    typeIndex < 0 ||
    rows.length !== COLUMNS.length ||
    COLUMNS.some(
      (name) =>
        !rows.some(
          (row) =>
            row[nameIndex] === name &&
            row[typeIndex] === (name === 'schema_version' ? 'int' : 'string'),
        ),
    )
  )
    throw new Error('zetaris_history_schema_mismatch');
}

export async function verifyZetarisHistorySchema(): Promise<void> {
  await verifySchema(target(), AbortSignal.timeout(20_000));
}

async function readRows(
  table: string,
  scope: Scope,
  recordId: string | undefined,
  limit: number,
  signal: AbortSignal,
  instanceId?: string,
  version?: 1 | 2,
): Promise<HistoricalRecord[]> {
  const result = parseZetarisTable(
    await queryZetaris(
      `SELECT ${COLUMNS.map((c) => `\`${c}\``).join(', ')} FROM ${table} WHERE account_id = ${literal(scope.account_id)} AND region = ${literal(scope.region)}${recordId ? ` AND record_id = ${literal(recordId)}` : ''}${instanceId ? ` AND instance_id = ${literal(instanceId)}` : ''}${version ? ` AND schema_version = ${version}` : ''} ORDER BY recorded_at_utc DESC, record_id ASC LIMIT ${limit}`,
      signal,
    ),
  );
  if (
    JSON.stringify(result.headers) !== JSON.stringify(COLUMNS) ||
    result.data.length > limit
  )
    throw new Error('zetaris_history_result_invalid');
  return result.data.map((row) => {
    const raw = Object.fromEntries(COLUMNS.map((name, i) => [name, row[i]]));
    if (raw.schema_version === '1') raw.schema_version = 1;
    if (raw.schema_version === '2') raw.schema_version = 2;
    const record = validateRecord(raw);
    if (
      record.account_id !== scope.account_id ||
      record.region !== scope.region ||
      (recordId && record.record_id !== recordId) ||
      (instanceId && record.instance_id !== instanceId) ||
      (version && record.schema_version !== version)
    )
      throw new Error('zetaris_history_scope_mismatch');
    return context(record);
  });
}

export async function readZetarisHistory(
  scopeInput: Scope,
  limit = 10,
  parentSignal?: AbortSignal,
  instanceId?: string,
): Promise<HistoricalRecord[]> {
  const scope = validateScope(exact(scopeInput, ['account_id', 'region']));
  integer(limit, 1, 20);
  if (instanceId !== undefined) identifier(instanceId);
  const table = target(),
    signal = AbortSignal.any([
      AbortSignal.timeout(20_000),
      ...(parentSignal ? [parentSignal] : []),
    ]);
  await verifySchema(table, signal);
  return readRows(table, scope, undefined, limit, signal, instanceId, 1);
}

/** Single-writer MVP: no automatic retries; reuses an identical ID only after exact readback. */
export async function appendZetarisHistory(
  input: HistoryRecord,
  parentSignal?: AbortSignal,
): Promise<HistoricalRecord> {
  const record = validateRecord(input),
    table = target();
  if (process.env.ZETARIS_HISTORY_ALLOW_APPEND !== 'true')
    throw new Error('zetaris_history_append_disabled');
  const signal = AbortSignal.any([
    AbortSignal.timeout(30_000),
    ...(parentSignal ? [parentSignal] : []),
  ]);
  await verifySchema(table, signal);
  const scope = { account_id: record.account_id, region: record.region };
  const existing = await readRows(table, scope, record.record_id, 2, signal);
  if (existing.length) {
    if (
      existing.length === 1 &&
      JSON.stringify(existing[0].record) === JSON.stringify(record)
    )
      return existing[0];
    throw new Error('zetaris_history_record_conflict');
  }
  // Once INSERT is sent, any failure is an uncertain write. Never retry it automatically.
  try {
    const values = COLUMNS.map((c) =>
      c === 'schema_version'
        ? String(record.schema_version)
        : literal(String(record[c])),
    );
    // DML response formats vary; only the exact validated readback establishes success.
    await queryZetaris(
      `INSERT INTO ${table} (${COLUMNS.map((c) => `\`${c}\``).join(', ')}) SELECT ${values.join(', ')}`,
      signal,
    );
    const saved = await readRows(table, scope, record.record_id, 2, signal);
    if (
      saved.length !== 1 ||
      JSON.stringify(saved[0].record) !== JSON.stringify(record)
    )
      throw new Error();
    return saved[0];
  } catch {
    throw new Error('zetaris_history_append_unverified');
  }
}

/** Exact historical lookup; duplicate IDs fail closed rather than choosing an arbitrary row. */
export async function readZetarisHistoryRecord(
  scopeInput: Scope,
  id: string,
): Promise<HistoricalRecord> {
  const scope = validateScope(exact(scopeInput, ['account_id', 'region']));
  identifier(id);
  const table = target(),
    signal = AbortSignal.timeout(20_000);
  await verifySchema(table, signal);
  const records = await readRows(table, scope, id, 2, signal);
  if (records.length !== 1)
    throw new Error('zetaris_history_record_missing_or_duplicate');
  return records[0];
}

/** Bounded per-instance follow-up ledger. Never silently claim completeness after truncation. */
export async function readZetarisFollowUps(
  scopeInput: Scope,
  instanceId: string,
): Promise<HistoricalRecord[]> {
  const scope = validateScope(exact(scopeInput, ['account_id', 'region']));
  identifier(instanceId);
  const table = target(),
    signal = AbortSignal.timeout(20_000);
  await verifySchema(table, signal);
  const records = await readRows(
    table,
    scope,
    undefined,
    20,
    signal,
    instanceId,
    2,
  );
  if (records.length === 20)
    throw new Error('zetaris_follow_up_query_limit_exceeded');
  return records;
}
