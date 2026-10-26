import { randomUUID } from 'node:crypto';
import { setTimeout } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';
import { loadProjectEnv } from '../src/config.ts';
import {
  listFollowUps,
  recordDecision,
  recordReview,
  reviewRequest,
} from '../src/investigation/follow-up.ts';
import { MockProvider } from '../src/investigation/mock.ts';
import { ScriptedPlanner } from '../src/investigation/planner.ts';
import { runInvestigation } from '../src/investigation/run.ts';

/** Explicit remote append proof, using fictional decisions and mock evidence. */
export async function demonstrateFollowUps(
  log: (message: string) => void = console.error,
) {
  const scope = {
    account_id: `followup-demo-${randomUUID()}`,
    region: 'us-east-1',
  };
  log(
    `Synthetic follow-up account: ${scope.account_id}; region: ${scope.region}. Retained writes may require inspection if interrupted.`,
  );
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
  log(
    '[followup-demo] evidence deferral and rejected window, separately attributed reviews',
  );
  const deferredReport = await runInvestigation(request, options());
  const rejectedReport = await runInvestigation(request, {
    provider: new MockProvider('B'),
    planner: new ScriptedPlanner(),
  });
  // Leave time for the bounded ledger read before append, without waiting minutes in the demo.
  const reviewAt = new Date(Date.now() + 1000).toISOString();
  const deferred = await recordDecision(deferredReport, 'i-mock-primary', {
    kind: 'deferred',
    actor: 'synthetic-demo-engineer',
    reason: 'Synthetic example: revisit after migration window.',
    review_at: reviewAt,
  });
  const pending = await recordDecision(rejectedReport, 'i-mock-primary', {
    kind: 'deferred',
    actor: 'synthetic-demo-engineer',
    reason:
      'Review the named job conflict after the owner updates the schedule.',
    review_at: new Date(Date.now() + 86400000).toISOString(),
  });
  while (Date.now() < Date.parse(reviewAt))
    await setTimeout(Math.max(1, Date.parse(reviewAt) - Date.now()));
  log(
    '[followup-demo] retrieve persisted decisions; one review is due, the other remains scheduled',
  );
  const before = await listFollowUps(scope, 'i-mock-primary');
  const { request: freshRequest } = await reviewRequest(
    scope,
    deferred.decision.record.record_id,
  );
  log(
    '[followup-demo] deferred review: fresh dependency conflict resolves the original evidence deferral',
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
  const after = await listFollowUps(scope, 'i-mock-primary');
  const checks = {
    rejection_and_deferral:
      deferredReport.candidates[0].verdict === 'needs_verification' &&
      rejectedReport.candidates[0].verdict === 'not_recommended',
    due_decision_retrieved: before.items.some(
      (i) =>
        i.decision_id === deferred.decision.record.record_id &&
        i.status === 'due',
    ),
    rejection_review_pending: before.items.some(
      (i) =>
        i.decision_id === pending.decision.record.record_id &&
        i.status === 'deferred',
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
      'Real Zetaris append/readback when invoked manually. An evidence deferral and a rejected window receive explicit review requests. A due review retrieves fresh mock evidence and records its new conflict. The other review remains scheduled. No H-MEM needed, no model call, no AWS mutation. Six labeled history records retained under an isolated synthetic account.',
    scope,
    before,
    after,
    deferred,
    pending,
    reviewed,
    reports: [deferredReport, rejectedReport, fresh],
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
