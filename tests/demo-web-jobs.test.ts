import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import test from 'node:test';
import { setTimeout } from 'node:timers/promises';
import type { demonstrateFollowUps } from '../scripts/demo-follow-up.ts';
import type { demonstrateWarmLearning } from '../scripts/demo-warm.ts';
import { generateDemoReports } from '../scripts/demo-web.ts';
import {
  DemoJobs,
  demoConfiguration,
  investigationHistoryOptions,
  liveInvestigationFromEnv,
  validateDemoRun,
} from '../scripts/demo-web-jobs.ts';
import type { InvestigationReport } from '../src/contracts.ts';
import type { recordDecision } from '../src/investigation/follow-up.ts';
import { mockZetarisLedger } from './helpers/zetaris-ledger.ts';

const input = {
  request_id: 'web-test',
  kind: 'investigate',
  planner: 'scripted',
  evidence: 'mock',
  scenario: 'B',
  account: 'demo',
  region: 'us-east-1',
  max_candidates: 1,
  real_services: false,
  allow_append: false,
  history: false,
};
async function settle(jobs: DemoJobs) {
  const until = Date.now() + 20000;
  while (jobs.current?.status === 'running' && Date.now() < until)
    await setTimeout(20);
  assert.notEqual(
    jobs.current?.status,
    'running',
    JSON.stringify(jobs.current),
  );
  return jobs.current;
}
async function finish<T = InvestigationReport>(jobs: DemoJobs) {
  const job = await settle(jobs);
  assert.equal(job?.status, 'complete', JSON.stringify(job));
  return job?.result as T;
}

test('web execution validates opt-ins and rejects unapproved input', () => {
  assert.equal(validateDemoRun(input).kind, 'investigate');
  for (const change of [
    { planner: 'model' },
    { evidence: 'aws' },
    { kind: 'followup' },
    { command: 'anything' },
    { allow_append: true },
    { max_candidates: 4 },
    { kind: 'learn', evidence: 'aws', real_services: true },
    { evidence: 'aws', real_services: true, account: 'demo' },
    { history: true },
    { kind: 'learn', history: true, real_services: true },
  ])
    assert.throws(() => validateDemoRun({ ...input, ...change }));
  assert.deepEqual(Object.keys(demoConfiguration()).sort(), [
    'live_scope',
    'model',
    'zetaris',
    'zetaris_append',
  ]);
});

