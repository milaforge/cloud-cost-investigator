import type {
  InvestigationReport,
  Mode,
  Scope,
  ToolName,
} from '../contracts.ts';
import {
  appendZetarisHistory,
  historyRecordFromReport,
  readZetarisHistory,
} from '../tools/zetaris-history.ts';
import { HmemReasoningMemory, reasoningSummaryFromReport } from './memory.ts';

export interface HistoryOptions {
  hmem_directory?: string;
  zetaris?: boolean;
}
export interface HistoryHint {
  context_id: string;
  recorded_at: string;
  source_mode: Mode;
  priority: 'get_ec2_operations' | 'get_ec2_dependencies';
}

/** History is advisory data only. No prior evidence IDs or free-form text reach the planner. */
export class InvestigationHistory {
  readonly result: InvestigationReport['historical_context'] = {
    zetaris: 'not_configured',
    hmem: 'not_configured',
    context_ids: [],
    limitations: [
      'Historical context can prioritize fresh checks; it cannot establish current facts.',
    ],
  };
  private memory?: HmemReasoningMemory;
  constructor(
    private readonly options: HistoryOptions,
    private readonly scope: Scope,
  ) {
    if (options.zetaris) this.result.zetaris = 'not_queried';
    if (options.hmem_directory) this.result.hmem = 'not_queried';
  }

  async recall(
    instance: string,
    startedAt: string,
    signal: AbortSignal,
  ): Promise<HistoryHint[]> {
    const hints: HistoryHint[] = [];
    const add = (
      id: string,
      recorded: string,
      mode: Mode,
      missing: string[],
    ) => {
      if (Date.parse(recorded) > Date.parse(startedAt)) return;
      hints.push({
        context_id: id,
        recorded_at: recorded,
        source_mode: mode,
        priority: missing.some((s) => s.includes('get_ec2_dependencies'))
          ? 'get_ec2_dependencies'
          : 'get_ec2_operations',
      });
    };
    if (this.options.zetaris) {
      try {
        for (const item of await readZetarisHistory(
          this.scope,
          10,
          signal,
          instance,
        )) {
          const r = item.record;
          if (r.instance_id !== instance) continue;
          const summary = JSON.parse(r.summary_json) as {
            missing_checks: string[];
          };
          add(
            item.context_id,
            r.recorded_at_utc,
            r.source_mode,
            summary.missing_checks,
          );
        }
        this.result.zetaris = 'ok';
      } catch {
        this.result.zetaris = 'unavailable';
      }
    }
    if (this.options.hmem_directory) {
      try {
        signal.throwIfAborted();
        this.memory = await HmemReasoningMemory.open(
          this.options.hmem_directory,
          this.scope,
        );
        signal.throwIfAborted();
        for (const item of this.memory.retrieve(instance)) {
          const s = item.summary;
          add(
            item.context_id,
            s.recorded_at,
            s.provenance.integration_mode,
            s.unresolved_risks,
          );
        }
        this.result.hmem = 'ok';
      } catch {
        this.result.hmem = 'unavailable';
      }
    }
    hints.sort(
      (a, b) =>
        Date.parse(b.recorded_at) - Date.parse(a.recorded_at) ||
        a.context_id.localeCompare(b.context_id),
    );
    this.result.context_ids = [...new Set(hints.map((h) => h.context_id))];
    for (const h of hints)
      this.result.limitations.push(
        `${h.context_id}: historical ${h.source_mode}, recorded ${h.recorded_at}; prioritize ${h.priority}.`,
      );
    return hints;
  }

  async persist(
    report: InvestigationReport,
    signal: AbortSignal,
  ): Promise<void> {
    if (!report.candidates.length) return;
    if (
      this.options.zetaris &&
      process.env.ZETARIS_HISTORY_ALLOW_APPEND === 'true'
    ) {
      try {
        signal.throwIfAborted();
        const saved = await appendZetarisHistory(
          historyRecordFromReport(report),
          signal,
        );
        this.result.limitations.push(
          `Zetaris append verified by exact readback: ${saved.context_id} (new history, not recalled context).`,
        );
      } catch {
        this.result.limitations.push(
          'Zetaris append failed or is unverified; no retry was attempted.',
        );
      }
    } else if (this.options.zetaris) {
      this.result.limitations.push(
        'Zetaris append disabled; no historical record written.',
      );
    }
    if (this.memory) {
      try {
        signal.throwIfAborted();
        const saved = this.memory.store(reasoningSummaryFromReport(report));
        this.result.limitations.push(
          `H-MEM summary stored: ${saved.context_id} (new history, not recalled context).`,
        );
      } catch {
        this.result.limitations.push(
          'H-MEM store failed; reopen before further use.',
        );
      }
    }
  }
}

export function historicalPriority(
  hints: HistoryHint[] | undefined,
): ToolName | undefined {
  return hints?.[0]?.priority;
}
