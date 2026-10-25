import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createToolsWithTransport,
  createAwsTools,
  METRICS,
  type AwsTransport,
  type AwsToolConfig,
} from '../src/tools/aws.js';
import {
  createSyntheticTools,
  FIXTURE_INSTANCE as id,
  FIXTURE_NOW,
  FIXTURE_WINDOW,
} from '../src/tools/aws-synthetic.js';
import type { ToolResult } from '../src/tools/aws-evidence.js';

const shortWindow = {
  from: '2026-10-21T00:00:00.000Z',
  to: '2026-10-21T02:00:00.000Z',
};
const config: AwsToolConfig = {
  clock: () => new Date(FIXTURE_NOW),
  window: shortWindow,
};
function transport(overrides: Partial<AwsTransport> = {}): AwsTransport {
  return {
    region: async () => 'us-east-1',
    identity: async () => ({ Account: '123456789012', $metadata: {} }),
    inventory: async () => ({ Reservations: [], $metadata: {} }),
    metrics: async () => ({
      MetricDataResults: METRICS.map((m) => ({
        Id: m.id,
        StatusCode: 'Complete',
        Timestamps: [
          new Date(shortWindow.from),
          new Date('2026-10-21T01:00:00Z'),
        ],
        Values: [0, 5],
      })),
      $metadata: {},
    }),
    costs: async () => ({ ResultsByTime: [], $metadata: {} }),
    close: () => {},
    ...overrides,
  };
}
const instance = (instanceId = id) => ({
  InstanceId: instanceId,
  InstanceType: 'm6i.large' as const,
  State: { Name: 'running' as const },
  LaunchTime: new Date('2026-01-01'),
  PlatformDetails: 'Linux/UNIX',
  Placement: { AvailabilityZone: 'us-east-1a', Tenancy: 'default' as const },
  Tags: [
    { Key: 'Owner', Value: 'team' },
    { Key: 'Environment', Value: 'dev' },
  ],
});

function assertEnvelope(result: ToolResult, synthetic: boolean) {
  assert.deepEqual(
    result.evidenceIds,
    result.evidence.map((e) => e.id),
  );
  assert.equal(new Set(result.evidenceIds).size, result.evidenceIds.length);
  for (const e of result.evidence) {
    assert.equal(e.synthetic, synthetic);
    assert.equal(e.instanceId, id);
    assert.equal(e.scope.accountId, result.scope.accountId);
    assert.equal(e.scope.region, result.scope.region);
    assert.ok(e.source && e.provenance.sourceRef && e.provenance.operation);
    assert.ok(Number.isFinite(Date.parse(e.observedAt)));
  }
}

test('default window requests the agreed 14 complete UTC days without filling missing metrics', async () => {
  let requested: { StartTime?: Date; EndTime?: Date } | undefined;
  const tools = createToolsWithTransport(
    { clock: () => new Date('2026-10-23T12:34:00Z') },
    transport({
      metrics: async (input) => {
        requested = input;
        return { MetricDataResults: [], $metadata: {} };
      },
    }),
  );
  const result = await tools.getUtilization(id);
  assert.equal(requested?.StartTime?.toISOString(), '2026-10-09T00:00:00.000Z');
  assert.equal(requested?.EndTime?.toISOString(), '2026-10-23T00:00:00.000Z');
  assert.notEqual(result.status, 'ok');
  assert.equal(result.evidence.length, 0);
  tools.close();
});

test('A: same envelope, full coverage, off-hours usage and conditional operational evidence', async () => {
  const tools = createSyntheticTools('A');
  const responses = await Promise.all([
    tools.getEC2Instances(),
    tools.getUtilization(id),
    tools.getCostEvidence(id),
    tools.getOperationalEvidence(id),
  ]);
  for (const r of responses) {
    assertEnvelope(r, true);
    assert.equal(r.status, 'ok');
  }
  const cpu = responses[1].evidence.find((e) => e.data.statistic === 'Average');
  assert.ok(cpu);
  assert.equal(cpu.data.points.length, 168);
  assert.equal(
    cpu.data.points.find((p) => p.timestamp === '2026-10-18T12:00:00.000Z')
      ?.value,
    1,
  );
  assert.equal(responses[2].evidence.length, 7);
  assert.deepEqual(await tools.getUtilization(id), responses[1]);
});

