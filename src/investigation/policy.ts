import type {
  BillingData,
  CandidateReport,
  DependenciesData,
  InvestigationRequest,
  InventoryData,
  MetricsData,
  Observation,
  OperationsData,
  SavingsCalculation,
  Schedule,
  SchedulingClearance,
  Window,
} from '../contracts.ts';

export const sameSchedule = (a: Schedule, b: Schedule) =>
  a.start_hour_utc === b.start_hour_utc && a.end_hour_utc === b.end_hour_utc;
export const overlaps = (a: Schedule, b: Schedule) =>
  a.start_hour_utc < b.end_hour_utc && b.start_hour_utc < a.end_hour_utc;
export const authoritative = (o: Observation | undefined): o is Observation =>
  !!o &&
  (o.status === 'ok' || o.status === 'no_match') &&
  o.data !== null &&
  o.coverage.complete &&
  o.coverage.authoritative &&
  o.missing_fields.length === 0;

/** Partial observations can motivate a question, never establish scheduling safety. */
export function supportsTentativeWindow(
  o: Observation | undefined,
): o is Observation & { data: MetricsData } {
  return (
    !!o &&
    o.tool === 'get_ec2_metrics' &&
    ['ok', 'partial'].includes(o.status) &&
    !!o.data &&
    'suggested_window' in o.data
  );
}

/** A daily proposal conflicts if any dated execution overlaps it in the planning month. */
export function schedulingConflict(
  request: InvestigationRequest,
  window: Schedule,
  observation: Observation,
  requireNamedDependency = false,
): 'critical_job' | 'scheduled_maintenance' | 'continuous_operation' | null {
  if (
    !['ok', 'no_match', 'partial'].includes(observation.status) ||
    !observation.data
  )
    return null;
  if (observation.tool === 'get_ec2_operations' && 'jobs' in observation.data) {
    if (
      observation.data.jobs.some(
        (j) => j.critical && overlaps(j.window, window),
      )
    )
      return 'critical_job';
    const period = estimatePeriod(request);
    for (const maintenance of observation.data.scheduled_maintenance ?? []) {
      const from = Math.max(
        Date.parse(maintenance.execution_window.from),
        Date.parse(period.from),
      );
      const to = Math.min(
        Date.parse(maintenance.execution_window.to),
        Date.parse(period.to),
      );
      for (
        let day = Math.floor(from / 86400000) * 86400000;
        day < to;
        day += 86400000
      ) {
        if (
          from < day + window.end_hour_utc * 3600000 &&
          to > day + window.start_hour_utc * 3600000
        )
          return 'scheduled_maintenance';
      }
    }
  }
  if (
    observation.tool === 'get_ec2_dependencies' &&
    'requires_continuous_operation' in observation.data &&
    observation.data.requires_continuous_operation &&
    (!requireNamedDependency || !!observation.data.continuous_operation_reason)
  )
    return 'continuous_operation';
  return null;
}
const windowText = (w: Schedule) =>
  `${String(w.start_hour_utc).padStart(2, '0')}:00–${String(w.end_hour_utc).padStart(2, '0')}:00 UTC`;

/** Explain only the conflict selected by the shared deterministic policy. */
export function conflictExplanation(
  request: InvestigationRequest,
  window: Schedule,
  observation: Observation,
): string | null {
  const conflict = schedulingConflict(request, window, observation, true);
  const data = observation.data;
  if (!conflict || !data) return null;
  if (conflict === 'critical_job' && 'jobs' in data) {
    const job = data.jobs.find((j) => j.critical && overlaps(j.window, window));
    if (!job) return null;
    return `Critical job ${job.job_id} runs ${windowText(job.window)}, overlapping proposed shutdown ${windowText(window)}; reject this window.`;
  }
  if (conflict === 'scheduled_maintenance' && 'jobs' in data) {
    const maintenance = data.scheduled_maintenance?.find(
      (m) =>
        schedulingConflict(request, window, {
          ...observation,
          data: { jobs: [], scheduled_maintenance: [m] },
        }) === 'scheduled_maintenance',
    );
    if (maintenance)
      return `SSM maintenance ${maintenance.window_id} executes ${maintenance.execution_window.from} to ${maintenance.execution_window.to}, overlapping proposed shutdown ${windowText(window)} in the planning month; reject this window.`;
  }
  if (
    'requires_continuous_operation' in data &&
    data.continuous_operation_reason
  ) {
    return `Dependency ${data.continuous_operation_reason.dependency_id} requires continuous operation: ${data.continuous_operation_reason.requirement.slice(0, 150)}. This conflicts with shutdown ${windowText(window)}; reject this window.`;
  }
  return null;
}

