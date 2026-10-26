import { pathToFileURL } from 'node:url';
import { loadProjectEnv } from '../src/config.ts';
import {
  type BillingData,
  type CandidateReport,
  type InventoryData,
  type InvestigationReport,
  type InvestigationRequest,
  type MetricsData,
  type Observation,
  type PlannerFailureCode,
  type ToolAction,
  validateObservation,
} from '../src/contracts.ts';
import {
  MockProvider,
  type CurrentEvidenceProvider,
  type MockScenario,
} from '../src/investigation/mock.ts';
import { OpenAICompatiblePlanner } from '../src/investigation/model.ts';
import {
  MODEL_PLANNER_TIMEOUT_MS,
  ScriptedPlanner,
} from '../src/investigation/planner.ts';
import { rankCandidates } from '../src/investigation/policy.ts';
import { validateReport } from '../src/investigation/report.ts';
import { runInvestigation } from '../src/investigation/run.ts';
import { progressText } from '../src/investigation/progress.ts';

type Verdict = CandidateReport['verdict'];
export const evaluationCases: {
  id: string;
  scenario: MockScenario;
  expected: Verdict;
  safety: 'supported' | 'unsafe' | 'unknown';
}[] = [
  {
    id: 'A',
    scenario: 'A',
    expected: 'conditional_recommendation',
    safety: 'supported',
  },
  { id: 'B', scenario: 'B', expected: 'not_recommended', safety: 'unsafe' },
  { id: 'C', scenario: 'C', expected: 'not_recommended', safety: 'unsafe' },
  {
    id: 'missing',
    scenario: 'missing',
    expected: 'needs_verification',
    safety: 'unknown',
  },
  {
    id: 'clear_without_authority',
    scenario: 'clear',
    expected: 'needs_verification',
    safety: 'unknown',
  },
  {
    id: 'high_peak',
    scenario: 'A',
    expected: 'needs_verification',
    safety: 'unsafe',
  },
  {
    id: 'partial_operations',
    scenario: 'A',
    expected: 'needs_verification',
    safety: 'unknown',
  },
  {
    id: 'unknown_commitments',
    scenario: 'A',
    expected: 'conditional_recommendation',
    safety: 'supported',
  },
];

const request: InvestigationRequest = {
  account_id: 'evaluation-synthetic',
  region: 'us-east-1',
  max_candidates: 1,
  window: { from: '2026-09-01T00:00:00Z', to: '2026-09-29T00:00:00Z' },
};

export function evaluationProvider(id: string): CurrentEvidenceProvider {
  const fixture = evaluationCases.find((c) => c.id === id);
  if (!fixture) throw new Error('Unknown evaluation case');
  const base = new MockProvider(fixture.scenario);
  return {
    mode: 'mock',
    async call(action, signal) {
      const o = (await base.call(action, signal)) as Observation;
      if (
        id === 'high_peak' &&
        o.tool === 'get_ec2_metrics' &&
        o.data &&
        'peak_cpu_percent' in o.data
      )
        o.data.peak_cpu_percent = 60;
      if (id === 'partial_operations' && o.tool === 'get_ec2_operations') {
        o.status = 'partial';
        o.coverage.complete = false;
      }
      if (
        id === 'unknown_commitments' &&
        o.data &&
        'commitment_coverage_known' in o.data
      )
        o.data.commitment_coverage_known = false;
      return o;
    },
  };
}

/** Deliberately limited comparison heuristic, never used by the investigation CLI. */
async function cpuBaseline(provider: CurrentEvidenceProvider) {
  const started = Date.now();
  let attempts = 0;
  const call = async (tool: ToolAction['tool'], instance_id?: string) => {
    const action: ToolAction = {
      type: 'tool',
      tool,
      reason: 'Evaluation baseline query',
      args: {
        account_id: request.account_id,
        region: request.region,
        window: request.window,
        ...(instance_id ? { instance_id } : {}),
      },
    };
    attempts++;
    const observation = validateObservation(
      await provider.call(action, AbortSignal.timeout(5000)),
      action,
      {
        started_at: new Date(started).toISOString(),
        now: new Date().toISOString(),
        mode: 'mock',
      },
    );
    return observation;
  };
  const inventory = await call('list_ec2_instances');
  const billing = await call('get_ec2_billing');
  const selected = rankCandidates(
    inventory.data as InventoryData,
    billing.data as BillingData,
    1,
  )[0];
  let verdict: Verdict = 'needs_verification';
  if (selected) {
    const metrics = await call('get_ec2_metrics', selected);
    if (
      metrics.status === 'ok' &&
      metrics.data &&
      (metrics.data as MetricsData).average_cpu_percent <= 10
    )
      verdict = 'conditional_recommendation';
  }
  return {
    verdict,
    elapsed_ms: Date.now() - started,
    tool_attempts: attempts,
    planner_calls: 0,
  };
}