test('Live browser investigations bind validated server scope, model and read-only history', () => {
  const request = {
    request_id: 'live-config-test',
    kind: 'investigate',
    evidence: 'aws',
    real_services: true,
    allow_append: false,
  };
  const env = {
    AWS_EXPECTED_ACCOUNT_ID: '123456789012',
    AWS_REGION: 'eu-west-3',
    CCI_MAX_CANDIDATES: '3',
    ZETARIS_BASE_URL: 'https://history.example',
    ZETARIS_HISTORY_TABLE: 'CCI_HISTORY.app.records',
    ZETARIS_USERNAME: 'test-user',
    ZETARIS_PASSWORD: 'test-password',
    ZETARIS_HISTORY_ALLOW_APPEND: 'true',
  };
  assert.deepEqual(liveInvestigationFromEnv(request, env), {
    ...request,
    account: env.AWS_EXPECTED_ACCOUNT_ID,
    region: env.AWS_REGION,
    max_candidates: 3,
    planner: 'model',
    history: true,
    scenario: 'A',
  });
  const live = liveInvestigationFromEnv(request, env);
  assert.deepEqual(investigationHistoryOptions(live, {}), {
    zetaris: true,
    zetaris_append: false,
    hmem_directory: '.cci-memory',
  });
  assert.deepEqual(
    investigationHistoryOptions(live, {
      HMEM_PERSIST_DIR: '/tmp/cci-test-memory',
    }),
    {
      zetaris: true,
      zetaris_append: false,
      hmem_directory: '/tmp/cci-test-memory',
    },
  );
  assert.deepEqual(investigationHistoryOptions(validateDemoRun(input), {}), {
    zetaris_append: false,
  });
  const minimal = {
    AWS_EXPECTED_ACCOUNT_ID: env.AWS_EXPECTED_ACCOUNT_ID,
    AWS_REGION: env.AWS_REGION,
  };
  const run = liveInvestigationFromEnv(request, minimal);
  assert.ok(run.kind !== 'decision');
  assert.equal(run.max_candidates, 1);
  assert.equal(run.history, false);
  for (const change of [
    { AWS_EXPECTED_ACCOUNT_ID: undefined },
    { AWS_EXPECTED_ACCOUNT_ID: 'invalid' },
    { AWS_REGION: undefined },
    { AWS_REGION: 'invalid' },
    ...['', '0', '4', '1.5', 'NaN'].map((CCI_MAX_CANDIDATES) => ({
      CCI_MAX_CANDIDATES,
    })),
  ]) {
    const invalid = { ...env, ...change };
    assert.throws(
      () => liveInvestigationFromEnv(request, invalid),
      /live_scope_not_configured/,
    );
    assert.equal(demoConfiguration(invalid).live_scope, null);
  }
  for (const change of [
    { account: '999999999999' },
    { region: 'us-east-1' },
    { max_candidates: 2 },
    { planner: 'scripted' },
    { history: false },
    { allow_append: true },
    { real_services: false },
    { evidence: 'mock' },
  ])
    assert.throws(() =>
      liveInvestigationFromEnv({ ...request, ...change }, env),
    );
  for (const days of [1, 2, 7, 14]) {
    const selected = liveInvestigationFromEnv(
      { ...request, lookback_days: days },
      env,
    );
    assert.ok(selected.kind !== 'decision');
    assert.equal(selected.lookback_days, days);
  }
  for (const days of [0, 15, 1.5, '2', null])
    assert.throws(
      () => liveInvestigationFromEnv({ ...request, lookback_days: days }, env),
      /invalid_lookback_days/,
    );
  const config = JSON.stringify(demoConfiguration(env));
  assert.ok(!config.includes(env.ZETARIS_PASSWORD));
  assert.ok(!config.includes(env.ZETARIS_BASE_URL));
});

test('isolated offline investigations and H-MEM learning return actual results with bounded progress', async () => {
  const jobs = new DemoJobs();
  try {
    const first = jobs.start(input);
    assert.equal(first.source_mode, 'mock');
    assert.equal(jobs.start(input), first);
    assert.throws(() => jobs.start({ ...input, scenario: 'A' }), /conflict/);
    assert.throws(
      () => jobs.start({ ...input, request_id: 'concurrent' }),
      /busy/,
    );
    const result = await finish(jobs);
    assert.equal(result.candidates[0].verdict, 'not_recommended');
    assert.equal(result.planner.mode, 'scripted');
    assert.equal(result.historical_context.zetaris, 'not_configured');
    assert.ok(
      jobs.current?.events.some((event) =>
        event.includes('Zetaris: disabled · Meterless H-MEM: disabled'),
      ),
    );
    assert.ok(jobs.current?.events.some((e) => e.includes('evaluator')));
    assert.ok((jobs.current?.events.length ?? 0) <= 160);
    jobs.start({ ...input, request_id: 'learning', kind: 'learn' });
    const learned =
      await finish<Awaited<ReturnType<typeof demonstrateWarmLearning>>>(jobs);
    assert.equal(learned.passed, true);
    assert.ok(
      jobs.current?.events.some((event) =>
        event.includes('Meterless H-MEM read ·'),
      ),
    );
    assert.ok(
      jobs.current?.events.some((event) =>
        event.includes('Meterless H-MEM store ·'),
      ),
    );
    assert.deepEqual(
      learned.runs.map((r: { phase: string }) => r.phase),
      ['cold', 'warm', 'changed'],
    );
    assert.equal(
      learned.runs[2].report.candidates[0].verdict,
      'needs_verification',
    );
  } finally {
    jobs.close();
  }
});

test('stop is explicit and prevents the worker from replacing a cancelled result', async () => {
  const jobs = new DemoJobs();
  jobs.start({ ...input, kind: 'learn' });
  assert.throws(() => jobs.cancel('wrong-id'), /not_found/);
  jobs.cancel(input.request_id);
  await setTimeout(500);
  assert.equal(jobs.current?.status, 'cancelled');
  assert.equal(jobs.current?.result, undefined);
  jobs.start({ ...input, request_id: 'after-cancel' });
  await finish(jobs);
  jobs.close();
});

