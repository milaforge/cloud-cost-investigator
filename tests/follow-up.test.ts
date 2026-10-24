import assert from 'node:assert/strict';
import test from 'node:test';
import { setTimeout } from 'node:timers/promises';
import { demonstrateFollowUps } from '../scripts/demo-follow-up.ts';
import { followUpMain } from '../scripts/follow-up.ts';
import {
  listFollowUps,
  recordDecision,
  recordOutcome,
  recordReview,
  reviewRequest,
} from '../src/investigation/follow-up.ts';
import { validateFollowUpEvent } from '../src/investigation/follow-up-contract.ts';
import { MockProvider, type MockScenario } from '../src/investigation/mock.ts';
import { ScriptedPlanner } from '../src/investigation/planner.ts';
import { runInvestigation } from '../src/investigation/run.ts';
import {
  appendZetarisHistory,
  readZetarisHistory,
} from '../src/tools/zetaris-history.ts';
import { mockZetarisLedger } from './helpers/zetaris-ledger.ts';

const scope = { account_id: 'followup-test', region: 'us-east-1' };
const instance = 'i-mock-primary';
const run = (scenario: MockScenario = 'A') =>
  runInvestigation(
    {
      ...scope,
      max_candidates: 1,
      window: {
        from: new Date(Date.now() - 28 * 86400000).toISOString(),
        to: new Date().toISOString(),
      },
    },
    { provider: new MockProvider(scenario), planner: new ScriptedPlanner() },
  );
const accepted = {
  kind: 'accepted',
  actor: 'test-engineer',
  reason: 'Explicit fixture decision.',
};

async function dueDecision() {
  const report = await run();
  const review_at = new Date(Date.now() + 25).toISOString();
  const saved = await recordDecision(report, instance, {
    ...accepted,
    kind: 'deferred',
    review_at,
  });
  while (Date.now() < Date.parse(review_at))
    await setTimeout(Math.max(1, Date.parse(review_at) - Date.now()));
  return saved;
}

test('both follow-up paths use persisted intent; fresh review and attributed outcome remain distinct', async (t) => {
  const { records } = mockZetarisLedger(t);
  t.mock.method(console, 'error', () => {});
  const result = await demonstrateFollowUps();
  assert.equal(result.passed, true, JSON.stringify(result.checks));
  assert.equal(records.length, 7);
  assert.equal((await readZetarisHistory(result.scope, 20)).length, 3);
});

test('decision is immutable and repeat delivery does not append duplicate rows', async (t) => {
  const { records } = mockZetarisLedger(t);
  const report = await run();
  const first = await recordDecision(report, instance, accepted);
  assert.deepEqual(await recordDecision(report, instance, accepted), first);
  assert.equal(records.length, 2);
  await assert.rejects(
    recordDecision(report, instance, {
      ...accepted,
      reason: 'Different decision',
    }),
    { message: 'follow_up_decision_conflict' },
  );
  assert.equal(records.length, 2);
});

test('only complete conditional recommendations can receive decisions; invalid input writes nothing', async (t) => {
  const { records } = mockZetarisLedger(t);
  await assert.rejects(recordDecision(await run('C'), instance, accepted), {
    message: 'follow_up_completed_recommendation_required',
  });
  const report = await run();
  await assert.rejects(
    recordDecision(report, instance, {
      ...accepted,
      kind: 'deferred',
      review_at: '2000-01-01T00:00:00Z',
    }),
    { message: 'follow_up_date_invalid' },
  );
  await assert.rejects(
    recordDecision(report, instance, { ...accepted, execute: true }),
  );
  await assert.rejects(recordDecision(report, 'different-instance', accepted));
  assert.equal(records.length, 0);
});

test('not-due, cross-account and wrong event transitions cannot start review', async (t) => {
  mockZetarisLedger(t);
  const deferred = await recordDecision(await run(), instance, {
    ...accepted,
    kind: 'deferred',
    review_at: new Date(Date.now() + 86400000).toISOString(),
  });
  await assert.rejects(
    reviewRequest(scope, deferred.decision.record.record_id),
    { message: 'follow_up_not_due' },
  );
  await assert.rejects(
    reviewRequest(
      { ...scope, account_id: 'other' },
      deferred.decision.record.record_id,
    ),
  );
  const accept = await recordDecision(await run(), instance, accepted);
  await assert.rejects(reviewRequest(scope, accept.decision.record.record_id), {
    message: 'follow_up_deferred_decision_required',
  });
  assert.deepEqual(
    (await listFollowUps(scope, instance)).items.map((i) => i.status).sort(),
    ['awaiting_outcome', 'deferred'],
  );
});

test('partial review is retained and does not close the due obligation', async (t) => {
  mockZetarisLedger(t);
  const deferred = await dueDecision();
  const report = await run('missing');
  assert.equal(report.completion_status, 'partial');
  await recordReview(scope, deferred.decision.record.record_id, report);
  const list = await listFollowUps(scope, instance);
  assert.equal(list.items[0].status, 'due');
  assert.equal(list.items[0].outcomes.length, 1);
});

test('review rejects old reports and cross-scope evidence', async (t) => {
  mockZetarisLedger(t);
  const old = await run();
  const deferred = await dueDecision();
  await assert.rejects(
    recordReview(scope, deferred.decision.record.record_id, old),
    { message: 'follow_up_fresh_review_required' },
  );
  const fresh = await run('C');
  fresh.request.account_id = 'different';
  await assert.rejects(
    recordReview(scope, deferred.decision.record.record_id, fresh),
  );
});

