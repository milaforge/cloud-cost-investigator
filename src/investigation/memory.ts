import { createHash } from 'node:crypto';
import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { loadHMEM } from '../engine.ts';
import {
  array,
  exact,
  identifier,
  member,
  textValue,
  utc,
  validateSchedule,
  validateScope,
  type InvestigationReport,
  type Mode,
  type Schedule,
  type Scope,
} from '../contracts.ts';
import { validateReport } from './report.ts';
import type { HMEM, MemoryRecord } from '../../vendor/hmem/src/index.ts';

export interface ReasoningSummary {
  schema_version: 1;
  investigation_id: string;
  recorded_at: string;
  scope: Scope;
  instance_id: string;
  hypothesis: {
    window: Schedule;
    state: 'proposed' | 'contradicted' | 'unresolved' | 'supported';
  } | null;
  verdict:
    | 'not_recommended'
    | 'needs_verification'
    | 'conditional_recommendation';
  reason: string;
  unresolved_risks: string[];
  provenance: { integration_mode: Mode; evidence_ids: string[] };
}
export interface HistoricalReasoningContext {
  context_id: string;
  historical: true;
  summary: ReasoningSummary;
}

export function validateReasoningSummary(value: unknown): ReasoningSummary {
  const o = exact(value, [
    'schema_version',
    'investigation_id',
    'recorded_at',
    'scope',
    'instance_id',
    'hypothesis',
    'verdict',
    'reason',
    'unresolved_risks',
    'provenance',
  ]);
  if (o.schema_version !== 1)
    throw new Error('Invalid reasoning summary version');
  const scope = validateScope(exact(o.scope, ['account_id', 'region']));
  const p = exact(o.provenance, ['integration_mode', 'evidence_ids']);
  let hypothesis: ReasoningSummary['hypothesis'] = null;
  if (o.hypothesis !== null) {
    const h = exact(o.hypothesis, ['window', 'state']);
    hypothesis = {
      window: validateSchedule(h.window),
      state: member(h.state, [
        'proposed',
        'contradicted',
        'unresolved',
        'supported',
      ]),
    };
  }
  return {
    schema_version: 1,
    investigation_id: identifier(o.investigation_id),
    recorded_at: utc(o.recorded_at),
    scope,
    instance_id: identifier(o.instance_id),
    hypothesis,
    verdict: member(o.verdict, [
      'not_recommended',
      'needs_verification',
      'conditional_recommendation',
    ]),
    reason: textValue(o.reason),
    unresolved_risks: array(o.unresolved_risks, 8).map((v) =>
      textValue(v, 400),
    ),
    provenance: {
      integration_mode: member(p.integration_mode, [
        'mock',
        'fixture',
        'live',
        'stub',
      ]),
      evidence_ids: array(p.evidence_ids, 15).map(identifier),
    },
  };
}

/** Deliberately omits telemetry, provider payloads, and complete reports. */
export function reasoningSummaryFromReport(
  input: InvestigationReport,
  candidateIndex = 0,
): ReasoningSummary {
  const report = validateReport(input);
  const candidate = report.candidates[candidateIndex];
  if (!candidate) throw new Error('hmem_summary_candidate_required');
  const hypothesis = candidate.hypotheses.at(-1);
  return validateReasoningSummary({
    schema_version: 1,
    investigation_id: report.investigation_id,
    recorded_at: report.finished_at,
    scope: {
      account_id: report.request.account_id,
      region: report.request.region,
    },
    instance_id: candidate.instance_id,
    hypothesis: hypothesis
      ? { window: hypothesis.window, state: hypothesis.state }
      : null,
    verdict: candidate.verdict,
    reason: candidate.explanation,
    unresolved_risks: [...candidate.risks, ...candidate.missing_checks].slice(
      0,
      8,
    ),
    provenance: {
      integration_mode: report.integration_mode,
      evidence_ids: report.evidence
        .filter(
          (e) =>
            e.scope.instance_id === undefined ||
            e.scope.instance_id === candidate.instance_id,
        )
        .map((o) => o.evidence_id),
    },
  });
}

