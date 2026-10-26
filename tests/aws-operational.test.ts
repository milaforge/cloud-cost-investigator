import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  Observation,
  ToolAction,
  OperationsData,
  DependenciesData,
} from '../src/contracts.ts';
import {
  createToolsWithTransport,
  type AwsTransport,
  type AwsToolConfig,
} from '../src/tools/aws.ts';
import { createAwsEvidenceProvider } from '../src/tools/aws-agent.ts';
import { MockProvider } from '../src/investigation/mock.ts';
import { ScriptedPlanner } from '../src/investigation/planner.ts';
import { runInvestigation } from '../src/investigation/run.ts';
import { renderReport, validateReport } from '../src/investigation/report.ts';
import { estimatePeriod } from '../src/investigation/policy.ts';
import { reasoningSummaryFromReport } from '../src/investigation/memory.ts';

const account_id = '000000000000';
const region = 'us-east-1';
const instance_id = 'i-0123456789abcdef0';
const window_id = 'mw-0123456789abcdef0';
const target_group_arn = `arn:aws:elasticloadbalancing:${region}:${account_id}:targetgroup/fixture/0123456789abcdef`;
const today = new Date();
today.setUTCHours(0, 0, 0, 0);
const request = {
  account_id,
  region,
  max_candidates: 1,
  window: {
    from: new Date(+today - 14 * 86400000).toISOString(),
    to: today.toISOString(),
  },
};
const period = estimatePeriod(request);
const scheduled = (hours: number, day = 1) =>
  new Date(
    Date.parse(period.from) + day * 86400000 + hours * 3600000,
  ).toISOString();
function transport(overrides: Partial<AwsTransport> = {}): AwsTransport {
  return {
    region: async () => region,
    identity: async () => ({ $metadata: {}, Account: account_id }),
    inventory: async () => {
      throw new Error('unexpected inventory read');
    },
    metrics: async () => {
      throw new Error('unexpected metrics read');
    },
    costs: async () => {
      throw new Error('unexpected paid read');
    },
    maintenanceSchedule: async () => ({
      $metadata: {},
      ScheduledWindowExecutions: [
        { WindowId: window_id, ExecutionTime: scheduled(2) },
      ],
    }),
    maintenanceWindow: async () => ({
      $metadata: {},
      WindowId: window_id,
      Enabled: true,
      Duration: 2,
    }),
    targetGroups: async () => ({
      $metadata: {},
      TargetGroups: [
        { TargetGroupArn: target_group_arn, TargetType: 'instance' },
      ],
    }),
    targetHealth: async () => ({
      $metadata: {},
      TargetHealthDescriptions: [
        {
          Target: { Id: instance_id, Port: 443 },
          TargetHealth: { State: 'healthy' },
        },
      ],
    }),
    close() {},
    ...overrides,
  };
}
function tools(
  overrides: Partial<AwsTransport> = {},
  config: AwsToolConfig = {},
) {
  return createToolsWithTransport(
    { region, expectedAccountId: account_id, ...config },
    transport(overrides),
    true,
  );
}
const action = (kind: 'operations' | 'dependencies'): ToolAction => ({
  type: 'tool',
  tool: kind === 'operations' ? 'get_ec2_operations' : 'get_ec2_dependencies',
  reason: 'Collect read-only native facts.',
  args: {
    account_id,
    region,
    window: request.window,
    instance_id,
    ...(kind === 'operations'
      ? { proposed_window: { start_hour_utc: 0, end_hour_utc: 6 } }
      : {}),
  },
});
async function observation(
  kind: 'operations' | 'dependencies',
  overrides: Partial<AwsTransport> = {},
) {
  const owned = tools(overrides);
  try {
    return (await createAwsEvidenceProvider({
      mode: 'fixture',
      tools: owned,
    }).call(action(kind), new AbortController().signal)) as Observation;
  } finally {
    owned.close();
  }
}
async function investigate(overrides: Partial<AwsTransport> = {}) {
  const owned = tools(overrides);
  const native = createAwsEvidenceProvider({ mode: 'fixture', tools: owned });
  const base = new MockProvider('A');
  try {
    return await runInvestigation(request, {
      planner: new ScriptedPlanner(),
      provider: {
        mode: 'fixture',
        async call(input, signal) {
          if (
            input.tool === 'get_ec2_operations' ||
            input.tool === 'get_ec2_dependencies'
          )
            return native.call(input, signal);
          const value = (await base.call(input, signal)) as Observation;
          value.integration_mode = 'fixture';
          if (value.data && 'instances' in value.data)
            value.data.instances = [{ instance_id, state: 'running' }];
          if (value.data && 'costs' in value.data)
            value.data.costs = [{ ...value.data.costs[0], instance_id }];
          return value;
        },
      },
    });
  } finally {
    owned.close();
  }
}

