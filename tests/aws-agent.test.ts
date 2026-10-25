import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateObservation,
  type ToolAction,
  type ToolName,
  type Observation,
  type MetricsData,
  type BillingData,
} from '../src/contracts.ts';
import {
  createAwsEvidenceProvider,
  list_ec2_instances,
  get_ec2_metrics,
  get_ec2_billing,
  get_ec2_operations,
  get_ec2_dependencies,
} from '../src/tools/aws-agent.ts';
import {
  createSyntheticTools,
  FIXTURE_INSTANCE,
  FIXTURE_WINDOW,
  FIXTURE_NOW,
} from '../src/tools/aws-synthetic.ts';
import {
  createToolsWithTransport,
  type AwsTransport,
} from '../src/tools/aws.ts';
import { runInvestigation } from '../src/investigation/run.ts';
import { ScriptedPlanner } from '../src/investigation/planner.ts';

const args = {
  account_id: '000000000000',
  region: 'us-east-1',
  window: FIXTURE_WINDOW,
};
function action(tool: ToolName): ToolAction {
  return {
    type: 'tool',
    tool,
    reason: 'Test read-only evidence.',
    args: {
      ...args,
      ...(!['list_ec2_instances', 'get_ec2_billing'].includes(tool)
        ? { instance_id: FIXTURE_INSTANCE }
        : {}),
      ...(tool === 'get_ec2_operations'
        ? { proposed_window: { start_hour_utc: 0, end_hour_utc: 6 } }
        : {}),
    },
  };
}
function provider(scenario: 'A' | 'B' | 'C' | 'missing' = 'A') {
  return createAwsEvidenceProvider({
    tools: createSyntheticTools(scenario),
    mode: 'fixture',
    clock: () => new Date(FIXTURE_NOW),
  });
}
async function call(
  tool: ToolName,
  scenario: 'A' | 'B' | 'C' | 'missing' = 'A',
) {
  const input = action(tool);
  const result = await provider(scenario).call(
    input,
    new AbortController().signal,
  );
  return validateObservation(result, input, {
    mode: 'fixture',
    started_at: FIXTURE_NOW,
    now: FIXTURE_NOW,
  });
}

test('five standalone exports match the async-function integration pattern', () => {
  for (const fn of [
    list_ec2_instances,
    get_ec2_metrics,
    get_ec2_billing,
    get_ec2_operations,
    get_ec2_dependencies,
  ])
    assert.equal(typeof fn, 'function');
});
for (const tool of [
  'list_ec2_instances',
  'get_ec2_billing',
  'get_ec2_metrics',
  'get_ec2_operations',
  'get_ec2_dependencies',
] as const) {
  test(`${tool} satisfies the unmodified shared runtime validator`, async () => {
    const o = await call(tool);
    assert.equal(o.tool, tool);
    assert.equal(o.integration_mode, 'fixture');
    assert.deepEqual(o.observed_window, FIXTURE_WINDOW);
    assert.equal(o.scope.account_id, args.account_id);
    assert.ok(o.evidence_id.startsWith('aws-observation-'));
    if (tool === 'get_ec2_operations' || tool === 'get_ec2_dependencies') {
      assert.equal(o.status, 'unavailable');
      assert.equal(o.data, null);
      assert.deepEqual(o.coverage, { complete: false, authoritative: false });
    } else assert.equal(o.status, 'ok');
  });
}

test('metrics summarize real samples and retain peak counter-evidence', async () => {
  const o = await call('get_ec2_metrics', 'B');
  const data = o.data as MetricsData;
  assert.ok(data.average_cpu_percent < 5);
  assert.equal(data.peak_cpu_percent, 99);
  assert.equal(data.aggregation_minutes, 60);
});

test('billing adapts per-instance exact records to scoped ranking totals', async () => {
  const o = await call('get_ec2_billing');
  const data = o.data as BillingData;
  assert.equal(data.costs.length, 1);
  assert.ok(Math.abs(data.costs[0].compute_cost - 16.8) < 1e-9);
  assert.equal(data.commitment_coverage_known, false);
  assert.equal(data.currency, 'USD');
});

test('missing CPU peaks never become zero or an invented complete summary', async () => {
  const o = await call('get_ec2_metrics', 'missing');
  assert.equal(o.status, 'unavailable');
  assert.equal(o.data, null);
  assert.ok(
    o.missing_fields.includes('cpu_summary_or_observed_schedule_unavailable'),
  );
});

