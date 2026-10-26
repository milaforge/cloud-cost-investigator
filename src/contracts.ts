// Runtime-validated current-evidence and investigation contracts.
export const TOOL_NAMES = [
  'list_ec2_instances',
  'get_ec2_billing',
  'get_ec2_metrics',
  'get_ec2_operations',
  'get_ec2_dependencies',
] as const;
export type ToolName = (typeof TOOL_NAMES)[number];
export type SourceStatus =
  | 'ok'
  | 'no_match'
  | 'partial'
  | 'unavailable'
  | 'error';
export type Mode = 'mock' | 'fixture' | 'live' | 'stub';
export const PLANNER_FAILURE_CODES = [
  'planner_timeout',
  'investigation_deadline_exceeded',
  'planner_invalid_action',
  'planner_unknown_failure',
  'model_transport_unavailable',
  'model_timeout',
  'model_cancelled',
  'model_invalid_response',
  'model_incomplete_response',
  'model_invalid_action_json',
  'model_invalid_choice',
  'model_tls_verification_required',
  'model_state_too_large',
] as const;
export type PlannerFailureCode =
  | (typeof PLANNER_FAILURE_CODES)[number]
  | `model_http_${number}`;

/** Only fixed public codes or a three-digit HTTP status may enter a report. */
export function validatePlannerFailureCode(value: unknown): PlannerFailureCode {
  if (typeof value === 'string' && /^model_http_[1-5][0-9]{2}$/.test(value))
    return value as PlannerFailureCode;
  return member(value, PLANNER_FAILURE_CODES);
}
export interface Window {
  from: string;
  to: string;
}
export interface Schedule {
  start_hour_utc: number;
  end_hour_utc: number;
}
export interface Scope {
  account_id: string;
  region: string;
}
export interface InvestigationRequest extends Scope {
  window: Window;
  max_candidates: number;
}
export interface ToolArgs extends Scope {
  window: Window;
  instance_id?: string;
  proposed_window?: Schedule;
}
export interface ToolAction {
  type: 'tool';
  tool: ToolName;
  args: ToolArgs;
  reason: string;
}
export type Action =
  | ToolAction
  | {
      type: 'propose';
      window: Schedule;
      evidence_ids: string[];
      reason: string;
    }
  | { type: 'finish'; reason: string };
export const OPTIONAL_INVENTORY_FIELDS = [
  'availabilityZone',
  'launchTime',
  'platform',
  'tenancy',
  'tags',
  'owner',
  'environment',
] as const;
export interface InventoryData {
  instances: {
    instance_id: string;
    state: 'running' | 'stopped';
    missing_metadata?: (typeof OPTIONAL_INVENTORY_FIELDS)[number][];
  }[];
}
export interface BillingData {
  costs: {
    instance_id: string;
    compute_cost: number;
    pricing?: ComputePricing;
  }[];
  currency: string;
  commitment_coverage_known: boolean;
}
export interface MetricsData {
  average_cpu_percent: number;
  peak_cpu_percent: number;
  suggested_window: Schedule;
  aggregation_minutes: number;
}
export interface SchedulingClearance {
  window: Schedule;
  valid_window: Window;
  owner_confirmed: boolean;
  calendar_reviewed: boolean;
  recovery_verified: boolean;
  excluded_dates: string[];
  overhead_minutes: number;
}
export interface ComputePricing {
  hourly_compute_rate: number;
  purchase_option: 'on_demand' | 'commitment' | 'unknown';
  retained_costs_excluded: boolean;
  billing_granularity_minutes: number;
  valid_window: Window;
}
export interface SavingsCalculation {
  currency: string;
  period: Window;
  eligible_days: number;
  avoided_hours: number;
  hourly_compute_rate: number;
  evidence_ids: string[];
}
export interface OperationsData {
  scheduling_clearance?: SchedulingClearance;
  jobs: { job_id: string; critical: boolean; window: Schedule }[];
  scheduled_maintenance?: ScheduledMaintenance[];
}
export interface DependenciesData {
  scheduling_clearance?: SchedulingClearance;
  requires_continuous_operation: boolean;
  load_balancer_targets?: LoadBalancerTarget[];
}
export interface ScheduledMaintenance {
  window_id: string;
  execution_window: Window;
}
export interface LoadBalancerTarget {
  target_group_arn: string;
  port: number;
  state:
    | 'initial'
    | 'healthy'
    | 'unhealthy'
    | 'unhealthy.draining'
    | 'unused'
    | 'draining'
    | 'unavailable';
}
export type ToolData =
  | InventoryData
  | BillingData
  | MetricsData
  | OperationsData
  | DependenciesData;