test('SSM queries the exact instance and planning horizon; native dated facts preserve provenance', async () => {
  let definitions = 0;
  const owned = tools({
    maintenanceSchedule: async (input) => {
      assert.deepEqual(input.Targets, [
        { Key: 'InstanceIds', Values: [instance_id] },
      ]);
      assert.equal(input.ResourceType, 'INSTANCE');
      assert.equal(input.MaxResults, 10);
      assert.equal(
        input.Filters?.find((f) => f.Key === 'ScheduledBefore')?.Values?.[0],
        period.to,
      );
      return {
        $metadata: {},
        ScheduledWindowExecutions: [2, 3].map((hour) => ({
          WindowId: window_id,
          ExecutionTime: scheduled(hour),
        })),
      };
    },
    maintenanceWindow: async () => {
      definitions++;
      return { $metadata: {}, WindowId: window_id, Enabled: true, Duration: 2 };
    },
  });
  try {
    const result = await owned.getOperationalEvidence(instance_id, {
      window: request.window,
    });
    assert.equal(result.status, 'partial');
    assert.equal(result.retrievedVia, 'fixture');
    assert.equal(definitions, 1);
    assert.equal(result.evidence.length, 2);
    assert.match(
      result.evidence[0].provenance.operation,
      /SSM.DescribeMaintenanceWindowSchedule/,
    );
    assert.equal(result.evidence[0].synthetic, true);
  } finally {
    owned.close();
  }
  const value = await observation('operations');
  const data = value.data as OperationsData;
  assert.equal(value.status, 'partial');
  assert.deepEqual(data.jobs, []);
  assert.deepEqual(data.scheduled_maintenance?.[0].execution_window, {
    from: scheduled(2),
    to: scheduled(4),
  });
  assert.deepEqual(value.coverage, { complete: false, authoritative: false });
});

test('SSM rejects a response exceeding its requested ten-result page', async () => {
  const value = await observation('operations', {
    maintenanceSchedule: async () => ({
      $metadata: {},
      ScheduledWindowExecutions: Array.from({ length: 11 }, () => ({
        WindowId: window_id,
        ExecutionTime: scheduled(2),
      })),
    }),
  });
  assert.equal(value.status, 'error');
  assert.equal(value.data, null);
});

test('ELBv2 registration is a current consumer fact, never continuous-operation authority', async () => {
  const value = await observation('dependencies');
  const data = value.data as DependenciesData;
  assert.equal(value.status, 'partial');
  assert.equal(value.coverage.authoritative, false);
  assert.equal(data.requires_continuous_operation, false);
  assert.deepEqual(data.load_balancer_targets, [
    { target_group_arn, port: 443, state: 'healthy' },
  ]);
  assert.ok(
    value.missing_fields.includes('DEPENDENCIES_OUTSIDE_ELBV2_UNKNOWN'),
  );
});

test('empty native reads stay partial and never assert a workload has no jobs or dependencies', async () => {
  const overrides = {
    maintenanceSchedule: async () => ({
      $metadata: {},
      ScheduledWindowExecutions: [],
    }),
    targetGroups: async () => ({ $metadata: {}, TargetGroups: [] }),
  };
  for (const kind of ['operations', 'dependencies'] as const) {
    const value = await observation(kind, overrides);
    assert.equal(value.status, 'partial');
    assert.equal(value.coverage.complete, false);
    assert.ok(value.missing_fields.length);
  }
  const report = await investigate(overrides);
  assert.equal(report.candidates[0].verdict, 'needs_verification');
  assert.equal(report.candidates[0].estimated_monthly_savings, null);
  validateReport(report);
});

