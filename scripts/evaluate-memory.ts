import { mkdtemp, rm } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import type { Action, InvestigationReport } from '../src/contracts.ts';
import { MockProvider, type MockScenario } from '../src/investigation/mock.ts';
import {
  ScriptedPlanner,
  type PlannerState,
} from '../src/investigation/planner.ts';
import { runInvestigation } from '../src/investigation/run.ts';

/** Same executor/evaluator as H-MEM; only the fixed ordering differs. No history hints. */
class FixedOrderPlanner extends ScriptedPlanner {
  constructor(private readonly dependenciesFirst: boolean) {
    super();
  }
  override async next(
    state: PlannerState,
    signal: AbortSignal,
  ): Promise<Action> {
    const action = await super.next({ ...state, historical_hints: [] }, signal);
    if (
      this.dependenciesFirst &&
      action.type === 'tool' &&
      action.tool === 'get_ec2_operations' &&
      !state.trace.some(
        (t) =>
          t.phase === 'tool' &&
          t.action?.type === 'tool' &&
          t.action.tool === 'get_ec2_dependencies',
      )
    ) {
      const { proposed_window: _window, ...args } = action.args;
      return {
        type: 'tool',
        tool: 'get_ec2_dependencies',
        args,
        reason: 'Fixed dependency-first baseline; no memory.',
      };
    }
    return action;
  }
}
const CASES: {
  name: string;
  prior: MockScenario;
  current: MockScenario;
  expected: string;
}[] = [
  {
    name: 'recurring_job',
    prior: 'B',
    current: 'B',
    expected: 'not_recommended',
  },
  {
    name: 'recurring_dependency',
    prior: 'C',
    current: 'C',
    expected: 'not_recommended',
  },
  {
    name: 'job_cleared',
    prior: 'B',
    current: 'A',
    expected: 'conditional_recommendation',
  },
  {
    name: 'dependency_cleared',
    prior: 'C',
    current: 'A',
    expected: 'conditional_recommendation',
  },
  {
    name: 'job_replaced_by_dependency',
    prior: 'B',
    current: 'C',
    expected: 'not_recommended',
  },
  {
    name: 'dependency_replaced_by_job',
    prior: 'C',
    current: 'B',
    expected: 'not_recommended',
  },
  {
    name: 'missing_current_jobs',
    prior: 'C',
    current: 'missing',
    expected: 'needs_verification',
  },
  {
    name: 'no_prior_conflict',
    prior: 'A',
    current: 'A',
    expected: 'conditional_recommendation',
  },
];
const toolCount = (r: InvestigationReport) =>
  r.budget.discovery_attempts + r.budget.candidate_attempts;
