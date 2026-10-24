import type {
  InvestigationReport,
  Mode,
  Scope,
  Schedule,
  ToolName,
} from '../contracts.ts';
import {
  appendZetarisHistory,
  historyRecordFromReport,
  readZetarisHistory,
} from '../tools/zetaris-history.ts';
import {
  HmemReasoningMemory,
  reasoningSummaryFromReport,
  lessonTool,
  type OperationalLesson,
} from './memory.ts';
import { sameSchedule } from './policy.ts';

export interface HistoryOptions {
  hmem_directory?: string;
  zetaris?: boolean;
}
export interface HistoryHint {
  context_id: string;
  recorded_at: string;
  source_mode: Mode;
  priority: 'get_ec2_operations' | 'get_ec2_dependencies';
  lesson?: Pick<OperationalLesson, 'check' | 'window'>;
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
    mode?: Mode,
  ): Promise<HistoryHint[]> {
    const hints: HistoryHint[] = [];
    const add = (
      id: string,
      recorded: string,
      mode: Mode,
      missing: string[],
      lesson?: OperationalLesson,
    ) => {
      if (Date.parse(recorded) > Date.parse(startedAt)) return;
      hints.push({
        context_id: id,
        recorded_at: recorded,
        source_mode: mode,
        priority: lesson
          ? lessonTool(lesson.check)
          : missing.some((s) => s.includes('get_ec2_dependencies'))
            ? 'get_ec2_dependencies'
            : 'get_ec2_operations',
        ...(lesson
          ? { lesson: { check: lesson.check, window: lesson.window } }
          : {}),
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
          if (Date.parse(r.recorded_at_utc) > Date.parse(startedAt)) continue;
          if (r.instance_id !== instance || (mode && r.source_mode !== mode))
            continue;
          // Zetaris retains the decision trail; only H-MEM teaches query order.
          this.result.context_ids.push(item.context_id);
          this.result.limitations.push(
            `${item.context_id}: historical recommendation ${r.verdict}, recorded ${r.recorded_at_utc}; audit context only, not a planner hint.`,
          );
        }
        this.result.zetaris = 'ok';
      } catch {
        if (this.result.zetaris !== 'ok') this.result.zetaris = 'unavailable';
        this.result.limitations.push(
          'A candidate Zetaris recall failed; no historical evidence used for that candidate.',
        );
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
        // The newest eligible summary supersedes older lessons for this instance.
        // Keep the old records in H-MEM for audit, but do not resurrect old conflicts.
        const latest = this.memory.retrieve(instance, {
          as_of: startedAt,
          mode,
        })[0];
        if (latest) {
          const item = latest;
          const s = item.summary;
          add(
            item.context_id,
            s.recorded_at,
            s.provenance.integration_mode,
            s.unresolved_risks,
            s.lesson,
          );
        }
        this.result.hmem = 'ok';
      } catch {
        if (this.result.hmem !== 'ok') this.result.hmem = 'unavailable';
        this.result.limitations.push(
          'A candidate H-MEM recall failed; no memory hints used for that candidate.',
        );
      }
    }
    hints.sort(
      (a, b) =>
        Number(!!b.lesson) - Number(!!a.lesson) ||
        Date.parse(b.recorded_at) - Date.parse(a.recorded_at) ||
        a.context_id.localeCompare(b.context_id),
    );
    this.result.context_ids = [
      ...new Set([
        ...this.result.context_ids,
        ...hints.map((h) => h.context_id),
      ]),
    ];
    for (const h of hints)
      this.result.limitations.push(
        `${h.context_id}: historical ${h.source_mode}, recorded ${h.recorded_at}; prioritize ${h.priority}${h.lesson ? `; learned check=${h.lesson.check}, window=${h.lesson.window.start_hour_utc}-${h.lesson.window.end_hour_utc} UTC; verify again` : ''}.`,
      );
    return hints;
  }

  async persist(
    report: InvestigationReport,
    signal: AbortSignal,
  ): Promise<void> {
    for (
      let candidateIndex = 0;
      candidateIndex < report.candidates.length;
      candidateIndex++
    ) {
      if (
        this.options.zetaris &&
        process.env.ZETARIS_HISTORY_ALLOW_APPEND === 'true'
      ) {
        try {
          signal.throwIfAborted();
          const saved = await appendZetarisHistory(
            historyRecordFromReport(report, candidateIndex),
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
          const saved = this.memory.store(
            reasoningSummaryFromReport(report, candidateIndex),
          );
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
}

export function historicalPriority(
  hints: HistoryHint[] | undefined,
  window?: Schedule | null,
): ToolName | undefined {
  return applicableHistoryHints(hints ?? [], window)[0]?.priority;
}

export function applicableHistoryHints(
  hints: HistoryHint[],
  window?: Schedule | null,
): HistoryHint[] {
  return hints.filter(
    (h) => !h.lesson || (!!window && sameSchedule(h.lesson.window, window)),
  );
}