test('browser follow-through worker reaches the real adapter via a local HTTP fixture, without external calls', async (t) => {
  const nativeFetch = globalThis.fetch;
  let uncertainInsert = false;
  const { records } = mockZetarisLedger(t);
  const fixtureFetch = globalThis.fetch;
  t.mock.restoreAll();
  const fixture = createServer(async (req, res) => {
    let body = '';
    for await (const chunk of req) body += chunk;
    try {
      const response = await fixtureFetch('http://fixture', { body });
      if (uncertainInsert && JSON.parse(body).sql.startsWith('INSERT')) {
        uncertainInsert = false;
        res.writeHead(500);
        res.end('{}');
        return;
      }
      res.writeHead(response.status, { 'Content-Type': 'application/json' });
      res.end(await response.text());
    } catch {
      res.writeHead(500);
      res.end('{}');
    }
  });
  await new Promise<void>((resolve) => fixture.listen(0, '127.0.0.1', resolve));
  const previousHttp = process.env.ZETARIS_ALLOW_HTTP;
  process.env.ZETARIS_BASE_URL = `http://127.0.0.1:${(fixture.address() as AddressInfo).port}`;
  process.env.ZETARIS_ALLOW_HTTP = 'true';
  const jobs = new DemoJobs();
  try {
    assert.equal(globalThis.fetch, nativeFetch);
    jobs.start({
      ...input,
      request_id: 'followup',
      kind: 'followup',
      real_services: true,
      allow_append: true,
    });
    const result =
      await finish<Awaited<ReturnType<typeof demonstrateFollowUps>>>(jobs);
    assert.equal(result.passed, true);
    assert.equal(records.length, 6);
    assert.ok(
      jobs.current?.events.some((e) =>
        e.startsWith('Synthetic follow-up account:'),
      ),
    );
    jobs.start({
      ...input,
      request_id: 'history-read',
      history: true,
      real_services: true,
    });
    const historyReport = await finish(jobs);
    assert.equal(historyReport.historical_context.zetaris, 'ok');
    assert.ok(
      jobs.current?.events.some((event) => event.includes('Zetaris read ·')),
    );
    assert.equal(records.length, 6);
    assert.ok(jobs.current?.events.some((e) => e.includes('append disabled')));
    const report = (await generateDemoReports()).A;
    const decisionInput = {
      request_id: 'engineer-review',
      kind: 'decision',
      real_services: true,
      allow_append: true,
      report,
      instance_id: report.candidates[0].instance_id,
      decision: {
        kind: 'deferred',
        review_at: new Date(Date.now() + 86400000).toISOString(),
        actor: 'engineer-42',
        reason: 'Accepted in local fixture test.',
      },
    };
    for (const change of [
      { allow_append: false },
      { real_services: false },
      { instance_id: 'i-other' },
      { decision: { ...decisionInput.decision, kind: 'delete' } },
      { decision: { ...decisionInput.decision, actor: 'spaces not allowed' } },
      { sql: 'arbitrary SQL' },
      { report: { ...report, completion_status: 'failed' } },
    ])
      assert.throws(() => validateDemoRun({ ...decisionInput, ...change }));
    jobs.start(decisionInput);
    const receipt =
      await finish<Awaited<ReturnType<typeof recordDecision>>>(jobs);
    assert.equal(records.length, 8);
    assert.equal(receipt.decision.record.schema_version, 2);
    assert.equal(
      JSON.parse(receipt.decision.record.summary_json).actor,
      'engineer-42',
    );
    assert.equal(
      receipt.recommendation.record.investigation_id,
      report.investigation_id,
    );
    assert.ok(
      jobs.current?.events.some((e) => e.includes('readback verified')),
    );
    jobs.start({ ...decisionInput, request_id: 'same-decision' });
    assert.deepEqual(await finish(jobs), receipt);
    assert.equal(records.length, 8);
    jobs.start({
      ...decisionInput,
      request_id: 'conflict-decision',
      decision: { ...decisionInput.decision, reason: 'Changed reason' },
    });
    const conflict = await settle(jobs);
    assert.equal(conflict?.status, 'failed');
    assert.match(conflict?.error ?? '', /cannot be overwritten/);
    assert.equal(records.length, 8);
    const deferredReport = (await generateDemoReports()).A;
    const review_at = new Date(Date.now() + 3600000).toISOString();
    // A failed worker reports its error before its close/cleanup event.
    await setTimeout(100);
    jobs.start({
      ...decisionInput,
      request_id: 'engineer-defer',
      report: deferredReport,
      decision: {
        kind: 'deferred',
        actor: 'engineer-42',
        reason: 'Revisit after migration.',
        review_at,
      },
    });
    const deferred =
      await finish<Awaited<ReturnType<typeof recordDecision>>>(jobs);
    assert.equal(
      JSON.parse(deferred.decision.record.summary_json).review_at,
      review_at,
    );
    assert.equal(records.length, 10);
    uncertainInsert = true;
    jobs.start({
      ...decisionInput,
      request_id: 'uncertain-save',
      report: (await generateDemoReports()).A,
    });
    const uncertain = await settle(jobs);
    assert.equal(uncertain?.status, 'failed');
    assert.equal(uncertain?.result, undefined);
    assert.match(uncertain?.error ?? '', /could not be verified/);
    assert.equal(
      records.length,
      11,
      'uncertain recommendation write is not automatically replayed',
    );
    assert.equal(JSON.stringify(jobs.current).includes('fixture-key'), false);
  } finally {
    jobs.close();
    fixture.closeAllConnections();
    await new Promise<void>((resolve) => fixture.close(() => resolve()));
    if (previousHttp === undefined) delete process.env.ZETARIS_ALLOW_HTTP;
    else process.env.ZETARIS_ALLOW_HTTP = previousHttp;
  }
});

