import { createHash } from 'node:crypto';
import { loadProjectEnv } from '../config.ts';
import {
  OPTIONAL_INVENTORY_FIELDS,
  type Observation,
  type ToolAction,
  type ToolArgs,
  type ToolName,
  type Schedule,
  validateAction,
  validateObservation,
} from '../contracts.ts';
import type { CurrentEvidenceProvider } from '../investigation/mock.ts';
import { createAwsTools, METRICS, type AwsToolConfig } from './aws.ts';
import type {
  EC2Tools,
  Evidence,
  ToolResult,
  Kind,
  UtilizationData,
} from './aws-evidence.ts';

const UNITS = {
  list_ec2_instances: 'instances',
  get_ec2_billing: 'currency',
  get_ec2_metrics: 'percent',
  get_ec2_operations: 'UTC-hours',
  get_ec2_dependencies: 'boolean',
} as const;
export interface AwsProviderOptions {
  config?: AwsToolConfig;
  mode?: 'live' | 'fixture';
  // Explicit test/fixture injection; caller owns this instance's lifetime.
  tools?: EC2Tools;
  clock?: () => Date;
  maxBillingInstances?: number;
}

function unavailable(
  o: Observation,
  missing: string[],
  status: 'unavailable' | 'error' = 'unavailable',
) {
  o.status = status;
  o.data = null;
  o.coverage = { complete: false, authoritative: false };
  o.missing_fields = [...new Set(missing)].slice(0, 30);
}
function gaps(result: ToolResult): string[] {
  return result.issues
    .filter((i) => i.severity !== 'info')
    .map((i) =>
      i.field &&
      [
        'cpu_avg',
        'cpu_max',
        'network_in',
        'network_out',
        'billing',
        'isEstimated',
      ].includes(i.field)
        ? `${i.code}:${i.field}`
        : i.code,
    )
    .slice(0, 25);
}
function compatible(
  result: ToolResult,
  action: ToolAction,
  mode: 'live' | 'fixture',
) {
  if (
    (result.status === 'ok' ||
      result.status === 'no_match' ||
      result.status === 'partial') &&
    (result.scope.accountId !== action.args.account_id ||
      result.scope.region !== action.args.region)
  )
    throw new Error('scope_mismatch');
  if (result.retrievedVia !== (mode === 'live' ? 'aws_sdk' : 'fixture'))
    throw new Error('source_mode_mismatch');
  if (
    result.window &&
    (result.window.from !== action.args.window.from ||
      result.window.to !== action.args.window.to)
  )
    throw new Error('source_period_mismatch');
  for (const evidence of result.evidence) {
    if (
      evidence.scope.accountId !== action.args.account_id ||
      evidence.scope.region !== action.args.region ||
      evidence.synthetic !== (mode === 'fixture')
    )
      throw new Error('source_mismatch');
    if (
      action.args.instance_id &&
      evidence.instanceId !== action.args.instance_id
    )
      throw new Error('resource_mismatch');
  }
  return result;
}
function setResult(o: Observation, result: ToolResult) {
  o.status = result.status;
  o.missing_fields = gaps(result);
  o.coverage = {
    complete: result.status === 'ok' || result.status === 'no_match',
    authoritative: result.status === 'ok' || result.status === 'no_match',
  };
  if (result.status === 'partial' && !o.missing_fields.length)
    o.missing_fields.push('incomplete_source');
}
function cpuSeries(
  evidence: Evidence<'utilization'>[],
  statistic: UtilizationData['statistic'],
) {
  return evidence.find(
    (e) =>
      e.data.metricName === 'CPUUtilization' && e.data.statistic === statistic,
  );
}
function suggestedWindow(series: UtilizationData): Schedule | null {
  // A question for the evaluator, never scheduling clearance. Search same-day
  // six-hour intervals with observations in each hour; do not impute missing hours.
  const buckets = Array.from({ length: 24 }, () => [] as number[]);
  for (const point of series.points)
    buckets[new Date(point.timestamp).getUTCHours()].push(point.value);
  let score = Infinity;
  let best: Schedule | null = null;
  for (let start = 0; start <= 18; start++) {
    const hours = buckets.slice(start, start + 6);
    if (hours.some((h) => !h.length)) continue;
    const candidate = hours.reduce(
      (sum, h) => sum + h.reduce((a, b) => a + b, 0) / h.length,
      0,
    );
    if (candidate < score) {
      score = candidate;
      best = { start_hour_utc: start, end_hour_utc: start + 6 };
    }
  }
  return best;
}