test('B: low average coexists with real peak and required batch counter-evidence', async () => {
  const tools = createSyntheticTools('B');
  const usage = await tools.getUtilization(id);
  const avg = usage.evidence.find((e) => e.data.statistic === 'Average')?.data
    .points;
  const peak = usage.evidence.find((e) => e.data.statistic === 'Maximum')?.data
    .points;
  assert.ok(avg);
  assert.ok(peak);
  assert.ok(avg.reduce((sum, p) => sum + p.value, 0) / avg.length < 5);
  assert.equal(Math.max(...peak.map((p) => p.value)), 99);
  const operation = (await tools.getOperationalEvidence(id)).evidence[0];
  assert.equal(operation.kind, 'schedule');
  assert.ok('dependencies' in operation.data);
  assert.deepEqual(operation.data.dependencies, ['settlement-batch']);
});

test('C: cost and workload increase match capacity-change evidence', async () => {
  const tools = createSyntheticTools('C');
  const billing = await tools.getCostEvidence(id);
  assert.equal(billing.evidence[0].data.amount, '2.40');
  assert.equal(billing.evidence.at(-1)?.data.amount, '4.80');
  assert.equal(
    (await tools.getEC2Instances()).evidence[0].data.instanceType,
    'm6i.xlarge',
  );
  assert.equal(
    (await tools.getOperationalEvidence(id)).evidence[0].kind,
    'deployment',
  );
});

test('missing scenario distinguishes partial utilization, unavailable billing and operations', async () => {
  const tools = createSyntheticTools('missing');
  const usage = await tools.getUtilization(id);
  assert.equal(usage.status, 'partial');
  assert.equal(usage.evidence.length, 1);
  assert.equal(usage.evidence[0].data.returnedPoints, 56);
  assert.ok(usage.issues.some((i) => i.code === 'NO_DATAPOINTS'));
  assert.equal((await tools.getCostEvidence(id)).status, 'unavailable');
  assert.equal((await tools.getOperationalEvidence(id)).status, 'unavailable');
});

test('invalid input fails before credentials or AWS calls', async () => {
  let calls = 0;
  const tools = createToolsWithTransport(
    config,
    transport({
      identity: async () => {
        calls++;
        throw Error();
      },
    }),
  );
  assert.equal(
    (await tools.getUtilization('bad')).issues[0].code,
    'INVALID_INPUT',
  );
  assert.equal(
    (
      await tools.getUtilization(id, {
        window: { from: '2026-10-21T00:01:00Z', to: shortWindow.to },
      })
    ).status,
    'error',
  );
  assert.equal(
    (await tools.getEC2Instances({ instanceIds: [] })).status,
    'error',
  );
  assert.equal(calls, 0);
});

test('account mismatch prevents discovery', async () => {
  let called = false;
  const tools = createToolsWithTransport(
    { ...config, expectedAccountId: '999999999999' },
    transport({
      inventory: async () => {
        called = true;
        throw Error();
      },
    }),
  );
  const result = await tools.getEC2Instances();
  assert.equal(result.issues[0].code, 'SCOPE_MISMATCH');
  assert.equal(called, false);
});

for (const [name, code] of [
  ['CredentialsProviderError', 'MISSING_CREDENTIALS'],
  ['AccessDeniedException', 'ACCESS_DENIED'],
  ['NetworkError', 'NETWORK_UNAVAILABLE'],
]) {
  test(`${name} is explicit and sanitized`, async () => {
    const tools = createToolsWithTransport(
      config,
      transport({
        identity: async () => {
          throw Object.assign(new Error('SECRET-private-provider-response'), {
            name,
            ...(name === 'NetworkError' ? { code: 'EAI_AGAIN' } : {}),
          });
        },
      }),
    );
    const result = await tools.getEC2Instances();
    assert.equal(result.status, 'unavailable');
    assert.equal(result.issues[0].code, code);
    assert.ok(!JSON.stringify(result).includes('SECRET'));
  });
}

test('missing region is explicit', async () => {
  const result = await createToolsWithTransport(
    config,
    transport({
      region: async () => {
        throw Error('private');
      },
    }),
  ).getEC2Instances();
  assert.equal(result.issues[0].code, 'MISSING_REGION');
});

test('discovery consumes pages, deduplicates IDs and scopes every row', async () => {
  let calls = 0;
  const tools = createToolsWithTransport(
    config,
    transport({
      inventory: async (input) => {
        calls++;
        if (calls === 2) assert.equal(input.NextToken, 'page-2');
        return {
          $metadata: {},
          Reservations: [{ OwnerId: '123456789012', Instances: [instance()] }],
          NextToken: calls === 1 ? 'page-2' : undefined,
        };
      },
    }),
  );
  const result = await tools.getEC2Instances();
  assert.equal(calls, 2);
  assert.equal(result.evidence.length, 1);
  assert.equal(result.status, 'ok');
  assertEnvelope(result, false);
});

