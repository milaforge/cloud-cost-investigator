import { randomUUID } from 'node:crypto';
import {
  type Action,
  type BillingData,
  type CandidateReport,
  type DependenciesData,
  type InventoryData,
  type InvestigationReport,
  type InvestigationRequest,
  type MetricsData,
  type Observation,
  type OperationsData,
  type ToolAction,
  type TraceEntry,
  validateAction,
  validateObservation,
  validateRequest,
} from '../contracts.ts';
import {
  type HistoryHint,
  type HistoryOptions,
  InvestigationHistory,
} from './history.ts';
import type { CurrentEvidenceProvider } from './mock.ts';
import {
  MODEL_PLANNER_TIMEOUT_MS,
  type Planner,
  sanitizedPlannerFailure,
} from './planner.ts';
import {
  schedulingProof,
  calculateSavings,
  rankCandidates,
  overlaps,
} from './policy.ts';
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
  | { event: 'planner_start'; call: number; timeout_ms: number }
  | { event: 'planner_pause'; delay_ms: number }
  | {
      event: 'trace';
      step: number;
      phase: TraceEntry['phase'];
      action?: Action['type'];
      tool?: ToolAction['tool'];
      status?: TraceEntry['status'];
      failure_code?: TraceEntry['failure_code'];
    };

class BoundedTimeout extends Error {}