export function citationCounts(input: InvestigationReport) {
  const report = validateReport(input);
  const ids = new Set(report.evidence.map((e) => e.evidence_id));
  const references = report.candidates.flatMap((c) => [
    ...c.selection_evidence_ids,
    ...c.supporting_evidence_ids,
    ...c.contradicting_evidence_ids,
    ...c.hypotheses.flatMap((h) => h.evidence_ids),
  ]);
  return {
    valid: references.filter((id) => ids.has(id)).length,
    total: references.length,
  };
}

export function score(
  rows: { expected: Verdict; verdict: Verdict | null; safety: string }[],
) {
  return {
    disposition_correct: rows.filter((r) => r.expected === r.verdict).length,
    cases: rows.length,
    unsafe_positives: rows.filter(
      (r) =>
        r.safety === 'unsafe' && r.verdict === 'conditional_recommendation',
    ).length,
    unsafe_cases: rows.filter((r) => r.safety === 'unsafe').length,
    unverified_positives: rows.filter(
      (r) =>
        r.safety === 'unknown' && r.verdict === 'conditional_recommendation',
    ).length,
    unknown_cases: rows.filter((r) => r.safety === 'unknown').length,
  };
}

export function executionSummary(
  rows: {
    expected: Verdict;
    investigation: {
      verdict: Verdict | null;
      completion: InvestigationReport['completion_status'];
      planner_failures: { step: number; code: PlannerFailureCode }[];
    };
  }[],
) {
  const counts: Partial<Record<PlannerFailureCode, number>> = {};
  for (const row of rows)
    for (const failure of row.investigation.planner_failures)
      counts[failure.code] = (counts[failure.code] ?? 0) + 1;
  return {
    cases: rows.length,
    complete: rows.filter((r) => r.investigation.completion === 'complete')
      .length,
    partial: rows.filter((r) => r.investigation.completion === 'partial')
      .length,
    failed: rows.filter((r) => r.investigation.completion === 'failed').length,
    planner_failure_cases: rows.filter(
      (r) => r.investigation.planner_failures.length > 0,
    ).length,
    matching_dispositions_with_planner_failure: rows.filter(
      (r) =>
        r.expected === r.investigation.verdict &&
        r.investigation.planner_failures.length > 0,
    ).length,
    failure_code_counts: counts,
  };
}