for (const kind of ['operations', 'dependencies'] as const) {
  test(`${kind} access denial is explicit and provider details stay private`, async () => {
    const denied = async () => {
      const error = new Error('private provider body and endpoint');
      error.name = 'AccessDeniedException';
      throw error;
    };
    const value = await observation(
      kind,
      kind === 'operations'
        ? { maintenanceSchedule: denied }
        : { targetGroups: denied },
    );
    assert.equal(value.status, 'unavailable');
    assert.equal(value.data, null);
    assert.ok(value.missing_fields.includes('ACCESS_DENIED'));
    assert.doesNotMatch(JSON.stringify(value), /private provider/);
  });
}

test('a dated SSM conflict rejects only the proposed window, with validated citations and no invented critical-job lesson', async () => {
  const report = await investigate();
  const candidate = report.candidates[0];
  assert.equal(report.completion_status, 'partial');
  assert.equal(candidate.verdict, 'not_recommended');
  assert.match(
    candidate.explanation,
    /SSM maintenance mw-0123456789abcdef0 executes 2026-11-02T02:00:00/,
  );
  assert.equal(candidate.estimated_monthly_savings, null);
  assert.equal(candidate.hypotheses[0].state, 'proposed');
  assert.equal(candidate.hypotheses[1].state, 'contradicted');
  const conflict = report.evidence.find((e) =>
    candidate.contradicting_evidence_ids.includes(e.evidence_id),
  );
  assert.equal(conflict?.tool, 'get_ec2_operations');
  assert.equal(reasoningSummaryFromReport(report).lesson, undefined);
  assert.match(renderReport(report), /scheduled_maintenance/);
  const forged = structuredClone(report);
  const data = forged.evidence.find((e) => e.tool === 'get_ec2_operations')
    ?.data as OperationsData;
  assert.ok(data.scheduled_maintenance);
  data.scheduled_maintenance[0].execution_window = {
    from: scheduled(8),
    to: scheduled(10),
  };
  assert.throws(() => validateReport(forged), /Invalid contradictory evidence/);
});

for (const [start, duration, expected] of [
  [23.5, 2, 'not_recommended'],
  [22, 2, 'needs_verification'],
  [6, 1, 'needs_verification'],
] as const) {
  test(`dated ${start}:00 UTC maintenance with ${duration}h duration respects midnight and overlap boundaries`, async () => {
    const report = await investigate({
      maintenanceSchedule: async () => ({
        $metadata: {},
        ScheduledWindowExecutions: [
          { WindowId: window_id, ExecutionTime: scheduled(start) },
        ],
      }),
      maintenanceWindow: async () => ({
        $metadata: {},
        WindowId: window_id,
        Enabled: true,
        Duration: duration,
      }),
    });
    assert.equal(report.candidates[0].verdict, expected);
    if (expected === 'needs_verification')
      assert.match(
        report.candidates[0].next_human_actions.join(' '),
        /registered load-balancer consumers.*traffic draining/,
      );
  });
}

test('disabled maintenance is not treated as planned work', async () => {
  const report = await investigate({
    maintenanceWindow: async () => ({
      $metadata: {},
      WindowId: window_id,
      Enabled: false,
      Duration: 2,
    }),
  });
  assert.equal(report.candidates[0].verdict, 'needs_verification');
});

for (const mutation of [
  'window_id',
  'duration',
  'timestamp',
  'arn_scope',
  'target_state',
] as const) {
  test(`malformed native ${mutation} fails closed`, async () => {
    const overrides: Partial<AwsTransport> = {};
    if (mutation === 'window_id')
      overrides.maintenanceWindow = async () => ({
        $metadata: {},
        WindowId: 'mw-fffffffffffffffff',
        Enabled: true,
        Duration: 2,
      });
    if (mutation === 'duration')
      overrides.maintenanceWindow = async () => ({
        $metadata: {},
        WindowId: window_id,
        Enabled: true,
        Duration: 25,
      });
    if (mutation === 'timestamp')
      overrides.maintenanceSchedule = async () => ({
        $metadata: {},
        ScheduledWindowExecutions: [
          { WindowId: window_id, ExecutionTime: 'not-a-date' },
        ],
      });
    if (mutation === 'arn_scope')
      overrides.targetGroups = async () => ({
        $metadata: {},
        TargetGroups: [
          {
            TargetType: 'instance',
            TargetGroupArn: target_group_arn.replace(
              account_id,
              '111111111111',
            ),
          },
        ],
      });
    if (mutation === 'target_state')
      overrides.targetHealth = async () => ({
        $metadata: {},
        TargetHealthDescriptions: [
          { Target: { Id: instance_id, Port: 443 }, TargetHealth: {} },
        ],
      });
    const value = await observation(
      mutation === 'arn_scope' || mutation === 'target_state'
        ? 'dependencies'
        : 'operations',
      overrides,
    );
    assert.equal(value.status, 'error');
    assert.equal(value.data, null);
  });
}