/** Supplies the exact shared Observation wire shape; no persistence or AWS writes. */
export function createAwsEvidenceProvider(
  options: AwsProviderOptions = {},
): CurrentEvidenceProvider {
  const mode = options.mode ?? 'live';
  if (mode === 'fixture' && !options.tools)
    throw new Error('fixture_tools_required');
  const maxBilling = options.maxBillingInstances ?? 5;
  if (!Number.isInteger(maxBilling) || maxBilling < 1 || maxBilling > 20)
    throw new Error('invalid_billing_limit');
  const clock = options.clock ?? (() => new Date());
  return {
    mode,
    async call(input, parentSignal) {
      const validated = validateAction(input);
      if (validated.type !== 'tool') throw new Error('tool_action_required');
      const action = validated;
      const { tool, args } = action;
      parentSignal.throwIfAborted();
      const started = clock().toISOString();
      const o: Observation = {
        tool,
        status: 'ok',
        source: `${mode === 'live' ? 'aws' : 'fixture'}-${tool}`,
        integration_mode: mode,
        scope: {
          account_id: args.account_id,
          region: args.region,
          ...(args.instance_id ? { instance_id: args.instance_id } : {}),
        },
        observed_window: { ...args.window },
        collected_at: started,
        coverage: { complete: false, authoritative: false },
        missing_fields: [],
        units: UNITS[tool],
        evidence_id: 'pending',
        data: null,
      };
      const rawIds: string[] = [];
      let owned: EC2Tools | undefined;
      // One bound covers discovery plus all per-instance billing calls.
      const deadline = AbortSignal.timeout(options.config?.timeoutMs ?? 20000);
      const signal = AbortSignal.any([parentSignal, deadline]);
      try {
        if (
          (options.config?.region && options.config.region !== args.region) ||
          (options.config?.expectedAccountId &&
            options.config.expectedAccountId !== args.account_id)
        )
          throw new Error('configured_scope_mismatch');
        {
          if (!options.tools) loadProjectEnv();
          if (!options.tools)
            owned = createAwsTools({
              ...options.config,
              // Investigation policy requires five-minute or finer evidence.
              // Keep the standalone collector's coarser default independent.
              periodSeconds: options.config?.periodSeconds ?? 300,
              region: args.region,
              expectedAccountId: args.account_id,
              window: args.window,
              signal,
              enableCostExplorer:
                options.config?.enableCostExplorer ??
                process.env.AWS_ENABLE_COST_EXPLORER === 'true',
            });
          const tools = options.tools ?? owned;
          if (!tools) throw new Error('tools_unavailable');
          const check = <K extends Kind>(r: ToolResult<K>) => {
            signal.throwIfAborted();
            compatible(r, action, mode);
            rawIds.push(...r.evidenceIds);
            return r;
          };
          if (
            tool === 'get_ec2_operations' ||
            tool === 'get_ec2_dependencies'
          ) {
            const result = check(
              await tools.getOperationalEvidence(args.instance_id ?? '', {
                window: args.window,
                kind:
                  tool === 'get_ec2_operations' ? 'operations' : 'dependencies',
              }),
            );
            o.source = `${mode === 'live' ? 'aws' : 'fixture'}-${tool === 'get_ec2_operations' ? 'ssm-maintenance-windows' : 'elbv2-target-health'}`;
            if (result.status === 'unavailable' || result.status === 'error')
              unavailable(o, gaps(result), result.status);
            else {
              const maintenance = result.evidence.flatMap((e) =>
                e.kind === 'schedule' && e.data.maintenance_window
                  ? [e.data.maintenance_window]
                  : [],
              );
              const targets = result.evidence.flatMap((e) =>
                e.kind === 'dependency' ? [e.data] : [],
              );
              // Legacy fixture cron strings/tags are never interpreted as facts.
              if (
                mode === 'fixture' &&
                !maintenance.length &&
                !targets.length &&
                result.status !== 'partial'
              )
                unavailable(o, [
                  tool === 'get_ec2_operations'
                    ? 'operational_source_not_configured'
                    : 'dependency_source_not_configured',
                ]);
              else {
                o.status = 'partial';
                o.coverage = { complete: false, authoritative: false };
                o.missing_fields = [
                  ...new Set([
                    ...gaps(result),
                    tool === 'get_ec2_operations'
                      ? 'JOBS_OUTSIDE_SSM_UNKNOWN'
                      : 'DEPENDENCIES_OUTSIDE_ELBV2_UNKNOWN',
                    'OWNER_CALENDAR_RECOVERY_CLEARANCE_REQUIRED',
                  ]),
                ].slice(0, 30);
                o.data =
                  tool === 'get_ec2_operations'
                    ? { jobs: [], scheduled_maintenance: maintenance }
                    : {
                        requires_continuous_operation: false,
                        load_balancer_targets: targets,
                      };
              }
            }
          } else if (tool === 'list_ec2_instances') {
            const result = check(await tools.getEC2Instances());
            setResult(o, result);
            if (result.status === 'error' || result.status === 'unavailable')
              unavailable(o, gaps(result), result.status);
            else {
              const rows = result.evidence.flatMap((e) =>
                e.data.state === 'running' || e.data.state === 'stopped'
                  ? [
                      {
                        instance_id: e.instanceId,
                        state: e.data.state as 'running' | 'stopped',
                        missing_metadata: OPTIONAL_INVENTORY_FIELDS.filter(
                          (field) => e.data[field] === null,
                        ),
                      },
                    ]
                  : [],
              );
              o.data = { instances: rows.slice(0, 100) };
              if (rows.length !== result.evidence.length || rows.length > 100) {
                o.status = 'partial';
                o.coverage.complete = false;
                o.missing_fields.push('unsupported_or_truncated_instances');
              }
            }
          } else if (tool === 'get_ec2_metrics') {
            if (!args.instance_id) throw new Error('instance_required');
            const result = check(
              await tools.getUtilization(args.instance_id, {
                window: args.window,
              }),
            );
            o.metric_coverage = METRICS.map((metric) => {
              const series = result.evidence.find(
                (e) =>
                  e.data.metricName === metric.metricName &&
                  e.data.statistic === metric.statistic,
              )?.data;
              const period =
                series?.periodSeconds ?? options.config?.periodSeconds ?? 3600;
              return {
                field: metric.id,
                period_seconds: period,
                expected_points:
                  series?.expectedPoints ??
                  (Date.parse(args.window.to) - Date.parse(args.window.from)) /
                    (period * 1000),
                returned_points: series?.returnedPoints ?? 0,
                first_sample_at: series?.points[0]?.timestamp ?? null,
                last_sample_at: series?.points.at(-1)?.timestamp ?? null,
              };
            });
            setResult(o, result);
            if (result.status === 'error' || result.status === 'unavailable')
              unavailable(o, gaps(result), result.status);
            else {
              const avg = cpuSeries(result.evidence, 'Average'),
                max = cpuSeries(result.evidence, 'Maximum');
              const window = avg ? suggestedWindow(avg.data) : null;
              // Shared MetricsData requires CPU average, peak and a schedule.
              // Its validator cannot represent no_match/null for this tool.
              if (
                !avg?.data.points.length ||
                !max?.data.points.length ||
                !window
              )
                unavailable(o, [
                  ...gaps(result),
                  'cpu_summary_or_observed_schedule_unavailable',
                ]);
              else {
                o.data = {
                  average_cpu_percent:
                    avg.data.points.reduce((sum, p) => sum + p.value, 0) /
                    avg.data.points.length,
                  peak_cpu_percent: Math.max(
                    ...max.data.points.map((p) => p.value),
                  ),
                  suggested_window: window,
                  aggregation_minutes: avg.data.periodSeconds / 60,
                };
              }
            }
          } else {
            const inventory = check(await tools.getEC2Instances());
            if (
              inventory.status === 'unavailable' ||
              inventory.status === 'error'
            )
              unavailable(o, gaps(inventory), inventory.status);
            else if (!inventory.evidence.length)
              unavailable(o, [
                'billing_currency_and_resource_records_unavailable',
              ]);
            else {
              const costs: { instance_id: string; compute_cost: number }[] = [];
              const currencies = new Set<string>();
              const missing = new Set(gaps(inventory));
              let billingError = false;
              if (inventory.status === 'partial')
                missing.add('inventory_incomplete');
              if (inventory.evidence.length > maxBilling)
                missing.add('billing_instance_limit');
              for (const instance of inventory.evidence.slice(0, maxBilling)) {
                const billing = check(
                  await tools.getCostEvidence(instance.instanceId, {
                    window: args.window,
                  }),
                );
                if (
                  billing.evidence.some(
                    (e) => e.instanceId !== instance.instanceId,
                  )
                )
                  throw new Error('billing_resource_mismatch');
                gaps(billing).forEach((gap) => {
                  missing.add(gap);
                });
                if (billing.status === 'error') billingError = true;
                if (billing.status !== 'ok') missing.add('billing_incomplete');
                if (!billing.evidence.length) {
                  missing.add('billing_records_unavailable');
                  continue;
                }
                for (const e of billing.evidence)
                  currencies.add(e.data.currency);
                const sum = billing.evidence.reduce(
                  (total, e) => total + Number(e.data.amount),
                  0,
                );
                if (!Number.isFinite(sum) || sum < 0 || sum > 1e12) {
                  missing.add('unsupported_signed_or_invalid_cost');
                  continue;
                }
                // Ranking input only; rich records retain exact decimal strings.
                costs.push({
                  instance_id: instance.instanceId,
                  compute_cost: sum,
                });
              }
              if (!costs.length || currencies.size !== 1)
                unavailable(
                  o,
                  [
                    ...missing,
                    currencies.size > 1
                      ? 'mixed_currencies'
                      : 'billing_currency_and_resource_records_unavailable',
                  ],
                  billingError ? 'error' : 'unavailable',
                );
              else {
                o.status = missing.size ? 'partial' : 'ok';
                o.coverage = {
                  complete: !missing.size,
                  authoritative: !missing.size,
                };
                o.missing_fields = [...missing].slice(0, 30);
                o.data = {
                  costs,
                  currency: [...currencies][0],
                  commitment_coverage_known: false,
                };
              }
            }
          }
        }
      } catch {
        unavailable(
          o,
          [
            signal.aborted
              ? 'request_cancelled_or_timed_out'
              : 'aws_adapter_failed_or_scope_mismatch',
          ],
          'error',
        );
      } finally {
        owned?.close();
      }
      o.collected_at = clock().toISOString();
      o.evidence_id = `aws-observation-${createHash('sha256')
        .update(JSON.stringify({ observation: o, rawIds }))
        .digest('hex')
        .slice(0, 24)}`;
      return validateObservation(o, action, {
        started_at: started,
        now: clock().toISOString(),
        mode,
      });
    },
  };
}

async function invoke(
  tool: ToolName,
  args: ToolArgs,
  parentSignal?: AbortSignal,
): Promise<Observation> {
  return (await createAwsEvidenceProvider().call(
    { type: 'tool', tool, args, reason: 'Read scoped AWS evidence.' },
    parentSignal ?? new AbortController().signal,
  )) as Observation;
}
export async function list_ec2_instances(
  args: ToolArgs,
  signal?: AbortSignal,
): Promise<Observation> {
  return invoke('list_ec2_instances', args, signal);
}
export async function get_ec2_billing(
  args: ToolArgs,
  signal?: AbortSignal,
): Promise<Observation> {
  return invoke('get_ec2_billing', args, signal);
}
export async function get_ec2_metrics(
  args: ToolArgs,
  signal?: AbortSignal,
): Promise<Observation> {
  return invoke('get_ec2_metrics', args, signal);
}
export async function get_ec2_operations(
  args: ToolArgs,
  signal?: AbortSignal,
): Promise<Observation> {
  return invoke('get_ec2_operations', args, signal);
}
export async function get_ec2_dependencies(
  args: ToolArgs,
  signal?: AbortSignal,
): Promise<Observation> {
  return invoke('get_ec2_dependencies', args, signal);
}