test('bounded discovery marks incomplete pages and retains earlier data on failure', async () => {
  const capped = createToolsWithTransport(
    { ...config, maxPages: 1 },
    transport({
      inventory: async () => ({
        $metadata: {},
        Reservations: [{ Instances: [instance()] }],
        NextToken: 'more',
      }),
    }),
  );
  assert.equal((await capped.getEC2Instances()).issues[0].code, 'TRUNCATED');
  let calls = 0;
  const failing = createToolsWithTransport(
    config,
    transport({
      inventory: async () => {
        if (++calls > 1) throw Error('private');
        return {
          $metadata: {},
          Reservations: [{ Instances: [instance()] }],
          NextToken: 'more',
        };
      },
    }),
  );
  const result = await failing.getEC2Instances();
  assert.equal(result.status, 'partial');
  assert.equal(result.evidence.length, 1);
});

test('empty discovery and metrics are no_match, never fabricated zero', async () => {
  const tools = createToolsWithTransport(
    config,
    transport({
      metrics: async () => ({ MetricDataResults: [], $metadata: {} }),
    }),
  );
  assert.equal((await tools.getEC2Instances()).status, 'no_match');
  const result = await tools.getUtilization(id);
  assert.equal(result.status, 'no_match');
  assert.equal(result.evidence.length, 0);
  assert.equal(
    result.issues.filter((i) => i.code === 'NO_DATAPOINTS').length,
    4,
  );
});

test('real zero values survive and metric queries carry correct scope and statistics', async () => {
  const original = transport();
  const tools = createToolsWithTransport(
    config,
    transport({
      metrics: async (input, signal) => {
        assert.equal(
          input.MetricDataQueries?.[0].MetricStat?.Metric?.Dimensions?.[0]
            .Value,
          id,
        );
        assert.deepEqual(
          input.MetricDataQueries?.map((q) => q.MetricStat?.Stat),
          ['Average', 'Maximum', 'Sum', 'Sum'],
        );
        return original.metrics(input, signal);
      },
    }),
  );
  const result = await tools.getUtilization(id);
  assert.equal(result.status, 'ok');
  assert.equal(result.evidence[0].data.points[0].value, 0);
  assert.equal(result.evidence[0].data.returnedPoints, 2);
});

test('CloudWatch PartialData pagination resolves complete coverage', async () => {
  let count = 0;
  const tools = createToolsWithTransport(
    config,
    transport({
      metrics: async (input) => {
        count++;
        if (count === 2) assert.equal(input.NextToken, 'more');
        return {
          $metadata: {},
          NextToken: count === 1 ? 'more' : undefined,
          MetricDataResults: METRICS.map((m) => ({
            Id: m.id,
            StatusCode: count === 1 ? 'PartialData' : 'Complete',
            Timestamps: [
              new Date(count === 1 ? shortWindow.from : '2026-10-21T01:00:00Z'),
            ],
            Values: [5],
          })),
        };
      },
    }),
  );
  const result = await tools.getUtilization(id);
  assert.equal(count, 2);
  assert.equal(result.status, 'ok');
  assert.equal(result.evidence[0].data.returnedPoints, 2);
});

test('missing metric, malformed samples and query errors are explicit', async () => {
  const tools = createToolsWithTransport(
    config,
    transport({
      metrics: async () => ({
        $metadata: {},
        MetricDataResults: [
          {
            Id: 'cpu_avg',
            StatusCode: 'Complete',
            Timestamps: [new Date(shortWindow.from)],
            Values: [3],
          },
        ],
      }),
    }),
  );
  assert.equal((await tools.getUtilization(id)).status, 'partial');
  const malformed = createToolsWithTransport(
    config,
    transport({
      metrics: async () => ({
        $metadata: {},
        MetricDataResults: [
          {
            Id: 'cpu_avg',
            StatusCode: 'Complete',
            Timestamps: [new Date(shortWindow.from)],
            Values: [NaN],
          },
        ],
      }),
    }),
  );
  assert.equal(
    (await malformed.getUtilization(id)).issues.at(-1)?.code,
    'INVALID_SOURCE_DATA',
  );
  const failed = createToolsWithTransport(
    config,
    transport({
      metrics: async () => ({
        $metadata: {},
        MetricDataResults: [{ Id: 'cpu_avg', StatusCode: 'InternalError' }],
      }),
    }),
  );
  assert.equal((await failed.getUtilization(id)).status, 'error');
});

test('tools enforce a deadline even if transport ignores abort', async () => {
  const result = await createToolsWithTransport(
    { ...config, timeoutMs: 10 },
    transport({ inventory: async () => new Promise(() => {}) }),
  ).getEC2Instances();
  assert.equal(result.status, 'error');
  assert.equal(result.issues[0].code, 'TIMEOUT');
});