export async function evaluate(
  plannerMode: 'scripted' | 'model',
  options: { verbose?: boolean; case?: string; delay_ms?: number } = {},
) {
  const fixtures =
    options.case === undefined
      ? evaluationCases
      : evaluationCases.filter((fixture) => fixture.id === options.case);
  if (!fixtures.length) throw new Error('Unknown evaluation case');
  const delay = options.delay_ms ?? (plannerMode === 'model' ? 5000 : 0);
  if (!Number.isInteger(delay) || delay < 0 || delay > 60_000)
    throw new Error('Invalid evaluation delay');
  const started = Date.now();
  const progress = (message: string) => {
    if (options.verbose)
      console.error(`[evaluate +${Date.now() - started}ms] ${message}`);
  };
  progress(
    `Starting ${fixtures.length} cases; planner=${plannerMode}; evidence=mock; history=disabled; delay=${delay}ms before each planner call. JSON is written after all cases finish.`,
  );
  const rows = [];
  for (const [index, fixture] of fixtures.entries()) {
    const label = `case ${index + 1}/${fixtures.length} ${fixture.id}`;
    progress(`${label}: CPU baseline started`);
    const baseline = await cpuBaseline(evaluationProvider(fixture.id));
    progress(`${label}: baseline=${baseline.verdict}; investigation started`);
    // No history options: evaluating fixtures must never append to configured remote history.
    const report = validateReport(
      await runInvestigation(request, {
        provider: evaluationProvider(fixture.id),
        limits: { planner_interval_ms: delay },
        planner:
          plannerMode === 'model'
            ? new OpenAICompatiblePlanner()
            : new ScriptedPlanner(),
        onProgress: options.verbose
          ? (event) => {
              if (event.event === 'planner_pause') {
                progress(`${label}: pacing pause ${event.delay_ms}ms`);
              } else if (event.event === 'planner_start') {
                progress(
                  `${label}: planner call ${event.call} waiting (timeout ${event.timeout_ms}ms)`,
                );
              } else if (
                event.event === 'activity' ||
                event.event === 'planner_retry' ||
                event.event === 'tool_retry'
              ) {
                progress(`${label}: ${progressText(event)}`);
              } else {
                progress(
                  `${label}: step ${event.step} ${event.phase}${event.action && event.action !== 'tool' ? ` ${event.action}` : ''}${event.tool ? ` ${event.tool}` : ''}${event.status ? ` ${event.status}` : ''}${event.failure_code ? ` [${event.failure_code}]` : ''}`,
                );
                if (event.provider_error)
                  progress(
                    `${label}: provider error: ${event.provider_error.body}${event.provider_error.truncated ? ' [truncated]' : ''}`,
                  );
              }
            }
          : undefined,
      }),
    );
    rows.push({
      case: fixture.id,
      expected: fixture.expected,
      safety: fixture.safety,
      cpu_baseline: baseline,
      investigation: {
        verdict: report.candidates[0]?.verdict ?? null,
        completion: report.completion_status,
        stop_reason: report.stop_reason,
        planner_failures: report.trace.flatMap((t) =>
          t.failure_code
            ? [
                {
                  step: t.step,
                  code: t.failure_code,
                  ...(t.provider_error
                    ? { provider_error: t.provider_error }
                    : {}),
                },
              ]
            : [],
        ),
        planner: report.planner,
        investigation_id: report.investigation_id,
        elapsed_ms: report.budget.elapsed_ms,
        tool_attempts:
          report.budget.discovery_attempts + report.budget.candidate_attempts,
        planner_calls: report.budget.planner_calls,
        citations: citationCounts(report),
        savings: report.candidates[0]?.estimated_monthly_savings ?? null,
      },
    });
    progress(
      `${label}: ${report.completion_status}; verdict=${report.candidates[0]?.verdict ?? 'none'}; stop=${report.stop_reason}; ${report.budget.elapsed_ms}ms`,
    );
  }
  progress('All cases finished; writing JSON to stdout');
  return {
    measured_at: new Date().toISOString(),
    evidence_mode: 'mock',
    planner_mode: plannerMode,
    selected_cases: fixtures.map((fixture) => fixture.id),
    planner_delay_ms: delay,
    planner_timeout_ms:
      plannerMode === 'model' ? MODEL_PLANNER_TIMEOUT_MS : 15_000,
    request,
    methodology:
      'Selected cases from eight fixed synthetic single-candidate fixtures, one run each, sequentially; independently labeled expected dispositions. CPU baseline shares discovery ranking, recommends when average CPU <=10%, ignores peaks and operational checks. Investigation uses the existing safety evaluator. Scripted runs measure deterministic policy; model runs measure real model planning. History disabled. D is measured separately by probe:warm. Citation counts cover candidate/hypothesis references and full reports pass runtime validation. No production generalization or model superiority follows from this small designed set.',
    model_cost: null,
    cost_limitation:
      'Planner does not record token usage or provider billing; cost is unavailable, not zero.',
    cpu_baseline: score(
      rows.map((r) => ({ ...r, verdict: r.cpu_baseline.verdict })),
    ),
    investigation: score(
      rows.map((r) => ({ ...r, verdict: r.investigation.verdict })),
    ),
    execution: executionSummary(rows),
    rows,
  };
}

export function evaluationPassed(
  result: Pick<
    Awaited<ReturnType<typeof evaluate>>,
    'execution' | 'investigation'
  >,
) {
  return (
    result.investigation.disposition_correct === result.investigation.cases &&
    result.execution.planner_failure_cases === 0 &&
    result.execution.failed === 0
  );
}

export async function evaluationMain(rawArgs: string[]): Promise<number> {
  try {
    let mode = 'scripted';
    let verbose = false;
    let caseId: string | undefined;
    let delay: number | undefined;
    const seen = new Set<string>();
    for (let i = 0; i < rawArgs.length; i++) {
      const flag = rawArgs[i];
      if (seen.has(flag)) throw new Error('Duplicate evaluation argument');
      seen.add(flag);
      if (flag === '--verbose') {
        verbose = true;
        continue;
      }
      if (!['--planner', '--case', '--delay-ms'].includes(flag))
        throw new Error('Unknown evaluation argument');
      const value = rawArgs[++i];
      if (!value || value.startsWith('--'))
        throw new Error('Missing evaluation argument');
      if (flag === '--planner') mode = value;
      if (flag === '--case') caseId = value;
      if (flag === '--delay-ms') {
        if (!/^\d+$/.test(value)) throw new Error('Invalid evaluation delay');
        delay = Number(value);
      }
    }
    if (!['scripted', 'model'].includes(mode))
      throw new Error('Invalid planner');
    if (mode === 'model') {
      loadProjectEnv();
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '1';
    }
    const result = await evaluate(mode as 'scripted' | 'model', {
      verbose,
      case: caseId,
      delay_ms: delay,
    });
    console.log(JSON.stringify(result, null, 2));
    return evaluationPassed(result) ? 0 : 1;
  } catch {
    console.error('Evaluation failed; provider details suppressed.');
    return 1;
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  process.exitCode = await evaluationMain(process.argv.slice(2));
}
