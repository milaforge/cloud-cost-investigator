import {
  createToolsWithTransport,
  type AwsTransport,
  type AwsToolConfig,
  METRICS,
} from './aws.js';
import {
  type EC2Tools,
  type ToolResult,
  checkInstance,
  checkWindow,
  makeEvidence,
} from './aws-evidence.js';

export type Scenario = 'A' | 'B' | 'C' | 'missing';
export const FIXTURE_INSTANCE = 'i-00000000000000001';
export const FIXTURE_WINDOW = {
  from: '2026-10-15T00:00:00.000Z',
  to: '2026-10-22T00:00:00.000Z',
};
export const FIXTURE_NOW = '2026-10-23T00:00:00.000Z';
const scope = { accountId: '000000000000', region: 'us-east-1' };

// Expected verdicts belong in tests, never in evidence given to the agent.
// The fixture transport exercises the real normalizers and result/error handling.
export function createSyntheticTools(
  scenario: Scenario = 'A',
  overrides: AwsToolConfig = {},
): EC2Tools {
  if (!['A', 'B', 'C', 'missing'].includes(scenario))
    throw new Error('Unknown synthetic scenario');
  const config = {
    region: scope.region,
    clock: () => new Date(FIXTURE_NOW),
    window: FIXTURE_WINDOW,
    enableCostExplorer: true,
    ...overrides,
  };
  const transport: AwsTransport = {
    region: async () => scope.region,
    identity: async () => ({ Account: scope.accountId, $metadata: {} }),
    inventory: async (input) => ({
      $metadata: {},
      Reservations: [
        {
          OwnerId: scope.accountId,
          Instances:
            input.InstanceIds && !input.InstanceIds.includes(FIXTURE_INSTANCE)
              ? []
              : [
                  {
                    InstanceId: FIXTURE_INSTANCE,
                    InstanceType: scenario === 'C' ? 'm6i.xlarge' : 'm6i.large',
                    State: { Name: 'running' },
                    LaunchTime: new Date('2026-10-01T00:00:00Z'),
                    Placement: {
                      AvailabilityZone: 'us-east-1a',
                      Tenancy: 'default',
                    },
                    PlatformDetails: 'Linux/UNIX',
                    Tags: [
                      { Key: 'Owner', Value: 'demo-team' },
                      {
                        Key: 'Environment',
                        Value: scenario === 'A' ? 'dev' : 'prod',
                      },
                    ],
                  },
                ],
        },
      ],
    }),
    metrics: async (input) => {
      const requestedId =
        input.MetricDataQueries?.[0]?.MetricStat?.Metric?.Dimensions?.[0]
          ?.Value;
      if (requestedId !== FIXTURE_INSTANCE)
        return { $metadata: {}, MetricDataResults: [] };
      if (!input.StartTime || !input.EndTime)
        throw new Error('Fixture metric period required');
      const from = +input.StartTime,
        to = +input.EndTime;
      return {
        $metadata: {},
        MetricDataResults: METRICS.map((metric) => {
          const period =
            input.MetricDataQueries?.find((q) => q.Id === metric.id)?.MetricStat
              ?.Period ?? 3600;
          const Timestamps: Date[] = [],
            Values: number[] = [];
          for (let time = from; time < to; time += period * 1000) {
            if (
              scenario === 'missing' &&
              (metric.id !== 'cpu_avg' || ((time - from) / 3600000) % 3 !== 0)
            )
              continue;
            const date = new Date(time),
              daytime =
                date.getUTCDay() >= 1 &&
                date.getUTCDay() <= 5 &&
                date.getUTCHours() >= 9 &&
                date.getUTCHours() < 17;
            const spike = date.getUTCDay() === 0 && date.getUTCHours() === 2;
            let cpu =
              scenario === 'A'
                ? daytime
                  ? 10
                  : 1
                : scenario === 'C'
                  ? time < Date.parse('2026-10-19T00:00:00Z')
                    ? 25
                    : 65
                  : 2;
            if (scenario === 'B' && spike) cpu = 70;
            const value =
              metric.metricName === 'CPUUtilization'
                ? metric.statistic === 'Maximum'
                  ? Math.min(
                      99,
                      cpu * 1.5 + (spike && scenario === 'B' ? 20 : 0),
                    )
                  : cpu
                : cpu * period * 1000;
            Timestamps.push(date);
            Values.push(value);
          }
          return {
            Id: metric.id,
            StatusCode: 'Complete' as const,
            Timestamps,
            Values,
          };
        }),
      };
    },
    costs: async (input) => {
      const resource = input.Filter?.And?.find(
        (f) => f.Dimensions?.Key === 'RESOURCE_ID',
      )?.Dimensions?.Values?.[0];
      if (resource !== FIXTURE_INSTANCE)
        return { $metadata: {}, ResultsByTime: [] };
      if (scenario === 'missing')
        throw Object.assign(new Error('private provider detail'), {
          name: 'DataUnavailableException',
        });
      const ResultsByTime = [];
      if (!input.TimePeriod?.Start || !input.TimePeriod.End)
        throw new Error('Fixture billing period required');
      for (
        let time = Date.parse(input.TimePeriod.Start);
        time < Date.parse(input.TimePeriod.End);
        time += 86400000
      ) {
        ResultsByTime.push({
          TimePeriod: {
            Start: new Date(time).toISOString().slice(0, 10),
            End: new Date(time + 86400000).toISOString().slice(0, 10),
          },
          Estimated: false,
          Groups: [
            {
              Keys: [
                scenario === 'C' && time >= Date.parse('2026-10-19')
                  ? 'BoxUsage:m6i.xlarge'
                  : 'BoxUsage:m6i.large',
                'Usage',
              ],
              Metrics: {
                UnblendedCost: {
                  Amount:
                    scenario === 'C' && time >= Date.parse('2026-10-19')
                      ? '4.80'
                      : '2.40',
                  Unit: 'USD',
                },
              },
            },
          ],
        });
      }
      return { $metadata: {}, ResultsByTime };
    },
    close: () => {},
  };
  const tools = createToolsWithTransport(config, transport, true);
  return {
    ...tools,
    getOperationalEvidence: async (instanceId, options = {}) => {
      if (scenario === 'missing')
        return tools.getOperationalEvidence(instanceId, options);
      const window = options.window ?? config.window;
      const collectedAt = config.clock().toISOString();
      const result: ToolResult<'schedule' | 'deployment'> = {
        status: 'ok',
        scope,
        window,
        collectedAt,
        retrievedVia: 'fixture',
        evidence: [],
        evidenceIds: [],
        issues: [],
      };
      try {
        checkInstance(instanceId);
        checkWindow(window);
      } catch {
        return {
          ...result,
          status: 'error',
          issues: [
            {
              code: 'INVALID_INPUT',
              message: 'Invalid EC2 ID or UTC window.',
              severity: 'error',
              retryable: false,
            },
          ],
        };
      }
      if (instanceId !== FIXTURE_INSTANCE)
        return { ...result, status: 'no_match' };
      if (scenario === 'C') {
        const changedAt = '2026-10-19T00:00:00.000Z';
        if (
          Date.parse(changedAt) >= Date.parse(window.from) &&
          Date.parse(changedAt) < Date.parse(window.to)
        )
          result.evidence.push(
            makeEvidence(
              'deployment',
              instanceId,
              {
                changeType: 'instance_resize',
                description:
                  'Approved capacity expansion from m6i.large to m6i.xlarge for increased workload.',
              },
              scope,
              collectedAt,
              true,
              'fixture.operations',
              undefined,
              undefined,
              changedAt,
            ),
          );
      } else {
        result.evidence.push(
          makeEvidence(
            'schedule',
            instanceId,
            scenario === 'B'
              ? {
                  description:
                    'Required weekly settlement batch; stopping during this workload is prohibited by the application owner.',
                  scheduleExpression: '0 2 * * 0',
                  timeZone: 'UTC',
                  requiredAvailability: 'Sunday 02:00–04:00 UTC',
                  dependencies: ['settlement-batch'],
                }
              : {
                  description:
                    'Demo owner confirms weekday use; no known off-hours jobs in the reviewed demo workload. Human approval remains required.',
                  scheduleExpression: '0 9 * * 1-5',
                  timeZone: 'UTC',
                  requiredAvailability: 'Weekdays 09:00–17:00 UTC',
                  dependencies: [],
                },
            scope,
            collectedAt,
            true,
            'fixture.operations',
            window,
          ),
        );
      }
      result.evidenceIds = result.evidence.map((e) => e.id);
      if (!result.evidence.length) result.status = 'no_match';
      return result;
    },
  };
}
