import { createHash } from 'node:crypto';
import type { LoadBalancerTarget, ScheduledMaintenance } from '../contracts.ts';

// Detailed collector records. The agent-facing adapter projects these into the
// runtime-validated shared Observation contract.
export type Window = { from: string; to: string };
export type Status = 'ok' | 'no_match' | 'partial' | 'unavailable' | 'error';
export type Scope = { accountId: string; region: string };
export type Issue = {
  code: string;
  message: string;
  field?: string;
  retryable: boolean;
  severity: 'info' | 'warning' | 'error';
};
export type InventoryData = {
  instanceType: string;
  state: string;
  availabilityZone: string | null;
  launchTime: string | null;
  platform: string | null;
  tenancy: string | null;
  tags: Record<string, string> | null;
  owner: string | null;
  environment: string | null;
};
export type UtilizationData = {
  namespace: 'AWS/EC2';
  metricName: 'CPUUtilization' | 'NetworkIn' | 'NetworkOut';
  dimensions: { InstanceId: string };
  unit: 'Percent' | 'Bytes';
  statistic: 'Average' | 'Maximum' | 'Sum';
  periodSeconds: number;
  points: { timestamp: string; value: number }[];
  expectedPoints: number;
  returnedPoints: number;
};
export type BillingData = {
  // Preserve AWS decimal precision. Conversion/arithmetic belongs to the savings layer.
  amount: string;
  currency: string;
  costBasis: 'UnblendedCost';
  component: 'compute';
  usageType: string;
  chargeType: string;
  pricingModel: 'on_demand' | 'spot' | 'reserved' | 'savings_plan' | 'unknown';
  usageQuantity: null;
  usageUnit: null;
  isEstimated: boolean | null;
};
export type OperationalData = {
  description: string;
  maintenance_window?: ScheduledMaintenance;
  scheduleExpression?: string;
  timeZone?: string;
  requiredAvailability?: string;
  dependencies?: string[];
  changeType?: string;
};
type Payloads = {
  inventory: InventoryData;
  utilization: UtilizationData;
  billing: BillingData;
  schedule: OperationalData;
  deployment: OperationalData;
  dependency: LoadBalancerTarget;
};
export type Kind = keyof Payloads;
export type Evidence<K extends Kind = Kind> = {
  [P in K]: {
    id: string;
    instanceId: string;
    kind: P;
    source: string;
    observedAt: string;
    collectedAt: string;
    synthetic: boolean;
    scope: Scope;
    window?: Window;
    provenance: { operation: string; sourceRef: string; requestId?: string };
    data: Payloads[P];
  };
}[K];
export type ToolResult<K extends Kind = Kind> = {
  status: Status;
  scope: { accountId: string | null; region: string | null };
  window?: Window;
  collectedAt: string;
  retrievedVia: 'aws_sdk' | 'fixture' | 'zetaris';
  evidence: Evidence<K>[];
  evidenceIds: string[];
  issues: Issue[];
};
export type InventoryOptions = { instanceIds?: string[] };
export type WindowOptions = { window?: Window };
export interface EC2Tools {
  getEC2Instances(options?: InventoryOptions): Promise<ToolResult<'inventory'>>;
  getUtilization(
    instanceId: string,
    options?: WindowOptions,
  ): Promise<ToolResult<'utilization'>>;
  getCostEvidence(
    instanceId: string,
    options?: WindowOptions,
  ): Promise<ToolResult<'billing'>>;
  getOperationalEvidence(
    instanceId: string,
    options?: WindowOptions & { kind?: 'operations' | 'dependencies' },
  ): Promise<ToolResult<'schedule' | 'deployment' | 'dependency'>>;
  close(): void;
}
export class InputError extends Error {}
export class DataError extends Error {}
export function issue(
  code: string,
  field?: string,
  severity: Issue['severity'] = 'warning',
): Issue {
  const messages: Record<string, string> = {
    NO_DATAPOINTS: 'No observations returned; missing data is not zero usage.',
    INCOMPLETE_COVERAGE: 'The requested period is not fully covered.',
    TRUNCATED: 'The configured page limit was reached; results are incomplete.',
    SOURCE_PARTIAL: 'The source reported incomplete metric data.',
    MEMORY_NOT_COLLECTED:
      'Memory is not a default EC2 metric; memory utilization remains unknown.',
    MISSING_METADATA: 'Some inventory metadata is unavailable.',
    UNKNOWN_COMMITMENT:
      'Commitment effects and marginal savings are unknown; this is compute cost evidence only.',
    SOURCE_NOT_CONFIGURED:
      'No operational source is configured; absence of jobs or dependencies is not established.',
  };
  return {
    code,
    field,
    severity,
    retryable: false,
    message: messages[code] ?? 'Source data is incomplete.',
  };
}
export function checkInstance(id: string): void {
  if (typeof id !== 'string' || !/^i-(?:[a-f0-9]{8}|[a-f0-9]{17})$/.test(id))
    throw new InputError('Invalid instance ID');
}
export function checkWindow(window: Window, periodSeconds = 3600): void {
  const utc = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
  if (!window || !utc.test(window.from) || !utc.test(window.to))
    throw new InputError('UTC window required');
  const from = Date.parse(window.from),
    to = Date.parse(window.to);
  if (
    !Number.isFinite(from) ||
    !Number.isFinite(to) ||
    to <= from ||
    to - from > 14 * 86400000 ||
    from % (periodSeconds * 1000) ||
    to % (periodSeconds * 1000)
  )
    throw new InputError('Invalid or unaligned window');
}
export function makeEvidence<K extends Kind>(
  kind: K,
  instanceId: string,
  data: Payloads[K],
  scope: Scope,
  collectedAt: string,
  synthetic: boolean,
  operation: string,
  window?: Window,
  requestId?: string,
  observedAt = window?.to ?? collectedAt,
): Evidence<K> {
  checkInstance(instanceId);
  if (!/^\d{12}$/.test(scope.accountId) || !scope.region)
    throw new DataError('Invalid scope');
  const identity = {
    kind,
    instanceId,
    data,
    scope,
    observedAt,
    window,
    synthetic,
  };
  const id = `ev-${createHash('sha256').update(JSON.stringify(identity)).digest('hex').slice(0, 24)}`;
  const service =
    kind === 'inventory'
      ? 'ec2'
      : kind === 'utilization'
        ? 'cloudwatch'
        : kind === 'billing'
          ? 'cost-explorer'
          : 'operations';
  return {
    ...identity,
    id,
    collectedAt,
    source: `${synthetic ? 'fixture' : 'aws'}.${service}`,
    provenance: {
      operation,
      sourceRef: `${synthetic ? 'fixture' : 'observation'}:${id}`,
      ...(requestId ? { requestId } : {}),
    },
  } as Evidence<K>;
}
