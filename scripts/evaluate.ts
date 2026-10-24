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
  type ToolAction,
  validateObservation,
} from '../src/contracts.ts';
import {
  MockProvider,
  type CurrentEvidenceProvider,
  type MockScenario,
} from '../src/investigation/mock.ts';
import { OpenAICompatiblePlanner } from '../src/investigation/model.ts';
import { ScriptedPlanner } from '../src/investigation/planner.ts';
import { rankCandidates } from '../src/investigation/policy.ts';
import { validateReport } from '../src/investigation/report.ts';
import { runInvestigation } from '../src/investigation/run.ts';

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

export async function evaluate(plannerMode: 'scripted' | 'model') {
  const rows = [];
  for (const fixture of evaluationCases) {
    const baseline = await cpuBaseline(evaluationProvider(fixture.id));
    // No history options: evaluating fixtures must never append to configured remote history.
    const report = validateReport(
      await runInvestigation(request, {
        provider: evaluationProvider(fixture.id),
        planner:
          plannerMode === 'model'
            ? new OpenAICompatiblePlanner()
            : new ScriptedPlanner(),
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
  }
  return {
    measured_at: new Date().toISOString(),
    evidence_mode: 'mock',
    planner_mode: plannerMode,
    request,
    methodology:
      'Eight fixed synthetic single-candidate fixtures, one run each; independently labeled expected dispositions. CPU baseline shares discovery ranking, recommends when average CPU <=10%, ignores peaks and operational checks. Investigation uses the existing safety evaluator. Scripted runs measure deterministic policy; model runs measure real model planning. History disabled. D is measured separately by probe:warm. Citation counts cover candidate/hypothesis references and full reports pass runtime validation. No production generalization or model superiority follows from this small designed set.',
    model_cost: null,
    cost_limitation:
      'Planner does not record token usage or provider billing; cost is unavailable, not zero.',
    cpu_baseline: score(
      rows.map((r) => ({ ...r, verdict: r.cpu_baseline.verdict })),
    ),
    investigation: score(
      rows.map((r) => ({ ...r, verdict: r.investigation.verdict })),
    ),
    rows,
  };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    const args = process.argv.slice(2);
    const mode = args[1] ?? 'scripted';
    if (
      args.length &&
      (args.length !== 2 ||
        args[0] !== '--planner' ||
        !['scripted', 'model'].includes(mode))
    )
      throw new Error('Invalid evaluation arguments');
    if (mode === 'model') {
      loadProjectEnv();
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '1';
    }
    const result = await evaluate(mode as 'scripted' | 'model');
    console.log(JSON.stringify(result, null, 2));
    if (result.investigation.disposition_correct !== result.investigation.cases)
      process.exitCode = 1;
  } catch {
    console.error('Evaluation failed; provider details suppressed.');
    process.exitCode = 1;
  }
}
