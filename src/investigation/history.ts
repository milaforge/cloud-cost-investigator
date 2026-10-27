import type {
  InvestigationReport,
  Mode,
  Schedule,
  Scope,
  ToolName,
} from '../contracts.ts';
import {
  appendZetarisHistory,
  historyRecordFromReport,
  readZetarisHistory,
} from '../tools/zetaris-history.ts';
import { outcomeLearningSummary } from './follow-up.ts';
import {
  HmemReasoningMemory,
  lessonTool,
  type OperationalLesson,
  type ReasoningSummary,
  reasoningSummaryFromReport,
} from './memory.ts';
import { sameSchedule } from './policy.ts';

export interface HistoryOptions {
  hmem_directory?: string;
  zetaris?: boolean;
  zetaris_append?: boolean;
}
/** History participates in planning and finalization, but never supplies current evidence. */
export interface HistorySession {
  result: InvestigationReport['historical_context'];
  recall(
    instance: string,
    startedAt: string,
    signal: AbortSignal,
    mode?: Mode,
  ): Promise<HistoryHint[]>;
  persist(report: InvestigationReport, signal: AbortSignal): Promise<void>;
}
export interface HistoryHint {
  context_id: string;
  recorded_at: string;
  source_mode: Mode;
  priority: 'get_ec2_operations' | 'get_ec2_dependencies';
  lesson?: Pick<OperationalLesson, 'check' | 'window'>;
}

/** Bounded history metadata for progress UI; no record prose, scope or credentials. */
export interface HistoryProgress {
  source: 'zetaris' | 'hmem';
  operation: 'read' | 'store';
  status: 'ok' | 'no_match' | 'unavailable' | 'disabled';
  count?: number;
  verdicts?: InvestigationReport['candidates'][number]['verdict'][];
  verdict?: InvestigationReport['candidates'][number]['verdict'];
  lesson?: OperationalLesson['check'];
  failure_code?: string;
}

/** History is advisory data only. No prior evidence IDs or free-form text reach the planner. */
export class InvestigationHistory implements HistorySession {
  readonly result: InvestigationReport['historical_context'] = {
    zetaris: 'not_configured',
    hmem: 'not_configured',
    context_ids: [],
    comparisons: [],
    limitations: [
      'Historical context can prioritize fresh checks; it cannot establish current facts.',
    ],
  };
  private memory?: HmemReasoningMemory;
  constructor(
    private readonly options: HistoryOptions,
    private readonly scope: Scope,
    private readonly onProgress?: (event: HistoryProgress) => void,
  ) {
    if (options.zetaris) this.result.zetaris = 'not_queried';
    if (options.hmem_directory) this.result.hmem = 'not_queried';
  }