test('legacy operational fixture strings never become authoritative facts', async () => {
  const operation = await call('get_ec2_operations');
  const dependency = await call('get_ec2_dependencies');
  for (const o of [operation, dependency]) {
    assert.equal(o.status, 'unavailable');
    assert.equal(o.data, null);
    assert.equal(o.integration_mode, 'fixture');
  }
});

test('source scope and fixture/live mode mismatches fail closed', async () => {
  const wrong = action('list_ec2_instances');
  wrong.args = { ...wrong.args, account_id: '111111111111' };
  const result = (await provider().call(
    wrong,
    new AbortController().signal,
  )) as Observation;
  assert.equal(result.status, 'error');
  assert.equal(result.data, null);
  const mixed = createAwsEvidenceProvider({
    tools: createSyntheticTools('A'),
    mode: 'live',
  });
  assert.equal(
    (
      (await mixed.call(
        action('list_ec2_instances'),
        new AbortController().signal,
      )) as Observation
    ).status,
    'error',
  );
});

test('aborted calls and invalid tool arguments cause no retrieval', async () => {
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(() =>
    provider().call(action('list_ec2_instances'), controller.signal),
  );
  const invalid = action('get_ec2_billing');
  invalid.args.instance_id = FIXTURE_INSTANCE;
  await assert.rejects(() =>
    provider().call(invalid, new AbortController().signal),
  );
});

test('empty authenticated discovery is a valid no_match observation', async () => {
  const unused = async (): Promise<never> => {
    throw new Error('unexpected API');
  };
  const transport: AwsTransport = {
    region: async () => args.region,
    identity: async () => ({ Account: args.account_id, $metadata: {} }),
    inventory: async () => ({ Reservations: [], $metadata: {} }),
    metrics: unused,
    costs: unused,
    close: () => {},
  };
  const p = createAwsEvidenceProvider({
    tools: createToolsWithTransport({}, transport),
    mode: 'live',
  });
  const input = action('list_ec2_instances');
  const start = new Date().toISOString();
  const o = validateObservation(
    await p.call(input, new AbortController().signal),
    input,
    { started_at: start, now: new Date().toISOString(), mode: 'live' },
  );
  assert.equal(o.status, 'no_match');
  assert.deepEqual(o.data, { instances: [] });
});

test('denied inventory explains the blocked investigation without assessing shutdown safety or leaking provider details', async () => {
  const unused = async (): Promise<never> => {
    throw new Error('unexpected API');
  };
  const transport: AwsTransport = {
    region: async () => args.region,
    identity: async () => ({ Account: args.account_id, $metadata: {} }),
    inventory: async () => {
      throw Object.assign(new Error('private-provider-detail-marker'), {
        name: 'UnauthorizedOperation',
      });
    },
    metrics: unused,
    costs: unused,
    close: () => {},
  };
  const report = await runInvestigation(
    { ...args, max_candidates: 1 },
    {
      planner: new ScriptedPlanner(),
      provider: createAwsEvidenceProvider({
        tools: createToolsWithTransport({}, transport, true),
        mode: 'fixture',
      }),
    },
  );
  assert.equal(report.completion_status, 'failed');
  assert.equal(report.stop_reason, 'required_tool_failed:list_ec2_instances');
  assert.equal(report.budget.planner_calls, 1);
  assert.equal(report.budget.discovery_attempts, 1);
  assert.equal(report.evidence.length, 1);
  assert.deepEqual(report.candidates, []);
  assert.equal(report.budget.candidate_attempts, 0);
  const inventory = report.evidence.find(
    (o) => o.tool === 'list_ec2_instances',
  );
  assert.equal(inventory?.status, 'unavailable');
  assert.deepEqual(inventory?.missing_fields, ['ACCESS_DENIED']);
  const attempt = report.trace.find(
    (t) =>
      t.phase === 'tool' &&
      t.action?.type === 'tool' &&
      t.action.tool === 'list_ec2_instances',
  );
  assert.match(
    attempt?.reason ?? '',
    /list_ec2_instances.*unavailable.*ACCESS_DENIED/,
  );
  assert.ok(
    report.discovery.gaps.some(
      (gap) =>
        gap.includes('AWS_PROFILE') && gap.includes('ec2:DescribeInstances'),
    ),
  );
  assert.ok(!JSON.stringify(report).includes('private-provider-detail-marker'));
});