test('outcomes require acceptance, bounded observed dates and explicit operator provenance', async (t) => {
  const { records } = mockZetarisLedger(t);
  const receipt = await recordDecision(await run(), instance, accepted);
  const event = {
    actor: 'test-engineer',
    reason: 'External change observed',
    observed_at: new Date().toISOString(),
    result: 'implemented',
    evidence_reference: 'ticket-42',
  };
  const saved = await recordOutcome(
    scope,
    receipt.decision.record.record_id,
    event,
  );
  assert.deepEqual(
    await recordOutcome(scope, receipt.decision.record.record_id, event),
    saved,
  );
  assert.equal(records.length, 3);
  assert.equal(
    JSON.parse(saved.record.summary_json).verification,
    'operator_reported',
  );
  await assert.rejects(
    recordOutcome(scope, receipt.decision.record.record_id, {
      ...event,
      observed_at: '2099-01-01T00:00:00Z',
    }),
  );
  await assert.rejects(
    recordOutcome(scope, receipt.decision.record.record_id, {
      ...event,
      observed_at: '2000-01-01T00:00:00Z',
    }),
  );
  const deferred = await dueDecision();
  await assert.rejects(
    recordOutcome(scope, deferred.decision.record.record_id, event),
    { message: 'follow_up_accepted_decision_required' },
  );
  assert.throws(() =>
    validateFollowUpEvent({
      ...event,
      kind: 'outcome',
      recommendation_record_id: 'r',
      decision_record_id: 'd',
      verification: 'aws_verified',
    }),
  );
});

test('query saturation, invalid version-two data and append-disabled fail explicitly', async (t) => {
  const { records } = mockZetarisLedger(t);
  const receipt = await recordDecision(await run(), instance, accepted);
  await assert.rejects(
    appendZetarisHistory({
      ...receipt.decision.record,
      summary_json: JSON.stringify({ kind: 'arbitrary_write' }),
    }),
  );
  process.env.ZETARIS_HISTORY_ALLOW_APPEND = 'false';
  await assert.rejects(recordDecision(await run(), instance, accepted), {
    message: 'zetaris_history_append_disabled',
  });
  while (records.filter((r) => r.schema_version === 2).length < 20)
    records.push({
      ...receipt.decision.record,
      record_id: `extra-${records.length}`,
    });
  await assert.rejects(listFollowUps(scope, instance), {
    message: 'zetaris_follow_up_query_limit_exceeded',
  });
});

test('CLI rejects ambiguous or incomplete requests before external effects', async (t) => {
  const { records, sqlLog } = mockZetarisLedger(t);
  await assert.rejects(followUpMain(['list', '--account', 'x']));
  await assert.rejects(
    followUpMain([
      'review',
      '--account',
      'x',
      '--region',
      'us-east-1',
      '--decision',
      'd',
      '--scenario',
      'A',
      '--scenario',
      'C',
    ]),
  );
  assert.equal(records.length, 0);
  assert.equal(sqlLog.length, 0);
});

test('follow-up cannot be closed by a forged review link', async (t) => {
  const { records } = mockZetarisLedger(t);
  const deferred = await dueDecision();
  await recordReview(scope, deferred.decision.record.record_id, await run('C'));
  const outcome = records.find(
    (r) =>
      r.schema_version === 2 && JSON.parse(r.summary_json).kind === 'reviewed',
  );
  assert.ok(outcome);
  const event = JSON.parse(outcome.summary_json);
  event.review_record_id = 'nonexistent-review';
  outcome.summary_json = JSON.stringify(event);
  await assert.rejects(listFollowUps(scope, instance), {
    message: 'zetaris_history_record_missing_or_duplicate',
  });
});

test('manual CLI records and queries an acceptance and its attributed outcome', async (t) => {
  mockZetarisLedger(t);
  const { mkdtemp, writeFile, rm } = await import('node:fs/promises');
  const directory = await mkdtemp('/tmp/cci-followup-cli-');
  t.after(() => rm(directory, { recursive: true, force: true }));
  const report = await run();
  await writeFile(`${directory}/report.json`, JSON.stringify(report));
  await writeFile(`${directory}/decision.json`, JSON.stringify(accepted));
  const outputs: string[] = [];
  t.mock.method(console, 'log', (message: string) => {
    outputs.push(message);
  });
  t.mock.method(console, 'error', () => {});
  assert.equal(
    await followUpMain([
      'decide',
      '--report',
      `${directory}/report.json`,
      '--instance',
      instance,
      '--input',
      `${directory}/decision.json`,
    ]),
    0,
  );
  const id = JSON.parse(outputs.at(-1) ?? '').decision.record.record_id;
  const flags = ['--account', scope.account_id, '--region', scope.region];
  assert.equal(
    await followUpMain(['list', ...flags, '--instance', instance]),
    0,
  );
  assert.equal(
    JSON.parse(outputs.at(-1) ?? '').items[0].status,
    'awaiting_outcome',
  );
  await writeFile(
    `${directory}/outcome.json`,
    JSON.stringify({
      actor: 'test-engineer',
      reason: 'Not implemented by operator',
      result: 'not_implemented',
      observed_at: new Date().toISOString(),
      evidence_reference: 'test-ticket-123',
    }),
  );
  assert.equal(
    await followUpMain([
      'outcome',
      ...flags,
      '--decision',
      id,
      '--input',
      `${directory}/outcome.json`,
    ]),
    0,
  );
  assert.equal(
    await followUpMain(['list', ...flags, '--instance', instance]),
    0,
  );
  const final = JSON.parse(outputs.at(-1) ?? '');
  assert.equal(final.items[0].status, 'outcome_reported');
  assert.equal(
    final.items[0].outcomes[0].event.verification,
    'operator_reported',
  );
});