/** Single-writer local H-MEM reference persistence, separate from notebook state and current evidence. */
export class HmemReasoningMemory {
  private unavailable = false;
  private constructor(
    private readonly engine: HMEM,
    readonly source: string,
    private readonly scope: Scope,
    private readonly namespace: string,
  ) {}

  static async open(
    persistDir: string,
    inputScope: Scope,
  ): Promise<HmemReasoningMemory> {
    try {
      textValue(persistDir, 4096);
      const scope = validateScope(exact(inputScope, ['account_id', 'region']));
      const namespace = createHash('sha256')
        .update(JSON.stringify([scope.account_id, scope.region]))
        .digest('hex');
      const directory = join(persistDir, `scope-${namespace}`);
      // Bound local reference JSON loading; this adapter is for compact investigation memory.
      for (const filename of ['state.json', 'ledger.jsonl']) {
        const path = join(directory, filename);
        if (existsSync(path) && statSync(path).size > 2_000_000)
          throw new Error('Memory capacity exceeded');
      }
      // The starter loader exits when nothing is installed. Keep missing setup recoverable here.
      if (
        !existsSync(new URL('../../vendor/hmem/src/index.ts', import.meta.url))
      )
        throw new Error('Vendored H-MEM unavailable');
      const { HMEM, source } = await loadHMEM();
      const memory = new HmemReasoningMemory(
        new HMEM({ persistDir: directory }),
        source,
        scope,
        namespace,
      );
      const records = memory.engine.store.all();
      if (records.length > 100) throw new Error('Memory capacity exceeded');
      for (const record of records) memory.readRecord(record);
      return memory;
    } catch {
      throw new Error('hmem_open_unavailable_or_invalid');
    }
  }

  store(value: unknown): HistoricalReasoningContext {
    try {
      if (this.unavailable)
        throw new Error('Reopen memory after a failed operation');
      const summary = validateReasoningSummary(value);
      this.assertScope(summary);
      if (this.engine.store.all().length >= 100)
        throw new Error('Memory capacity exceeded');
      const record = this.engine.add({
        content: JSON.stringify(summary),
        type: 'general',
        layer: 'working',
        tags: ['project:cloud-cost-investigator', 'off-hours', 'scheduling'],
        confidence: 0.7,
        source: 'cloud-cost-investigator-historical-reasoning',
        chatId: this.namespace,
        provenance: {
          origin: 'plan_completion',
          learnedAt: Date.parse(summary.recorded_at),
          label: 'Historical investigation reasoning; requires fresh evidence',
          refs: [...summary.provenance.evidence_ids],
        },
      });
      return this.readRecord(record);
    } catch {
      // The reference mutates in-memory state before disk writes. Never recall a failed append.
      this.unavailable = true;
      throw new Error('hmem_store_unavailable_or_invalid');
    }
  }

  retrieve(instanceId: string): HistoricalReasoningContext[] {
    try {
      if (this.unavailable)
        throw new Error('Reopen memory after a failed operation');
      const instance = identifier(instanceId);
      // The engine ranks historical reasoning, never establishes a current operational fact.
      const result = this.engine.query(
        `off-hours scheduling critical jobs unresolved risks ${instance}`,
        {
          topN: 100,
          threshold: 0,
          chatId: this.namespace,
        },
      );
      return result.memories
        .map(({ memory }) => this.readRecord(memory))
        .filter((context) => context.summary.instance_id === instance)
        .slice(0, 5);
    } catch {
      this.unavailable = true;
      throw new Error('hmem_retrieve_unavailable_or_invalid');
    }
  }

  private assertScope(summary: ReasoningSummary): void {
    if (
      summary.scope.account_id !== this.scope.account_id ||
      summary.scope.region !== this.scope.region
    )
      throw new Error('Historical scope mismatch');
  }

  private readRecord(record: MemoryRecord): HistoricalReasoningContext {
    if (
      record.source !== 'cloud-cost-investigator-historical-reasoning' ||
      record.chatId !== this.namespace
    )
      throw new Error('Invalid memory provenance');
    const summary = validateReasoningSummary(
      JSON.parse(textValue(record.content, 8000)),
    );
    this.assertScope(summary);
    return {
      context_id: `hmem:${identifier(record.id)}`,
      historical: true,
      summary,
    };
  }
}
