import {
  array,
  exact,
  identifier,
  member,
  object,
  textValue,
  utc,
} from '../contracts.ts';

export type FollowUpEvent =
  | {
      kind: 'deferred';
      recommendation_record_id: string;
      actor: string;
      reason: string;
      review_at: string;
    }
  | {
      kind: 'accepted';
      recommendation_record_id: string;
      actor: string;
      reason: string;
    }
  | {
      kind: 'outcome';
      recommendation_record_id: string;
      decision_record_id: string;
      actor: string;
      reason: string;
      observed_at: string;
      result: 'implemented' | 'not_implemented' | 'rolled_back';
      evidence_reference: string;
      verification: 'operator_reported';
    }
  | {
      kind: 'reviewed';
      recommendation_record_id: string;
      decision_record_id: string;
      review_record_id: string;
      completion_status: 'complete' | 'partial' | 'failed';
      evidence_ids: string[];
    };

/** Operator data and observed outcomes are never planner instructions or infrastructure authority. */
export function validateFollowUpEvent(value: unknown): FollowUpEvent {
  const o = object(value);
  if (o.kind === 'deferred' || o.kind === 'accepted') {
    const e = exact(o, [
      'kind',
      'recommendation_record_id',
      'actor',
      'reason',
      ...(o.kind === 'deferred' ? ['review_at'] : []),
    ]);
    const common = {
      recommendation_record_id: identifier(e.recommendation_record_id),
      actor: identifier(e.actor),
      reason: textValue(e.reason, 400),
    };
    return o.kind === 'deferred'
      ? {
          ...common,
          kind: 'deferred',
          review_at: new Date(utc(e.review_at)).toISOString(),
        }
      : { ...common, kind: 'accepted' };
  }
  if (o.kind === 'outcome') {
    const e = exact(o, [
      'kind',
      'recommendation_record_id',
      'decision_record_id',
      'actor',
      'reason',
      'observed_at',
      'result',
      'evidence_reference',
      'verification',
    ]);
    if (e.verification !== 'operator_reported')
      throw new Error('follow_up_event_invalid');
    return {
      kind: 'outcome',
      recommendation_record_id: identifier(e.recommendation_record_id),
      decision_record_id: identifier(e.decision_record_id),
      actor: identifier(e.actor),
      reason: textValue(e.reason, 400),
      observed_at: new Date(utc(e.observed_at)).toISOString(),
      result: member(e.result, [
        'implemented',
        'not_implemented',
        'rolled_back',
      ]),
      evidence_reference: identifier(e.evidence_reference),
      verification: 'operator_reported',
    };
  }
  const e = exact(o, [
    'kind',
    'recommendation_record_id',
    'decision_record_id',
    'review_record_id',
    'completion_status',
    'evidence_ids',
  ]);
  if (e.kind !== 'reviewed') throw new Error('follow_up_event_invalid');
  return {
    kind: 'reviewed',
    recommendation_record_id: identifier(e.recommendation_record_id),
    decision_record_id: identifier(e.decision_record_id),
    review_record_id: identifier(e.review_record_id),
    completion_status: member(e.completion_status, [
      'complete',
      'partial',
      'failed',
    ]),
    evidence_ids: array(e.evidence_ids, 15).map(identifier),
  };
}
