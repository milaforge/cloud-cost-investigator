import {
  EC2Client,
  DescribeInstancesCommand,
  type DescribeInstancesCommandInput,
  type DescribeInstancesCommandOutput,
} from '@aws-sdk/client-ec2';
import {
  CloudWatchClient,
  GetMetricDataCommand,
  type GetMetricDataCommandInput,
  type GetMetricDataCommandOutput,
} from '@aws-sdk/client-cloudwatch';
import {
  CostExplorerClient,
  GetCostAndUsageWithResourcesCommand,
  type GetCostAndUsageWithResourcesCommandInput,
  type GetCostAndUsageWithResourcesCommandOutput,
} from '@aws-sdk/client-cost-explorer';
import {
  STSClient,
  GetCallerIdentityCommand,
  type GetCallerIdentityCommandOutput,
} from '@aws-sdk/client-sts';
import {
  SSMClient,
  DescribeMaintenanceWindowScheduleCommand,
  GetMaintenanceWindowCommand,
  type DescribeMaintenanceWindowScheduleCommandInput,
  type DescribeMaintenanceWindowScheduleCommandOutput,
  type GetMaintenanceWindowCommandInput,
  type GetMaintenanceWindowCommandOutput,
} from '@aws-sdk/client-ssm';
import {
  ElasticLoadBalancingV2Client,
  DescribeTargetGroupsCommand,
  DescribeTargetHealthCommand,
  type DescribeTargetGroupsCommandInput,
  type DescribeTargetGroupsCommandOutput,
  type DescribeTargetHealthCommandInput,
  type DescribeTargetHealthCommandOutput,
} from '@aws-sdk/client-elastic-load-balancing-v2';
import { collectOperationalEvidence } from './aws-operational.ts';
import {
  type EC2Tools,
  type Kind,
  type Scope,
  type ToolResult,
  type Window,
  type UtilizationData,
  type BillingData,
  InputError,
  DataError,
  checkInstance,
  checkWindow,
  issue,
  makeEvidence,
} from './aws-evidence.js';

// SDK operations are injected as functions, independently of any agent framework.
export interface AwsTransport {
  maintenanceSchedule?(
    input: DescribeMaintenanceWindowScheduleCommandInput,
    signal: AbortSignal,
  ): Promise<DescribeMaintenanceWindowScheduleCommandOutput>;
  maintenanceWindow?(
    input: GetMaintenanceWindowCommandInput,
    signal: AbortSignal,
  ): Promise<GetMaintenanceWindowCommandOutput>;
  targetGroups?(
    input: DescribeTargetGroupsCommandInput,
    signal: AbortSignal,
  ): Promise<DescribeTargetGroupsCommandOutput>;
  targetHealth?(
    input: DescribeTargetHealthCommandInput,
    signal: AbortSignal,
  ): Promise<DescribeTargetHealthCommandOutput>;
  region(): Promise<string>;
  identity(signal: AbortSignal): Promise<GetCallerIdentityCommandOutput>;
  inventory(
    input: DescribeInstancesCommandInput,
    signal: AbortSignal,
  ): Promise<DescribeInstancesCommandOutput>;
  metrics(
    input: GetMetricDataCommandInput,
    signal: AbortSignal,
  ): Promise<GetMetricDataCommandOutput>;
  costs(
    input: GetCostAndUsageWithResourcesCommandInput,
    signal: AbortSignal,
  ): Promise<GetCostAndUsageWithResourcesCommandOutput>;
  close(): void;
}
export interface AwsToolConfig {
  region?: string;
  expectedAccountId?: string;
  window?: Window;
  periodSeconds?: 300 | 3600;
  maxPages?: number;
  timeoutMs?: number;
  clock?: () => Date;
  // No automatic enabling of paid resource-level billing features.
  enableCostExplorer?: boolean;
  signal?: AbortSignal;
}
export const METRICS = [
  {
    id: 'cpu_avg',
    metricName: 'CPUUtilization',
    statistic: 'Average',
    unit: 'Percent',
  },
  {
    id: 'cpu_max',
    metricName: 'CPUUtilization',
    statistic: 'Maximum',
    unit: 'Percent',
  },
  {
    id: 'network_in',
    metricName: 'NetworkIn',
    statistic: 'Sum',
    unit: 'Bytes',
  },
  {
    id: 'network_out',
    metricName: 'NetworkOut',
    statistic: 'Sum',
    unit: 'Bytes',
  },
] as const;