export interface MetricCoverage {
  field: 'cpu_avg' | 'cpu_max' | 'network_in' | 'network_out';
  expected_points: number;
  returned_points: number;
  period_seconds: number;
  first_sample_at: string | null;
  last_sample_at: string | null;
}
/** Operator-supplied supporting context. Never telemetry, clearance, or model instructions. */
export interface OwnerEvidence extends Scope {
  instance_id: string;
  owner: string;
  topic: 'jobs' | 'dependencies' | 'retirement' | 'other';
  statement: string;
  source_ref: string;
  asserted_at: string;
  valid_window: Window;
}
export function validateOwnerEvidence(
  value: unknown,
  scope: Scope,
  now = new Date().toISOString(),
): OwnerEvidence[] {
  return array(value, 3).map((value) => {
    const o = exact(value, [
      'account_id',
      'region',
      'instance_id',
      'owner',
      'topic',
      'statement',
      'source_ref',
      'asserted_at',
      'valid_window',
    ]);
    const supplied = validateScope(o);
    if (
      supplied.account_id !== scope.account_id ||
      supplied.region !== scope.region
    )
      throw new Error('Owner evidence scope mismatch');
    for (const field of ['owner', 'statement', 'source_ref']) {
      if (typeof o[field] !== 'string' || !o[field].trim())
        throw new Error('Empty owner evidence field');
    }
    const instance_id = identifier(o.instance_id);
    if (!/^i-(?:[a-f0-9]{8}|[a-f0-9]{17})$/.test(instance_id))
      throw new Error('Invalid owner evidence instance');
    const asserted_at = utc(o.asserted_at);
    if (Date.parse(asserted_at) > Date.parse(now))
      throw new Error('Future owner statement');
    return {
      ...supplied,
      instance_id,
      owner: textValue(o.owner, 100),
      topic: member(o.topic, ['jobs', 'dependencies', 'retirement', 'other']),
      statement: textValue(
        typeof o.statement === 'string'
          ? o.statement.replace(/\r?\n/g, ' ')
          : o.statement,
        1000,
      ),
      source_ref: textValue(o.source_ref, 300),
      asserted_at,
      valid_window: validateWindow(o.valid_window),
    };
  });
}
export interface Observation {
  tool: ToolName;
  status: SourceStatus;
  source: string;
  integration_mode: Mode;
  scope: Scope & { instance_id?: string };
  observed_window: Window;
  collected_at: string;
  coverage: { complete: boolean; authoritative: boolean };
  missing_fields: string[];
  metric_coverage?: MetricCoverage[];
  units: 'instances' | 'currency' | 'percent' | 'UTC-hours' | 'boolean';
  evidence_id: string;
  data: ToolData | null;
}
export interface Hypothesis {
  window: Schedule;
  state: 'proposed' | 'contradicted' | 'unresolved' | 'supported';
  evidence_ids: string[];
  reason: string;
}
export interface TraceEntry {
  /** Correlation ID shared by every step in this investigation. */
  trace_id: string;
  /** Evidence support for this step, never a probability of shutdown safety. */
  confidence: 'unassessed' | 'insufficient' | 'supported';
  /** Retries already made for this action; null for legacy traces without counters. */
  retry_count: number | null;
  step: number;
  phase: 'planner' | 'tool' | 'evaluator' | 'finish';
  reason: string;
  action?: Action;
  status?: SourceStatus;
  evidence_ids: string[];
  failure_code?: PlannerFailureCode;
  provider_error?: { body: string; truncated: boolean };
}
/** Deterministic evidence support, without model-authored certainty scores. */
export function traceConfidence(
  status: SourceStatus | undefined,
  observations: Observation[],
): TraceEntry['confidence'] {
  if (status === 'error' || status === 'unavailable') return 'insufficient';
  if (!observations.length) return 'unassessed';
  return observations.every(
    (o) =>
      (o.status === 'ok' || o.status === 'no_match') &&
      o.coverage.complete &&
      o.coverage.authoritative &&
      !o.missing_fields.length,
  )
    ? 'supported'
    : 'insufficient';
}
export interface CandidateReport {
  instance_id: string;
  selection_reason: string;
  selection_evidence_ids: string[];
  proposed_window: Schedule | null;
  verdict:
    | 'not_recommended'
    | 'needs_verification'
    | 'conditional_recommendation';
  explanation: string;
  supporting_evidence_ids: string[];
  contradicting_evidence_ids: string[];
  hypotheses: Hypothesis[];
  risks: string[];
  missing_checks: string[];
  assumptions: string[];
  next_human_actions: string[];
  estimated_monthly_savings: number | null;
  savings_calculation: SavingsCalculation | null;
}
/** Prior decision context only; never current evidence or scheduling clearance. */
export interface HistoricalComparison {
  historical: true;
  context_id: string;
  record_id: string;
  investigation_id: string;
  recorded_at: string;
  scope: Scope;
  instance_id: string;
  source_mode: Mode;
  verdict: CandidateReport['verdict'];
  proposed_window: Schedule | null;
  rejected_windows: Schedule[];
}
export interface InvestigationReport {
  investigation_id: string;
  goal: 'evaluate_ec2_off_hours_scheduling';
  request: InvestigationRequest;
  started_at: string;
  finished_at: string;
  completion_status: 'complete' | 'partial' | 'failed';
  integration_mode: Mode;
  planner: { mode: 'scripted' | 'live'; model: string | null };
  discovery: {
    discovered_count: number;
    candidate_limit: number;
    gaps: string[];
  };
  candidates: CandidateReport[];
  evidence: Observation[];
  trace: TraceEntry[];
  historical_context: {
    zetaris: 'not_configured' | 'not_queried' | 'ok' | 'unavailable';
    hmem: 'not_configured' | 'not_queried' | 'ok' | 'unavailable';
    context_ids: string[];
    /** Optional for compatibility with previously retained reports. */
    comparisons?: HistoricalComparison[];
    limitations: string[];
  };
  budget: {
    discovery_attempts: number;
    candidate_attempts: number;
    planner_calls: number;
    elapsed_ms: number;
  };
  limitations: string[];
  stop_reason: string;
  owner_evidence?: OwnerEvidence[];
}

