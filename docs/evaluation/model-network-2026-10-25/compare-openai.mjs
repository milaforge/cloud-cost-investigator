// Focused provider comparison; run from the repository root with tsx and timing preload.
import { execFile } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const local = (path) => import(pathToFileURL(resolve(path)).href);
const { loadProjectEnv, modelConfigFromEnv } = await local('src/config.ts');
const { OpenAICompatiblePlanner } = await local('src/investigation/model.ts');
const { validateAction } = await local('src/contracts.ts');
const { validateReport } = await local('src/investigation/report.ts');
const { sanitizedPlannerFailure } = await local('src/investigation/planner.ts');
const { ModelHttpError } = await local('src/investigation/provider-error.ts');
const { reliabilityChecks } = await local('scripts/probe-model-reliability.ts');
loadProjectEnv();
if (process.env.NODE_TLS_REJECT_UNAUTHORIZED !== '1')
  throw new Error('TLS verification required');
const output = process.argv[2];
if (!output) throw new Error('New output directory required');
const config = modelConfigFromEnv();
if (config.baseUrl !== 'https://api.openai.com/v1')
  throw new Error('OpenAI configuration required');
await mkdir(output);
const result = {
  measured_at: new Date().toISOString(),
  model: config.model,
  provider: 'openai',
  response_format: config.responseFormat,
  extra_body: config.extraBody,
  methodology:
    'Three distinct previously failing states, one serial replay each with a 45-second bound; then one full actual CLI C run only if all replays pass. No retries, fallback, historical writes, A/B reruns, DNS/TLS/catalog resampling or successful checks repeated as standalone tests. C necessarily repeats discovery prerequisites with fresh mock evidence. This selected comparison is not the nine-run release gate or a controlled provider-only experiment.',
  replays: [],
  cli_c: { outcome: 'not_run' },
};
const save = () =>
  writeFile(`${output}/summary.json`, `${JSON.stringify(result, null, 2)}\n`);
const samples = [
  { name: 'initial', file: 'round-3-A.json', expected: 'list_ec2_instances' },
  {
    name: 'after_billing',
    file: 'round-2-C.json',
    expected: 'get_ec2_metrics',
  },
  {
    name: 'after_operations',
    file: 'round-1-C.json',
    expected: 'get_ec2_dependencies',
  },
];
for (const sample of samples) {
  const report = validateReport(
    JSON.parse(
      await readFile(
        `docs/evaluation/model-network-2026-10-25/gate-rerun/${sample.file}`,
        'utf8',
      ),
    ),
  );
  const failedAt = report.trace.findIndex((entry) => entry.failure_code);
  if (failedAt < 0) throw new Error('Failed source report required');
  const state = {
    request: report.request,
    candidate_id: report.candidates[0]?.instance_id ?? null,
    proposed_window: report.candidates[0]?.proposed_window ?? null,
    observations: report.evidence,
    trace: report.trace.slice(0, failedAt),
    historical_hints: [],
  };
  const signal = AbortSignal.timeout(45000);
  const start = performance.now();
  let outcome;
  console.error(`replay ${sample.name}: started`);
  try {
    const action = validateAction(
      await new OpenAICompatiblePlanner(config).next(state, signal),
    );
    const chosen = action.type === 'tool' ? action.tool : action.type;
    outcome = {
      outcome: 'action_returned',
      action: chosen,
      passed: chosen === sample.expected,
    };
  } catch (error) {
    outcome = {
      outcome: 'failed',
      passed: false,
      failure_code: signal.aborted
        ? 'diagnostic_deadline_exceeded'
        : sanitizedPlannerFailure(error),
      ...(error instanceof ModelHttpError
        ? { provider_error: error.provider_error }
        : {}),
    };
  }
  result.replays.push({
    state: sample.name,
    source_report: sample.file,
    expected: sample.expected,
    elapsed_ms: Math.round(performance.now() - start),
    ...outcome,
  });
  await save();
  console.error(`replay ${sample.name}: ${outcome.passed ? 'PASS' : 'FAIL'}`);
  if (!outcome.passed) break; // Do not spend quota repeating an unresolved failure.
}
if (result.replays.length === 3 && result.replays.every((row) => row.passed)) {
  console.error(
    'CLI C: started; real OpenAI; mock evidence; histories disabled',
  );
  const child = await new Promise((resolveChild) =>
    execFile(
      process.execPath,
      [
        '--import',
        resolve('scripts/model-request-timing.mjs'),
        '--import',
        'tsx',
        resolve('cli.ts'),
        'investigate',
        '--evidence',
        'mock',
        '--planner',
        'model',
        '--account',
        'reliability-synthetic',
        '--region',
        'us-east-1',
        '--scenario',
        'C',
        '--json',
      ],
      {
        env: {
          ...process.env,
          NODE_TLS_REJECT_UNAUTHORIZED: '1',
          ZETARIS_HISTORY_TABLE: '',
          ZETARIS_HISTORY_ALLOW_APPEND: 'false',
          HMEM_PERSIST_DIR: '',
        },
        timeout: 48 * 60_000,
        maxBuffer: 2_000_000,
      },
      (error, stdout, stderr) =>
        resolveChild({
          stdout,
          stderr,
          exit_code: error
            ? typeof error.code === 'number'
              ? error.code
              : 1
            : 0,
        }),
    ),
  );
  await writeFile(`${output}/C.json`, child.stdout, { flag: 'wx' });
  await writeFile(`${output}/C.stderr.txt`, child.stderr, { flag: 'wx' });
  try {
    const report = validateReport(JSON.parse(child.stdout));
    const checks = {
      ...reliabilityChecks(report, 'C', child.exit_code),
      configured_model: report.planner.model === config.model,
    };
    result.cli_c = {
      outcome: report.completion_status,
      exit_code: child.exit_code,
      passed: Object.values(checks).every(Boolean),
      checks,
      planner_calls: report.budget.planner_calls,
      elapsed_ms: report.budget.elapsed_ms,
      failure_codes: report.trace.flatMap((t) =>
        t.failure_code ? [t.failure_code] : [],
      ),
    };
  } catch {
    result.cli_c = {
      outcome: 'invalid_or_absent_report',
      passed: false,
      exit_code: child.exit_code,
    };
  }
}
result.passed =
  result.replays.length === 3 &&
  result.replays.every((row) => row.passed) &&
  result.cli_c.passed === true;
await save();
console.log(JSON.stringify(result, null, 2));
process.exitCode = result.passed ? 0 : 1;