test('an identity scope mismatch prevents all operational reads', async () => {
  let reads = 0;
  const value = await observation('operations', {
    identity: async () => ({ $metadata: {}, Account: '111111111111' }),
    maintenanceSchedule: async () => {
      reads++;
      return { $metadata: {}, ScheduledWindowExecutions: [] };
    },
  });
  assert.equal(value.status, 'error');
  assert.equal(reads, 0);
});

test('a later page failure retains collected maintenance facts with explicit partial status', async () => {
  let calls = 0;
  const value = await observation('operations', {
    maintenanceSchedule: async () => {
      if (calls++) {
        const error = new Error('private');
        error.name = 'AccessDeniedException';
        throw error;
      }
      return {
        $metadata: {},
        NextToken: 'second',
        ScheduledWindowExecutions: [
          { WindowId: window_id, ExecutionTime: scheduled(2) },
        ],
      };
    },
  });
  assert.equal(value.status, 'partial');
  assert.equal((value.data as OperationsData).scheduled_maintenance?.length, 1);
  assert.ok(value.missing_fields.includes('ACCESS_DENIED'));
});

test('repeated pagination tokens stop with partial coverage', async () => {
  let calls = 0;
  const value = await observation('operations', {
    maintenanceSchedule: async () => {
      calls++;
      return {
        $metadata: {},
        NextToken: 'same',
        ScheduledWindowExecutions: [],
      };
    },
  });
  assert.equal(calls, 2);
  assert.equal(value.status, 'partial');
  assert.ok(value.missing_fields.includes('TRUNCATED'));
});

test('ELB scanning is bounded to twenty requests, including target-health reads', async () => {
  let calls = 0;
  const value = await observation('dependencies', {
    targetGroups: async () => {
      calls++;
      return {
        $metadata: {},
        TargetGroups: Array.from({ length: 20 }, (_, i) => ({
          TargetType: 'instance',
          TargetGroupArn: target_group_arn.replace(
            '/fixture/',
            `/fixture-${i}/`,
          ),
        })),
      };
    },
    targetHealth: async () => {
      calls++;
      return { $metadata: {}, TargetHealthDescriptions: [] };
    },
  });
  assert.equal(calls, 20);
  assert.equal(value.status, 'partial');
  assert.ok(value.missing_fields.includes('TRUNCATED'));
});

test('IP registrations are explicitly unresolved rather than silently cleared', async () => {
  const value = await observation('dependencies', {
    targetGroups: async () => ({
      $metadata: {},
      TargetGroups: [{ TargetGroupArn: target_group_arn, TargetType: 'ip' }],
    }),
  });
  assert.equal(value.status, 'partial');
  assert.ok(value.missing_fields.includes('NON_INSTANCE_TARGETS_NOT_RESOLVED'));
});

test('operational deadline aborts the SDK request without leaking or hanging', async () => {
  let aborted = false;
  const owned = tools(
    {
      maintenanceSchedule: async (_input, signal) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener(
            'abort',
            () => {
              aborted = true;
              reject(new Error('cancelled'));
            },
            { once: true },
          );
        }),
    },
    { timeoutMs: 10 },
  );
  try {
    const result = await owned.getOperationalEvidence(instance_id, {
      window: request.window,
    });
    assert.equal(result.status, 'error');
    assert.equal(aborted, true);
    assert.ok(result.issues.some((i) => i.code === 'TIMEOUT'));
  } finally {
    owned.close();
  }
});