test('billing is opt-in and never enables AWS features', async () => {
  let calls = 0;
  const tools = createToolsWithTransport(
    { ...config, window: FIXTURE_WINDOW },
    transport({
      costs: async () => {
        calls++;
        throw Error();
      },
    }),
  );
  assert.equal(
    (await tools.getCostEvidence(id)).issues[0].code,
    'COST_EXPLORER_DISABLED',
  );
  assert.equal(calls, 0);
});

test('billing filters resource, account, region, service and preserves decimals/currency', async () => {
  const window = {
    from: '2026-10-21T00:00:00.000Z',
    to: '2026-10-22T00:00:00.000Z',
  };
  const tools = createToolsWithTransport(
    { ...config, window, enableCostExplorer: true },
    transport({
      costs: async (input) => {
        assert.deepEqual(
          input.Filter?.And?.map((f) => [
            f.Dimensions?.Key,
            f.Dimensions?.Values,
          ]),
          [
            ['SERVICE', ['Amazon Elastic Compute Cloud - Compute']],
            ['RESOURCE_ID', [id]],
            ['LINKED_ACCOUNT', ['123456789012']],
            ['REGION', ['us-east-1']],
          ],
        );
        return {
          $metadata: {},
          ResultsByTime: [
            {
              TimePeriod: { Start: '2026-10-21', End: '2026-10-22' },
              Estimated: true,
              Groups: [
                {
                  Keys: ['BoxUsage:m6i.large', 'SavingsPlanCoveredUsage'],
                  Metrics: {
                    UnblendedCost: { Amount: '0.123456789', Unit: 'EUR' },
                  },
                },
              ],
            },
          ],
        };
      },
    }),
  );
  const result = await tools.getCostEvidence(id);
  assert.equal(result.status, 'ok');
  assert.equal(result.evidence[0].data.amount, '0.123456789');
  assert.equal(result.evidence[0].data.currency, 'EUR');
  assert.equal(result.evidence[0].data.pricingModel, 'savings_plan');
  assert.equal(result.evidence[0].data.isEstimated, true);
});

test('billing rejects unsupported windows and never fabricates unavailable costs', async () => {
  const tools = createToolsWithTransport(
    { ...config, enableCostExplorer: true },
    transport(),
  );
  assert.equal((await tools.getCostEvidence(id)).status, 'error'); // not a whole-day window
  assert.equal(
    (
      await tools.getCostEvidence(id, {
        window: { from: '2026-09-01T00:00:00Z', to: '2026-09-02T00:00:00Z' },
      })
    ).status,
    'error',
  );
  assert.equal(
    (await tools.getCostEvidence(id, { window: FIXTURE_WINDOW })).status,
    'no_match',
  );
});

test('SDK factory can be constructed without resolving credentials or contacting AWS', () => {
  const tools = createAwsTools({ region: 'us-east-1' });
  tools.close();
});

test('configured region mismatch fails before any identity or resource read', async () => {
  let calls = 0;
  const tools = createToolsWithTransport(
    { region: 'eu-west-1' },
    transport({
      identity: async () => {
        calls++;
        return { Account: '123456789012', $metadata: {} };
      },
      inventory: async () => {
        calls++;
        return { Reservations: [], $metadata: {} };
      },
    }),
  );
  const result = await tools.getEC2Instances();
  assert.equal(result.status, 'error');
  assert.equal(calls, 0);
  assert.equal(result.evidence.length, 0);
});

test('malformed inventory scalar and cost grouping fields fail closed', async () => {
  for (const value of [{ InstanceType: 42 }, { PlatformDetails: 42 }]) {
    const tools = createToolsWithTransport(
      config,
      transport({
        inventory: async () => ({
          Reservations: [{ Instances: [{ ...instance(), ...value } as never] }],
          $metadata: {},
        }),
      }),
    );
    const result = await tools.getEC2Instances();
    assert.equal(result.status, 'error');
    assert.equal(result.evidence.length, 0);
  }
  const tools = createToolsWithTransport(
    {
      clock: () => new Date(FIXTURE_NOW),
      window: FIXTURE_WINDOW,
      enableCostExplorer: true,
    },
    transport({
      costs: async () => ({
        ResultsByTime: [
          {
            TimePeriod: {
              Start: FIXTURE_WINDOW.from.slice(0, 10),
              End: new Date(Date.parse(FIXTURE_WINDOW.from) + 86400000)
                .toISOString()
                .slice(0, 10),
            },
            Groups: [
              {
                Keys: ['BoxUsage', 42] as never,
                Metrics: { UnblendedCost: { Amount: '1', Unit: 'USD' } },
              },
            ],
          },
        ],
        $metadata: {},
      }),
    }),
  );
  const result = await tools.getCostEvidence(id);
  assert.equal(result.status, 'error');
  assert.equal(result.evidence.length, 0);
});
