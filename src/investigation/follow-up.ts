import { createHash } from 'node:crypto';
import {
  exact,
  type InvestigationReport,
  identifier,
  type Mode,
  type Scope,
  validateSchedule,
  validateScope,
} from '../contracts.ts';
import {
  appendZetarisHistory,
  type HistoryRecord,
  historyRecordFromReport,
  readZetarisFollowUps,
  readZetarisHistoryRecord,
} from '../tools/zetaris-history.ts';
import {
  type FollowUpEvent,
  validateFollowUpEvent,
} from './follow-up-contract.ts';
import { type ReasoningSummary, validateReasoningSummary } from './memory.ts';
import { validateReport } from './report.ts';

const digest = (value: string) =>
  createHash('sha256').update(value).digest('hex');
const nowIso = () => new Date().toISOString();
const scopeOf = (r: HistoryRecord): Scope => ({
  account_id: r.account_id,
  region: r.region,
});
function eventOf(r: HistoryRecord) {
  if (r.schema_version !== 2) throw new Error('follow_up_event_required');
  return validateFollowUpEvent(JSON.parse(r.summary_json));
}
function sameInstance(a: HistoryRecord, b: HistoryRecord) {
  if (
    a.account_id !== b.account_id ||
    a.region !== b.region ||
    a.instance_id !== b.instance_id ||
    a.source_mode !== b.source_mode
  )
    throw new Error('follow_up_scope_mismatch');
}
function eventRecord(
  base: HistoryRecord,
  event: FollowUpEvent,
  id: string,
  recorded = nowIso(),
): HistoryRecord {
  return {
    ...base,
    schema_version: 2,
    record_id: id,
    recorded_at_utc: recorded,
    summary_json: JSON.stringify(validateFollowUpEvent(event)),
  };
}

/** Shared validation for CLI and browser decision entry; performs no I/O. */
export function prepareDecision(
  inputReport: InvestigationReport,
  instance: string,
  input: unknown,
) {
  const report = validateReport(inputReport);
  const index = report.candidates.findIndex(
    (c) => c.instance_id === identifier(instance),
  );
  if (index < 0 || report.completion_status === 'failed')
    throw new Error('follow_up_completed_recommendation_required');
  const recommendation = historyRecordFromReport(report, index);
  const fields = exact(input, ['kind', 'actor', 'reason', 'review_at']);
  const event = validateFollowUpEvent({
    ...fields,
    recommendation_record_id: recommendation.record_id,
  });
  if (event.kind !== 'deferred' && event.kind !== 'accepted')
    throw new Error('follow_up_decision_required');
  if (
    event.kind === 'accepted' &&
    (report.decision_policy ||
      report.completion_status !== 'complete' ||
      report.candidates[index].verdict !== 'conditional_recommendation')
  )
    throw new Error('follow_up_completed_recommendation_required');
  return { report, recommendation, event };
}

/** Explicit operator input. One immutable decision per recommendation in this bounded MVP. */
export async function recordDecision(
  inputReport: InvestigationReport,
  instance: string,
  input: unknown,
) {
  const { recommendation, event } = prepareDecision(
    inputReport,
    instance,
    input,
  );
  const recorded = nowIso();
  const decision = eventRecord(
    recommendation,
    event,
    digest(`decision:${recommendation.record_id}`),
    recorded,
  );
  // A retry may reuse the existing receipt, but cannot silently alter its author/reason/schedule.
  const previous = (
    await readZetarisFollowUps(scopeOf(recommendation), instance)
  ).find((r) => r.record.record_id === decision.record_id);
  if (previous) {
    const old = previous.record;
    if (
      old.summary_json !== decision.summary_json ||
      old.investigation_id !== recommendation.investigation_id ||
      old.source_mode !== recommendation.source_mode
    )
      throw new Error('follow_up_decision_conflict');
    const stored = await readZetarisHistoryRecord(
      scopeOf(recommendation),
      recommendation.record_id,
    );
    if (JSON.stringify(stored.record) !== JSON.stringify(recommendation))
      throw new Error('follow_up_recommendation_conflict');
    return { recommendation: stored, decision: previous };
  }
  if (
    Date.parse(recommendation.recorded_at_utc) > Date.parse(recorded) ||
    (event.kind === 'deferred' &&
      Date.parse(event.review_at) < Date.parse(recorded))
  )
    throw new Error('follow_up_date_invalid');
  const stored = await appendZetarisHistory(recommendation);
  return {
    recommendation: stored,
    decision: await appendZetarisHistory(decision),
  };
}

async function decisionRecord(scope: Scope, id: string, signal?: AbortSignal) {
  const saved = (await readZetarisHistoryRecord(scope, id, signal)).record;
  const event = eventOf(saved);
  if (event.kind !== 'deferred' && event.kind !== 'accepted')
    throw new Error('follow_up_decision_required');
  const recommendation = (
    await readZetarisHistoryRecord(
      scope,
      event.recommendation_record_id,
      signal,
    )
  ).record;
  sameInstance(saved, recommendation);
  if (
    recommendation.schema_version !== 1 ||
    (event.kind === 'accepted' &&
      recommendation.verdict !== 'conditional_recommendation') ||
    recommendation.investigation_id !== saved.investigation_id ||
    Date.parse(saved.recorded_at_utc) <
      Date.parse(recommendation.recorded_at_utc)
  )
    throw new Error('follow_up_recommendation_invalid');
  return { record: saved, event, recommendation };
}

