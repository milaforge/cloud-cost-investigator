import assert from 'node:assert/strict';
import test from 'node:test';
import {
  type Observation,
  type OwnerEvidence,
  type ToolAction,
  validateObservation,
  validateOwnerEvidence,
} from '../src/contracts.ts';
import { createAwsEvidenceProvider } from '../src/tools/aws-agent.ts';
import {
  createToolsWithTransport,
  type AwsTransport,
} from '../src/tools/aws.ts';
import {
  createSyntheticTools,
  FIXTURE_INSTANCE,
  FIXTURE_WINDOW,
  FIXTURE_NOW,
} from '../src/tools/aws-synthetic.ts';
import { runInvestigation } from '../src/investigation/run.ts';
import { ScriptedPlanner } from '../src/investigation/planner.ts';
import { renderReport, validateReport } from '../src/investigation/report.ts';
import { validateDemoRun } from '../scripts/demo-web-jobs.ts';
import { reasoningSummaryFromReport } from '../src/investigation/memory.ts';
import { historyRecordFromReport } from '../src/tools/zetaris-history.ts';

const request = {
  account_id: '000000000000',
  region: 'us-east-1',
  window: FIXTURE_WINDOW,
  max_candidates: 1,
};
const input = (tool: ToolAction['tool']): ToolAction => ({
  type: 'tool',
  tool,
  reason: 'Test diagnostics',
  args: {
    account_id: request.account_id,
    region: request.region,
    window: request.window,
    ...(tool === 'get_ec2_metrics' ? { instance_id: FIXTURE_INSTANCE } : {}),
  },
});
function fixture() {
  const tools = createSyntheticTools('A');
  const provider = createAwsEvidenceProvider({
    mode: 'fixture',
    tools,
    clock: () => new Date(FIXTURE_NOW),
  });
  return { tools, provider };
}
async function observation(
  provider: ReturnType<typeof fixture>['provider'],
  tool: ToolAction['tool'],
) {
  return (await provider.call(
    input(tool),
    new AbortController().signal,
  )) as Observation;
}

test('optional metadata leaves resource discovery and matching billing complete; truncation still blocks coverage', async () => {
  const { tools, provider } = fixture();
  const transport: AwsTransport = {
    region: async () => request.region,
    identity: async () => ({ Account: request.account_id, $metadata: {} }),
    inventory: async () => ({
      Reservations: [
        {
          Instances: [
            {
              InstanceId: FIXTURE_INSTANCE,
              InstanceType: 't3.micro',
              State: { Name: 'running' },
            },
          ],
        },
      ],
      $metadata: {},
    }),
    metrics: async () => {
      throw new Error('unexpected');
    },
    costs: async () => {
      throw new Error('unexpected');
    },
    close() {},
  };
  const collector = createToolsWithTransport(
    { window: FIXTURE_WINDOW, clock: () => new Date(FIXTURE_NOW) },
    transport,
    true,
  );
  tools.getEC2Instances = () => collector.getEC2Instances();
  const raw = await tools.getEC2Instances();
  assert.equal(raw.status, 'ok');
  assert.ok(raw.issues.every((i) => i.severity === 'info'));
  const inventory = await observation(provider, 'list_ec2_instances');
  assert.equal(inventory.status, 'ok');
  assert.equal(inventory.coverage.complete, true);
  assert.deepEqual(inventory.missing_fields, []);
  assert.ok(inventory.data && 'instances' in inventory.data);
  assert.deepEqual(inventory.data.instances[0].missing_metadata, [
    'availabilityZone',
    'launchTime',
    'platform',
    'tenancy',
    'tags',
    'owner',
    'environment',
  ]);
  const billing = await observation(provider, 'get_ec2_billing');
  assert.equal(billing.status, 'ok');
  assert.ok(!billing.missing_fields.includes('inventory_incomplete'));
  transport.inventory = async () => ({
    Reservations: [],
    NextToken: 'again',
    $metadata: {},
  });
  assert.equal(
    (await observation(provider, 'list_ec2_instances')).coverage.complete,
    false,
  );
});

test('partial metrics preserve per-field counts and bounds without imputing missing samples', async () => {
  const { tools, provider } = fixture();
  const original = tools.getUtilization;
  tools.getUtilization = async (...args) => {
    const result = await original(...args);
    result.status = 'partial';
    result.issues = ['cpu_avg', 'cpu_max', 'network_in', 'network_out'].map(
      (field) => ({
        code: 'INCOMPLETE_COVERAGE',
        field,
        message: 'Gap',
        retryable: false,
        severity: 'warning',
      }),
    );
    for (const e of result.evidence) {
      e.data.points = e.data.points.slice(-7);
      e.data.returnedPoints = 7;
    }
    return result;
  };
  const metrics = await observation(provider, 'get_ec2_metrics');
  assert.equal(metrics.status, 'partial');
  assert.deepEqual(metrics.missing_fields, [
    'INCOMPLETE_COVERAGE:cpu_avg',
    'INCOMPLETE_COVERAGE:cpu_max',
    'INCOMPLETE_COVERAGE:network_in',
    'INCOMPLETE_COVERAGE:network_out',
  ]);
  assert.equal(metrics.metric_coverage?.length, 4);
  assert.deepEqual(metrics.metric_coverage?.[0], {
    field: 'cpu_avg',
    expected_points: 168,
    returned_points: 7,
    period_seconds: 3600,
    first_sample_at: '2026-10-21T17:00:00.000Z',
    last_sample_at: '2026-10-21T23:00:00.000Z',
  });
  const validate = (value: unknown) =>
    validateObservation(value, input('get_ec2_metrics'), {
      mode: 'fixture',
      started_at: FIXTURE_NOW,
      now: FIXTURE_NOW,
    });
  for (const change of [
    { returned_points: 169 },
    { expected_points: 7 },
    { field: 'secret' },
    { first_sample_at: '2026-01-01T00:00:00.000Z' },
    { returned_points: 0 },
  ]) {
    const forged = structuredClone(metrics);
    assert.ok(forged.metric_coverage);
    Object.assign(forged.metric_coverage[0], change);
    assert.throws(() => validate(forged));
  }
  // Real runner timestamps use the wall clock, so the provider must collect in this run.
  const liveClockProvider = createAwsEvidenceProvider({
    mode: 'fixture',
    tools,
  });
  const report = await runInvestigation(request, {
    provider: liveClockProvider,
    planner: new ScriptedPlanner(),
  });
  assert.equal(report.stop_reason, 'metrics_evidence_incomplete');
  assert.equal(report.candidates[0].verdict, 'needs_verification');
  assert.equal(report.candidates[0].proposed_window, null);
  assert.ok(
    !report.evidence.some(
      (o) =>
        o.tool === 'get_ec2_operations' || o.tool === 'get_ec2_dependencies',
    ),
  );
  assert.match(
    renderReport(report),
    /targeted jobs and dependency checks were not reached/,
  );
  assert.match(renderReport(report), /cpu_avg: 7\/168 samples/);
  assert.deepEqual(validateReport(report), report);
});

