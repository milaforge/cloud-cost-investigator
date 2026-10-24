import { randomUUID } from 'node:crypto';
import { setTimeout } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';
import { loadProjectEnv } from '../src/config.ts';
import {
  listFollowUps,
  recordDecision,
  recordOutcome,
  recordReview,
  reviewRequest,
} from '../src/investigation/follow-up.ts';
import { MockProvider } from '../src/investigation/mock.ts';
import { ScriptedPlanner } from '../src/investigation/planner.ts';
import { runInvestigation } from '../src/investigation/run.ts';

/** Explicit remote append proof, using fictional decisions and mock evidence. */
export async function demonstrateFollowUps() {
  const scope = {
    account_id: `followup-demo-${randomUUID()}`,
    region: 'us-east-1',
  };
  const request = {
    ...scope,
    max_candidates: 1,
    window: {
      from: new Date(Date.now() - 28 * 86400000).toISOString(),
      to: new Date().toISOString(),
    },
  };
  const options = () => ({
    provider: new MockProvider('A'),
    planner: new ScriptedPlanner(),
  });
  console.error(
    '[followup-demo] two identical current-evidence scenarios, different historical decisions',
  );
  const deferredReport = await runInvestigation(request, options());
  const acceptedReport = await runInvestigation(request, options());
  // Leave time for the bounded ledger read before append, without waiting minutes in the demo.
  const reviewAt = new Date(Date.now() + 1000).toISOString();
  const deferred = await recordDecision(deferredReport, 'i-mock-primary', {
    kind: 'deferred',
    actor: 'synthetic-demo-engineer',
    reason: 'Synthetic example: revisit after migration window.',
    review_at: reviewAt,
  });
  const accepted = await recordDecision(acceptedReport, 'i-mock-primary', {
    kind: 'accepted',
    actor: 'synthetic-demo-engineer',
    reason:
      'Synthetic acceptance for a separate human-controlled change process.',
  });
  while (Date.now() < Date.parse(reviewAt))
    await setTimeout(Math.max(1, Date.parse(reviewAt) - Date.now()));
  console.error(
    '[followup-demo] retrieve persisted decisions; deferred is due, accepted awaits outcome',
  );
  const before = await listFollowUps(scope, 'i-mock-primary');
  const { request: freshRequest } = await reviewRequest(
    scope,
    deferred.decision.record.record_id,
  );
  console.error(
    '[followup-demo] deferred review: fresh dependency conflict overturns original recommendation',
  );
  const fresh = await runInvestigation(
    { ...freshRequest, max_candidates: 1 },
    { provider: new MockProvider('C'), planner: new ScriptedPlanner() },
  );
  const reviewed = await recordReview(
    scope,
    deferred.decision.record.record_id,
    fresh,
  );
  console.error(
    '[followup-demo] accepted path: append synthetic operator-reported rollback receipt',
  );
  const outcome = await recordOutcome(
    scope,
    accepted.decision.record.record_id,
    {
      actor: 'synthetic-demo-engineer',
      reason:
        'Synthetic example: external change was rolled back after recovery problems.',
      observed_at: new Date().toISOString(),
      result: 'rolled_back',
      evidence_reference: 'synthetic-change-ticket-42',
    },
  );
  const after = await listFollowUps(scope, 'i-mock-primary');
  const checks = {
    same_initial_recommendations:
      deferredReport.candidates[0].verdict === 'conditional_recommendation' &&
      acceptedReport.candidates[0].verdict === 'conditional_recommendation',
    due_decision_retrieved: before.items.some(
      (i) =>
        i.decision_id === deferred.decision.record.record_id &&
        i.status === 'due',
    ),
    acceptance_retrieved: before.items.some(
      (i) =>
        i.decision_id === accepted.decision.record.record_id &&
        i.status === 'awaiting_outcome',
    ),
    changed_evidence_controls_review:
      fresh.completion_status === 'complete' &&
      fresh.candidates[0].verdict === 'not_recommended',
    new_evidence: fresh.evidence.every(
      (e) =>
        !deferredReport.evidence.some(
          (old) => old.evidence_id === e.evidence_id,
        ),
    ),
    review_recorded: after.items.some(
      (i) =>
        i.decision_id === deferred.decision.record.record_id &&
        i.status === 'reviewed',
    ),
    outcome_recorded: after.items.some(
      (i) =>
        i.decision_id === accepted.decision.record.record_id &&
        i.status === 'outcome_reported' &&
        i.outcomes.some(
          (o) =>
            o.event.kind === 'outcome' &&
            o.event.result === 'rolled_back' &&
            o.event.verification === 'operator_reported',
        ),
    ),
    no_history_as_current_facts:
      fresh.historical_context.context_ids.length === 0,
  };
  return {
    measured_at: new Date().toISOString(),
    passed: Object.values(checks).every(Boolean),
    checks,
    evidence_mode: 'mock',
    planner_mode: 'scripted',
    decisions: 'synthetic explicit operator inputs',
    outcome_verification: 'operator_reported',
    methodology:
      'Real Zetaris append/readback when invoked manually. Same fixture telemetry produces different follow-up obligations from recorded intent. Deferred recommendation is reinvestigated using new mock evidence. Accepted recommendation receives a synthetic external rollback receipt, not measured savings. No H-MEM needed, no model call, no AWS mutation. Seven labeled history records retained under an isolated synthetic account.',
    scope,
    before,
    after,
    deferred,
    accepted,
    reviewed,
    outcome,
    reports: [deferredReport, acceptedReport, fresh],
  };
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    if (process.argv.length !== 2)
      throw new Error('follow_up_arguments_invalid');
    loadProjectEnv();
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '1';
    const result = await demonstrateFollowUps();
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.passed ? 0 : 1;
  } catch (error) {
    const code =
      error instanceof Error &&
      /^(follow_up|zetaris)_[a-z_0-9]+$/.test(error.message)
        ? error.message
        : 'follow_up_demo_failed';
    console.log(
      JSON.stringify({
        passed: false,
        code,
        remote_writes_may_have_occurred: true,
      }),
    );
    process.exitCode = 1;
  }
}
