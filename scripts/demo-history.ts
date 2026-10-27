import type {
  HistoricalComparison,
  InvestigationReport,
  Mode,
  Scope,
} from '../src/contracts.ts';
import type {
  HistoryHint,
  HistoryProgress,
  HistorySession,
} from '../src/investigation/history.ts';
import {
  lessonTool,
  type ReasoningSummary,
  reasoningSummaryFromReport,
} from '../src/investigation/memory.ts';

export type DemoScenario =
  | 'A'
  | 'B'
  | 'C'
  | 'missing'
  | 'mixed'
  | 'cold'
  | 'changed';

/** Per-preview synthetic history. No remote request, disk write or shared state. */
export class DemoHistory implements HistorySession {
  readonly result: InvestigationReport['historical_context'] = {
    zetaris: 'not_queried',
    hmem: 'not_queried',
    context_ids: [],
    comparisons: [],
    limitations: [
      'Synthetic mock history only; neither service was contacted.',
    ],
  };
  private readonly summaries = new Map<string, ReasoningSummary>();

  constructor(
    private readonly scope: Scope,
    private readonly scenario: DemoScenario,
    private readonly onProgress?: (event: HistoryProgress) => void,
  ) {}

  private priorCheck(instance: string): HistoryHint['priority'] {
    const scenario =
      this.scenario === 'mixed'
        ? instance === 'i-mock-primary'
          ? 'A'
          : instance === 'i-mock-secondary'
            ? 'B'
            : 'C'
        : this.scenario;
    return scenario === 'C' || scenario === 'changed'
      ? 'get_ec2_dependencies'
      : 'get_ec2_operations';
  }

  async recall(
    instance: string,
    startedAt: string,
    signal: AbortSignal,
    mode?: Mode,
  ): Promise<HistoryHint[]> {
    signal.throwIfAborted();
    if (mode !== 'mock') throw new Error('Demo history requires mock evidence');
    if (this.scenario === 'cold' && !this.summaries.has(instance)) {
      this.result.zetaris = 'ok';
      this.result.hmem = 'ok';
      for (const source of ['zetaris', 'hmem'] as const)
        this.onProgress?.({
          source,
          operation: 'read',
          status: 'ok',
          count: 0,
        });
      return [];
    }
    const recorded_at = new Date(
      Date.parse(startedAt) - 7 * 86400000,
    ).toISOString();
    const record_id = `mock-prior-${this.scenario}-${instance}`;
    const comparison: HistoricalComparison = {
      historical: true,
      context_id: `zetaris:${record_id}`,
      record_id,
      investigation_id: `mock-prior-run-${this.scenario}-${instance}`,
      recorded_at,
      scope: this.scope,
      instance_id: instance,
      source_mode: 'mock',
      verdict:
        this.scenario === 'changed' ? 'not_recommended' : 'needs_verification',
      proposed_window: { start_hour_utc: 0, end_hour_utc: 6 },
      rejected_windows:
        this.scenario === 'changed'
          ? [{ start_hour_utc: 0, end_hour_utc: 6 }]
          : [],
    };
    if (
      !this.result.comparisons?.some(
        (item) => item.context_id === comparison.context_id,
      )
    )
      this.result.comparisons?.push(comparison);
    if (!this.result.context_ids.includes(comparison.context_id))
      this.result.context_ids.push(comparison.context_id);
    this.result.zetaris = 'ok';
    this.result.limitations.push(
      `${comparison.context_id}: synthetic prior decision ${this.scenario === 'changed' ? 'rejected' : 'deferred'} the 00:00–06:00 UTC window; audit context only.`,
    );
    this.onProgress?.({
      source: 'zetaris',
      operation: 'read',
      status: 'ok',
      count: 1,
      verdicts: [comparison.verdict],
    });

    const summary = this.summaries.get(instance);
    const stored =
      summary?.provenance.integration_mode === mode &&
      Date.parse(summary.recorded_at) <= Date.parse(startedAt)
        ? summary
        : null;
    const context_id = stored
      ? `hmem:mock:${stored.investigation_id}:${instance}`
      : `hmem:mock-prior-${this.scenario}-${instance}`;
    const priority = stored?.lesson
      ? lessonTool(stored.lesson.check)
      : stored?.unresolved_risks.some((risk) =>
            risk.includes('get_ec2_dependencies'),
          )
        ? 'get_ec2_dependencies'
        : stored
          ? 'get_ec2_operations'
          : this.priorCheck(instance);
    this.result.hmem = 'ok';
    this.result.limitations.push(
      `${context_id}: synthetic scoped H-MEM hint prioritizes ${priority}; fresh checks still required.`,
    );
    this.onProgress?.({
      source: 'hmem',
      operation: 'read',
      status: 'ok',
      count: 1,
      lesson: stored?.lesson?.check,
    });
    if (!this.result.context_ids.includes(context_id))
      this.result.context_ids.push(context_id);
    return [
      {
        context_id,
        recorded_at: stored?.recorded_at ?? recorded_at,
        source_mode: 'mock',
        priority,
        ...(stored?.lesson
          ? {
              lesson: {
                check: stored.lesson.check,
                window: stored.lesson.window,
              },
            }
          : this.scenario === 'changed' && !stored
            ? {
                lesson: {
                  check: 'dependency_continuous_operation' as const,
                  window: { start_hour_utc: 0, end_hour_utc: 6 },
                },
              }
            : {}),
      },
    ];
  }

  async persist(
    report: InvestigationReport,
    signal: AbortSignal,
  ): Promise<void> {
    signal.throwIfAborted();
    if (
      report.integration_mode !== 'mock' ||
      report.request.account_id !== this.scope.account_id ||
      report.request.region !== this.scope.region
    )
      throw new Error('Demo history scope or mode mismatch');
    for (const [index, candidate] of report.candidates.entries()) {
      signal.throwIfAborted();
      const summary = reasoningSummaryFromReport(report, index);
      this.summaries.set(candidate.instance_id, summary);
      this.result.limitations.push(
        'Synthetic mock H-MEM summary held in this preview only; no persistent record written.',
      );
      this.onProgress?.({
        source: 'zetaris',
        operation: 'store',
        status: 'disabled',
      });
      this.onProgress?.({
        source: 'hmem',
        operation: 'store',
        status: 'ok',
        verdict: summary.verdict,
        lesson: summary.lesson?.check,
      });
    }
  }
}
