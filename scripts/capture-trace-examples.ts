import { mkdir, writeFile } from 'node:fs/promises';
import { loadProjectEnv, modelConfigFromEnv } from '../src/config.ts';
import type { Observation } from '../src/contracts.ts';
import { MockProvider } from '../src/investigation/mock.ts';
import { OpenAICompatiblePlanner } from '../src/investigation/model.ts';
import { validateReport } from '../src/investigation/report.ts';
import { runInvestigation } from '../src/investigation/run.ts';
import { renderTraceJsonl } from '../src/investigation/trace.ts';

// Fictional AWS-shaped identities enter at the provider boundary, before model
// calls and validation. Reports are captured unchanged; source mode stays mock.
const scenarios = [
  {
    scenario: 'A',
    name: 'staging-api',
    instance: 'i-0a17c9e2b4d680f31',
    cpu: 1.8,
    peak: 7.2,
    cost: 129.02,
  },
  {
    scenario: 'B',
    name: 'finance-batch',
    instance: 'i-07b3d8a91e6c204f5',
    cpu: 2.1,
    peak: 9.3,
    cost: 258.05,
  },
  {
    scenario: 'C',
    name: 'orders-worker',
    instance: 'i-0c92e5f714a3b680d',
    cpu: 1.4,
    peak: 6.1,
    cost: 516.1,
  },
] as const;

async function main() {
  const directory = process.argv[2];
  if (!directory || process.argv.length !== 3)
    throw new Error('One new output directory required');
  loadProjectEnv();
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '1';
  const config = modelConfigFromEnv();
  await mkdir(directory); // Preserve earlier measurements rather than overwrite.
  const runs = [];
  for (const example of scenarios) {
    const base = new MockProvider(example.scenario);
    let operationsAttempts = 0;
    console.error(
      `${example.scenario}: ${example.name}; real model, synthetic AWS`,
    );
    const report = validateReport(
      await runInvestigation(
        {
          account_id: '605629425343',
          region: 'eu-west-3',
          window: { from: '2026-09-28T00:00:00Z', to: '2026-10-26T00:00:00Z' },
          max_candidates: 1,
        },
        {
          planner: new OpenAICompatiblePlanner(config),
          // No history configuration: no remote historical writes or H-MEM calls.
          provider: {
            mode: 'mock',
            async call(action, signal) {
              if (
                example.scenario === 'B' &&
                action.tool === 'get_ec2_operations' &&
                operationsAttempts++ < 3
              )
                throw new Error('synthetic operations timeout');
              const observation = (await base.call(
                action,
                signal,
              )) as Observation;
              const data = observation.data;
              const instance = (id: string) =>
                id === 'i-mock-primary'
                  ? example.instance
                  : 'i-06e4a2d79b130c8f5';
              if (data && 'instances' in data)
                for (const row of data.instances)
                  row.instance_id = instance(row.instance_id);
              if (data && 'costs' in data)
                for (const row of data.costs) {
                  const primary = row.instance_id === 'i-mock-primary';
                  row.instance_id = instance(row.instance_id);
                  row.compute_cost = primary ? example.cost : 32.26;
                  if (row.pricing) row.pricing.hourly_compute_rate = 0.192;
                }
              if (data && 'average_cpu_percent' in data) {
                data.average_cpu_percent = example.cpu;
                data.peak_cpu_percent = example.peak;
              }
              if (data && 'jobs' in data)
                for (const job of data.jobs)
                  job.job_id = 'finance-ledger-reconciliation';
              return observation;
            },
          },
          onProgress(event) {
            if (event.event === 'planner_start')
              console.error(`${example.scenario}: planner call ${event.call}`);
            if (event.event === 'trace' && event.failure_code)
              console.error(`${example.scenario}: ${event.failure_code}`);
          },
        },
      ),
    );
    await writeFile(
      `${directory}/${example.scenario}.json`,
      `${JSON.stringify(report, null, 2)}\n`,
      { flag: 'wx' },
    );
    await writeFile(
      `${directory}/${example.scenario}.trace.jsonl`,
      renderTraceJsonl(report),
      { flag: 'wx' },
    );
    const run = {
      scenario: example.scenario,
      service: example.name,
      instance_id: example.instance,
      trace_id: report.investigation_id,
      completion_status: report.completion_status,
      verdict: report.candidates[0]?.verdict ?? null,
      budget: report.budget,
      failure_codes: report.trace.flatMap((entry) =>
        entry.failure_code ? [entry.failure_code] : [],
      ),
    };
    runs.push(run);
    console.error(
      `${example.scenario}: ${run.completion_status}; ${run.verdict}`,
    );
  }
  await writeFile(
    `${directory}/summary.json`,
    `${JSON.stringify(
      {
        captured_at: new Date().toISOString(),
        model: config.model,
        evidence_mode: 'mock',
        planner_mode: 'live',
        note: 'Demo UI account/region with fictional resources and synthetic AWS evidence. B injects three operations exceptions. No history configured. All runs retained, including failures.',
        runs,
      },
      null,
      2,
    )}\n`,
    { flag: 'wx' },
  );
}

main().catch(() => {
  console.error(
    'Trace capture failed; check configuration and use a new output directory. Earlier reports are preserved.',
  );
  process.exitCode = 1;
});
