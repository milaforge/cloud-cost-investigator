import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadProjectEnv } from '../src/config.ts';
import type {
  InvestigationReport,
  InvestigationRequest,
} from '../src/contracts.ts';
import { InvestigationHistory } from '../src/investigation/history.ts';
import {
  HmemReasoningMemory,
  type HistoricalReasoningContext,
} from '../src/investigation/memory.ts';
import { MockProvider } from '../src/investigation/mock.ts';
import { OpenAICompatiblePlanner } from '../src/investigation/model.ts';
import { ScriptedPlanner } from '../src/investigation/planner.ts';
import { validateReport } from '../src/investigation/report.ts';
import { runInvestigation } from '../src/investigation/run.ts';

const operationalChecks = (report: InvestigationReport) =>
  report.evidence
    .map((e) => e.tool)
    .filter(
      (tool) =>
        tool === 'get_ec2_operations' || tool === 'get_ec2_dependencies',
    );

/** Real disk-backed H-MEM, isolated from configured Zetaris and existing memory. */
export async function demonstrateWarmLearning(
  plannerMode: 'scripted' | 'model',
  log: (message: string) => void = console.error,
) {
  const directory = await mkdtemp(join(tmpdir(), 'cci-learned-check-'));
  const request: InvestigationRequest = {
    account_id: `lesson-demo-${randomUUID()}`,
    region: 'us-east-1',
    max_candidates: 1,
    window: { from: '2026-09-01T00:00:00Z', to: '2026-09-29T00:00:00Z' },
  };
  const runs: {
    phase: 'cold' | 'warm' | 'changed';
    report: InvestigationReport;
  }[] = [];
  const scope = { account_id: request.account_id, region: request.region };
  const stored: (HistoricalReasoningContext | null)[] = [];
  try {
    for (const phase of ['cold', 'warm', 'changed'] as const) {
      log(
        `[warm-demo] ${phase}: ${phase === 'changed' ? 'fresh operational clearance replaces the old conflict' : 'fresh continuous-operation dependency conflict'}`,
      );
      const report = validateReport(
        await runInvestigation(request, {
          planner:
            plannerMode === 'model'
              ? new OpenAICompatiblePlanner()
              : new ScriptedPlanner(),
          provider: new MockProvider(phase === 'changed' ? 'A' : 'C'),
          history: { hmem_directory: directory },
          limits: { planner_interval_ms: plannerMode === 'model' ? 5000 : 0 },
          onProgress(event) {
            if (event.event === 'planner_start')
              log(
                `[warm-demo] ${phase}: planner call ${event.call} (timeout ${event.timeout_ms}ms)`,
              );
            if (event.event === 'trace' && event.failure_code)
              log(`[warm-demo] ${phase}: ${event.failure_code}`);
            if (event.event === 'trace' && event.phase === 'tool')
              log(`[warm-demo] ${phase}: ${event.tool} ${event.status}`);
          },
        }),
      );
      runs.push({ phase, report });
      // Reopen the actual engine: verify what was persisted, not an in-memory stub.
      const memory = await HmemReasoningMemory.open(directory, scope);
      const record = memory
        .retrieve('i-mock-primary')
        .find((r) => r.summary.investigation_id === report.investigation_id);
      stored.push(record ?? null);
      log(
        `[warm-demo] ${phase}: ${report.completion_status}, ${report.candidates[0]?.verdict ?? 'no verdict'}, ${report.budget.planner_calls} planner calls, ${report.budget.elapsed_ms}ms`,
      );
      // A failed phase cannot teach a verified lesson. Keep its report and stop honestly.
      if (
        report.completion_status !== 'complete' ||
        !record ||
        report.trace.some((t) => t.failure_code)
      )
        break;
    }
    const cold = runs[0]?.report,
      warm = runs[1]?.report,
      changed = runs[2]?.report;
    const allIds = runs.flatMap(({ report }) =>
      report.evidence.map((e) => e.evidence_id),
    );
    const recalledAfterChange = changed
      ? await new InvestigationHistory(
          { hmem_directory: directory },
          scope,
        ).recall(
          'i-mock-primary',
          new Date().toISOString(),
          AbortSignal.timeout(5000),
          'mock',
        )
      : [];
    const verdict = (report?: InvestigationReport) =>
      report?.candidates[0]?.verdict;
    const toolCount = (report: InvestigationReport) =>
      report.budget.discovery_attempts + report.budget.candidate_attempts;
    const checks = {
      three_complete_runs:
        runs.length === 3 &&
        runs.every(({ report }) => report.completion_status === 'complete'),
      no_planner_failures: runs.every(
        ({ report }) => !report.trace.some((t) => t.failure_code),
      ),
      hmem_only: runs.every(
        ({ report }) =>
          report.historical_context.hmem === 'ok' &&
          report.historical_context.zetaris === 'not_configured',
      ),
      cold_has_no_history:
        !!cold && cold.historical_context.context_ids.length === 0,
      learned_from_cold_evidence:
        stored[0]?.summary.lesson?.check ===
          'dependency_continuous_operation' &&
        !!cold?.candidates[0]?.contradicting_evidence_ids.includes(
          stored[0].summary.lesson.evidence_id,
        ),
      warm_recalls_cold:
        !!stored[0] &&
        !!warm?.historical_context.context_ids.includes(stored[0].context_id),
      cold_checks_jobs_then_dependencies:
        !!cold &&
        operationalChecks(cold).join(',') ===
          'get_ec2_operations,get_ec2_dependencies',
      warm_checks_dependency_first:
        !!warm && operationalChecks(warm).join(',') === 'get_ec2_dependencies',
      same_correct_rejection:
        verdict(cold) === 'not_recommended' &&
        verdict(warm) === 'not_recommended',
      warm_uses_fewer_calls:
        !!cold &&
        !!warm &&
        warm.budget.planner_calls < cold.budget.planner_calls &&
        toolCount(warm) < toolCount(cold),
      fresh_disjoint_evidence: new Set(allIds).size === allIds.length,
      warm_verifies_lesson: !!warm?.trace.some(
        (t) =>
          t.reason.includes(
            'dependency_continuous_operation confirmed by fresh evidence',
          ) && t.evidence_ids.length > 0,
      ),
      changed_recalls_then_rechecks:
        !!stored[1] &&
        !!changed?.historical_context.context_ids.includes(
          stored[1].context_id,
        ) &&
        operationalChecks(changed).join(',') ===
          'get_ec2_dependencies,get_ec2_operations',
      changed_abandons_rejection:
        verdict(changed) === 'conditional_recommendation' &&
        changed?.candidates[0].contradicting_evidence_ids.length === 0 &&
        !!changed.trace.some((t) =>
          t.reason.includes(
            'dependency_continuous_operation not_observed by fresh evidence',
          ),
        ),
      correction_persisted:
        !!stored[2] &&
        stored[2].summary.verdict === 'conditional_recommendation' &&
        !stored[2].summary.lesson &&
        recalledAfterChange.some(
          (hint) => hint.context_id === stored[2]?.context_id,
        ) &&
        recalledAfterChange.every((hint) => !hint.lesson),
    };
    return {
      measured_at: new Date().toISOString(),
      passed: Object.values(checks).every(Boolean),
      planner_mode: plannerMode,
      evidence_mode: 'mock',
      memory_engine: 'vendor/hmem',
      methodology:
        'One sequential cold C, warm C and changed A investigation. Real H-MEM is reopened between runs; Zetaris is disabled to isolate memory contribution. Same model and runner throughout. Earlier means fewer planner/tool calls; wall time is reported separately. All current conclusions pass report validation with fresh evidence. This designed demonstration does not establish production accuracy or live AWS integration.',
      checks,
      comparison:
        cold && warm
          ? {
              planner_calls_saved:
                cold.budget.planner_calls - warm.budget.planner_calls,
              tool_calls_saved: toolCount(cold) - toolCount(warm),
              elapsed_ms_saved: cold.budget.elapsed_ms - warm.budget.elapsed_ms,
              faster_wall_clock:
                warm.budget.elapsed_ms < cold.budget.elapsed_ms,
            }
          : null,
      learned_lesson: stored[0] ?? null,
      correction: stored[2] ?? null,
      runs,
      cleanup:
        'Temporary synthetic memory is removed before return; no remote writes.',
    };
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

export async function warmDemoMain(args: string[]) {
  const json = args.includes('--json');
  const rest = args.filter((arg) => arg !== '--json');
  if (
    args.filter((arg) => arg === '--json').length > 1 ||
    (rest.length &&
      (rest.length !== 2 ||
        rest[0] !== '--planner' ||
        !['scripted', 'model'].includes(rest[1])))
  )
    throw new Error('Invalid warm demo arguments');
  const mode = rest[1] === 'model' ? 'model' : 'scripted';
  if (mode === 'model') {
    loadProjectEnv();
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '1';
  }
  const result = await demonstrateWarmLearning(mode);
  if (json) console.log(JSON.stringify(result, null, 2));
  else {
    console.log(
      `Meterless learned-check demonstration: ${result.passed ? 'PASS' : 'FAIL'}\nEvidence: MOCK; H-MEM: real local persistence; planner: ${mode}; Zetaris: disabled`,
    );
    for (const { phase, report } of result.runs) {
      console.log(
        `${phase}: ${report.candidates[0]?.verdict ?? 'none'}; ${report.budget.planner_calls} planner calls; ${report.budget.discovery_attempts + report.budget.candidate_attempts} tools; ${report.budget.elapsed_ms}ms; checks: ${operationalChecks(report).join(' → ')}`,
      );
      for (const entry of report.trace.filter((entry) =>
        entry.reason.startsWith('Historical lesson '),
      ))
        console.log(
          `  ${entry.reason} Current citations: ${entry.evidence_ids.join(', ')}`,
        );
    }
    console.log(
      `Learned: ${result.learned_lesson?.summary.lesson?.check ?? 'none'}; warm run must cite fresh evidence.\nCorrection: ${result.correction?.summary.verdict ?? 'not established'}; old conflict must not justify rejection.`,
    );
    console.log(`Measurement: ${JSON.stringify(result.comparison)}`);
    for (const [check, passed] of Object.entries(result.checks))
      console.log(`${passed ? 'PASS' : 'FAIL'} ${check}`);
  }
  return result.passed ? 0 : 1;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    process.exitCode = await warmDemoMain(process.argv.slice(2));
  } catch {
    console.error('Warm demonstration failed; provider details suppressed.');
    process.exitCode = 1;
  }
}
