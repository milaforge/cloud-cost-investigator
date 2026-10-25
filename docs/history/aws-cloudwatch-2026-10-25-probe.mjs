import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { loadProjectEnv } from '../../src/config.ts';
import { createAwsTools } from '../../src/tools/aws.ts';
import { createAwsEvidenceProvider } from '../../src/tools/aws-agent.ts';

loadProjectEnv();
const started = new Date();
const end = new Date(started);
end.setUTCHours(0, 0, 0, 0);
const window = {
  from: new Date(+end - 14 * 86400000).toISOString(),
  to: end.toISOString(),
};
const signal = AbortSignal.timeout(60_000);
const tools = createAwsTools({
  region: 'eu-west-3',
  expectedAccountId: process.env.AWS_EXPECTED_ACCOUNT_ID,
  periodSeconds: 300,
  window,
  enableCostExplorer: false,
  signal,
});
const summary = {
  started_at: started.toISOString(),
  mode: 'live',
  profile: 'cci',
  region: 'eu-west-3',
  observation_window: window,
  period_seconds: 300,
  billing_queries: 0,
  model_calls: 0,
  infrastructure_writes: 0,
  raw_metrics_retained: false,
};
try {
  const inventory = await tools.getEC2Instances();
  summary.inventory = {
    status: inventory.status,
    count: inventory.evidence.length,
    issues: inventory.issues.map((i) => i.code),
  };
  const instance = inventory.evidence.find((e) => e.data.state === 'running');
  if (!instance) {
    summary.result = 'unavailable';
    summary.reason = 'no_running_instance_retrieved';
    process.exitCode = 2;
  } else {
    const result = await tools.getUtilization(instance.instanceId, { window });
    summary.collector = {
      status: result.status,
      source: result.retrievedVia,
      collected_at: result.collectedAt,
      issues: result.issues.map((i) => ({
        code: i.code,
        field: i.field ?? null,
      })),
      series: [],
    };
    for (const e of result.evidence) {
      assert.equal(e.synthetic, false);
      assert.equal(e.instanceId, instance.instanceId);
      assert.equal(e.scope.accountId, inventory.scope.accountId);
      assert.equal(e.scope.region, 'eu-west-3');
      assert.equal(e.provenance.operation, 'GetMetricData');
      assert.deepEqual(e.window, window);
      const d = e.data;
      assert.equal(d.periodSeconds, 300);
      assert.equal(d.expectedPoints, 4032);
      assert.equal(d.returnedPoints, d.points.length);
      summary.collector.series.push({
        metric: d.metricName,
        statistic: d.statistic,
        unit: d.unit,
        expected_points: d.expectedPoints,
        returned_points: d.returnedPoints,
        coverage_complete: d.returnedPoints === d.expectedPoints,
        finite_values: d.points.every((p) => Number.isFinite(p.value)),
        first_sample_utc: d.points.at(0)?.timestamp ?? null,
        last_sample_utc: d.points.at(-1)?.timestamp ?? null,
      });
    }
    const avg = result.evidence.find(
      (e) =>
        e.data.metricName === 'CPUUtilization' &&
        e.data.statistic === 'Average',
    );
    const peak = result.evidence.find(
      (e) =>
        e.data.metricName === 'CPUUtilization' &&
        e.data.statistic === 'Maximum',
    );
    if (avg && peak) {
      const peaks = new Map(
        peak.data.points.map((p) => [p.timestamp, p.value]),
      );
      const pairs = avg.data.points.filter((p) => peaks.has(p.timestamp));
      summary.cpu_consistency = {
        average_present: true,
        maximum_present: true,
        paired_samples: pairs.length,
        maxima_at_least_averages: pairs.every(
          (p) => peaks.get(p.timestamp) + 1e-9 >= p.value,
        ),
      };
      assert.ok(summary.cpu_consistency.maxima_at_least_averages);
    }
    // Project this exact live collection through the agent boundary without a
    // second CloudWatch retrieval or retaining the raw observation.
    const provider = createAwsEvidenceProvider({
      mode: 'live',
      tools: { ...tools, getUtilization: async () => result },
    });
    const observation = await provider.call(
      {
        type: 'tool',
        tool: 'get_ec2_metrics',
        reason: 'Verify fresh CloudWatch coverage and CPU summaries.',
        args: {
          account_id: inventory.scope.accountId,
          region: 'eu-west-3',
          instance_id: instance.instanceId,
          window,
        },
      },
      signal,
    );
    summary.agent_observation = {
      validated: true,
      source: observation.source,
      mode: observation.integration_mode,
      status: observation.status,
      coverage: observation.coverage,
      missing_fields: observation.missing_fields,
      cpu_summary_present:
        observation.data !== null &&
        'average_cpu_percent' in observation.data &&
        'peak_cpu_percent' in observation.data,
      aggregation_minutes: observation.data?.aggregation_minutes ?? null,
      evidence_id_assigned:
        observation.evidence_id.startsWith('aws-observation-'),
    };
    summary.result =
      result.evidence.length && summary.agent_observation.cpu_summary_present
        ? result.status === 'ok'
          ? 'passed'
          : 'partial'
        : 'unavailable';
    if (summary.result !== 'passed') process.exitCode = 2;
  }
} catch (error) {
  summary.result = 'failed';
  summary.failure_type = /^[A-Za-z0-9_]{1,80}$/.test(error.name ?? '')
    ? error.name
    : 'unknown';
  process.exitCode = 1;
} finally {
  tools.close();
  summary.finished_at = new Date().toISOString();
  const output = JSON.stringify(summary, null, 2) + '\n';
  assert.doesNotMatch(
    output,
    /arn:aws:|\bi-[a-f0-9]{8,17}\b|AKIA[A-Z0-9]{16}|ASIA[A-Z0-9]{16}/,
  );
  writeFileSync('/tmp/cci-cloudwatch-2026-10-25-summary.json', output, {
    mode: 0o600,
  });
  process.stdout.write(output);
}
