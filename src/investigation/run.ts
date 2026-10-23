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
  type OperationsData,
  type DependenciesData,
  type ToolAction,
  type TraceEntry,
  validateAction,
  validateObservation,
  validateRequest,
} from '../contracts.ts';
import { validateReport } from './report.ts';
import type { Planner } from './planner.ts';
import type { CurrentEvidenceProvider } from './mock.ts';

export interface PlannerState {
  request: InvestigationRequest;
  candidate_id: string | null;
  proposed_window: CandidateReport['proposed_window'];
  observations: Observation[];
  trace: TraceEntry[];
}
export interface RunOptions {
  planner: Planner;
  provider: CurrentEvidenceProvider;
  limits?: {
    tool_timeout_ms?: number;
    planner_timeout_ms?: number;
    total_timeout_ms?: number;
    candidate_attempts?: number;
    planner_calls?: number;
  };
}

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
          reject(new Error('deadline'));
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
export const overlaps = (
  a: { start_hour_utc: number; end_hour_utc: number },
  b: { start_hour_utc: number; end_hour_utc: number },
): boolean =>
  a.start_hour_utc < b.end_hour_utc && b.start_hour_utc < a.end_hour_utc;

export async function runInvestigation(
  input: InvestigationRequest,
  options: RunOptions,
): Promise<InvestigationReport> {
  const request = validateRequest(input);
  const start = Date.now();
  const started_at = new Date(start).toISOString();
  if (Date.parse(request.window.to) > start)
    throw new Error('Observation window cannot end in the future');
  const total = limit(options.limits?.total_timeout_ms, 120_000, 120_000);
  const toolTimeout = limit(options.limits?.tool_timeout_ms, 5_000, 30_000);
  const plannerTimeout = limit(
    options.limits?.planner_timeout_ms,
    15_000,
    30_000,
  );
  const maxCandidate = limit(options.limits?.candidate_attempts, 6, 6);
  const maxPlanner = limit(options.limits?.planner_calls, 9, 9); // 2 discovery + 7 per candidate
  const evidence: Observation[] = [];
  const trace: TraceEntry[] = [];
  const gaps: string[] = [];
  const actions = new Set<string>();
  let candidate: CandidateReport | null = null;
  let discoveredCount = 0;
  let discoveryAttempts = 0;
  let candidateAttempts = 0;
  let plannerCalls = 0;
  let candidatePlannerCalls = 0;
  let stopReason = 'planner_budget_exhausted';
  let degraded = false;
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
  };
  const find = (tool: string) => evidence.find((o) => o.tool === tool);
  const remaining = (timeout: number) =>
    Math.max(1, Math.min(timeout, start + total - Date.now()));
  while (plannerCalls < maxPlanner) {
    if (Date.now() >= start + total) {
      stopReason = 'total_runtime_exhausted';
      break;
    }
    if (candidate && candidatePlannerCalls >= 7) {
      stopReason = 'planner_budget_exhausted';
      break;
    }
    plannerCalls++;
    if (candidate) candidatePlannerCalls++;
    let action: Action;
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
              observations: structuredClone(evidence),
              trace: structuredClone(trace),
            },
            signal,
          ),
        remaining(plannerTimeout),
      );
      action = validateAction(value);
    } catch {
      stopReason = 'planner_unavailable_or_invalid';
      add(
        'planner',
        'Planner failed, timed out, or returned an invalid action.',
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
      const metricData = usable(metrics) ? (metrics.data as MetricsData) : null;
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
      action.tool === 'list_ec2_instances' || action.tool === 'get_ec2_billing';
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
    if (action.tool === 'get_ec2_dependencies' && !candidate?.proposed_window) {
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
    else candidateAttempts++;
    let observation: Observation;
    try {
      const raw = await bounded(
        (signal) =>
          options.provider.call(structuredClone(action) as ToolAction, signal),
        remaining(toolTimeout),
      );
      observation = validateObservation(raw, action, {
        started_at,
        now: new Date().toISOString(),
        mode: options.provider.mode,
      });
      if (evidence.some((o) => o.evidence_id === observation.evidence_id))
        throw new Error('Duplicate evidence id');
    } catch {
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
        const costs = (billing.data as BillingData).costs;
        const eligible = (inventory.data as InventoryData).instances
          .filter((i) => i.state === 'running')
          .flatMap((i) => {
            const cost = costs.find((c) => c.instance_id === i.instance_id);
            return cost && cost.compute_cost > 0
              ? [{ ...i, cost: cost.compute_cost }]
              : [];
          })
          .sort(
            (a, b) =>
              b.cost - a.cost || a.instance_id.localeCompare(b.instance_id),
          );
        if (!eligible.length) {
          stopReason = 'no_eligible_candidates';
          break;
        }
        const selected = eligible[0];
        candidate = {
          instance_id: selected.instance_id,
          selection_reason:
            'Highest observed compute cost among discovered running instances with positive matching billing; ties by instance ID.',
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
        };
        add(
          'evaluator',
          candidate.selection_reason,
          candidate.selection_evidence_ids,
        );
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
        'Positive scheduling clearance and calendar exception checks are outside this rejection-first slice.',
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
      'Other shutdown windows and unqueried sources have not been evaluated.',
    ];
  }
  if (Date.now() >= start + total && stopReason !== 'hypothesis_contradicted')
    stopReason = 'total_runtime_exhausted';
  add('finish', stopReason);
  const report: InvestigationReport = {
    investigation_id: randomUUID(),
    goal: 'evaluate_ec2_off_hours_scheduling',
    request,
    started_at,
    finished_at: new Date().toISOString(),
    completion_status:
      candidate?.verdict === 'not_recommended' && !degraded
        ? 'complete'
        : stopReason === 'no_eligible_candidates' && !degraded
          ? 'complete'
          : evidence.length
            ? 'partial'
            : 'failed',
    integration_mode: options.provider.mode,
    planner: { mode: options.planner.mode, model: options.planner.model },
    discovery: { discovered_count: discoveredCount, candidate_limit: 1, gaps },
    candidates: candidate ? [candidate] : [],
    evidence,
    trace,
    historical_context: {
      zetaris: 'not_configured',
      hmem: 'not_configured',
      context_ids: [],
      limitations: [
        'No historical services were read or written. First-run current evidence does not depend on history.',
      ],
    },
    budget: {
      discovery_attempts: discoveryAttempts,
      candidate_attempts: candidateAttempts,
      planner_calls: plannerCalls,
      elapsed_ms: Date.now() - start,
    },
    limitations: [
      'Single candidate, rejection-first slice; positive recommendations and savings calculation are deferred.',
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
  return validateReport(report);
}