function sdkTransport(config: AwsToolConfig): AwsTransport {
  // Omitting credentials deliberately uses the Node SDK default provider chain.
  const settings = { region: config.region, maxAttempts: 2 };
  const ec2 = new EC2Client(settings);
  const cloudwatch = new CloudWatchClient(settings);
  const sts = new STSClient(settings);
  const ce = new CostExplorerClient({ region: 'us-east-1', maxAttempts: 2 });
  // Operational clients are created only for the corresponding read path.
  let ssm: SSMClient | undefined;
  let elb: ElasticLoadBalancingV2Client | undefined;
  return {
    maintenanceSchedule: (input, signal) => {
      ssm ??= new SSMClient(settings);
      return ssm.send(new DescribeMaintenanceWindowScheduleCommand(input), {
        abortSignal: signal,
      });
    },
    maintenanceWindow: (input, signal) => {
      ssm ??= new SSMClient(settings);
      return ssm.send(new GetMaintenanceWindowCommand(input), {
        abortSignal: signal,
      });
    },
    targetGroups: (input, signal) => {
      elb ??= new ElasticLoadBalancingV2Client(settings);
      return elb.send(new DescribeTargetGroupsCommand(input), {
        abortSignal: signal,
      });
    },
    targetHealth: (input, signal) => {
      elb ??= new ElasticLoadBalancingV2Client(settings);
      return elb.send(new DescribeTargetHealthCommand(input), {
        abortSignal: signal,
      });
    },
    region: () => ec2.config.region(),
    identity: (signal) =>
      sts.send(new GetCallerIdentityCommand({}), { abortSignal: signal }),
    inventory: (input, signal) =>
      ec2.send(new DescribeInstancesCommand(input), { abortSignal: signal }),
    metrics: (input, signal) =>
      cloudwatch.send(new GetMetricDataCommand(input), { abortSignal: signal }),
    costs: (input, signal) =>
      ce.send(new GetCostAndUsageWithResourcesCommand(input), {
        abortSignal: signal,
      }),
    close: () => {
      ec2.destroy();
      cloudwatch.destroy();
      sts.destroy();
      ce.destroy();
      ssm?.destroy();
      elb?.destroy();
    },
  };
}
class ScopeError extends Error {}
class DeadlineError extends Error {}
class UnavailableError extends Error {
  constructor(public code: string) {
    super(code);
  }
}
function classify(error: unknown) {
  const name = error instanceof Error ? error.name : '';
  const networkCode =
    error instanceof Error && 'code' in error ? error.code : undefined;
  if (error instanceof InputError)
    return {
      status: 'error' as const,
      code: 'INVALID_INPUT',
      message:
        'Invalid arguments: use an EC2 ID and an aligned UTC window of at most 14 days.',
      retryable: false,
    };
  if (error instanceof DataError)
    return {
      status: 'error' as const,
      code: 'INVALID_SOURCE_DATA',
      message: 'The source returned data that did not pass validation.',
      retryable: false,
    };
  if (error instanceof ScopeError)
    return {
      status: 'error' as const,
      code: 'SCOPE_MISMATCH',
      message: 'Authenticated account does not match the expected account.',
      retryable: false,
    };
  if (error instanceof UnavailableError)
    return {
      status: 'unavailable' as const,
      code: error.code,
      message: 'Required source or configuration is unavailable.',
      retryable: false,
    };
  if (
    /CredentialsProvider|TokenProvider|ExpiredToken|InvalidClientToken|UnrecognizedClient/.test(
      name,
    )
  )
    return {
      status: 'unavailable' as const,
      code: 'MISSING_CREDENTIALS',
      message:
        'AWS credentials are unavailable or expired; configure the local credential provider chain.',
      retryable: false,
    };
  if (/AccessDenied|UnauthorizedOperation/.test(name))
    return {
      status: 'unavailable' as const,
      code: 'ACCESS_DENIED',
      message: 'The configured AWS identity cannot read this source.',
      retryable: false,
    };
  if (/DataUnavailable|OptInRequired/.test(name))
    return {
      status: 'unavailable' as const,
      code: 'SOURCE_UNAVAILABLE',
      message: 'Resource-level billing data is not available for this request.',
      retryable: false,
    };
  if (
    typeof networkCode === 'string' &&
    ['EAI_AGAIN', 'ENOTFOUND', 'ECONNREFUSED', 'ENETUNREACH'].includes(
      networkCode,
    )
  )
    return {
      status: 'unavailable' as const,
      code: 'NETWORK_UNAVAILABLE',
      message: 'AWS endpoint or credential service could not be reached.',
      retryable: true,
    };
  if (error instanceof DeadlineError || /AbortError|Timeout/.test(name))
    return {
      status: 'error' as const,
      code: 'TIMEOUT',
      message: 'The tool exceeded its time limit.',
      retryable: true,
    };
  return {
    status: 'error' as const,
    code: 'AWS_REQUEST_FAILED',
    message:
      'AWS retrieval failed. No raw provider error or credentials are included.',
    retryable: true,
  };
}