test('explicit model control preserves a provider failure without scripted fallback', async () => {
  let attempts = 0;
  const fixture = createServer((_req, res) => {
    attempts++;
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end('{"error":{"message":"fixture failure"}}');
  });
  await new Promise<void>((resolve) => fixture.listen(0, '127.0.0.1', resolve));
  const settings = {
    LLM_BASE_URL: `http://127.0.0.1:${(fixture.address() as AddressInfo).port}/v1`,
    LLM_MODEL: 'fixture-model',
    LLM_API_KEY: 'fixture-model-key',
    LLM_EXTRA_BODY: '{}',
    LLM_RESPONSE_FORMAT: 'text',
  };
  const previous = Object.fromEntries(
    Object.keys(settings).map((k) => [k, process.env[k]]),
  );
  Object.assign(process.env, settings);
  const jobs = new DemoJobs();
  try {
    jobs.start({
      ...input,
      request_id: 'model-failure',
      planner: 'model',
      real_services: true,
    });
    const result = await finish(jobs);
    assert.equal(attempts, 3);
    assert.equal(result.budget.planner_calls, 3);
    assert.equal(
      jobs.current?.events.filter((e) => e.includes('retry ')).length,
      2,
    );
    assert.ok(jobs.current?.activity);
    assert.equal(result.planner.mode, 'live');
    assert.equal(result.completion_status, 'partial');
    assert.ok(result.trace.some((t) => t.failure_code === 'model_http_500'));
    assert.equal(
      JSON.stringify(jobs.current).includes('fixture-model-key'),
      false,
    );
  } finally {
    jobs.close();
    fixture.closeAllConnections();
    await new Promise<void>((resolve) => fixture.close(() => resolve()));
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test('model exchanges reach web execution events through worker IPC using a local fixture', async () => {
  let sentMessages: { role: string; content: string }[] = [];
  const output = JSON.stringify({
    action: 'finish',
    reason: 'Fixture stops after inventory discovery.',
  });
  const fixture = createServer(async (req, res) => {
    let body = '';
    for await (const chunk of req) body += chunk;
    sentMessages = JSON.parse(body).messages;
    const state = JSON.parse(
      sentMessages[1].content.split('\n').slice(1).join('\n'),
    );
    assert.equal(state.observations[0].tool, 'list_ec2_instances');
    assert.equal(state.observations[0].status, 'ok');
    assert.deepEqual(state.available_actions, ['get_ec2_billing', 'finish']);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        choices: [{ finish_reason: 'stop', message: { content: output } }],
      }),
    );
  });
  await new Promise<void>((resolve) => fixture.listen(0, '127.0.0.1', resolve));
  const settings = {
    LLM_BASE_URL: `http://127.0.0.1:${(fixture.address() as AddressInfo).port}/v1`,
    LLM_MODEL: 'fixture-model',
    LLM_API_KEY: 'fixture-model-key',
    LLM_EXTRA_BODY: '{}',
    LLM_RESPONSE_FORMAT: 'text',
  };
  const previous = Object.fromEntries(
    Object.keys(settings).map((key) => [key, process.env[key]]),
  );
  Object.assign(process.env, settings);
  const jobs = new DemoJobs();
  try {
    jobs.start({
      ...input,
      request_id: 'model-exchange',
      planner: 'model',
      real_services: true,
    });
    await finish(jobs);
    const events = jobs.current?.events ?? [];
    const promptIndex = events.findIndex((event) =>
      event.startsWith('Model prompt: '),
    );
    assert.ok(promptIndex > events.indexOf('Planner call 1 started'));
    assert.equal(
      events[promptIndex],
      `Model prompt: ${sentMessages.map((message) => `${message.role.toUpperCase()}\n${message.content}`).join('\n\n')}`,
    );
    assert.equal(events[promptIndex + 1], `Model output: ${output}`);
    assert.equal(
      JSON.stringify(jobs.current).includes(settings.LLM_API_KEY),
      false,
    );
    assert.equal(
      JSON.stringify(jobs.current).includes(settings.LLM_BASE_URL),
      false,
    );
    assert.equal(jobs.current?.activity?.startsWith('Model '), false);
  } finally {
    jobs.close();
    fixture.closeAllConnections();
    await new Promise<void>((resolve) => fixture.close(() => resolve()));
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test('stopping during planner backoff prevents another provider request', async () => {
  let attempts = 0;
  const fixture = createServer((_req, res) => {
    attempts++;
    res.writeHead(503, { 'Content-Type': 'application/json' });
    res.end('{}');
  });
  await new Promise<void>((resolve) => fixture.listen(0, '127.0.0.1', resolve));
  const settings = {
    LLM_BASE_URL: `http://127.0.0.1:${(fixture.address() as AddressInfo).port}/v1`,
    LLM_MODEL: 'fixture',
    LLM_API_KEY: 'fixture-key',
    LLM_EXTRA_BODY: '{}',
    LLM_RESPONSE_FORMAT: 'text',
  };
  const previous = Object.fromEntries(
    Object.keys(settings).map((k) => [k, process.env[k]]),
  );
  Object.assign(process.env, settings);
  const jobs = new DemoJobs();
  try {
    jobs.start({
      ...input,
      request_id: 'cancel-backoff',
      planner: 'model',
      real_services: true,
    });
    const until = Date.now() + 10000;
    while (
      !jobs.current?.events.some((e) => e.includes('retry 2/3')) &&
      Date.now() < until
    )
      await setTimeout(20);
    assert.ok(jobs.current?.events.some((e) => e.includes('retry 2/3')));
    jobs.cancel('cancel-backoff');
    await setTimeout(3000);
    assert.equal(attempts, 1);
    assert.equal(jobs.current?.status, 'cancelled');
    assert.equal(jobs.current?.result, undefined);
  } finally {
    jobs.close();
    fixture.closeAllConnections();
    await new Promise<void>((resolve) => fixture.close(() => resolve()));
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test('selected lookback reaches the isolated investigation worker', async () => {
  const jobs = new DemoJobs();
  try {
    jobs.start({ ...input, scenario: 'A', lookback_days: 2 });
    const report = await finish(jobs);
    assert.equal(
      Date.parse(report.request.window.to) -
        Date.parse(report.request.window.from),
      2 * 86400000,
    );
    assert.equal(report.candidates[0].verdict, 'needs_verification');
    assert.match(
      report.candidates[0].explanation,
      /Decision deferred.*Insufficient history.*Observed CPU/,
    );
  } finally {
    jobs.close();
  }
});