const metrics = (r: InvestigationReport) => ({
  verdict: r.candidates[0]?.verdict ?? null,
  completion: r.completion_status,
  planner_calls: r.budget.planner_calls,
  tool_calls: toolCount(r),
  elapsed_ms: r.budget.elapsed_ms,
  planner_failures: r.trace.flatMap((t) =>
    t.failure_code ? [t.failure_code] : [],
  ),
  checks: r.evidence
    .map((e) => e.tool)
    .filter((t) => t === 'get_ec2_operations' || t === 'get_ec2_dependencies'),
});
export async function evaluateMemory() {
  const directory = await mkdtemp('/tmp/cci-memory-eval-');
  try {
    const rows: {
      name: string;
      prior: MockScenario;
      current: MockScenario;
      expected: string;
      training: ReturnType<typeof metrics>;
      results: (ReturnType<typeof metrics> & {
        strategy: string;
        correct: boolean;
        independent_evidence: boolean;
        report: InvestigationReport;
      })[];
    }[] = [];
    for (const c of CASES) {
      const request = {
        account_id: `memory-eval-${c.name}`,
        region: 'us-east-1',
        max_candidates: 1,
        window: { from: '2026-09-01T00:00:00Z', to: '2026-09-29T00:00:00Z' },
      };
      const training = await runInvestigation(request, {
        provider: new MockProvider(c.prior),
        planner: new ScriptedPlanner(),
        history: { hmem_directory: directory },
      });
      const results = [];
      for (const strategy of [
        'jobs_first',
        'dependencies_first',
        'hmem',
      ] as const) {
        const report = await runInvestigation(request, {
          provider: new MockProvider(c.current),
          planner:
            strategy === 'hmem'
              ? new ScriptedPlanner()
              : new FixedOrderPlanner(strategy === 'dependencies_first'),
          history:
            strategy === 'hmem' ? { hmem_directory: directory } : undefined,
        });
        const currentIds = new Set(report.evidence.map((e) => e.evidence_id));
        results.push({
          strategy,
          ...metrics(report),
          correct: report.candidates[0]?.verdict === c.expected,
          history_used_as_intended:
            strategy === 'hmem'
              ? report.historical_context.hmem === 'ok' &&
                report.historical_context.context_ids.some((id) =>
                  id.startsWith('hmem:'),
                )
              : report.historical_context.context_ids.length === 0,
          independent_evidence: training.evidence.every(
            (e) => !currentIds.has(e.evidence_id),
          ),
          report,
        });
      }
      rows.push({ ...c, training: metrics(training), results });
    }
    const totals = (['jobs_first', 'dependencies_first', 'hmem'] as const).map(
      (strategy) => {
        const selected = rows.map((r) => {
          const result = r.results.find((v) => v.strategy === strategy);
          if (!result) throw new Error('Missing evaluation strategy');
          return result;
        });
        return {
          strategy,
          cases: selected.length,
          correct: selected.filter((r) => r.correct).length,
          complete: selected.filter((r) => r.completion === 'complete').length,
          partial: selected.filter((r) => r.completion === 'partial').length,
          planner_failures: selected.reduce(
            (n, r) => n + r.planner_failures.length,
            0,
          ),
          planner_calls: selected.reduce((n, r) => n + r.planner_calls, 0),
          tool_calls: selected.reduce((n, r) => n + r.tool_calls, 0),
        };
      },
    );
    const bestFixed = totals
      .slice(0, 2)
      .sort((a, b) => a.tool_calls - b.tool_calls)[0];
    const hmem = totals[2];
    return {
      measured_at: new Date().toISOString(),
      evidence_mode: 'mock',
      planner_mode: 'scripted',
      memory_engine: 'vendor/hmem',
      methodology:
        'Eight equally weighted designed workloads. Each H-MEM case learns from a separate prior investigation, then reopens disk memory. Both fixed orders use the same fresh fixtures, runner and evaluator with no history. Best fixed total is selected after measurement, a favorable comparator for rules. Include cleared, switched and missing evidence; do not tune the case mix to claim superiority. No production accuracy, real-model latency, or measured billing claim.',
      passed: rows.every((r) =>
        r.results.every(
          (v) =>
            v.correct &&
            v.independent_evidence &&
            v.planner_failures.length === 0 &&
            v.completion === (r.current === 'missing' ? 'partial' : 'complete'),
        ),
      ),
      totals,
      comparison: {
        best_fixed_order: bestFixed.strategy,
        warm_planner_calls_saved_vs_best_fixed:
          bestFixed.planner_calls - hmem.planner_calls,
        warm_tool_calls_saved_vs_best_fixed:
          bestFixed.tool_calls - hmem.tool_calls,
        training_planner_calls: rows.reduce(
          (n, r) => n + r.training.planner_calls,
          0,
        ),
        training_tool_calls: rows.reduce(
          (n, r) => n + r.training.tool_calls,
          0,
        ),
        interpretation:
          'Training cost is additional if prior investigations were run solely to seed memory. A tie or loss is a valid result. Stable recurring blockers can benefit; changed blockers can make the remembered ordering worse.',
      },
      rows,
    };
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  if (process.argv.length !== 2) {
    console.error(
      'Usage: npm run --silent evaluate:memory > memory-evaluation.json',
    );
    process.exitCode = 1;
  } else {
    console.error(
      '[memory-eval] comparing both fixed orders with scoped H-MEM lessons across eight workloads',
    );
    const result = await evaluateMemory();
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.passed ? 0 : 1;
  }
}