const statement: OwnerEvidence = {
  account_id: request.account_id,
  region: request.region,
  instance_id: FIXTURE_INSTANCE,
  owner: 'Workload team',
  topic: 'retirement',
  statement: 'private-owner-marker: workload retired',
  source_ref: 'OPS-123',
  asserted_at: '2026-10-22T00:00:00.000Z',
  valid_window: {
    from: '2026-10-22T00:00:00.000Z',
    to: '2026-11-22T00:00:00.000Z',
  },
};
test('owner statements round-trip separately and never enter planning or satisfy safety gates', async () => {
  const scripted = new ScriptedPlanner();
  const report = await runInvestigation(request, {
    provider: createAwsEvidenceProvider({
      mode: 'fixture',
      tools: createSyntheticTools('A'),
    }),
    owner_evidence: [statement],
    planner: {
      mode: 'scripted',
      model: null,
      async next(state, signal) {
        assert.ok(!JSON.stringify(state).includes('private-owner-marker'));
        return scripted.next(state, signal);
      },
    },
  });
  assert.deepEqual(validateReport(report).owner_evidence, [statement]);
  assert.equal(report.candidates[0].verdict, 'needs_verification');
  assert.equal(report.candidates[0].estimated_monthly_savings, null);
  assert.ok(!JSON.stringify(report.evidence).includes('private-owner-marker'));
  assert.match(
    renderReport(report),
    /Owner statements — unverified supporting context/,
  );
  assert.match(renderReport(report), /private-owner-marker/);
  assert.ok(
    !JSON.stringify(reasoningSummaryFromReport(report)).includes(
      'private-owner-marker',
    ),
  );
  assert.ok(
    !JSON.stringify(historyRecordFromReport(report)).includes(
      'private-owner-marker',
    ),
  );
  assert.throws(() =>
    validateReport({
      ...report,
      owner_evidence: [{ ...statement, account_id: '111111111111' }],
    }),
  );
});

test('owner evidence rejects scope, future, invalid, oversized and authority-bearing input before work', async () => {
  for (const change of [
    { account_id: '111111111111' },
    { region: 'us-west-2' },
    { asserted_at: '2099-01-01T00:00:00.000Z' },
    { instance_id: 'other' },
    { statement: 'x'.repeat(1001) },
    { owner: '' },
    { authorized: true },
    {
      valid_window: {
        from: '2026-11-22T00:00:00.000Z',
        to: '2026-10-22T00:00:00.000Z',
      },
    },
  ])
    assert.throws(() =>
      validateOwnerEvidence([{ ...statement, ...change }], request),
    );
  let called = false;
  await assert.rejects(
    runInvestigation(request, {
      owner_evidence: [{ ...statement, account_id: '111111111111' }],
      planner: new ScriptedPlanner(),
      provider: {
        mode: 'fixture',
        async call() {
          called = true;
          throw new Error();
        },
      },
    }),
  );
  assert.equal(called, false);
  const run = {
    request_id: 'owner-context',
    kind: 'investigate',
    planner: 'scripted',
    real_services: false,
    allow_append: false,
    history: false,
    evidence: 'mock',
    scenario: 'A',
    account: request.account_id,
    region: request.region,
    max_candidates: 1,
    owner_evidence: [statement],
  };
  const validatedRun = validateDemoRun(run);
  assert.equal(validatedRun.kind, 'investigate');
  assert.deepEqual(validatedRun.owner_evidence, [statement]);
  assert.throws(() => validateDemoRun({ ...run, kind: 'learn' }));
});

test('missing CPU series keeps sample diagnostics even when a usable summary is withheld', async () => {
  const provider = createAwsEvidenceProvider({
    mode: 'fixture',
    tools: createSyntheticTools('missing'),
    clock: () => new Date(FIXTURE_NOW),
  });
  const metrics = await observation(provider, 'get_ec2_metrics');
  assert.equal(metrics.status, 'unavailable');
  assert.equal(metrics.data, null);
  assert.equal(metrics.coverage.complete, false);
  assert.equal(
    metrics.metric_coverage?.find((c) => c.field === 'cpu_max')
      ?.returned_points,
    0,
  );
  assert.equal(
    metrics.metric_coverage?.find((c) => c.field === 'cpu_max')
      ?.first_sample_at,
    null,
  );
  assert.ok(metrics.metric_coverage?.some((c) => c.returned_points > 0));
});
