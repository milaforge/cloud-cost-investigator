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
/** Shared deterministic discovery order for execution and report validation. */
export function rankCandidates(
  inventory: InventoryData,
  billing: BillingData,
  maximum: number,
): string[] {
  return inventory.instances
    .filter((i) => i.state === 'running')
    .map((i) => ({
      instance_id: i.instance_id,
      cost:
        billing.costs.find((c) => c.instance_id === i.instance_id)
          ?.compute_cost ?? 0,
    }))
    .filter((i) => i.cost > 0)
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
function cleared(
  c: SchedulingClearance | undefined,
  window: Schedule,
  period: Window,
): c is SchedulingClearance {
  return (
    !!c &&
    sameSchedule(c.window, window) &&
    covers(c.valid_window, period) &&
    c.owner_confirmed &&
    c.calendar_reviewed &&
    c.recovery_verified &&
    c.overhead_minutes < (window.end_hour_utc - window.start_hour_utc) * 60
  );
}
/** Positive evidence is mandatory from both operational owners; empty query results alone are insufficient. */
export function schedulingProof(
  request: InvestigationRequest,
  candidate: CandidateReport,
  evidence: Observation[],
): Observation[] | null {
  const window = candidate.proposed_window;
  if (!window) return null;
  const find = (tool: string) =>
    evidence.find(
      (o) => o.tool === tool && o.scope.instance_id === candidate.instance_id,
    );
  const metrics = find('get_ec2_metrics'),
    operations = find('get_ec2_operations'),
    dependencies = find('get_ec2_dependencies');
  const inventory = evidence.find((o) => o.tool === 'list_ec2_instances'),
    billing = evidence.find((o) => o.tool === 'get_ec2_billing');
  if (
    !authoritative(metrics) ||
    !authoritative(operations) ||
    !authoritative(dependencies) ||
    !authoritative(inventory) ||
    !authoritative(billing)
  )
    return null;
  const m = metrics.data as MetricsData,
    o = operations.data as OperationsData,
    d = dependencies.data as DependenciesData;
  const period = estimatePeriod(request);
  if (
    Date.parse(request.window.to) - Date.parse(request.window.from) <
      7 * 86400000 ||
    m.aggregation_minutes > 5 ||
    m.average_cpu_percent > 10 ||
    m.peak_cpu_percent > 20 ||
    !sameSchedule(m.suggested_window, window) ||
    o.jobs.some((j) => overlaps(j.window, window)) ||
    d.requires_continuous_operation ||
    !cleared(o.scheduling_clearance, window, period) ||
    !cleared(d.scheduling_clearance, window, period)
  )
    return null;
  if (
    JSON.stringify(o.scheduling_clearance) !==
    JSON.stringify(d.scheduling_clearance)
  )
    return null;
  return [metrics, operations, dependencies];
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