  private emit(event: HistoryProgress) {
    try {
      this.onProgress?.(event);
    } catch {
      // Observability cannot change history reads, writes or investigation policy.
    }
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
      lesson?: Pick<OperationalLesson, 'check' | 'window'>,
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
        let matched = 0;
        const verdicts: NonNullable<HistoryProgress['verdicts']> = [];
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
          matched++;
          verdicts.push(r.verdict);
          const summary = JSON.parse(r.summary_json);
          // The adapter has validated the version-1 summary and scoped record.
          this.result.comparisons?.push({
            historical: true,
            context_id: item.context_id,
            record_id: r.record_id,
            investigation_id: r.investigation_id,
            recorded_at: r.recorded_at_utc,
            scope: { account_id: r.account_id, region: r.region },
            instance_id: r.instance_id,
            source_mode: r.source_mode,
            verdict: r.verdict,
            proposed_window: summary.proposed_window,
            rejected_windows: summary.rejected_windows,
          });
          // Zetaris retains the decision trail; only H-MEM teaches query order.
          this.result.context_ids.push(item.context_id);
          this.result.limitations.push(
            `${item.context_id}: historical recommendation ${r.verdict}, recorded ${r.recorded_at_utc}; audit context only, not a planner hint.`,
          );
        }
        this.result.zetaris = 'ok';
        this.emit({
          source: 'zetaris',
          operation: 'read',
          status: matched ? 'ok' : 'no_match',
          count: matched,
          verdicts,
        });
      } catch (error) {
        if (this.result.zetaris !== 'ok') this.result.zetaris = 'unavailable';
        const code =
          error instanceof Error &&
          /^zetaris_(?:tls_verification_required|auth_unavailable|transport_unavailable|configuration_required|configuration_invalid|login_configuration_required|org_mismatch|auth_invalid_response|invalid_response|history_schema_mismatch|history_table_invalid|history_result_invalid|history_scope_mismatch|http_\d{3}|auth_http_\d{3})$/.test(
            error.message,
          )
            ? error.message
            : 'zetaris_history_read_failed';
        this.result.limitations.push(
          `A candidate Zetaris recall failed (${code}); no historical evidence used for that candidate.`,
        );
        this.emit({
          source: 'zetaris',
          operation: 'read',
          status: 'unavailable',
          failure_code: code,
        });
      }
    } else
      this.emit({ source: 'zetaris', operation: 'read', status: 'disabled' });
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
        let latest = this.memory.retrieve(instance, {
          as_of: startedAt,
          mode,
        })[0];
        let learned: ReasoningSummary | null = null;
        if (this.options.zetaris) {
          try {
            learned = await outcomeLearningSummary(
              this.scope,
              instance,
              startedAt,
              mode,
              signal,
            );
          } catch {
            this.result.limitations.push(
              'Outcome learning unavailable or invalid; existing H-MEM strategy retained.',
            );
          }
        }
        if (
          learned?.outcome &&
          (!latest ||
            (Date.parse(learned.outcome.observed_at) >
              Date.parse(latest.summary.recorded_at) &&
              Date.parse(learned.recorded_at) >
                Date.parse(latest.summary.recorded_at)))
        ) {
          // Let a failed disk write reach the outer handler; never use an unpersisted lesson.
          latest = this.memory.store(learned);
          this.emit({
            source: 'hmem',
            operation: 'store',
            status: 'ok',
            verdict: learned.verdict,
            lesson:
              learned.lesson?.check ?? learned.outcome?.investigation_check,
          });
        }
        if (latest) {
          const item = latest;
          const s = item.summary;
          if (s.outcome) {
            this.result.context_ids.push(
              ...[
                s.outcome.record_id,
                s.outcome.decision_record_id,
                s.outcome.recommendation_record_id,
              ].map((id) => `zetaris:${id}`),
            );
            this.result.limitations.push(
              `zetaris:${s.outcome.record_id}: operator-reported ${s.outcome.result}; H-MEM check-order context only, not current evidence.`,
            );
          }
          add(
            item.context_id,
            s.recorded_at,
            s.provenance.integration_mode,
            s.unresolved_risks,
            s.lesson ??
              (s.outcome?.investigation_check && s.hypothesis
                ? {
                    check: s.outcome.investigation_check,
                    window: s.hypothesis.window,
                  }
                : undefined),
          );
        }
        this.result.hmem = 'ok';
        this.emit({
          source: 'hmem',
          operation: 'read',
          status: latest ? 'ok' : 'no_match',
          count: latest ? 1 : 0,
          lesson:
            latest?.summary.lesson?.check ??
            latest?.summary.outcome?.investigation_check,
        });
      } catch {
        if (this.result.hmem !== 'ok') this.result.hmem = 'unavailable';
        this.result.limitations.push(
          'A candidate H-MEM recall failed; no memory hints used for that candidate.',
        );
        this.emit({ source: 'hmem', operation: 'read', status: 'unavailable' });
      }
    } else this.emit({ source: 'hmem', operation: 'read', status: 'disabled' });
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
        this.options.zetaris_append !== false &&
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
          this.emit({
            source: 'zetaris',
            operation: 'store',
            status: 'ok',
            verdict: saved.record.verdict,
          });
        } catch {
          this.result.limitations.push(
            'Zetaris append failed or is unverified; no retry was attempted.',
          );
          this.emit({
            source: 'zetaris',
            operation: 'store',
            status: 'unavailable',
          });
        }
      } else if (this.options.zetaris) {
        this.result.limitations.push(
          'Zetaris append disabled; no historical record written.',
        );
        this.emit({
          source: 'zetaris',
          operation: 'store',
          status: 'disabled',
        });
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
          this.emit({
            source: 'hmem',
            operation: 'store',
            status: 'ok',
            verdict: saved.summary.verdict,
            lesson: saved.summary.lesson?.check,
          });
        } catch {
          this.result.limitations.push(
            'H-MEM store failed; reopen before further use.',
          );
          this.emit({
            source: 'hmem',
            operation: 'store',
            status: 'unavailable',
          });
        }
      } else
        this.emit({
          source: 'hmem',
          operation: 'store',
          status: this.options.hmem_directory ? 'unavailable' : 'disabled',
        });
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
