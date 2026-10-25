import { execFile } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadProjectEnv, modelConfigFromEnv } from '../src/config.ts';
import { INVESTIGATION_TIMEOUT_MS } from '../src/investigation/limits.ts';
import { validateReport } from '../src/investigation/report.ts';
import { citationCounts } from './evaluate.ts';

const EXPECTED = {
  A: 'conditional_recommendation',
  B: 'not_recommended',
  C: 'not_recommended',
} as const;
type Scenario = keyof typeof EXPECTED;

/** A matching safe deferral after a model failure must never pass this gate. */
export function reliabilityChecks(
  value: unknown,
  scenario: Scenario,
  exitCode: number,
) {
  const report = validateReport(value);
  const candidate = report.candidates[0];
  const citations = citationCounts(report);
  const contradictionTool =
    scenario === 'B' ? 'get_ec2_operations' : 'get_ec2_dependencies';
  return {
    cli_completed: exitCode === 0 && report.completion_status === 'complete',
    real_model: report.planner.mode === 'live' && !!report.planner.model,
    mock_evidence: report.integration_mode === 'mock',
    expected_verdict:
      report.candidates.length === 1 &&
      candidate.verdict === EXPECTED[scenario],
    no_planner_failure: report.trace.every((entry) => !entry.failure_code),
    current_citations:
      citations.total > 0 && citations.valid === citations.total,
    history_disabled:
      report.historical_context.zetaris === 'not_configured' &&
      report.historical_context.hmem === 'not_configured' &&
      report.historical_context.context_ids.length === 0,
    evidence_driven_revision:
      scenario === 'A' ||
      (candidate?.hypotheses[0]?.state === 'proposed' &&
        candidate.hypotheses.some(
          (hypothesis) =>
            hypothesis.state === 'contradicted' &&
            hypothesis.evidence_ids.some((id) =>
              report.evidence.some(
                (evidence) =>
                  evidence.evidence_id === id &&
                  evidence.tool === contradictionTool,
              ),
            ),
        )),
  };
}

async function probe(directory: string) {
  loadProjectEnv();
  const config = modelConfigFromEnv();
  // Exclusive directory creation prevents replacing an earlier measurement.
  await mkdir(directory);
  const rows = [];
  const seen = new Set<string>();
  for (let round = 1; round <= 3; round++) {
    for (const scenario of ['A', 'B', 'C'] as const) {
      const name = `round-${round}-${scenario}`;
      console.error(`${name}: real model; mock evidence; history disabled`);
      const result = await new Promise<{
        exit_code: number;
        stdout: string;
        stderr: string;
      }>((resolve) => {
        execFile(
          process.execPath,
          [
            '--import',
            fileURLToPath(
              new URL('./model-request-timing.mjs', import.meta.url),
            ),
            '--import',
            'tsx',
            fileURLToPath(new URL('../cli.ts', import.meta.url)),
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
            scenario,
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
            timeout: INVESTIGATION_TIMEOUT_MS,
            maxBuffer: 2_000_000,
          },
          (error, stdout, stderr) =>
            resolve({
              exit_code: error
                ? typeof error.code === 'number'
                  ? error.code
                  : 1
                : 0,
              stdout,
              stderr,
            }),
        );
      });
      // Preserve partial/failed output before assessment, with no retry or fallback.
      await writeFile(`${directory}/${name}.json`, result.stdout, {
        flag: 'wx',
      });
      await writeFile(`${directory}/${name}.stderr.txt`, result.stderr, {
        flag: 'wx',
      });
      const assessment = (() => {
        try {
          const report = validateReport(JSON.parse(result.stdout));
          const checks = {
            ...reliabilityChecks(report, scenario, result.exit_code),
            configured_model: report.planner.model === config.model,
          };
          const ids = [
            report.investigation_id,
            ...report.evidence.map((evidence) => evidence.evidence_id),
          ];
          const fresh = ids.every((id) => !seen.has(id));
          for (const id of ids) seen.add(id);
          return {
            checks: { ...checks, independent_run: fresh },
            passed: fresh && Object.values(checks).every(Boolean),
            completion: report.completion_status,
            verdict: report.candidates[0]?.verdict ?? null,
            planner_calls: report.budget.planner_calls,
            elapsed_ms: report.budget.elapsed_ms,
            citations: citationCounts(report),
            failure_codes: report.trace.flatMap((entry) =>
              entry.failure_code ? [entry.failure_code] : [],
            ),
          };
        } catch {
          return { passed: false, invalid_or_absent_report: true };
        }
      })();
      rows.push({
        round,
        scenario,
        exit_code: result.exit_code,
        ...assessment,
      });
      console.error(`${name}: ${assessment.passed ? 'PASS' : 'FAIL'}`);
    }
  }
  const template = config.extraBody?.chat_template_kwargs;
  const summary = {
    measured_at: new Date().toISOString(),
    evidence_mode: 'mock',
    planner_mode: 'live',
    model: config.model,
    response_format: config.responseFormat,
    thinking_disabled:
      typeof template === 'object' &&
      template !== null &&
      'enable_thinking' in template &&
      template.enable_thinking === false,
    methodology:
      'Three serial A/B/C rounds through the actual CLI, fresh processes and evidence, no history, retries or fallback. CLI pacing is unchanged. All nine attempts remain in the denominator. This is a designed-fixture release gate, not a production reliability estimate. Earlier diagnostics are recorded separately.',
    passed: rows.length === 9 && rows.every((row) => row.passed),
    passed_runs: rows.filter((row) => row.passed).length,
    total_runs: rows.length,
    rows,
  };
  await writeFile(
    `${directory}/summary.json`,
    `${JSON.stringify(summary, null, 2)}\n`,
    { flag: 'wx' },
  );
  console.log(JSON.stringify(summary, null, 2));
  return summary.passed ? 0 : 1;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    if (process.argv.length !== 3)
      throw new Error('One new output directory required');
    process.exitCode = await probe(process.argv[2]);
  } catch {
    console.error(
      'Reliability probe failed; use one new output directory and valid model configuration. Existing artifacts are preserved.',
    );
    process.exitCode = 1;
  }
}