export async function reviewRequest(scope: Scope, decisionId: string) {
  const decision = await decisionRecord(scope, decisionId);
  if (decision.event.kind !== 'deferred')
    throw new Error('follow_up_deferred_decision_required');
  const now = Date.now();
  if (Date.parse(decision.event.review_at) > now)
    throw new Error('follow_up_not_due');
  return {
    decision,
    request: {
      ...scopeOf(decision.record),
      max_candidates: 3,
      window: {
        from: new Date(now - 28 * 86400000).toISOString(),
        to: new Date(now).toISOString(),
      },
    },
  };
}

/** Accept only a new validated investigation, never a copy of the original verdict. */
export async function recordReview(
  scope: Scope,
  decisionId: string,
  input: InvestigationReport,
) {
  const { decision } = await reviewRequest(scope, decisionId);
  const report = validateReport(input);
  const index = report.candidates.findIndex(
    (c) => c.instance_id === decision.record.instance_id,
  );
  if (index < 0) throw new Error('follow_up_target_not_investigated');
  const review = historyRecordFromReport(report, index);
  sameInstance(decision.record, review);
  const due =
    decision.event.kind === 'deferred' ? decision.event.review_at : '';
  if (
    report.investigation_id === decision.record.investigation_id ||
    Date.parse(report.started_at) < Date.parse(due) ||
    Date.parse(report.finished_at) > Date.now() ||
    report.evidence.some(
      (e) => Date.parse(e.collected_at) < Date.parse(report.started_at),
    )
  )
    throw new Error('follow_up_fresh_review_required');
  const originalIds: string[] = JSON.parse(
    decision.recommendation.summary_json,
  ).evidence_ids;
  if (report.evidence.some((e) => originalIds.includes(e.evidence_id)))
    throw new Error('follow_up_fresh_review_required');
  const saved = await appendZetarisHistory(review);
  const event: FollowUpEvent = {
    kind: 'reviewed',
    recommendation_record_id: decision.event.recommendation_record_id,
    decision_record_id: decisionId,
    review_record_id: review.record_id,
    completion_status: report.completion_status,
    evidence_ids: JSON.parse(review.summary_json).evidence_ids,
  };
  const outcome = await appendZetarisHistory(
    eventRecord(
      review,
      event,
      digest(`review:${decisionId}:${review.record_id}`),
      review.recorded_at_utc,
    ),
  );
  return { review: saved, outcome };
}

/** This records an attributed operator observation, not verified telemetry or measured savings. */
export async function recordOutcome(
  scope: Scope,
  decisionId: string,
  input: unknown,
) {
  const decision = await decisionRecord(scope, decisionId);
  if (decision.event.kind !== 'accepted')
    throw new Error('follow_up_accepted_decision_required');
  const fields = exact(input, [
    'actor',
    'reason',
    'observed_at',
    'result',
    'evidence_reference',
    'investigation_check',
  ]);
  const event = validateFollowUpEvent({
    ...fields,
    kind: 'outcome',
    verification: 'operator_reported',
    recommendation_record_id: decision.event.recommendation_record_id,
    decision_record_id: decisionId,
  });
  if (
    event.kind !== 'outcome' ||
    Date.parse(event.observed_at) <
      Date.parse(decision.record.recorded_at_utc) ||
    Date.parse(event.observed_at) > Date.now()
  )
    throw new Error('follow_up_date_invalid');
  // Same supplied observation is idempotent; a later observation appends a distinct receipt.
  const record = eventRecord(
    decision.record,
    event,
    digest(JSON.stringify(event)),
  );
  const existing = (
    await readZetarisFollowUps(scope, decision.record.instance_id)
  ).find((r) => r.record.record_id === record.record_id);
  if (existing) {
    if (existing.record.summary_json !== record.summary_json)
      throw new Error('follow_up_outcome_conflict');
    return existing;
  }
  return appendZetarisHistory(record);
}