export function createAwsTools(config: AwsToolConfig = {}): EC2Tools {
  return createToolsWithTransport(config, sdkTransport(config));
}

// Also used by deterministic fixtures; no AWS client is created in fixture mode.
export function createToolsWithTransport(
  config: AwsToolConfig,
  transport: AwsTransport,
  synthetic = false,
): EC2Tools {
  const clock = config.clock ?? (() => new Date());
  const end = new Date(clock());
  end.setUTCHours(0, 0, 0, 0);
  const defaultWindow = config.window ?? {
    from: new Date(+end - 14 * 86400000).toISOString(),
    to: end.toISOString(),
  };
  const period = config.periodSeconds ?? 3600;
  const maxPages = config.maxPages ?? 5;
  const timeoutMs = config.timeoutMs ?? 20000;
  if (
    ![300, 3600].includes(period) ||
    !Number.isInteger(maxPages) ||
    maxPages < 1 ||
    maxPages > 20 ||
    !Number.isFinite(timeoutMs) ||
    timeoutMs < 1 ||
    timeoutMs > 120000
  )
    throw new InputError('Invalid tool configuration');
  let account: string | null = null;
  let region: string | null = config.region ?? null;

  async function run<K extends Kind>(
    window: Window | undefined,
    validate: () => void,
    collect: (
      result: ToolResult<K>,
      scope: Scope,
      signal: AbortSignal,
    ) => Promise<void>,
  ): Promise<ToolResult<K>> {
    const result: ToolResult<K> = {
      status: 'ok',
      scope: { accountId: account, region },
      window,
      collectedAt: clock().toISOString(),
      retrievedVia: synthetic ? 'fixture' : 'aws_sdk',
      evidence: [],
      evidenceIds: [],
      issues: [],
    };
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancel: (() => void) | undefined;
    try {
      validate();
      if (config.signal?.aborted) throw new DeadlineError();
      await Promise.race([
        (async () => {
          try {
            region = await transport.region();
          } catch {
            throw new UnavailableError('MISSING_REGION');
          }
          controller.signal.throwIfAborted();
          if (!/^[a-z]{2}(?:-[a-z]+)+-\d+$/.test(region))
            throw new UnavailableError('MISSING_REGION');
          if (config.region && region !== config.region) throw new ScopeError();
          result.scope.region = region;
          if (!account) {
            const identity = await transport.identity(controller.signal);
            controller.signal.throwIfAborted();
            if (!identity.Account || !/^\d{12}$/.test(identity.Account))
              throw new DataError('Missing identity');
            if (
              config.expectedAccountId &&
              identity.Account !== config.expectedAccountId
            )
              throw new ScopeError();
            account = identity.Account;
          }
          result.scope.accountId = account;
          await collect(
            result,
            { accountId: account, region },
            controller.signal,
          );
        })(),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => {
            controller.abort();
            reject(new DeadlineError());
          }, timeoutMs);
        }),
        new Promise<never>((_, reject) => {
          cancel = () => {
            controller.abort();
            reject(new DeadlineError());
          };
          config.signal?.addEventListener('abort', cancel, { once: true });
        }),
      ]);
      if (result.status === 'ok' && !result.evidence.length)
        result.status = 'no_match';
    } catch (error) {
      const failure = classify(error);
      result.status = result.evidence.length ? 'partial' : failure.status;
      result.issues.push({
        code: failure.code,
        message: failure.message,
        retryable: failure.retryable,
        severity: 'error',
      });
    } finally {
      if (timer) clearTimeout(timer);
      if (cancel) config.signal?.removeEventListener('abort', cancel);
      controller.abort();
    }
    result.evidenceIds = result.evidence.map((e) => e.id);
    // Detach from any SDK operation still settling after the deadline.
    return structuredClone(result);
  }
  function validatePeriod(window: Window, seconds: number = period) {
    checkWindow(window, seconds);
    if (
      Date.parse(window.to) > +clock() ||
      Date.parse(window.from) < +clock() - 15 * 86400000
    )
      throw new InputError('Unsupported window');
  }
  const partial = <K extends Kind>(
    r: ToolResult<K>,
    code: string,
    field?: string,
  ) => {
    r.status = 'partial';
    r.issues.push(issue(code, field));
  };

  return {
    close: () => transport.close(),
    getEC2Instances: (options = {}) =>
      run(
        undefined,
        () => {
          if (
            options.instanceIds &&
            (!Array.isArray(options.instanceIds) ||
              !options.instanceIds.length ||
              options.instanceIds.length > 100)
          )
            throw new InputError();
          options.instanceIds?.forEach(checkInstance);
        },
        async (r, scope, signal) => {
          let token: string | undefined;
          const seen = new Set<string>();
          for (let page = 0; page < maxPages; page++) {
            const response = await transport.inventory(
              {
                ...(options.instanceIds
                  ? { InstanceIds: options.instanceIds }
                  : { MaxResults: 100 }),
                NextToken: token,
              },
              signal,
            );
            signal.throwIfAborted();
            for (const reservation of response.Reservations ?? []) {
              if (
                reservation.OwnerId &&
                reservation.OwnerId !== scope.accountId
              )
                throw new ScopeError();
              for (const instance of reservation.Instances ?? []) {
                if (
                  typeof instance.InstanceId !== 'string' ||
                  typeof instance.InstanceType !== 'string' ||
                  !instance.InstanceType ||
                  typeof instance.State?.Name !== 'string' ||
                  !instance.State.Name
                )
                  throw new DataError('Incomplete instance');
                for (const value of [
                  instance.Placement?.AvailabilityZone,
                  instance.Placement?.Tenancy,
                  instance.PlatformDetails,
                  instance.Platform,
                ])
                  if (value !== undefined && typeof value !== 'string')
                    throw new DataError('Invalid inventory metadata');
                checkInstance(instance.InstanceId);
                if (
                  instance.Placement?.AvailabilityZone &&
                  !instance.Placement.AvailabilityZone.startsWith(scope.region)
                )
                  throw new DataError('Unexpected region');
                if (
                  options.instanceIds &&
                  !options.instanceIds.includes(instance.InstanceId)
                )
                  throw new DataError('Unexpected instance');
                if (seen.has(instance.InstanceId)) continue;
                seen.add(instance.InstanceId);
                const tags: Record<string, string> | null = instance.Tags
                  ? Object.fromEntries(
                      instance.Tags.map((t) => {
                        if (
                          typeof t.Key !== 'string' ||
                          typeof t.Value !== 'string'
                        )
                          throw new DataError('Invalid tags');
                        return [t.Key, t.Value];
                      }).sort(([a], [b]) => a.localeCompare(b)),
                    )
                  : null;
                const data = {
                  instanceType: instance.InstanceType,
                  state: instance.State.Name,
                  availabilityZone:
                    instance.Placement?.AvailabilityZone ?? null,
                  launchTime: instance.LaunchTime?.toISOString() ?? null,
                  platform:
                    instance.PlatformDetails ?? instance.Platform ?? null,
                  tenancy: instance.Placement?.Tenancy ?? null,
                  tags,
                  owner: tags?.Owner ?? tags?.owner ?? null,
                  environment: tags?.Environment ?? tags?.environment ?? null,
                };
                r.evidence.push(
                  makeEvidence(
                    'inventory',
                    instance.InstanceId,
                    data,
                    scope,
                    r.collectedAt,
                    synthetic,
                    'DescribeInstances',
                    undefined,
                    response.$metadata?.requestId,
                  ),
                );
                if (Object.values(data).some((v) => v === null))
                  partial(r, 'MISSING_METADATA', instance.InstanceId);
              }
            }
            if (!response.NextToken) break;
            if (response.NextToken === token || page === maxPages - 1) {
              partial(r, 'TRUNCATED');
              break;
            }
            token = response.NextToken;
          }
        },
      ),
    getUtilization: (instanceId, options = {}) => {
      const window = options.window ?? defaultWindow;
      return run(
        window,
        () => {
          checkInstance(instanceId);
          validatePeriod(window);
        },
        async (r, scope, signal) => {
          const series = new Map(
            METRICS.map((m) => [m.id as string, new Map<string, number>()]),
          );
          const failures = new Set<string>();
          let token: string | undefined;
          let requestId: string | undefined;
          let pages = 0;
          let retrievalFailure: unknown;
          try {
            for (; pages < maxPages; pages++) {
              const response = await transport.metrics(
                {
                  StartTime: new Date(window.from),
                  EndTime: new Date(window.to),
                  ScanBy: 'TimestampAscending',
                  MaxDatapoints: 10000,
                  MetricDataQueries: METRICS.map((m) => ({
                    Id: m.id,
                    ReturnData: true,
                    MetricStat: {
                      Metric: {
                        Namespace: 'AWS/EC2',
                        MetricName: m.metricName,
                        Dimensions: [{ Name: 'InstanceId', Value: instanceId }],
                      },
                      Period: period,
                      Stat: m.statistic,
                      Unit: m.unit,
                    },
                  })),
                  NextToken: token,
                },
                signal,
              );
              signal.throwIfAborted();
              requestId = response.$metadata?.requestId;
              if (response.Messages?.length) partial(r, 'SOURCE_PARTIAL');
              for (const metric of response.MetricDataResults ?? []) {
                if (!metric.Id || !series.has(metric.Id))
                  throw new DataError('Unexpected metric');
                const metricId = metric.Id;
                const metricPoints = series.get(metricId);
                if (!metricPoints) throw new DataError('Unexpected metric');
                if (
                  metric.StatusCode !== 'Complete' &&
                  !(metric.StatusCode === 'PartialData' && response.NextToken)
                )
                  failures.add(metric.Id);
                if (metric.Messages?.length) failures.add(metric.Id);
                const times = metric.Timestamps ?? [],
                  values = metric.Values ?? [];
                if (times.length !== values.length)
                  throw new DataError('Mismatched points');
                times.forEach((time, index) => {
                  const timestamp = time.toISOString(),
                    value = values[index];
                  if (
                    +time < Date.parse(window.from) ||
                    +time >= Date.parse(window.to) ||
                    +time % (period * 1000) ||
                    !Number.isFinite(value) ||
                    value < 0 ||
                    (metricId.startsWith('cpu_') && value > 100)
                  )
                    throw new DataError('Invalid datapoint');
                  const points = metricPoints;
                  if (points.has(timestamp) && points.get(timestamp) !== value)
                    throw new DataError('Conflicting datapoint');
                  points.set(timestamp, value);
                });
              }
              if (!response.NextToken) break;
              if (response.NextToken === token || pages === maxPages - 1) {
                partial(r, 'TRUNCATED');
                break;
              }
              token = response.NextToken;
            }
          } catch (error) {
            retrievalFailure = error;
          }
          for (const metric of METRICS) {
            const points = [...(series.get(metric.id) ?? [])]
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([timestamp, value]) => ({ timestamp, value }));
            if (!points.length) {
              r.issues.push(issue('NO_DATAPOINTS', metric.id));
              continue;
            }
            const expectedPoints =
              (Date.parse(window.to) - Date.parse(window.from)) /
              (period * 1000);
            const data: UtilizationData = {
              namespace: 'AWS/EC2',
              metricName: metric.metricName,
              dimensions: { InstanceId: instanceId },
              unit: metric.unit,
              statistic: metric.statistic,
              periodSeconds: period,
              points,
              expectedPoints,
              returnedPoints: points.length,
            };
            r.evidence.push(
              makeEvidence(
                'utilization',
                instanceId,
                data,
                scope,
                r.collectedAt,
                synthetic,
                'GetMetricData',
                window,
                requestId,
                points.at(-1)?.timestamp,
              ),
            );
            if (points.length < expectedPoints)
              partial(r, 'INCOMPLETE_COVERAGE', metric.id);
            if (failures.has(metric.id))
              partial(r, 'SOURCE_PARTIAL', metric.id);
          }
          r.issues.push(issue('MEMORY_NOT_COLLECTED', 'memory', 'info'));
          if (r.evidence.length && r.evidence.length < METRICS.length)
            r.status = 'partial';
          if (retrievalFailure) throw retrievalFailure;
          if (!r.evidence.length && failures.size)
            throw new DataError('Metric queries failed');
        },
      );
    },
    getCostEvidence: (instanceId, options = {}) => {
      const window = options.window ?? defaultWindow;
      return run(
        window,
        () => {
          checkInstance(instanceId);
          validatePeriod(window, 86400);
          const today = new Date(clock());
          today.setUTCHours(0, 0, 0, 0);
          if (Date.parse(window.from) < +today - 14 * 86400000)
            throw new InputError(
              'Cost Explorer only supports recent resource data',
            );
          if (!config.enableCostExplorer)
            throw new UnavailableError('COST_EXPLORER_DISABLED');
        },
        async (r, scope, signal) => {
          let token: string | undefined;
          const days = new Set<string>();
          const records = new Set<string>();
          for (let page = 0; page < maxPages; page++) {
            const response = await transport.costs(
              {
                TimePeriod: {
                  Start: window.from.slice(0, 10),
                  End: window.to.slice(0, 10),
                },
                Granularity: 'DAILY',
                Metrics: ['UnblendedCost'],
                Filter: {
                  And: [
                    {
                      Dimensions: {
                        Key: 'SERVICE',
                        Values: ['Amazon Elastic Compute Cloud - Compute'],
                      },
                    },
                    {
                      Dimensions: { Key: 'RESOURCE_ID', Values: [instanceId] },
                    },
                    {
                      Dimensions: {
                        Key: 'LINKED_ACCOUNT',
                        Values: [scope.accountId],
                      },
                    },
                    { Dimensions: { Key: 'REGION', Values: [scope.region] } },
                  ],
                },
                GroupBy: [
                  { Type: 'DIMENSION', Key: 'USAGE_TYPE' },
                  { Type: 'DIMENSION', Key: 'RECORD_TYPE' },
                ],
                NextPageToken: token,
              },
              signal,
            );
            signal.throwIfAborted();
            for (const day of response.ResultsByTime ?? []) {
              if (!day.TimePeriod?.Start || !day.TimePeriod.End)
                throw new DataError('Missing billing period');
              const periodWindow = {
                from: `${day.TimePeriod.Start}T00:00:00.000Z`,
                to: `${day.TimePeriod.End}T00:00:00.000Z`,
              };
              checkWindow(periodWindow, 86400);
              if (
                Date.parse(periodWindow.from) < Date.parse(window.from) ||
                Date.parse(periodWindow.to) > Date.parse(window.to) ||
                Date.parse(periodWindow.to) - Date.parse(periodWindow.from) !==
                  86400000
              )
                throw new DataError('Unexpected billing period');
              if (day.Groups?.length) days.add(day.TimePeriod.Start);
              for (const group of day.Groups ?? []) {
                const amount = group.Metrics?.UnblendedCost?.Amount,
                  currency = group.Metrics?.UnblendedCost?.Unit;
                if (
                  group.Keys?.length !== 2 ||
                  group.Keys.some((key) => typeof key !== 'string' || !key) ||
                  typeof amount !== 'string' ||
                  !/^-?\d+(\.\d+)?$/.test(amount) ||
                  !currency ||
                  !/^[A-Z]{3}$/.test(currency)
                )
                  throw new DataError('Invalid cost row');
                const [usageType, chargeType] = group.Keys;
                const pricingModel: BillingData['pricingModel'] =
                  chargeType === 'SavingsPlanCoveredUsage'
                    ? 'savings_plan'
                    : chargeType === 'DiscountedUsage'
                      ? 'reserved'
                      : /SpotUsage/.test(usageType)
                        ? 'spot'
                        : chargeType === 'Usage'
                          ? 'on_demand'
                          : 'unknown';
                const data: BillingData = {
                  amount,
                  currency,
                  costBasis: 'UnblendedCost',
                  component: 'compute',
                  usageType,
                  chargeType,
                  pricingModel,
                  usageQuantity: null,
                  usageUnit: null,
                  isEstimated:
                    typeof day.Estimated === 'boolean' ? day.Estimated : null,
                };
                const evidence = makeEvidence(
                  'billing',
                  instanceId,
                  data,
                  scope,
                  r.collectedAt,
                  synthetic,
                  'GetCostAndUsageWithResources',
                  periodWindow,
                  response.$metadata?.requestId,
                );
                if (!records.has(evidence.id)) {
                  records.add(evidence.id);
                  r.evidence.push(evidence);
                }
                if (data.isEstimated === null)
                  partial(r, 'MISSING_METADATA', 'isEstimated');
              }
            }
            if (!response.NextPageToken) break;
            if (response.NextPageToken === token || page === maxPages - 1) {
              partial(r, 'TRUNCATED');
              break;
            }
            token = response.NextPageToken;
          }
          if (
            r.evidence.length &&
            days.size <
              (Date.parse(window.to) - Date.parse(window.from)) / 86400000
          )
            partial(r, 'INCOMPLETE_COVERAGE', 'billing');
          r.issues.push(issue('UNKNOWN_COMMITMENT', 'billing', 'info'));
        },
      );
    },
    getOperationalEvidence: (instanceId, options = {}) => {
      const window = options.window ?? defaultWindow;
      return run<'schedule' | 'deployment' | 'dependency'>(
        window,
        () => {
          checkInstance(instanceId);
          validatePeriod(window);
          if (
            options.kind !== undefined &&
            options.kind !== 'operations' &&
            options.kind !== 'dependencies'
          )
            throw new InputError('Invalid operational evidence kind');
        },
        (result, scope, signal) =>
          collectOperationalEvidence({
            instanceId,
            kind: options.kind ?? 'operations',
            window,
            result,
            scope,
            signal,
            transport,
            maxPages,
            clock,
            synthetic,
          }),
      );
    },
  };
}
