// Run from the repository root with the explicit request-timing preload and tsx.
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const local = (path) => import(pathToFileURL(resolve(path)).href);
const { loadProjectEnv, modelConfigFromEnv } = await local('src/config.ts');
const { OpenAICompatiblePlanner } = await local('src/investigation/model.ts');
const { validateAction } = await local('src/contracts.ts');
const { validateReport } = await local('src/investigation/report.ts');
const { sanitizedPlannerFailure } = await local('src/investigation/planner.ts');
const { ModelHttpError } = await local('src/investigation/provider-error.ts');
loadProjectEnv();
if (process.env.NODE_TLS_REJECT_UNAUTHORIZED !== '1')
  throw new Error('TLS verification required');
const output = process.argv[2];
if (!output) throw new Error('New output file required');
const config = modelConfigFromEnv();
const report = validateReport(
  JSON.parse(
    await readFile(
      'docs/evaluation/model-network-2026-10-25/gate-rerun/round-1-C.json',
      'utf8',
    ),
  ),
);
const failedAt = report.trace.findIndex((entry) => entry.failure_code);
if (failedAt < 0 || !report.candidates[0])
  throw new Error('Failed candidate required');
const state = {
  request: report.request,
  candidate_id: report.candidates[0].instance_id,
  proposed_window: report.candidates[0].proposed_window,
  observations: report.evidence,
  trace: report.trace.slice(0, failedAt),
  historical_hints: [],
};
const signal = AbortSignal.timeout(45000);
const start = performance.now();
let outcome;
try {
  const action = validateAction(
    await new OpenAICompatiblePlanner(config).next(state, signal),
  );
  outcome = {
    outcome: 'action_returned',
    action: action.type === 'tool' ? action.tool : action.type,
  };
} catch (error) {
  outcome = {
    outcome: 'failed',
    failure_code: signal.aborted
      ? 'diagnostic_deadline_exceeded'
      : sanitizedPlannerFailure(error),
    ...(error instanceof ModelHttpError
      ? { provider_error: error.provider_error }
      : {}),
  };
}
const result = {
  measured_at: new Date().toISOString(),
  model: config.model,
  source_report: 'gate-rerun/round-1-C.json',
  methodology:
    'One 45-second-bounded replay of reconstructed C state after operations, before dependencies. Explicit metadata-only preload; no tools, retries, fallback or history. Separate diagnostic, not a gate attempt.',
  elapsed_ms: Math.round(performance.now() - start),
  ...outcome,
};
await writeFile(output, `${JSON.stringify(result, null, 2)}\n`, { flag: 'wx' });
console.log(JSON.stringify(result, null, 2));
