import { loadProjectEnv } from '../src/config.ts';
import {
  appendZetarisHistory,
  historyRecordFromReport,
  readZetarisHistory,
} from '../src/tools/zetaris-history.ts';
import { MockProvider } from '../src/investigation/mock.ts';
import { ScriptedPlanner } from '../src/investigation/planner.ts';
import { runInvestigation } from '../src/investigation/run.ts';

// Explicit manual write probe. Retains one synthetic record; no cleanup/delete operation.
try {
  loadProjectEnv();
  const now = Date.now();
  const scope = { account_id: 'integration-test', region: 'us-east-1' };
  const report = await runInvestigation(
    {
      ...scope,
      max_candidates: 1,
      window: {
        from: new Date(now - 28 * 86400000).toISOString(),
        to: new Date(now - 1000).toISOString(),
      },
    },
    { provider: new MockProvider(), planner: new ScriptedPlanner() },
  );
  const record = historyRecordFromReport(report);
  const stored = await appendZetarisHistory(record);
  const recent = await readZetarisHistory(scope, 20);
  if (
    !recent.some(
      (row) =>
        row.context_id === stored.context_id &&
        JSON.stringify(row.record) === JSON.stringify(record),
    )
  )
    throw new Error('zetaris_history_readback_missing');
  console.log(
    JSON.stringify({
      result: 'pass',
      history_read_write_verified: true,
      evidence_mode: 'mock',
      historical: true,
      synthetic_record_retained: true,
      warm_planner_proven: false,
    }),
  );
} catch (error) {
  const code =
    error instanceof Error && /^zetaris_[a-z_0-9]+$/.test(error.message)
      ? error.message
      : 'zetaris_history_probe_failed';
  console.log(
    JSON.stringify({
      result: 'failed',
      code,
      history_read_write_verified: false,
    }),
  );
  process.exitCode = 1;
}