/** Shared deterministic discovery order for execution and report validation. */
export function rankCandidates(
  inventory: InventoryData,
  billing: BillingData | null,
  maximum: number,
  includeUnbilled = false,
): string[] {
  return inventory.instances
    .filter((i) => i.state === 'running')
    .map((i) => ({
      instance_id: i.instance_id,
      cost:
        billing?.costs.find((c) => c.instance_id === i.instance_id)
          ?.compute_cost ?? 0,
    }))
    .filter((i) => includeUnbilled || i.cost > 0)
    .sort(
      (a, b) => b.cost - a.cost || a.instance_id.localeCompare(b.instance_id),
    )
    .slice(0, maximum)
    .map((i) => i.instance_id);
}
export function estimatePeriod(request: InvestigationRequest): Window {
  const date = new Date(request.window.to);
  return {
    from: new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1),
    ).toISOString(),
    to: new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 2, 1),
    ).toISOString(),
  };
}
const covers = (a: Window, b: Window) =>
  Date.parse(a.from) <= Date.parse(b.from) &&
  Date.parse(a.to) >= Date.parse(b.to);
function clearanceChecks(
  c: SchedulingClearance | undefined,
  window: Schedule,
  period: Window,
): string[] {
  if (!c)
    return [
      'Obtain owner, calendar and recovery clearance for the proposed UTC window and estimate month.',
    ];
  const checks: string[] = [];
  if (!sameSchedule(c.window, window))
    checks.push('Obtain clearance for the exact proposed UTC window.');
  if (!covers(c.valid_window, period))
    checks.push(
      `Renew clearance to cover ${period.from} through ${period.to}.`,
    );
  if (!c.owner_confirmed)
    checks.push(
      'Ask the workload owner to confirm the proposed shutdown window.',
    );
  if (!c.calendar_reviewed)
    checks.push(
      'Review the job calendar and exceptional dates with the owner.',
    );
  if (!c.recovery_verified)
    checks.push(
      'Verify stop/start recovery readiness with the workload owner.',
    );
  if (c.overhead_minutes >= (window.end_hour_utc - window.start_hour_utc) * 60)
    checks.push(
      'Review stop/start overhead; it must leave usable time within the proposed window.',
    );
  return checks;
}
/** Positive evidence is mandatory from both operational owners; empty query results alone are insufficient. */
export function assessScheduling(
  request: InvestigationRequest,
  candidate: CandidateReport,
  evidence: Observation[],
  requireBilling = true,
): { proof: Observation[] | null; missing_checks: string[] } {
  const window = candidate.proposed_window;
  const missing_checks: string[] = [];
  if (!window)
    missing_checks.push(
      'get_ec2_metrics: The agent could not establish a supported UTC window from the available utilization history.',
    );
  const find = (tool: string) =>
    evidence.find(
      (o) => o.tool === tool && o.scope.instance_id === candidate.instance_id,
    );
  const metrics = find('get_ec2_metrics'),
    operations = find('get_ec2_operations'),
    dependencies = find('get_ec2_dependencies');
  const inventory = evidence.find((o) => o.tool === 'list_ec2_instances'),
    billing = evidence.find((o) => o.tool === 'get_ec2_billing');
  const sources = [
    [
      'list_ec2_instances',
      inventory,
      'Retrieve complete scoped EC2 inventory.',
    ],
    [
      'get_ec2_billing',
      billing,
      'Retrieve complete matching compute-cost evidence.',
    ],
    [
      'get_ec2_metrics',
      metrics,
      'Utilization coverage is incomplete for the requested period. Review the reported sample dates and counts; select a period with available history or collect more observations. Missing samples are unknown, not inactivity.',
    ],
    [
      'get_ec2_operations',
      operations,
      'Ask the workload owner to supply an authoritative job schedule, including timezones and exceptions, for this instance and proposed window.',
    ],
    [
      'get_ec2_dependencies',
      dependencies,
      'Ask service owners to verify upstream/downstream consumers and continuous-availability obligations for this instance.',
    ],
  ] as const;
  for (const [tool, observation, action] of sources) {
    const status = observation?.status ?? 'no validated observation';
    const detail =
      observation?.missing_fields.join(', ') ||
      (observation ? 'coverage or authority incomplete' : 'not queried');
    if (tool === 'get_ec2_billing' && !requireBilling) continue;
    if (!authoritative(observation))
      missing_checks.push(`${tool} (${status}; ${detail}): ${action}`);
  }
  const period = estimatePeriod(request);
  if (
    dependencies?.data &&
    'requires_continuous_operation' in dependencies.data &&
    dependencies.data.requires_continuous_operation &&
    !dependencies.data.continuous_operation_reason
  )
    missing_checks.push(
      'get_ec2_dependencies: Identify the dependency and its attributable continuous-operation obligation; a boolean alone does not explain the conflict.',
    );
  if (
    dependencies?.data &&
    'load_balancer_targets' in dependencies.data &&
    dependencies.data.load_balancer_targets?.length
  )
    missing_checks.push(
      'get_ec2_dependencies: Review the registered load-balancer consumers with service owners and plan traffic draining before reconsidering shutdown; registration alone does not establish continuous-operation obligations.',
    );
  if (
    Date.parse(request.window.to) - Date.parse(request.window.from) <
    7 * 86400000
  )
    missing_checks.push(
      'get_ec2_metrics: Insufficient history for a recurring schedule: at least seven days of utilization are required by policy. Shorter periods can describe observed activity only.',
    );
  if (authoritative(metrics)) {
    const m = metrics.data as MetricsData;
    if (m.aggregation_minutes > 5)
      missing_checks.push(
        'get_ec2_metrics: Retrieve CPU averages and peaks at five-minute or finer resolution.',
      );
    if (m.average_cpu_percent > 10 || m.peak_cpu_percent > 20)
      missing_checks.push(
        'get_ec2_metrics: Determine whether observed whole-period CPU peaks occur inside this window; retrieve window-specific activity before interpreting the peaks as a shutdown conflict.',
      );
    if (window && !sameSchedule(m.suggested_window, window))
      missing_checks.push(
        'get_ec2_metrics: Re-evaluate the proposed window against the window supported by current utilization evidence.',
      );
  }
  if (!window) return { proof: null, missing_checks };
  if (
    operations &&
    schedulingConflict(request, window, operations) === 'scheduled_maintenance'
  )
    missing_checks.push(
      'get_ec2_operations: Review the overlapping dated SSM maintenance execution with the workload owner before proposing this window again.',
    );
  if (authoritative(operations)) {
    const o = operations.data as OperationsData;
    if (o.jobs.some((j) => overlaps(j.window, window)))
      missing_checks.push(
        'get_ec2_operations: Resolve overlapping jobs with the workload owner before proposing this window again.',
      );
    missing_checks.push(
      ...clearanceChecks(o.scheduling_clearance, window, period).map(
        (check) => `get_ec2_operations: ${check}`,
      ),
    );
  }
  if (authoritative(dependencies)) {
    const d = dependencies.data as DependenciesData;
    if (d.requires_continuous_operation)
      missing_checks.push(
        'get_ec2_dependencies: Review the continuous-operation requirement with service owners before reconsidering this window.',
      );
    missing_checks.push(
      ...clearanceChecks(d.scheduling_clearance, window, period).map(
        (check) => `get_ec2_dependencies: ${check}`,
      ),
    );
  }
  if (
    authoritative(operations) &&
    authoritative(dependencies) &&
    JSON.stringify((operations.data as OperationsData).scheduling_clearance) !==
      JSON.stringify(
        (dependencies.data as DependenciesData).scheduling_clearance,
      )
  )
    missing_checks.push(
      'Reconcile operations and dependency clearances: window, validity, excluded dates and stop/start overhead must match.',
    );
  if (missing_checks.length || !metrics || !operations || !dependencies)
    return { proof: null, missing_checks };
  return { proof: [metrics, operations, dependencies], missing_checks };
}
/** Keep diagnostics in missing_checks; expose only operator tasks here. */
export function nextHumanActions(missingChecks: string[]): string[] {
  const actions = new Set<string>();
  for (const check of missingChecks) {
    const action = check.replace(
      /^(?:get_ec2_\w+|list_ec2_instances)(?: \([^)]*\))?: /,
      '',
    );
    // This is a finding, not a task the operator can perform.
    if (action.startsWith('The agent could not establish')) continue;
    if (
      action.startsWith('Utilization coverage is incomplete') ||
      action.startsWith('Insufficient history for a recurring schedule')
    ) {
      actions.add(
        'Select a period with at least seven complete days of utilization history, or wait for enough observations, then rerun the investigation.',
      );
    } else if (action.startsWith('Authorized human shutdown decision')) {
      actions.add(
        'Review the retrieved evidence and obtain authorized human approval through the external change process before any infrastructure change.',
      );
    } else {
      actions.add(action);
    }
  }
  return [...actions];
}