// Also bounds adapters which ignore cancellation; only validated read-only tools reach here.
async function bounded<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  milliseconds: number,
): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Promise.resolve().then(() => fn(controller.signal)),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          reject(new BoundedTimeout('deadline'));
        }, milliseconds);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
    controller.abort();
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
  const start = Date.now();
  const started_at = new Date(start).toISOString();
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
  const maxCandidate = limit(options.limits?.candidate_attempts, 6, 6);
  const maxPlanner = limit(
    options.limits?.planner_calls,
    2 + 7 * request.max_candidates,
    2 + 7 * request.max_candidates,
  ); // 2 discovery + 7 per candidate
  const total = limit(
    options.limits?.total_timeout_ms,
    options.planner.mode === 'live'
      ? maxPlanner * (plannerTimeout + plannerInterval) + 120_000
      : 120_000,
    8_400_000, // 23 planner calls at maximum timeout + pacing, plus 2 minutes.
  );
  const history = new InvestigationHistory(options.history ?? {}, {
    account_id: request.account_id,
    region: request.region,
  });
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
  let stopReason = 'planner_budget_exhausted';
  let degraded = false;
  let runtimeExhausted = false;
  const add = (
    phase: TraceEntry['phase'],
    reason: string,
    ids: string[] = [],
    extra: Partial<TraceEntry> = {},
  ) => {
    trace.push({
      step: trace.length + 1,
      phase,
      reason,
      evidence_ids: ids,
      ...extra,
    });
    options.onProgress?.({
      event: 'trace',
      step: trace.length,
      phase,
      action: extra.action?.type,
      tool: extra.action?.type === 'tool' ? extra.action.tool : undefined,
      status: extra.status,
      failure_code: extra.failure_code,
    });
  };
  const find = (tool: string) =>
    evidence.find(
      (o) =>
        o.tool === tool &&
        (o.scope.instance_id === undefined ||
          o.scope.instance_id === candidate?.instance_id),
    );
  const remaining = (timeout: number) =>
    Math.max(1, Math.min(timeout, start + total - Date.now()));
  const select = async (instance: string) => {
    const inventory = find('list_ec2_instances');
    const billing = find('get_ec2_billing');
    if (!inventory || !billing) throw new Error('Discovery required');
    historicalHints =
      runtimeExhausted ||
      Date.now() >= start + total ||
      plannerCalls >= maxPlanner
        ? []
        : await history.recall(
            instance,
            started_at,
            AbortSignal.timeout(remaining(total)),
          );
    if (historicalHints.length)
      add(
        'evaluator',
        'Historical context prioritizes fresh checks only; current evidence still controls the verdict.',
      );
    const selectedCandidate: CandidateReport = {
      instance_id: instance,
      selection_reason:
        'Selected in descending observed compute cost among discovered running instances with positive matching billing; ties by instance ID.',
      selection_evidence_ids: [inventory.evidence_id, billing.evidence_id],
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
      if (runtimeExhausted || Date.now() >= start + total) {
        stopReason = 'total_runtime_exhausted';
        break;
      }
      if (candidate && candidatePlannerCalls >= 7) {
        stopReason = 'planner_budget_exhausted';
        break;
      }
      if (plannerInterval) {
        const delay = remaining(plannerInterval);
        options.onProgress?.({ event: 'planner_pause', delay_ms: delay });
        await new Promise<void>((resolve) => setTimeout(resolve, delay));
        if (Date.now() >= start + total) {
          runtimeExhausted = true;
          stopReason = 'total_runtime_exhausted';
          break;
        }
      }
      plannerCalls++;
      if (candidate) candidatePlannerCalls++;
      let action: Action;
      const plannerUsesRuntimeDeadline =
        start + total - Date.now() <= plannerTimeout;
      const plannerDeadline = remaining(plannerTimeout);
      options.onProgress?.({
        event: 'planner_start',
        call: plannerCalls,
        timeout_ms: plannerDeadline,
      });
      let validatingAction = false;
      try {
        const value = await bounded(
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
      } catch (error) {
        runtimeExhausted =
          error instanceof BoundedTimeout && plannerUsesRuntimeDeadline;
        stopReason = runtimeExhausted
          ? 'total_runtime_exhausted'
          : 'planner_unavailable_or_invalid';
        add(
          'planner',
          'Planner failed, timed out, or returned an invalid action.',
          [],
          {
            failure_code:
              error instanceof BoundedTimeout
                ? runtimeExhausted
                  ? 'investigation_deadline_exceeded'
                  : 'planner_timeout'
                : validatingAction
                  ? 'planner_invalid_action'
                  : sanitizedPlannerFailure(error),
          },
        );
        break;
      }
      // Planner text is explanatory, never a verdict or authority to execute a write.
      if (action.type === 'finish') {
        add('planner', action.reason, [], { action });
        stopReason = 'planner_finished';
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
          !metrics?.coverage.complete ||
          metrics.missing_fields.length ||
          metricData.average_cpu_percent > 10 ||
          metricData.peak_cpu_percent > 20 ||
          JSON.stringify(action.window) !==
            JSON.stringify(metricData.suggested_window) ||
          action.evidence_ids.length !== 1 ||
          action.evidence_ids[0] !== metrics.evidence_id
        ) {
          stopReason = 'unsupported_hypothesis';
          break;
        }
        add('planner', action.reason, action.evidence_ids, { action });
        candidate.proposed_window = action.window;
        candidate.hypotheses.push({
          window: action.window,
          state: 'proposed',
          evidence_ids: action.evidence_ids,
          reason:
            'Low observed average and peak CPU suggest a question; operational safety is unverified.',
        });
        candidate.supporting_evidence_ids.push(...action.evidence_ids);
        add(
          'evaluator',
          'Plausible window proposed. Require a fresh targeted operations challenge; low CPU is not scheduling authority.',
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
        discovery
          ? !!candidate
          : !candidate || a.instance_id !== candidate.instance_id
      ) {
        stopReason = 'action_resource_mismatch';
        break;
      }
      if (
        action.tool === 'get_ec2_operations' &&
        (!candidate?.proposed_window ||
          JSON.stringify(a.proposed_window) !==
            JSON.stringify(candidate.proposed_window))
      ) {
        stopReason = 'challenge_window_mismatch';
        break;
      }
      if (
        action.tool === 'get_ec2_dependencies' &&
        !candidate?.proposed_window
      ) {
        stopReason = 'hypothesis_required';
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
        discovery ? discoveryAttempts >= 2 : candidateAttempts >= maxCandidate
      ) {
        stopReason = 'tool_budget_exhausted';
        break;
      }
      add('planner', action.reason, [], { action });
      actions.add(signature);
      if (discovery) discoveryAttempts++;
      else {
        candidateAttempts++;
        totalCandidateAttempts++;
      }
      let observation: Observation;
      const toolUsesRuntimeDeadline = start + total - Date.now() <= toolTimeout;
      const toolDeadline = remaining(toolTimeout);
      try {
        const raw = await bounded(
          (signal) =>
            options.provider.call(
              structuredClone(action) as ToolAction,
              signal,
            ),
          toolDeadline,
        );
        observation = validateObservation(raw, action, {
          started_at,
          now: new Date().toISOString(),
          mode: options.provider.mode,
        });
        if (evidence.some((o) => o.evidence_id === observation.evidence_id))
          throw new Error('Duplicate evidence id');
      } catch (error) {
        degraded = true;
        gaps.push(
          `${action.tool}: timed out, failed, or returned invalid scoped evidence`,
        );
        add(
          'tool',
          'Tool failed, timed out, or returned invalid scoped evidence; no payload retained.',
          [],
          { action, status: 'error' },
        );
        if (error instanceof BoundedTimeout && toolUsesRuntimeDeadline) {
          runtimeExhausted = true;
          stopReason = 'total_runtime_exhausted';
          break;
        }
        continue;
      }
      evidence.push(observation);
      add(
        'tool',
        'Validated current-investigation observation registered.',
        [observation.evidence_id],
        { action, status: observation.status },
      );
      if (
        (observation.status !== 'ok' && observation.status !== 'no_match') ||
        !observation.coverage.complete ||
        !observation.coverage.authoritative ||
        observation.missing_fields.length
      ) {
        degraded = true;
        gaps.push(
          `${observation.tool}: ${observation.status}; critical coverage may be incomplete`,
        );
      }
      if (!candidate) {
        const inventory = find('list_ec2_instances');
        const billing = find('get_ec2_billing');
        if (usable(inventory))
          discoveredCount = (inventory.data as InventoryData).instances.length;
        if (usable(inventory) && usable(billing)) {
          const eligible = rankCandidates(
            inventory.data as InventoryData,
            billing.data as BillingData,
            request.max_candidates,
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
        let conflict = false;
        if (observation.tool === 'get_ec2_operations')
          conflict = (observation.data as OperationsData).jobs.some(
            (j) => j.critical && overlaps(j.window, proposedWindow),
          );
        if (observation.tool === 'get_ec2_dependencies')
          conflict = (observation.data as DependenciesData)
            .requires_continuous_operation;
        if (conflict) {
          candidate.verdict = 'not_recommended';
          candidate.explanation =
            observation.tool === 'get_ec2_operations'
              ? 'A retrieved critical job overlaps the proposed shutdown window; reject this window.'
              : 'A retrieved dependency requires continuous operation; reject this window.';
          candidate.contradicting_evidence_ids = [observation.evidence_id];
          candidate.hypotheses.push({
            window: proposedWindow,
            state: 'contradicted',
            evidence_ids: [observation.evidence_id],
            reason: candidate.explanation,
          });
          add('evaluator', candidate.explanation, [observation.evidence_id]);
          stopReason = 'hypothesis_contradicted';
          break;
        }
      }
      const proof = schedulingProof(request, candidate, evidence);
      if (proof && candidate.proposed_window) {
        candidate.verdict = 'conditional_recommendation';
        candidate.explanation =
          'Current complete operational evidence clears this window conditionally; obtain human approval and revalidate before execution.';
        candidate.supporting_evidence_ids = proof.map((o) => o.evidence_id);
        candidate.hypotheses.push({
          window: candidate.proposed_window,
          state: 'supported',
          evidence_ids: candidate.supporting_evidence_ids,
          reason: candidate.explanation,
        });
        candidate.assumptions = [
          'Clearance applies only to the specified UTC calendar month following the observation window and reviewed exclusions.',
          'Compute-only on-demand savings exclude retained storage, networking and other charges; subtract recovery overhead and round down to billing units.',
        ];
        candidate.next_human_actions = [
          'Obtain authorized human approval; revalidate jobs, dependencies, calendar exceptions and recovery readiness before scheduling.',
        ];
        const savings = calculateSavings(request, candidate, evidence);
        candidate.estimated_monthly_savings = savings?.amount ?? null;
        candidate.savings_calculation = savings?.calculation ?? null;
        if (!savings)
          candidate.missing_checks.push(
            'Savings require a valid marginal on-demand compute rate, known commitment treatment and retained-cost exclusions.',
          );
        add(
          'evaluator',
          candidate.explanation,
          candidate.supporting_evidence_ids,
        );
        stopReason = 'hypothesis_supported';
        break;
      }
    }
    if (candidate && candidate.verdict === 'needs_verification') {
      candidate.explanation =
        'Critical operational authority or complete evidence is unresolved; no shutdown recommendation is issued.';
      for (const tool of [
        'get_ec2_metrics',
        'get_ec2_operations',
        'get_ec2_dependencies',
      ]) {
        const obs = find(tool);
        if (
          !usable(obs) ||
          !obs.coverage.complete ||
          !obs.coverage.authoritative ||
          obs.missing_fields.length
        )
          candidate.missing_checks.push(
            `${tool}: require complete authoritative evidence`,
          );
      }
      if (!candidate.proposed_window)
        candidate.missing_checks.push(
          'No supported initial scheduling window established.',
        );
      if (!candidate.missing_checks.length)
        candidate.missing_checks.push(
          'Require matching owner, calendar and recovery clearance from operations and dependencies; all jobs, peaks and complete coverage must permit the window.',
        );
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
    candidate = null;
    stopReason = 'planner_budget_exhausted';
    candidate = await select(next);
  }
  if (
    runtimeExhausted ||
    (Date.now() >= start + total && stopReason !== 'hypothesis_contradicted')
  )
    stopReason = 'total_runtime_exhausted';
  add('finish', stopReason);
  const report: InvestigationReport = {
    investigation_id: randomUUID(),
    goal: 'evaluate_ec2_off_hours_scheduling',
    request,
    started_at,
    finished_at: new Date().toISOString(),
    completion_status:
      candidates.length > 0 &&
      candidates.every((c) => c.verdict !== 'needs_verification') &&
      !degraded
        ? 'complete'
        : stopReason === 'no_eligible_candidates' && !degraded
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
      'Conditional scheduling requires human approval. Savings are estimates for the UTC calendar month following the observation window, not all-in invoice reductions.',
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
  if (runtimeExhausted || Date.now() >= start + total) {
    report.historical_context.limitations.push(
      'History persistence skipped: aggregate investigation deadline exhausted.',
    );
  } else {
    await history.persist(report, AbortSignal.timeout(remaining(total)));
  }
  report.finished_at = new Date().toISOString();
  report.budget.elapsed_ms = Date.now() - start;
  return validateReport(report);
}