export function object(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Expected object');
  return value as Record<string, unknown>;
}
export function exact(value: unknown, keys: string[]): Record<string, unknown> {
  const obj = object(value);
  if (Object.keys(obj).some((k) => !keys.includes(k)))
    throw new Error('Unexpected field');
  return obj;
}
export function textValue(value: unknown, max = 400): string {
  // biome-ignore lint/suspicious/noControlCharactersInRegex: Reject ASCII control characters at the input boundary.
  const controlCharacters = /[\x00-\x1f\x7f]/;
  if (
    typeof value !== 'string' ||
    !value.length ||
    value.length > max ||
    controlCharacters.test(value)
  )
    throw new Error('Invalid text');
  return value;
}
export function identifier(value: unknown): string {
  const s = textValue(value, 100);
  if (!/^[A-Za-z0-9][A-Za-z0-9_.:-]*$/.test(s))
    throw new Error('Invalid identifier');
  return s;
}
export function integer(value: unknown, min: number, max: number): number {
  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value < min ||
    value > max
  )
    throw new Error('Invalid integer');
  return value;
}
function numberValue(value: unknown, min: number, max: number): number {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < min ||
    value > max
  )
    throw new Error('Invalid number');
  return value;
}
export function bool(value: unknown): boolean {
  if (typeof value !== 'boolean') throw new Error('Invalid boolean');
  return value;
}
export function array(value: unknown, max = 100): unknown[] {
  if (!Array.isArray(value) || value.length > max)
    throw new Error('Invalid array');
  return value;
}
export function member<T extends string>(
  value: unknown,
  values: readonly T[],
): T {
  if (!values.includes(value as T)) throw new Error('Invalid enum');
  return value as T;
}
export function utc(value: unknown): string {
  const s = textValue(value, 24);
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(s) ||
    !Number.isFinite(Date.parse(s)) ||
    new Date(s).toISOString().replace('.000Z', 'Z') !== s.replace('.000Z', 'Z')
  )
    throw new Error('Invalid UTC timestamp');
  return s;
}
export function validateWindow(value: unknown): Window {
  const o = exact(value, ['from', 'to']);
  const result = { from: utc(o.from), to: utc(o.to) };
  if (
    Date.parse(result.from) >= Date.parse(result.to) ||
    Date.parse(result.to) - Date.parse(result.from) > 90 * 86400000
  )
    throw new Error('Invalid observation window');
  return result;
}
export function validateSchedule(value: unknown): Schedule {
  const o = exact(value, ['start_hour_utc', 'end_hour_utc']);
  const result = {
    start_hour_utc: integer(o.start_hour_utc, 0, 23),
    end_hour_utc: integer(o.end_hour_utc, 1, 24),
  };
  // This thin slice supports same-day daily windows only; overnight schedules must be split upstream.
  if (result.start_hour_utc >= result.end_hour_utc)
    throw new Error('Unsupported scheduling window');
  return result;
}
export function validateScope(value: unknown): Scope {
  const o = object(value);
  const account_id = identifier(o.account_id);
  const region = textValue(o.region, 40);
  if (!/^[a-z]{2}(?:-[a-z]+)+-\d$/.test(region))
    throw new Error('Invalid region');
  return { account_id, region };
}
export function validateRequest(value: unknown): InvestigationRequest {
  const o = exact(value, ['account_id', 'region', 'window', 'max_candidates']);
  return {
    ...validateScope(o),
    window: validateWindow(o.window),
    max_candidates: integer(o.max_candidates, 1, 3),
  };
}
export function validateAction(value: unknown): Action {
  const o = object(value);
  const reason = textValue(o.reason);
  if (o.type === 'finish') {
    exact(o, ['type', 'reason']);
    return { type: 'finish', reason };
  }
  if (o.type === 'propose') {
    exact(o, ['type', 'window', 'evidence_ids', 'reason']);
    return {
      type: 'propose',
      window: validateSchedule(o.window),
      evidence_ids: array(o.evidence_ids, 10).map(identifier),
      reason,
    };
  }
  exact(o, ['type', 'tool', 'args', 'reason']);
  if (o.type !== 'tool') throw new Error('Invalid action');
  const tool = member(o.tool, TOOL_NAMES);
  const a = exact(o.args, [
    'account_id',
    'region',
    'window',
    'instance_id',
    'proposed_window',
  ]);
  const args: ToolArgs = {
    ...validateScope(a),
    window: validateWindow(a.window),
  };
  const candidateTool = !['list_ec2_instances', 'get_ec2_billing'].includes(
    tool,
  );
  if (candidateTool) args.instance_id = identifier(a.instance_id);
  else if (a.instance_id !== undefined)
    throw new Error('Discovery cannot select an instance');
  if (tool === 'get_ec2_operations')
    args.proposed_window = validateSchedule(a.proposed_window);
  else if (a.proposed_window !== undefined)
    throw new Error('Unexpected proposed window');
  return { type: 'tool', tool, args, reason };
}
export function validateObservation(
  value: unknown,
  action: ToolAction,
  run: { started_at: string; now: string; mode: Mode },
): Observation {
  const o = exact(value, [
    'tool',
    'status',
    'source',
    'integration_mode',
    'scope',
    'observed_window',
    'collected_at',
    'coverage',
    'missing_fields',
    'metric_coverage',
    'units',
    'evidence_id',
    'data',
  ]);
  const tool = member(o.tool, TOOL_NAMES);
  if (tool !== action.tool) throw new Error('Tool mismatch');
  const scopeObj = exact(o.scope, ['account_id', 'region', 'instance_id']);
  const scope: Observation['scope'] = validateScope(scopeObj);
  if (scopeObj.instance_id !== undefined)
    scope.instance_id = identifier(scopeObj.instance_id);
  if (
    scope.account_id !== action.args.account_id ||
    scope.region !== action.args.region ||
    scope.instance_id !== action.args.instance_id
  )
    throw new Error('Scope mismatch');
  const observed_window = validateWindow(o.observed_window);
  if (
    observed_window.from !== action.args.window.from ||
    observed_window.to !== action.args.window.to
  )
    throw new Error('Period mismatch');
  const collected_at = utc(o.collected_at);
  if (
    Date.parse(collected_at) < Date.parse(run.started_at) ||
    Date.parse(collected_at) > Date.parse(run.now) + 1000
  )
    throw new Error('Evidence not collected during investigation');
  const integration_mode = member(o.integration_mode, [
    'mock',
    'fixture',
    'live',
    'stub',
  ]);
  if (integration_mode !== run.mode) throw new Error('Provider mode mismatch');
  const coverageObj = exact(o.coverage, ['complete', 'authoritative']);
  const coverage = {
    complete: bool(coverageObj.complete),
    authoritative: bool(coverageObj.authoritative),
  };
  const status = member(o.status, [
    'ok',
    'no_match',
    'partial',
    'unavailable',
    'error',
  ]);
  const missing_fields = array(o.missing_fields, 30).map((v) =>
    textValue(v, 100),
  );
  if (status === 'partial' && missing_fields.length === 0)
    throw new Error('Partial evidence must disclose missing fields');
  const expectedUnits = {
    list_ec2_instances: 'instances',
    get_ec2_billing: 'currency',
    get_ec2_metrics: 'percent',
    get_ec2_operations: 'UTC-hours',
    get_ec2_dependencies: 'boolean',
  } as const;
  const units = member(o.units, [expectedUnits[tool]]);
  let data: ToolData | null = null;
  if (status === 'unavailable' || status === 'error') {
    if (o.data !== null || coverage.complete || coverage.authoritative)
      throw new Error('Unavailable data cannot assert coverage');
  } else {
    const d = object(o.data);
    switch (tool) {
      case 'list_ec2_instances': {
        exact(d, ['instances']);
        const instances = array(d.instances).map((v) => {
          const i = exact(v, ['instance_id', 'state', 'missing_metadata']);
          return {
            instance_id: identifier(i.instance_id),
            state: member(i.state, ['running', 'stopped']),
            ...(i.missing_metadata === undefined
              ? {}
              : {
                  missing_metadata: array(i.missing_metadata, 7).map((v) =>
                    member(v, OPTIONAL_INVENTORY_FIELDS),
                  ),
                }),
          };
        });
        if (
          new Set(instances.map((i) => i.instance_id)).size !== instances.length
        )
          throw new Error('Duplicate instance');
        data = { instances };
        break;
      }
      case 'get_ec2_billing': {
        exact(d, ['costs', 'currency', 'commitment_coverage_known']);
        const currency = textValue(d.currency, 3);
        if (!/^[A-Z]{3}$/.test(currency)) throw new Error('Invalid currency');
        const costs = array(d.costs).map((v) => {
          const c = exact(v, ['instance_id', 'compute_cost', 'pricing']);
          return {
            instance_id: identifier(c.instance_id),
            compute_cost: numberValue(c.compute_cost, 0, 1e12),
            ...(c.pricing === undefined
              ? {}
              : { pricing: validatePricing(c.pricing) }),
          };
        });
        if (new Set(costs.map((c) => c.instance_id)).size !== costs.length)
          throw new Error('Duplicate cost');
        data = {
          costs,
          currency,
          commitment_coverage_known: bool(d.commitment_coverage_known),
        };
        break;
      }
      case 'get_ec2_metrics':
        exact(d, [
          'average_cpu_percent',
          'peak_cpu_percent',
          'suggested_window',
          'aggregation_minutes',
        ]);
        data = {
          average_cpu_percent: numberValue(d.average_cpu_percent, 0, 100),
          peak_cpu_percent: numberValue(d.peak_cpu_percent, 0, 100),
          suggested_window: validateSchedule(d.suggested_window),
          aggregation_minutes: integer(d.aggregation_minutes, 1, 60),
        };
        if (data.peak_cpu_percent < data.average_cpu_percent)
          throw new Error('Peak below average');
        break;
      case 'get_ec2_operations':
        exact(d, ['jobs', 'scheduling_clearance', 'scheduled_maintenance']);
        data = {
          ...(d.scheduled_maintenance === undefined
            ? {}
            : {
                scheduled_maintenance: array(d.scheduled_maintenance).map(
                  validateScheduledMaintenance,
                ),
              }),
          ...(d.scheduling_clearance === undefined
            ? {}
            : {
                scheduling_clearance: validateClearance(d.scheduling_clearance),
              }),
          jobs: array(d.jobs).map((v) => {
            const j = exact(v, ['job_id', 'critical', 'window']);
            return {
              job_id: identifier(j.job_id),
              critical: bool(j.critical),
              window: validateSchedule(j.window),
            };
          }),
        };
        break;
      case 'get_ec2_dependencies':
        exact(d, [
          'requires_continuous_operation',
          'scheduling_clearance',
          'load_balancer_targets',
        ]);
        data = {
          requires_continuous_operation: bool(d.requires_continuous_operation),
          ...(d.load_balancer_targets === undefined
            ? {}
            : {
                load_balancer_targets: array(d.load_balancer_targets).map(
                  (target) => validateLoadBalancerTarget(target, scope),
                ),
              }),
          ...(d.scheduling_clearance === undefined
            ? {}
            : {
                scheduling_clearance: validateClearance(d.scheduling_clearance),
              }),
        };
        break;
    }
    if (status === 'no_match') {
      const rows =
        data &&
        ('instances' in data
          ? data.instances
          : 'costs' in data
            ? data.costs
            : 'jobs' in data
              ? data.jobs
              : null);
      if (rows?.length !== 0)
        throw new Error('no_match requires an empty collection');
    }
  }
  let metric_coverage: MetricCoverage[] | undefined;
  if (o.metric_coverage !== undefined) {
    if (tool !== 'get_ec2_metrics')
      throw new Error('Unexpected metric coverage');
    metric_coverage = array(o.metric_coverage, 4).map((value) => {
      const c = exact(value, [
        'field',
        'expected_points',
        'returned_points',
        'period_seconds',
        'first_sample_at',
        'last_sample_at',
      ]);
      const field = member(c.field, [
        'cpu_avg',
        'cpu_max',
        'network_in',
        'network_out',
      ]);
      const period_seconds = integer(c.period_seconds, 60, 3600);
      const expected_points = integer(c.expected_points, 1, 129600);
      const returned_points = integer(c.returned_points, 0, expected_points);
      const first_sample_at =
        c.first_sample_at === null ? null : utc(c.first_sample_at);
      const last_sample_at =
        c.last_sample_at === null ? null : utc(c.last_sample_at);
      if (
        expected_points !==
          (Date.parse(observed_window.to) - Date.parse(observed_window.from)) /
            (period_seconds * 1000) ||
        (returned_points === 0
          ? first_sample_at !== null || last_sample_at !== null
          : !first_sample_at ||
            !last_sample_at ||
            Date.parse(first_sample_at) < Date.parse(observed_window.from) ||
            Date.parse(last_sample_at) >= Date.parse(observed_window.to) ||
            Date.parse(first_sample_at) > Date.parse(last_sample_at)) ||
        (coverage.complete && returned_points !== expected_points)
      )
        throw new Error('Invalid metric coverage');
      return {
        field,
        period_seconds,
        expected_points,
        returned_points,
        first_sample_at,
        last_sample_at,
      };
    });
    if (
      new Set(metric_coverage.map((c) => c.field)).size !==
      metric_coverage.length
    )
      throw new Error('Duplicate metric coverage');
  }
  return {
    tool,
    status,
    source: identifier(o.source),
    integration_mode,
    scope,
    observed_window,
    collected_at,
    coverage,
    missing_fields,
    ...(metric_coverage === undefined ? {} : { metric_coverage }),
    units,
    evidence_id: identifier(o.evidence_id),
    data,
  };
}
export function validateScheduledMaintenance(
  value: unknown,
): ScheduledMaintenance {
  const m = exact(value, ['window_id', 'execution_window']);
  const window_id = identifier(m.window_id);
  if (!/^mw-[a-f0-9]{17}$/.test(window_id))
    throw new Error('Invalid maintenance window');
  const execution_window = validateWindow(m.execution_window);
  if (
    Date.parse(execution_window.to) - Date.parse(execution_window.from) >
    86400000
  )
    throw new Error('Invalid maintenance duration');
  return { window_id, execution_window };
}
export function validateLoadBalancerTarget(
  value: unknown,
  scope: Scope,
): LoadBalancerTarget {
  const t = exact(value, ['target_group_arn', 'port', 'state']);
  return {
    target_group_arn: validateTargetGroupArn(t.target_group_arn, scope),
    port: integer(t.port, 1, 65535),
    state: member(t.state, [
      'initial',
      'healthy',
      'unhealthy',
      'unhealthy.draining',
      'unused',
      'draining',
      'unavailable',
    ]),
  };
}
export function validateTargetGroupArn(value: unknown, scope: Scope): string {
  const target_group_arn = textValue(value, 2048);
  const partition = scope.region.startsWith('cn-')
    ? 'aws-cn'
    : scope.region.startsWith('us-gov-')
      ? 'aws-us-gov'
      : 'aws';
  const prefix = `arn:${partition}:elasticloadbalancing:${scope.region}:${scope.account_id}:targetgroup/`;
  if (
    !target_group_arn.startsWith(prefix) ||
    !/^[a-zA-Z0-9-]{1,32}\/[a-f0-9]{16}$/.test(
      target_group_arn.slice(prefix.length),
    )
  )
    throw new Error('Target group scope mismatch');
  return target_group_arn;
}

