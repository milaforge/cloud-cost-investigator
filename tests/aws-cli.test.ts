import assert from 'node:assert/strict';
import test from 'node:test';
import { main, parseArgs, createEvidenceProvider } from '../cli.ts';
import { createAwsEvidenceProvider } from '../src/tools/aws-agent.ts';
import {
  createToolsWithTransport,
  METRICS,
  type AwsTransport,
} from '../src/tools/aws.ts';
import { validateReport } from '../src/investigation/report.ts';

const args = [
  'investigate',
  '--account',
  '123456789012',
  '--region',
  'us-east-1',
];

test('AWS CLI defaults to live evidence, uses complete UTC days and rejects incompatible options before retrieval', () => {
  const options = parseArgs(args, Date.parse('2026-10-24T13:47:00Z'));
  assert.notEqual(options, 'help');
  if (options === 'help') return;
  assert.equal(options.evidence, 'aws');
  assert.equal(createEvidenceProvider(options).mode, 'live');
  assert.deepEqual(
    parseArgs(
      [...args, '--evidence', 'aws'],
      Date.parse('2026-10-24T13:47:00Z'),
    ),
    options,
  );
  assert.deepEqual(options.request.window, {
    from: '2026-10-10T00:00:00.000Z',
    to: '2026-10-24T00:00:00.000Z',
  });
  for (const extra of [
    ['--scenario', 'B'],
    ['--lookback-days', '15'],
    ['--evidence', 'other'],
  ])
    assert.throws(() => parseArgs([...args, ...extra]));
  assert.throws(() =>
    parseArgs([
      'investigate',
      '--account',
      'demo',
      '--region',
      'us-east-1',
      '--evidence',
      'aws',
    ]),
  );
});

test('AWS CLI routes through collector and evaluator: empty, denied, missing billing and unknown safety', async () => {
  const keys = ['HMEM_PERSIST_DIR', 'ZETARIS_HISTORY_TABLE'];
  const saved = keys.map((key) => process.env[key]);
  const out = process.stdout.write,
    err = process.stderr.write;
  try {
    for (const key of keys) process.env[key] = '';
    for (const scenario of [
      'empty',
      'denied',
      'billing_missing',
      'populated',
    ]) {
      let stdout = '',
        stderr = '',
        inventoryCalls = 0,
        metricCalls = 0,
        costCalls = 0;
      process.stdout.write = ((chunk: string | Uint8Array) => {
        stdout += chunk.toString();
        return true;
      }) as typeof out;
      process.stderr.write = ((chunk: string | Uint8Array) => {
        stderr += chunk.toString();
        return true;
      }) as typeof err;
      const code = await main(
        [...args, '--lookback-days', '1', '--json'],
        (options) => {
          assert.equal(options.evidence, 'aws');
          const window = options.request.window;
          const transport: AwsTransport = {
            region: async () => 'us-east-1',
            identity: async () => ({ Account: '123456789012', $metadata: {} }),
            inventory: async () => {
              inventoryCalls++;
              if (scenario === 'denied')
                throw Object.assign(new Error('private-provider-message'), {
                  name: 'AccessDeniedException',
                });
              return {
                Reservations:
                  scenario === 'empty'
                    ? []
                    : [
                        {
                          Instances: [
                            {
                              InstanceId: 'i-0123456789abcdef0',
                              InstanceType: 't3.micro',
                              State: { Name: 'running' },
                              Placement: {
                                AvailabilityZone: 'us-east-1a',
                                Tenancy: 'default',
                              },
                              PlatformDetails: 'Linux/UNIX',
                              LaunchTime: new Date('2026-01-01'),
                              Tags: [],
                            },
                          ],
                        },
                      ],
                $metadata: {},
              };
            },
            metrics: async () => {
              metricCalls++;
              return {
                MetricDataResults: METRICS.map((m) => ({
                  Id: m.id,
                  StatusCode: 'Complete',
                  Timestamps: Array.from(
                    { length: 24 },
                    (_, i) => new Date(Date.parse(window.from) + i * 3600000),
                  ),
                  Values: Array(24).fill(1),
                })),
                $metadata: {},
              };
            },
            costs: async () => {
              costCalls++;
              return {
                ResultsByTime: [
                  {
                    TimePeriod: {
                      Start: window.from.slice(0, 10),
                      End: window.to.slice(0, 10),
                    },
                    Estimated: false,
                    Groups: [
                      {
                        Keys: ['BoxUsage:t3.micro', 'Usage'],
                        Metrics: {
                          UnblendedCost: { Amount: '2.40', Unit: 'USD' },
                        },
                      },
                    ],
                  },
                ],
                $metadata: {},
              };
            },
            close: () => {},
          };
          return createAwsEvidenceProvider({
            mode: 'live',
            tools: createToolsWithTransport(
              {
                region: 'us-east-1',
                expectedAccountId: '123456789012',
                window,
                enableCostExplorer: scenario !== 'billing_missing',
              },
              transport,
            ),
          });
        },
      );
      assert.equal(stderr, '');
      assert.ok(inventoryCalls > 0);
      assert.ok(!stdout.includes('private-provider-message'));
      const report = validateReport(JSON.parse(stdout));
      assert.equal(report.integration_mode, 'live'); // Mocked transport, not live AWS proof.
      assert.ok(report.evidence.every((e) => e.integration_mode === 'live'));
      if (scenario === 'empty') {
        // Shared discovery also requires billing; absent currency stays unknown.
        assert.equal(code, 2);
        assert.equal(report.candidates.length, 0);
        assert.equal(report.evidence[0].status, 'no_match');
      } else {
        assert.notEqual(code, 0);
        if (scenario === 'populated') {
          assert.equal(metricCalls, 1);
          assert.equal(costCalls, 1);
          assert.equal(report.candidates[0].verdict, 'needs_verification');
          assert.equal(report.candidates[0].estimated_monthly_savings, null);
          for (const tool of ['get_ec2_operations', 'get_ec2_dependencies'])
            assert.equal(
              report.evidence.find((e) => e.tool === tool)?.status,
              'unavailable',
            );
        } else {
          assert.equal(metricCalls, 0);
          assert.equal(costCalls, 0);
          assert.equal(report.candidates.length, 0);
          assert.ok(
            report.evidence.some(
              (e) => e.status === 'unavailable' || e.status === 'error',
            ),
          );
        }
      }
    }
  } finally {
    process.stdout.write = out;
    process.stderr.write = err;
    keys.forEach((key, i) => {
      if (saved[i] === undefined) delete process.env[key];
      else process.env[key] = saved[i];
    });
  }
});
