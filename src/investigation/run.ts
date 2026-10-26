import { randomUUID } from 'node:crypto';
import {
  type Action,
  type BillingData,
  type CandidateReport,
  type InventoryData,
  type InvestigationReport,
  type InvestigationRequest,
  type MetricsData,
  type Observation,
  type OwnerEvidence,
  type PlannerFailureCode,
  type ToolAction,
  type TraceEntry,
  traceConfidence,
  validateAction,
  validateObservation,
  validateOwnerEvidence,
  validateRequest,
} from '../contracts.ts';
import {
  applicableHistoryHints,
  type HistoryHint,
  type HistoryOptions,
  type HistoryProgress,
  InvestigationHistory,
} from './history.ts';
import {
  INVESTIGATION_TIMEOUT_MS,
  REPORT_FINALIZATION_RESERVE_MS,
} from './limits.ts';
import { assessOperationalCheck, lessonTool } from './memory.ts';
import type { CurrentEvidenceProvider } from './mock.ts';
import {
  MODEL_PLANNER_TIMEOUT_MS,
  type Planner,
  sanitizedPlannerFailure,
} from './planner.ts';
import {
  assessScheduling,
  conflictExplanation,
  isExpectedAwsCoverageLimit,
  nextHumanActions,
  rankCandidates,
  sameSchedule,
  supportsTentativeWindow,
} from './policy.ts';
import { ModelHttpError } from './provider-error.ts';
import { validateReport } from './report.ts';

export interface PlannerState {
  request: InvestigationRequest;
  candidate_id: string | null;
  proposed_window: CandidateReport['proposed_window'];
  historical_hints?: HistoryHint[];
  observations: Observation[];
  trace: TraceEntry[];
}
export interface RunOptions {
  planner: Planner;
  provider: CurrentEvidenceProvider;
  history?: HistoryOptions;
  owner_evidence?: OwnerEvidence[];
  /** Safe metadata only: no model text, source payloads, scope or credentials. */
  onProgress?: (event: InvestigationProgress) => void;
  limits?: {
    tool_timeout_ms?: number;
    planner_timeout_ms?: number;
    planner_interval_ms?: number;
    total_timeout_ms?: number;
    candidate_attempts?: number;
    planner_calls?: number;
  };
}

export type InvestigationProgress =
  | ({ event: 'history' } & HistoryProgress)
  | {
      event: 'planner_context';
      history_hint_count: number;
      checks: HistoryHint['priority'][];
    }
  | { event: 'planner_start'; call: number; timeout_ms: number }
  | { event: 'planner_pause'; delay_ms: number }
  | {
      event: 'planner_retry';
      call: number;
      attempt: number;
      delay_ms: number;
      failure_code: PlannerFailureCode;
    }
  | {
      event: 'tool_retry';
      tool: ToolAction['tool'];
      retry_count: number;
      delay_ms: number;
    }
  | {
      event: 'activity';
      message: string;
      elapsed_ms: number;
      remaining_ms: number;
    }
  | {
      event: 'trace';
      trace_id: string;
      confidence: TraceEntry['confidence'];
      retry_count: number | null;
      step: number;
      phase: TraceEntry['phase'];
      action?: Action['type'];
      tool?: ToolAction['tool'];
      status?: TraceEntry['status'];
      failure_code?: TraceEntry['failure_code'];
      provider_error?: TraceEntry['provider_error'];
    };

class BoundedTimeout extends Error {}

// Bounds our wait even when an adapter ignores cancellation. Aborting cannot undo remote writes.
async function bounded<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  milliseconds: number,
  onWait?: (elapsed: number, remaining: number) => void,
): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await observeWait(
      () =>
        Promise.race([
          Promise.resolve().then(() => fn(controller.signal)),
          new Promise<never>((_, reject) => {
            timer = setTimeout(() => {
              controller.abort();
              reject(new BoundedTimeout('deadline'));
            }, milliseconds);
          }),
        ]),
      milliseconds,
      onWait,
    );
  } finally {
    if (timer) clearTimeout(timer);
    controller.abort();
  }
}
async function observeWait<T>(
  fn: () => Promise<T>,
  milliseconds: number,
  onWait?: (elapsed: number, remaining: number) => void,
): Promise<T> {
  const started = Date.now();
  const update = () =>
    onWait?.(
      Date.now() - started,
      Math.max(0, milliseconds - (Date.now() - started)),
    );
  update();
  const heartbeat = onWait ? setInterval(update, 2000) : undefined;
  try {
    return await fn();
  } finally {
    if (heartbeat) clearInterval(heartbeat);
  }
}
function limit(
  value: number | undefined,
  fallback: number,
  maximum: number,
): number {
  const n = value ?? fallback;
  if (!Number.isInteger(n) || n < 1 || n > maximum)
    throw new Error('Invalid investigation limit');
  return n;
}
export const usable = (o: Observation | undefined): o is Observation =>
  !!o &&
  (o.status === 'ok' || o.status === 'partial' || o.status === 'no_match') &&
  o.data !== null;
