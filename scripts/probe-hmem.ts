import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import {
  HmemReasoningMemory,
  reasoningSummaryFromReport,
} from '../src/investigation/memory.ts';
import { MockProvider } from '../src/investigation/mock.ts';
import { ScriptedPlanner } from '../src/investigation/planner.ts';
import { runInvestigation } from '../src/investigation/run.ts';

async function probe(): Promise<void> {
  const directory = await mkdtemp('/tmp/cloud-cost-investigator-hmem-probe-');
  try {
    const now = Date.now();
    const scope = { account_id: 'demo', region: 'us-east-1' };
    const report = await runInvestigation(
      {
        ...scope,
        max_candidates: 1,
        window: {
          from: new Date(now - 28 * 86400000).toISOString(),
          to: new Date(now - 1000).toISOString(),
        },
      },
      { provider: new MockProvider('B'), planner: new ScriptedPlanner() },
    );
    const memory = await HmemReasoningMemory.open(directory, scope);
    const stored = memory.store(reasoningSummaryFromReport(report));
    const reloaded = await HmemReasoningMemory.open(directory, scope);
    const contexts = reloaded.retrieve(report.candidates[0].instance_id);
    assert.ok(
      contexts.some((context) => context.context_id === stored.context_id),
    );
    assert.equal(contexts[0].summary.hypothesis?.state, 'contradicted');
    console.log(
      JSON.stringify({
        result: 'pass',
        engine: memory.source,
        integration: 'local-hmem-reference',
        proof: 'persist-reload-query',
        evidence_mode: 'mock',
        context: 'historical-reasoning',
        hosted_service_proven: false,
        warm_planner_proven: false,
      }),
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

probe().catch(() => {
  console.error('hmem_probe_failed');
  process.exitCode = 1;
});
