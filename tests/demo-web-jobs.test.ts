import type { InvestigationReport } from '../src/contracts.ts';
import type { demonstrateWarmLearning } from '../scripts/demo-warm.ts';
import type { demonstrateFollowUps } from '../scripts/demo-follow-up.ts';
import assert from 'node:assert/strict';
import test from 'node:test';
import { setTimeout } from 'node:timers/promises';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import {
  DemoJobs,
  validateDemoRun,
  demoConfiguration,
} from '../scripts/demo-web-jobs.ts';
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
async function finish<T = InvestigationReport>(jobs: DemoJobs) {
  const until = Date.now() + 20000;
  while (jobs.current?.status === 'running' && Date.now() < until)
    await setTimeout(20);
  assert.equal(jobs.current?.status, 'complete', JSON.stringify(jobs.current));
  return jobs.current?.result as T;
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
    'model',
    'zetaris',
    'zetaris_append',
  ]);
});

test('isolated offline investigations and H-MEM learning return actual results with bounded progress', async () => {
  const jobs = new DemoJobs();
  try {
    const first = jobs.start(input);
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
    assert.ok(jobs.current?.events.some((e) => e.includes('evaluator')));
    assert.ok((jobs.current?.events.length ?? 0) <= 160);
    jobs.start({ ...input, request_id: 'learning', kind: 'learn' });
    const learned =
      await finish<Awaited<ReturnType<typeof demonstrateWarmLearning>>>(jobs);
    assert.equal(learned.passed, true);
    assert.deepEqual(
      learned.runs.map((r: { phase: string }) => r.phase),
      ['cold', 'warm', 'changed'],
    );
    assert.equal(
      learned.runs[2].report.candidates[0].verdict,
      'conditional_recommendation',
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
  const { records } = mockZetarisLedger(t);
  const fixtureFetch = globalThis.fetch;
  t.mock.restoreAll();
  const fixture = createServer(async (req, res) => {
    let body = '';
    for await (const chunk of req) body += chunk;
    try {
      const response = await fixtureFetch('http://fixture', { body });
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
    assert.equal(records.length, 7);
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
    assert.equal(records.length, 7);
    assert.ok(jobs.current?.events.some((e) => e.includes('append disabled')));
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
  const fixture = createServer((_req, res) => {
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
    assert.equal(result.planner.mode, 'live');
    assert.equal(result.completion_status, 'failed');
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