export { overlaps } from './policy.ts';

export async function runInvestigation(
  input: InvestigationRequest,
  options: RunOptions,
): Promise<InvestigationReport> {
  const request = validateRequest(input);
  const investigation_id = randomUUID();
  const start = Date.now();
  const started_at = new Date(start).toISOString();
  const ownerEvidence =
    options.owner_evidence === undefined
      ? undefined
      : validateOwnerEvidence(options.owner_evidence, request, started_at);
  if (Date.parse(request.window.to) > start)
    throw new Error('Observation window cannot end in the future');
  const toolTimeout = limit(options.limits?.tool_timeout_ms, 5_000, 30_000);
  const plannerTimeout = limit(
    options.limits?.planner_timeout_ms,
    options.planner.mode === 'live' ? MODEL_PLANNER_TIMEOUT_MS : 15_000,
    MODEL_PLANNER_TIMEOUT_MS,
  );
  const plannerInterval = options.limits?.planner_interval_ms ?? 0;
  if (
    !Number.isInteger(plannerInterval) ||
    plannerInterval < 0 ||
    plannerInterval > 60_000
  )
    throw new Error('Invalid planner interval');
  const maxCandidate = limit(options.limits?.candidate_attempts, 12, 12);
  const maxPlanner = limit(
    options.limits?.planner_calls,
    2 + 7 * request.max_candidates,
    2 + 7 * request.max_candidates,
  ); // Retain the existing aggregate cap, including planner recovery attempts.
  const total = limit(
    options.limits?.total_timeout_ms,
    options.planner.mode === 'live' ? INVESTIGATION_TIMEOUT_MS : 120_000,
    INVESTIGATION_TIMEOUT_MS,
  );
  const workDeadline =
    start +
    total -
    Math.min(REPORT_FINALIZATION_RESERVE_MS, Math.floor(total / 10));
  const history = new InvestigationHistory(
    options.history ?? {},
    {
      account_id: request.account_id,
      region: request.region,
    },
    (event) => options.onProgress?.({ event: 'history', ...event }),
  );
  let historicalHints: HistoryHint[] = [];
  const evidence: Observation[] = [];
  const trace: TraceEntry[] = [];
  const gaps: string[] = [];
  const actions = new Set<string>();
  let candidate: CandidateReport | null = null;
  const candidates: CandidateReport[] = [];
  let pending: string[] = [];
  let totalCandidateAttempts = 0;
  let discoveredCount = 0;
  let discoveryAttempts = 0;
  let candidateAttempts = 0;
  let plannerCalls = 0;
  let candidatePlannerCalls = 0;
  let plannerFailures = 0;
  let stopReason = 'planner_budget_exhausted';
  let degraded = false;
  let discoveryFailed = false;
  let runtimeExhausted = false;
  let toolCancelled = false;
  const add = (
    phase: TraceEntry['phase'],
    reason: string,
    ids: string[] = [],
    extra: Partial<TraceEntry> = {},
  ) => {
    const entry: TraceEntry = {
      timestamp: new Date().toISOString(),
      trace_id: investigation_id,
      confidence: traceConfidence(
        extra.failure_code ? 'error' : extra.status,
        evidence.filter((o) => ids.includes(o.evidence_id)),
      ),
      retry_count: 0,
      step: trace.length + 1,
      phase,
      reason,
      evidence_ids: ids,
      ...extra,
    };
    trace.push(entry);
    options.onProgress?.({
      event: 'trace',
      trace_id: entry.trace_id,
      confidence: entry.confidence,
      retry_count: entry.retry_count,
      step: trace.length,
      phase,
      action: extra.action?.type,
      tool: extra.action?.type === 'tool' ? extra.action.tool : undefined,
      status: extra.status,
      failure_code: extra.failure_code,
      provider_error: extra.provider_error,
    });
  };
  const failDiscovery = (tool: ToolAction['tool']) => {
    discoveryFailed = true;
    stopReason = `required_tool_failed:${tool}`;
    const reason = `Required tool ${tool} failed; investigation stopped before candidate evaluation. Fix the tool access or source and rerun. Shutdown safety was not assessed.`;
    gaps.push(reason);
    add('evaluator', reason);
  };
  const find = (tool: string) =>
    evidence.find(
      (o) =>
        o.tool === tool &&
        (o.scope.instance_id === undefined ||
          o.scope.instance_id === candidate?.instance_id),
    );
  const remaining = (timeout: number) =>
    Math.max(1, Math.min(timeout, workDeadline - Date.now()));
  const activity = (message: string) =>
    options.onProgress
      ? (elapsed_ms: number, remaining_ms: number) =>
          options.onProgress?.({
            event: 'activity',
            message,
            elapsed_ms,
            remaining_ms,
          })
      : undefined;
  const working = <T>(
    message: string,
    fn: (signal: AbortSignal) => Promise<T>,
    timeout: number,
  ) => bounded(fn, timeout, activity(message));
  const pause = (message: string, delay: number) =>
    observeWait(
      () => new Promise<void>((resolve) => setTimeout(resolve, delay)),
      delay,
      activity(message),
    );
  const select = async (instance: string) => {
    const inventory = find('list_ec2_instances');
    const billing = find('get_ec2_billing');
    if (!usable(inventory)) throw new Error('Discovery required');
    historicalHints = [];
    if (
      !runtimeExhausted &&
      !toolCancelled &&
      Date.now() < workDeadline &&
      plannerCalls < maxPlanner
    ) {
      try {
        historicalHints = await working(
          'Reading historical context; current evidence remains authoritative',
          (signal) =>
            history.recall(instance, started_at, signal, options.provider.mode),
          remaining(total),
        );
      } catch (error) {
        if (!(error instanceof BoundedTimeout)) throw error;
        runtimeExhausted = true;
        for (const source of ['zetaris', 'hmem'] as const)
          if (history.result[source] === 'not_queried')
            history.result[source] = 'unavailable';
        history.result.limitations.push(
          'History recall exceeded the aggregate investigation deadline; unresolved candidates deferred.',
        );
      }
    }
    if (historicalHints.length)
      add(
        'evaluator',
        'Historical context prioritizes fresh checks only; current evidence still controls the verdict.',
      );
    const selectedCandidate: CandidateReport = {
      instance_id: instance,
      selection_reason:
        'Selected from validated running inventory, ordered by available compute spend then instance ID. Missing billing is unknown, not zero spend.',
      selection_evidence_ids: [
        inventory.evidence_id,
        ...(usable(billing) ? [billing.evidence_id] : []),
      ],
      proposed_window: null,
      verdict: 'needs_verification',
      explanation: 'Operational safety has not been established.',
      supporting_evidence_ids: [],
      contradicting_evidence_ids: [],
      hypotheses: [],
      risks: ['Stopping requires an authorized human decision.'],
      missing_checks: [],
      assumptions: [
        'UTC daily same-day schedule only; exceptions are not inferred.',
        'Savings eligibility, commitments and retained charges have not been established.',
      ],
      next_human_actions: [
        'Verify missing operational constraints with the resource owner before considering any shutdown.',
      ],
      estimated_monthly_savings: null,
      savings_calculation: null,
    };
    add(
      'evaluator',
      selectedCandidate.selection_reason,
      selectedCandidate.selection_evidence_ids,
    );
    return selectedCandidate;
  };
  for (;;) {
    while (plannerCalls < maxPlanner) {
      if (runtimeExhausted || toolCancelled || Date.now() >= workDeadline) {
        stopReason = toolCancelled
          ? 'tool_cancelled'
          : 'total_runtime_exhausted';
        break;
      }
      if (candidate && candidatePlannerCalls >= 7) {
        stopReason = 'planner_budget_exhausted';
        break;
      }
      const automaticInventory = discoveryAttempts === 0;
      let action: Action;
      let plannerRetryCount = 0;
      if (automaticInventory) {
        // Inventory is a prerequisite, not a model decision. Reuse the executor
        // below so validation, retries, cancellation and deadlines stay identical.
        action = {
          type: 'tool',
          tool: 'list_ec2_instances',
          args: {
            account_id: request.account_id,
            region: request.region,
            window: structuredClone(request.window),
          },
          reason:
            'Required scoped EC2 discovery before the first planner call.',
        };
      } else {
        if (plannerInterval) {
          const delay = remaining(plannerInterval);
          options.onProgress?.({ event: 'planner_pause', delay_ms: delay });
          await pause('Waiting for planner pacing', delay);
          if (Date.now() >= workDeadline) {
            runtimeExhausted = true;
            stopReason = 'total_runtime_exhausted';
            break;
          }
        }
        plannerCalls++;
        if (candidate) candidatePlannerCalls++;
        const plannerUsesRuntimeDeadline =
          workDeadline - Date.now() <= plannerTimeout;
        const plannerDeadline = remaining(plannerTimeout);
        options.onProgress?.({
          event: 'planner_start',
          call: plannerCalls,
          timeout_ms: plannerDeadline,
        });
        const applicableHints = applicableHistoryHints(
          historicalHints,
          candidate?.proposed_window,
        );
        options.onProgress?.({
          event: 'planner_context',
          history_hint_count: applicableHints.length,
          checks: applicableHints.map((hint) => hint.priority),
        });
        plannerRetryCount = plannerFailures;
        let validatingAction = false;
        try {
          const value = await working(
            `Waiting for planner call ${plannerCalls}`,
            (signal) =>
              options.planner.next(
                {
                  request: structuredClone(request),
                  candidate_id: candidate?.instance_id ?? null,
                  proposed_window: structuredClone(
                    candidate?.proposed_window ?? null,
                  ),
                  historical_hints: structuredClone(historicalHints),
                  observations: structuredClone(
                    evidence.filter(
                      (o) =>
                        o.scope.instance_id === undefined ||
                        o.scope.instance_id === candidate?.instance_id,
                    ),
                  ),
                  trace: structuredClone(
                    trace.filter(
                      (t) =>
                        t.action?.type !== 'tool' ||
                        t.action.args.instance_id === undefined ||
                        t.action.args.instance_id === candidate?.instance_id,
                    ),
                  ),
                },
                signal,
              ),
            plannerDeadline,
          );
          validatingAction = true;
          action = validateAction(value);
          if (plannerFailures)
            add(
              'evaluator',
              'Planner recovered after a transient failure; continuing with the retained evidence.',
            );
          plannerFailures = 0;
        } catch (error) {
          runtimeExhausted =
            Date.now() >= workDeadline ||
            (error instanceof BoundedTimeout && plannerUsesRuntimeDeadline);
          stopReason = runtimeExhausted
            ? 'total_runtime_exhausted'
            : 'planner_unavailable_or_invalid';
          const failureCode =
            error instanceof BoundedTimeout
              ? runtimeExhausted
                ? 'investigation_deadline_exceeded'
                : 'planner_timeout'
              : validatingAction
                ? 'planner_invalid_action'
                : sanitizedPlannerFailure(error);
          add(
            'planner',
            'Planner failed, timed out, or returned an invalid action.',
            [],
            {
              retry_count: plannerRetryCount,
              failure_code: failureCode,
              ...(error instanceof ModelHttpError
                ? { provider_error: error.provider_error }
                : {}),
            },
          );
          plannerFailures++;
          const transient =
            /^(model_http_(408|429|5\d\d)|model_transport_unavailable|model_timeout|planner_timeout)$/.test(
              failureCode,
            );
          if (
            options.planner.mode === 'live' &&
            transient &&
            !runtimeExhausted &&
            plannerFailures < 3 &&
            plannerCalls < maxPlanner &&
            (!candidate || candidatePlannerCalls < 7)
          ) {
            const backoff = 2000 * 2 ** (plannerFailures - 1);
            const delay = Math.max(
              Math.round(backoff * (1 + Math.random() * 0.25)),
              error instanceof ModelHttpError ? (error.retry_after_ms ?? 0) : 0,
            );
            if (delay >= workDeadline - Date.now()) {
              runtimeExhausted = true;
              stopReason = 'total_runtime_exhausted';
              add(
                'evaluator',
                'Insufficient investigation time for the required planner retry delay; unresolved work deferred.',
              );
              break;
            }
            options.onProgress?.({
              event: 'planner_retry',
              call: plannerCalls,
              attempt: plannerFailures + 1,
              delay_ms: delay,
              failure_code: failureCode,
            });
            await pause(
              `Planner retry ${plannerFailures + 1}/3 after ${failureCode}; waiting before next call`,
              delay,
            );
            continue;
          }
          add(
            'evaluator',
            `Planner stopped: ${runtimeExhausted ? 'investigation deadline exhausted' : transient ? 'retry or call budget exhausted' : 'failure is not retryable'}. Retaining completed evidence; unresolved safety remains unknown.`,
          );
          break;
        }
      }
      // Planner text is explanatory, never a verdict or authority to execute a write.
      if (action.type === 'finish') {
        add('planner', action.reason, [], {
          action,
          retry_count: plannerRetryCount,
        });
        stopReason =
          candidate?.verdict === 'not_recommended'
            ? 'hypothesis_contradicted'
            : 'planner_finished';
        break;
      }
      if (action.type === 'propose') {
        const metrics = find('get_ec2_metrics');
        const metricData = usable(metrics)
          ? (metrics.data as MetricsData)
          : null;
        if (
          !candidate ||
          candidate.proposed_window ||
          !metricData ||
          !supportsTentativeWindow(metrics) ||
          JSON.stringify(action.window) !==
            JSON.stringify(metricData.suggested_window) ||
          action.evidence_ids.length !== 1 ||
          action.evidence_ids[0] !== metrics?.evidence_id
        ) {
          stopReason = 'unsupported_hypothesis';
          break;
        }
        add('planner', action.reason, action.evidence_ids, {
          action,
          retry_count: plannerRetryCount,
        });
        candidate.proposed_window = action.window;
        candidate.hypotheses.push({
          window: action.window,
          state: 'proposed',
          evidence_ids: action.evidence_ids,
          reason:
            'The retrieved utilization window is a tentative question; whole-period CPU statistics do not establish window safety.',
        });
        candidate.supporting_evidence_ids.push(...action.evidence_ids);
        add(
          'evaluator',
          'Tentative window proposed. Require fresh targeted operational checks; utilization alone is not scheduling authority.',
          action.evidence_ids,
        );
        continue;
      }
      const a = action.args;
      if (
        a.account_id !== request.account_id ||
        a.region !== request.region ||
        a.window.from !== request.window.from ||
        a.window.to !== request.window.to
      ) {
        stopReason = 'action_scope_mismatch';
        break;
      }
      const discovery =
        action.tool === 'list_ec2_instances' ||
        action.tool === 'get_ec2_billing';
      if (
        action.tool === 'get_ec2_billing' &&
        !usable(find('list_ec2_instances'))
      ) {
        stopReason = 'inventory_required';
        gaps.push(
          'list_ec2_instances must establish inventory access before billing can execute. Investigation stopped.',
        );
        break;
      }
      if (
        discovery
          ? !!candidate
          : !candidate || a.instance_id !== candidate.instance_id
      ) {
        stopReason = 'action_resource_mismatch';
        break;
      }
      if (
        action.tool === 'get_ec2_operations' &&
        a.proposed_window !== undefined &&
        (!candidate?.proposed_window ||
          JSON.stringify(a.proposed_window) !==
            JSON.stringify(candidate.proposed_window))
      ) {
        stopReason = 'challenge_window_mismatch';
        break;
      }
      const signature = JSON.stringify([
        action.tool,
        a.account_id,
        a.region,
        a.instance_id,
        a.window,
        a.proposed_window,
      ]);
      if (actions.has(signature)) {
        stopReason = 'repeated_action';
        break;
      }
      if (
        discovery ? discoveryAttempts >= 8 : candidateAttempts >= maxCandidate
      ) {
        stopReason = 'tool_budget_exhausted';
        break;
      }
      add(automaticInventory ? 'evaluator' : 'planner', action.reason, [], {
        action,
        retry_count: plannerRetryCount,
      });
      actions.add(signature);
      let observation: Observation | undefined;
      let toolRetryCount = 0;
      let invalidEvidence = false;
      for (;;) {
        if (discovery) discoveryAttempts++;
        else {
          candidateAttempts++;
          totalCandidateAttempts++;
        }
        const toolUsesRuntimeDeadline =
          workDeadline - Date.now() <= toolTimeout;
        let validatingObservation = false;
        let retryable = true;
        try {
          const raw = await working(
            `Collecting current evidence: ${action.tool} (retry ${toolRetryCount}/3)`,
            (signal) =>
              options.provider.call(
                structuredClone(action) as ToolAction,
                signal,
              ),
            remaining(toolTimeout),
          );
          validatingObservation = true;
          observation = validateObservation(raw, action, {
            started_at,
            now: new Date().toISOString(),
            mode: options.provider.mode,
          });
          if (evidence.some((o) => o.evidence_id === observation?.evidence_id))
            throw new Error('Duplicate evidence id');
          if (
            observation.status !== 'error' &&
            observation.status !== 'unavailable'
          )
            break;
        } catch (error) {
          observation = undefined;
          invalidEvidence = validatingObservation;
          // Invalid payloads and cancellation are trust/cancellation boundaries,
          // not temporary source outages. Raw exception details stay private.
          toolCancelled = error instanceof Error && error.name === 'AbortError';
          retryable = !validatingObservation && !toolCancelled;
          if (
            Date.now() >= workDeadline ||
            (error instanceof BoundedTimeout && toolUsesRuntimeDeadline)
          )
            runtimeExhausted = true;
        }
        const canRetry =
          retryable &&
          !runtimeExhausted &&
          toolRetryCount < 3 &&
          (discovery
            ? discoveryAttempts < 8
            : candidateAttempts < maxCandidate);
        const delay = Math.round(
          2000 * 2 ** toolRetryCount * (1 + Math.random() * 0.25),
        );
        const fitsDeadline = delay < workDeadline - Date.now();
        // Only the final response enters the evidence registry. Earlier failed
        // attempts remain in the trace; they cannot shadow a recovered response.
        if (!canRetry || !fitsDeadline) {
          if (canRetry && !fitsDeadline) runtimeExhausted = true;
          if (!observation) {
            add(
              'tool',
              'Tool failed, timed out, or returned invalid scoped evidence; no payload retained.',
              [],
              { action, status: 'error', retry_count: toolRetryCount },
            );
          }
          break;
        }
        add(
          'tool',
          observation
            ? `${action.tool}: ${observation.status}; retrying the same read-only action after backoff.`
            : 'Tool failed or timed out; retrying the same read-only action after backoff. No payload retained.',
          [],
          {
            action,
            status: observation?.status ?? 'error',
            retry_count: toolRetryCount,
          },
        );
        observation = undefined;
        toolRetryCount++;
        options.onProgress?.({
          event: 'tool_retry',
          tool: action.tool,
          retry_count: toolRetryCount,
          delay_ms: delay,
        });
        await pause(
          `Tool ${action.tool} retry ${toolRetryCount}/3; waiting before next call`,
          delay,
        );
        if (Date.now() >= workDeadline) {
          runtimeExhausted = true;
          break;
        }
      }
      if (!observation) {
        degraded = true;
        gaps.push(
          `${action.tool}: timed out, failed, or returned invalid scoped evidence`,
        );
        if (
          action.tool === 'get_ec2_billing' &&
          !invalidEvidence &&
          !toolCancelled &&
          !runtimeExhausted
        ) {
          const inventory = find('list_ec2_instances');
          if (usable(inventory)) {
            pending = rankCandidates(
              inventory.data as InventoryData,
              null,
              request.max_candidates,
              true,
            );
            const next = pending.shift();
            if (next) candidate = await select(next);
            else stopReason = 'no_eligible_candidates';
            if (candidate) continue;
          }
        }
        if (discovery) failDiscovery(action.tool);
        if (toolCancelled) stopReason = 'tool_cancelled';
        if (runtimeExhausted || discovery || toolCancelled) break;
        continue;
      }
      evidence.push(observation);
      // Keep trace text within its 400-character contract; the cited observation
      // retains the complete missing-fields list. Never include raw provider errors.
      const missingFields = observation.missing_fields.join(', ');
      const observationReason =
        `${observation.tool}: ${observation.status}; coverage ${observation.coverage.complete ? 'complete' : 'incomplete'}, ${observation.coverage.authoritative ? 'authoritative' : 'non-authoritative'}.` +
        (missingFields
          ? ` Missing fields: ${missingFields.slice(0, 250)}${missingFields.length > 250 ? '…' : ''}.`
          : '');
      add('tool', observationReason, [observation.evidence_id], {
        action,
        status: observation.status,
        retry_count: toolRetryCount,
      });
      for (const hint of historicalHints) {
        if (
          hint.lesson &&
          candidate?.proposed_window &&
          sameSchedule(hint.lesson.window, candidate.proposed_window) &&
          observation.tool === lessonTool(hint.lesson.check)
        ) {
          const outcome = assessOperationalCheck(
            hint.lesson.check,
            candidate.proposed_window,
            observation,
          );
          add(
            'evaluator',
            `Historical lesson ${hint.context_id}: ${hint.lesson.check} ${outcome} by fresh evidence; ${outcome === 'not_observed' ? 'old conflict does not justify rejection; continue safety checks' : outcome === 'unresolved' ? 'unknown; old conflict cannot substitute for missing evidence' : 'current evidence controls the verdict'}.`,
            [observation.evidence_id],
          );
        }
      }
      if (
        (observation.status !== 'ok' && observation.status !== 'no_match') ||
        !observation.coverage.complete ||
        !observation.coverage.authoritative ||
        observation.missing_fields.length
      ) {
        degraded = true;
        gaps.push(observationReason);
        if (
          observation.tool === 'list_ec2_instances' &&
          (observation.status === 'unavailable' ||
            observation.status === 'error') &&
          observation.missing_fields.includes('ACCESS_DENIED')
        )
          gaps.push(
            'AWS denied inventory access before candidate evaluation. Verify the server AWS_PROFILE and ec2:DescribeInstances permission for the requested account/region; restart the server with the intended profile and rerun. Shutdown safety was not assessed.',
          );
      }
      if (action.tool === 'list_ec2_instances' && !usable(observation)) {
        failDiscovery(action.tool);
        break;
      }
      if (!candidate) {
        const inventory = find('list_ec2_instances');
        const billing = find('get_ec2_billing');
        if (usable(inventory))
          discoveredCount = (inventory.data as InventoryData).instances.length;
        if (usable(inventory) && discoveredCount === 0) {
          stopReason = 'no_eligible_candidates';
          break;
        }
        if (usable(inventory) && action.tool === 'get_ec2_billing') {
          const eligible = rankCandidates(
            inventory.data as InventoryData,
            usable(billing) ? (billing.data as BillingData) : null,
            request.max_candidates,
            true,
          );
          if (!eligible.length) {
            stopReason = 'no_eligible_candidates';
            break;
          }
          pending = eligible;
          const next = pending.shift();
          if (!next) throw new Error('Eligible candidate required');
          candidate = await select(next);
        }
        continue;
      }
      const proposedWindow = candidate.proposed_window;
      if (proposedWindow && usable(observation)) {
        const explanation = conflictExplanation(
          request,
          proposedWindow,
          observation,
        );
        if (explanation && candidate.verdict !== 'not_recommended') {
          candidate.verdict = 'not_recommended';
          candidate.explanation = explanation;
          candidate.contradicting_evidence_ids = [observation.evidence_id];
          candidate.hypotheses.push({
            window: proposedWindow,
            state: 'contradicted',
            evidence_ids: [observation.evidence_id],
            reason: candidate.explanation,
          });
          add('evaluator', candidate.explanation, [observation.evidence_id]);
          stopReason = 'hypothesis_contradicted';
        }
      }
      if (
        candidate.verdict === 'not_recommended' &&
        find('get_ec2_operations') &&
        find('get_ec2_dependencies')
      ) {
        stopReason = 'hypothesis_contradicted';
        break;
      }
    }
    if (candidate && candidate.verdict === 'needs_verification') {
      const assessment = assessScheduling(request, candidate, evidence, false);
      candidate.missing_checks.push(...assessment.missing_checks);
      if (!candidate.missing_checks.length)
        candidate.missing_checks.push(
          'Authorized human shutdown decision is not supplied by CCI. Review the retrieved evidence and obtain approval through the external change process.',
        );
      candidate.explanation = isExpectedAwsCoverageLimit(
        candidate.missing_checks[0],
      )
        ? 'Decision deferred. AWS operational checks completed, but native AWS sources cannot establish all workload jobs, dependencies, or owner clearance. No shutdown recommendation is issued.'
        : `Decision deferred. ${candidate.missing_checks[0].slice(0, 200)} No shutdown recommendation is issued.`;
      if (assessment.proof) {
        candidate.supporting_evidence_ids = assessment.proof.map(
          (o) => o.evidence_id,
        );
        candidate.explanation =
          'No conflict was established by the completed checks. Technical evidence is present; an authorized human shutdown decision remains outside CCI. Decision deferred; this is not a recommendation.';
      }
      const metrics = find('get_ec2_metrics');
      if (metrics?.data && 'average_cpu_percent' in metrics.data) {
        candidate.explanation += ` Observed CPU average ${metrics.data.average_cpu_percent.toFixed(2)}%, peak ${metrics.data.peak_cpu_percent.toFixed(2)}%; ${metrics.coverage.complete ? 'complete' : 'incomplete'} coverage. Low CPU does not prove absence of jobs or dependencies.`;
        candidate.supporting_evidence_ids = [
          ...new Set([
            ...candidate.supporting_evidence_ids,
            metrics.evidence_id,
          ]),
        ];
      }
      candidate.explanation = candidate.explanation.slice(0, 400);
      const humanActions = nextHumanActions(candidate.missing_checks);
      candidate.next_human_actions = humanActions.length
        ? [
            ...humanActions,
            'Rerun the investigation with fresh evidence after resolving these checks; obtain authorized human approval before any infrastructure change.',
          ]
        : [
            'Obtain authorized human approval through the external change process before any infrastructure change.',
          ];
      if (candidate.proposed_window)
        candidate.hypotheses.push({
          window: candidate.proposed_window,
          state: 'unresolved',
          evidence_ids: [],
          reason: candidate.explanation,
        });
      add('evaluator', candidate.explanation);
    }
    if (candidate?.verdict === 'not_recommended') {
      if (!find('get_ec2_operations') || !find('get_ec2_dependencies'))
        degraded = true;
      candidate.next_human_actions = [
        'Keep the proposed window rejected; review the cited conflict with the resource owner.',
      ];
      candidate.missing_checks = [
        'Other shutdown windows have not been evaluated.',
        ...(['get_ec2_operations', 'get_ec2_dependencies'] as const)
          .filter((tool) => !find(tool))
          .map((tool) => `${tool}: not queried; requires fresh verification`),
      ];
    }
    if (candidate) candidates.push(candidate);
    const next = pending.shift();
    if (!next) break;
    candidateAttempts = 0;
    candidatePlannerCalls = 0;
    plannerFailures = 0;
    candidate = null;
    stopReason = 'planner_budget_exhausted';
    candidate = await select(next);
  }
  if (runtimeExhausted || Date.now() >= workDeadline) {
    runtimeExhausted = true;
    stopReason = 'total_runtime_exhausted';
  }
  add('finish', stopReason);
  const report: InvestigationReport = {
    investigation_id,
    goal: 'evaluate_ec2_off_hours_scheduling',
    decision_policy: 'reject_or_defer',
    request,
    ...(ownerEvidence === undefined ? {} : { owner_evidence: ownerEvidence }),
    started_at,
    finished_at: new Date().toISOString(),
    completion_status: discoveryFailed
      ? 'failed'
      : !runtimeExhausted &&
          candidates.length > 0 &&
          candidates.every((c) => c.verdict !== 'needs_verification') &&
          !degraded
        ? 'complete'
        : !runtimeExhausted &&
            stopReason === 'no_eligible_candidates' &&
            !degraded
          ? 'complete'
          : evidence.length
            ? 'partial'
            : 'failed',
    integration_mode: options.provider.mode,
    planner: { mode: options.planner.mode, model: options.planner.model },
    discovery: {
      discovered_count: discoveredCount,
      candidate_limit: request.max_candidates,
      gaps,
    },
    candidates,
    evidence,
    trace,
    historical_context: history.result,
    budget: {
      discovery_attempts: discoveryAttempts,
      candidate_attempts: totalCandidateAttempts,
      planner_calls: plannerCalls,
      elapsed_ms: Date.now() - start,
    },
    limitations: [
      'CCI only rejects or defers the evaluated window. No found conflict is not approval; any infrastructure change requires an external authorized human decision. New savings are not produced.',
      ...(options.planner.mode === 'scripted'
        ? [
            'Scripted planner exercises deterministic behavior; no model call was made.',
          ]
        : [
            'The configured live model is not independently verified as event-approved.',
          ]),
    ],
    stop_reason: stopReason,
  };
  validateReport(report);
  const markDeadlineExhausted = () => {
    report.stop_reason = 'total_runtime_exhausted';
    report.completion_status =
      discoveryFailed || !evidence.length ? 'failed' : 'partial';
    trace[trace.length - 1].reason = report.stop_reason;
  };
  if (toolCancelled) {
    report.historical_context.limitations.push(
      'History persistence skipped: investigation cancelled.',
    );
  } else if (runtimeExhausted || Date.now() >= workDeadline) {
    markDeadlineExhausted();
    report.historical_context.limitations.push(
      'History persistence skipped: aggregate investigation deadline exhausted.',
    );
  } else {
    try {
      await working(
        'Finalizing report and historical records',
        (signal) => history.persist(report, signal),
        remaining(total),
      );
    } catch (error) {
      if (!(error instanceof BoundedTimeout)) throw error;
      markDeadlineExhausted();
      report.historical_context.limitations.push(
        'History persistence exceeded the aggregate investigation deadline; writes may have completed. Inspect history before retrying; no automatic retry was made.',
      );
    }
  }
  report.finished_at = new Date().toISOString();
  report.budget.elapsed_ms = Date.now() - start;
  return validateReport(report);
}