test('partial inventory preserves known rows with incomplete coverage', async () => {
  const tools = createSyntheticTools('A');
  const original = tools.getEC2Instances;
  tools.getEC2Instances = async () => ({
    ...(await original()),
    status: 'partial',
    issues: [
      {
        code: 'TRUNCATED',
        message: 'Page limit.',
        severity: 'warning',
        retryable: false,
      },
    ],
  });
  const p = createAwsEvidenceProvider({
    tools,
    mode: 'fixture',
    clock: () => new Date(FIXTURE_NOW),
  });
  const o = (await p.call(
    action('list_ec2_instances'),
    new AbortController().signal,
  )) as Observation;
  assert.equal(o.status, 'partial');
  assert.equal(o.coverage.complete, false);
  assert.ok(o.missing_fields.includes('TRUNCATED'));
});

test('mixed currency billing never silently combines costs', async () => {
  const tools = createSyntheticTools('A');
  const original = tools.getCostEvidence;
  tools.getCostEvidence = async (id, options) => {
    const r = await original(id, options);
    r.evidence[0].data.currency = 'EUR';
    return r;
  };
  const p = createAwsEvidenceProvider({
    tools,
    mode: 'fixture',
    clock: () => new Date(FIXTURE_NOW),
  });
  const o = (await p.call(
    action('get_ec2_billing'),
    new AbortController().signal,
  )) as Observation;
  assert.equal(o.status, 'unavailable');
  assert.equal(o.data, null);
  assert.ok(o.missing_fields.includes('mixed_currencies'));
});

test('empty results still enforce source scope and provider mode', async () => {
  const tools = createSyntheticTools('A');
  const original = tools.getEC2Instances;
  tools.getEC2Instances = async () => ({
    ...(await original()),
    status: 'no_match',
    evidence: [],
    evidenceIds: [],
    scope: { accountId: '111111111111', region: args.region },
  });
  const p = createAwsEvidenceProvider({ tools, mode: 'fixture' });
  const o = (await p.call(
    action('list_ec2_instances'),
    new AbortController().signal,
  )) as Observation;
  assert.equal(o.status, 'error');
  assert.equal(o.coverage.authoritative, false);
});

test('billing retrieval errors remain error rather than becoming unavailable', async () => {
  const tools = createSyntheticTools('A');
  const original = tools.getCostEvidence;
  tools.getCostEvidence = async (id, options) => ({
    ...(await original(id, options)),
    status: 'error',
    evidence: [],
    evidenceIds: [],
    issues: [
      {
        code: 'TIMEOUT',
        message: 'Timed out.',
        retryable: true,
        severity: 'error',
      },
    ],
  });
  const p = createAwsEvidenceProvider({ tools, mode: 'fixture' });
  const o = (await p.call(
    action('get_ec2_billing'),
    new AbortController().signal,
  )) as Observation;
  assert.equal(o.status, 'error');
  assert.equal(o.data, null);
  assert.ok(o.missing_fields.includes('TIMEOUT'));
});

test('collector cancellation reaches the active AWS transport', async () => {
  const parent = new AbortController();
  let aborted = false;
  const unused = async (): Promise<never> => {
    throw new Error('unexpected API');
  };
  const transport: AwsTransport = {
    region: async () => args.region,
    identity: async () => ({ Account: args.account_id, $metadata: {} }),
    inventory: async (_, signal) =>
      new Promise((_, reject) => {
        signal.addEventListener('abort', () => {
          aborted = true;
          reject(new Error('cancelled'));
        });
        parent.abort();
      }),
    metrics: unused,
    costs: unused,
    close: () => {},
  };
  const r = await createToolsWithTransport(
    { signal: parent.signal },
    transport,
  ).getEC2Instances();
  assert.equal(r.status, 'error');
  assert.equal(aborted, true);
});

test('real investigation engine consumes fixture-backed AWS summaries and defers unknown safety', async () => {
  const report = await runInvestigation(
    { ...args, max_candidates: 1 },
    {
      planner: new ScriptedPlanner(),
      provider: createAwsEvidenceProvider({
        mode: 'fixture',
        tools: createSyntheticTools('A'),
      }),
    },
  );
  assert.equal(report.integration_mode, 'fixture');
  assert.equal(report.candidates.length, 1);
  assert.equal(report.candidates[0].verdict, 'needs_verification');
  assert.equal(report.candidates[0].estimated_monthly_savings, null);
  assert.equal(
    report.evidence.find((o) => o.tool === 'get_ec2_operations')?.status,
    'unavailable',
  );
  assert.equal(
    report.evidence.find((o) => o.tool === 'get_ec2_dependencies')?.status,
    'unavailable',
  );
});