/** Queries historical intent/outcomes that cannot be reconstructed from current EC2 telemetry. */
export async function listFollowUps(scopeInput: Scope, instance: string) {
  const scope = validateScope(exact(scopeInput, ['account_id', 'region']));
  const rows = await readZetarisFollowUps(scope, identifier(instance));
  const at = nowIso();
  if (rows.some((r) => Date.parse(r.record.recorded_at_utc) > Date.parse(at)))
    throw new Error('follow_up_future_record');
  const items = [];
  for (const { record } of rows) {
    const event = eventOf(record);
    if (event.kind !== 'deferred' && event.kind !== 'accepted') continue;
    const decision = await decisionRecord(scope, record.record_id);
    const outcomes = rows
      .filter((r) => {
        const e = eventOf(r.record);
        return (
          (e.kind === 'reviewed' || e.kind === 'outcome') &&
          e.decision_record_id === record.record_id
        );
      })
      .map(({ record: outcome }) => {
        sameInstance(record, outcome);
        const e = eventOf(outcome);
        if (
          e.recommendation_record_id !==
            decision.event.recommendation_record_id ||
          Date.parse(outcome.recorded_at_utc) <
            Date.parse(record.recorded_at_utc) ||
          (event.kind === 'deferred'
            ? e.kind !== 'reviewed'
            : e.kind !== 'outcome')
        )
          throw new Error('follow_up_outcome_invalid');
        return { record: outcome, event: e };
      });
    for (const outcome of outcomes) {
      if (outcome.event.kind !== 'reviewed') continue;
      const review = (
        await readZetarisHistoryRecord(scope, outcome.event.review_record_id)
      ).record;
      sameInstance(record, review);
      if (
        review.schema_version !== 1 ||
        review.investigation_id !== outcome.record.investigation_id ||
        review.verdict !== outcome.record.verdict ||
        review.recorded_at_utc !== outcome.record.recorded_at_utc ||
        (event.kind === 'deferred' &&
          Date.parse(review.recorded_at_utc) < Date.parse(event.review_at)) ||
        JSON.stringify(JSON.parse(review.summary_json).evidence_ids) !==
          JSON.stringify(outcome.event.evidence_ids)
      )
        throw new Error('follow_up_outcome_invalid');
    }
    const reviewed = outcomes.some(
      (o) =>
        o.event.kind === 'reviewed' && o.event.completion_status === 'complete',
    );
    items.push({
      decision_id: record.record_id,
      instance_id: record.instance_id,
      source_mode: record.source_mode,
      event,
      status:
        event.kind === 'accepted'
          ? outcomes.length
            ? 'outcome_reported'
            : 'awaiting_outcome'
          : reviewed
            ? 'reviewed'
            : Date.parse(event.review_at) <= Date.parse(at)
              ? 'due'
              : 'deferred',
      outcomes,
    });
  }
  return { as_of: at, historical: true, items };
}

/** Convert linked, scoped feedback into a bounded question for H-MEM, never telemetry. */
export async function outcomeLearningSummary(
  scope: Scope,
  instance: string,
  asOf: string,
  mode: Mode | undefined,
  signal: AbortSignal,
): Promise<ReasoningSummary | null> {
  const rows = await readZetarisFollowUps(scope, instance, signal);
  const eligible = rows
    .flatMap(({ record }) => {
      const event = eventOf(record);
      if (
        event.kind !== 'outcome' ||
        event.result === 'not_implemented' ||
        Date.parse(record.recorded_at_utc) > Date.parse(asOf) ||
        (mode && record.source_mode !== mode)
      )
        return [];
      return [{ record, event }];
    })
    .sort(
      (a, b) =>
        Date.parse(b.event.observed_at) - Date.parse(a.event.observed_at) ||
        Date.parse(b.record.recorded_at_utc) -
          Date.parse(a.record.recorded_at_utc),
    );
  const latest = eligible[0];
  if (!latest) return null;
  // Ambiguous equally timed feedback cannot teach a strategy.
  if (
    eligible[1]?.event.observed_at === latest.event.observed_at &&
    eligible[1]?.record.recorded_at_utc === latest.record.recorded_at_utc
  )
    throw new Error('outcome_learning_ambiguous');
  const { record, event } = latest;
  const decision = await decisionRecord(
    scope,
    event.decision_record_id,
    signal,
  );
  sameInstance(record, decision.record);
  if (
    decision.event.kind !== 'accepted' ||
    event.recommendation_record_id !==
      decision.event.recommendation_record_id ||
    record.investigation_id !== decision.record.investigation_id ||
    Date.parse(event.observed_at) <
      Date.parse(decision.record.recorded_at_utc) ||
    Date.parse(record.recorded_at_utc) <
      Date.parse(decision.record.recorded_at_utc)
  )
    throw new Error('outcome_learning_link_invalid');
  const recommendation = decision.recommendation;
  const window = validateSchedule(
    JSON.parse(recommendation.summary_json).proposed_window,
  );
  return validateReasoningSummary({
    schema_version: 1,
    investigation_id: recommendation.investigation_id,
    recorded_at: record.recorded_at_utc,
    scope,
    instance_id: instance,
    hypothesis: { window, state: 'supported' },
    verdict: 'conditional_recommendation',
    reason:
      'Historical operator-reported outcome; verify current conditions before deciding.',
    unresolved_risks: [],
    provenance: { integration_mode: record.source_mode, evidence_ids: [] },
    outcome: {
      record_id: record.record_id,
      decision_record_id: event.decision_record_id,
      recommendation_record_id: event.recommendation_record_id,
      observed_at: event.observed_at,
      result: event.result,
      verification: 'operator_reported',
      ...(event.investigation_check
        ? { investigation_check: event.investigation_check }
        : {}),
    },
  });
}