function validatePricing(value: unknown): ComputePricing {
  const p = exact(value, [
    'hourly_compute_rate',
    'purchase_option',
    'retained_costs_excluded',
    'billing_granularity_minutes',
    'valid_window',
  ]);
  return {
    hourly_compute_rate: numberValue(p.hourly_compute_rate, 0, 1e6),
    purchase_option: member(p.purchase_option, [
      'on_demand',
      'commitment',
      'unknown',
    ]),
    retained_costs_excluded: bool(p.retained_costs_excluded),
    billing_granularity_minutes: integer(p.billing_granularity_minutes, 1, 60),
    valid_window: validateWindow(p.valid_window),
  };
}
function validateClearance(value: unknown): SchedulingClearance {
  const c = exact(value, [
    'window',
    'valid_window',
    'owner_confirmed',
    'calendar_reviewed',
    'recovery_verified',
    'excluded_dates',
    'overhead_minutes',
  ]);
  const valid_window = validateWindow(c.valid_window);
  const excluded_dates = array(c.excluded_dates, 90).map((v) => {
    const date = textValue(v, 10);
    utc(`${date}T00:00:00Z`);
    if (
      Date.parse(`${date}T00:00:00Z`) < Date.parse(valid_window.from) ||
      Date.parse(`${date}T00:00:00Z`) >= Date.parse(valid_window.to)
    )
      throw new Error('Exception outside clearance');
    return date;
  });
  if (new Set(excluded_dates).size !== excluded_dates.length)
    throw new Error('Duplicate calendar exception');
  return {
    window: validateSchedule(c.window),
    valid_window,
    owner_confirmed: bool(c.owner_confirmed),
    calendar_reviewed: bool(c.calendar_reviewed),
    recovery_verified: bool(c.recovery_verified),
    excluded_dates: excluded_dates.sort(),
    overhead_minutes: integer(c.overhead_minutes, 0, 1440),
  };
}
