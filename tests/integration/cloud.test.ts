import assert from 'node:assert/strict';
import test from 'node:test';
import { loadProjectEnv } from '../../src/config.ts';
import type { Observation, ToolAction } from '../../src/contracts.ts';
import { createAwsTools } from '../../src/tools/aws.ts';
import { createAwsEvidenceProvider } from '../../src/tools/aws-agent.ts';

// Explicit live suite; excluded from npm test. No model, history or AWS writes.
// Failure messages contain only adapter status/codes, never AWS payloads or IDs.
test('live AWS evidence tools', { timeout: 150_000 }, async (t) => {
  loadProjectEnv();
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '1';
  const to = new Date();
  to.setUTCHours(0, 0, 0, 0);
  const window = {
    from: new Date(to.getTime() - 14 * 86_400_000).toISOString(),
    to: to.toISOString(),
  };
  const tools = createAwsTools({
    region: process.env.AWS_REGION,
    expectedAccountId: process.env.AWS_EXPECTED_ACCOUNT_ID || undefined,
    window,
    periodSeconds: 300,
    timeoutMs: 20_000,
    maxPages: 3,
    signal: t.signal,
    enableCostExplorer: process.env.AWS_ENABLE_COST_EXPLORER === 'true',
  });
  try {
    // Authenticate/discover scope using the same bounded read-only SDK collector.
    const inventory = await tools.getEC2Instances();
    const codes = inventory.issues.map((issue) => issue.code).join(', ');
    assert.ok(
      inventory.scope.accountId &&
        inventory.scope.region &&
        ['ok', 'partial', 'no_match'].includes(inventory.status) &&
        !inventory.issues.some((issue) => issue.severity === 'error'),
      `list_ec2_instances failed (${inventory.status}: ${codes}). Check the SDK profile/region, credentials and ec2:DescribeInstances; no downstream reads attempted.`,
    );
    const provider = createAwsEvidenceProvider({
      mode: 'live',
      // Reuse this run's fresh inventory for projection and bounded billing.
      tools: { ...tools, getEC2Instances: async () => inventory },
      maxBillingInstances: 1,
    });
    const args = {
      account_id: inventory.scope.accountId,
      region: inventory.scope.region,
      window,
    };
    const call = async (tool: ToolAction['tool'], instance_id?: string) => {
      const result = (await provider.call(
        {
          type: 'tool',
          tool,
          reason: 'Verify live read-only AWS evidence access.',
          args: {
            ...args,
            ...(instance_id ? { instance_id } : {}),
            ...(tool === 'get_ec2_operations'
              ? { proposed_window: { start_hour_utc: 0, end_hour_utc: 6 } }
              : {}),
          },
        },
        t.signal,
      )) as Observation;
      const summary = `${tool}: ${result.status}; ${result.missing_fields.join(', ') || 'no gaps'}`;
      t.diagnostic(summary);
      assert.ok(
        result.integration_mode === 'live' && result.source.startsWith('aws-'),
        `${tool}: expected direct live AWS provenance`,
      );
      assert.ok(
        result.data !== null &&
          ['ok', 'partial', 'no_match'].includes(result.status),
        `${summary}. Check source access/configuration and populated data; missing evidence is not zero.`,
      );
      assert.ok(
        !result.missing_fields.some((code) =>
          /^(ACCESS_DENIED|MISSING_CREDENTIALS|MISSING_REGION|SCOPE_MISMATCH|SOURCE_UNAVAILABLE|SOURCE_NOT_CONFIGURED|NETWORK_UNAVAILABLE|TIMEOUT|AWS_REQUEST_FAILED|INVALID_INPUT|INVALID_SOURCE_DATA)$/.test(
            code,
          ),
        ),
        `${summary}. A partial response must not hide a failed API read.`,
      );
    };
    await t.test(
      'list_ec2_instances returns validated live inventory',
      async () => {
        await call('list_ec2_instances');
      },
    );
    const instance = inventory.evidence.find((e) =>
      ['running', 'stopped'].includes(e.data.state),
    );
    assert.ok(
      instance,
      'Inventory read succeeded but no running/stopped EC2 exists in this scope; resource checks cannot be verified. No IDs are fabricated.',
    );
    await t.test(
      'get_ec2_billing returns resource costs and currency',
      async () => {
        assert.ok(
          process.env.AWS_ENABLE_COST_EXPLORER === 'true',
          'get_ec2_billing: set AWS_ENABLE_COST_EXPLORER=true to opt in to potentially charged Cost Explorer queries. No billing request was made.',
        );
        await call('get_ec2_billing');
      },
    );
    for (const tool of [
      'get_ec2_metrics',
      'get_ec2_operations',
      'get_ec2_dependencies',
    ] as const) {
      await t.test(`${tool} returns validated live evidence`, async () => {
        await call(tool, instance.instanceId);
      });
    }
    t.diagnostic(
      'Partial coverage and empty SSM/ELBv2 reads can pass access checks; they do not prove shutdown safety, complete inventory/history, or numeric savings.',
    );
  } finally {
    tools.close();
  }
});