export function schedulingProof(
  request: InvestigationRequest,
  candidate: CandidateReport,
  evidence: Observation[],
): Observation[] | null {
  return assessScheduling(request, candidate, evidence).proof;
}
/** Next UTC calendar month, compute-only marginal on-demand rate, conservative billing-unit rounding. */
export function calculateSavings(
  request: InvestigationRequest,
  candidate: CandidateReport,
  evidence: Observation[],
): { amount: number; calculation: SavingsCalculation } | null {
  const proof = schedulingProof(request, candidate, evidence);
  if (
    !proof ||
    candidate.verdict !== 'conditional_recommendation' ||
    !candidate.proposed_window
  )
    return null;
  const billing = evidence.find((o) => o.tool === 'get_ec2_billing');
  if (!authoritative(billing)) return null;
  const data = billing.data as BillingData;
  const pricing = data.costs.find(
    (c) => c.instance_id === candidate.instance_id,
  )?.pricing;
  const period = estimatePeriod(request);
  if (
    data.currency !== 'USD' ||
    !data.commitment_coverage_known ||
    !pricing ||
    pricing.purchase_option !== 'on_demand' ||
    !pricing.retained_costs_excluded ||
    !covers(pricing.valid_window, period)
  )
    return null;
  const operations = proof.find((o) => o.tool === 'get_ec2_operations');
  if (!operations?.data || !('jobs' in operations.data)) return null;
  const clearance = operations.data.scheduling_clearance;
  if (!clearance) return null;
  const days = (Date.parse(period.to) - Date.parse(period.from)) / 86400000;
  const excluded = clearance.excluded_dates.filter(
    (d) =>
      Date.parse(`${d}T00:00:00Z`) >= Date.parse(period.from) &&
      Date.parse(`${d}T00:00:00Z`) < Date.parse(period.to),
  );
  const eligible_days = days - excluded.length;
  const minutes =
    (candidate.proposed_window.end_hour_utc -
      candidate.proposed_window.start_hour_utc) *
      60 -
    clearance.overhead_minutes;
  const avoided_hours =
    (eligible_days *
      Math.floor(minutes / pricing.billing_granularity_minutes) *
      pricing.billing_granularity_minutes) /
    60;
  // USD cents only; other currencies remain unknown until their rounding is modeled.
  const amount =
    Math.floor(
      (avoided_hours * pricing.hourly_compute_rate + Number.EPSILON) * 100,
    ) / 100;
  return {
    amount,
    calculation: {
      currency: data.currency,
      period,
      eligible_days,
      avoided_hours,
      hourly_compute_rate: pricing.hourly_compute_rate,
      evidence_ids: [billing.evidence_id, ...proof.map((o) => o.evidence_id)],
    },
  };
}
