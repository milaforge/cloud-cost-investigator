import assert from 'node:assert/strict';
import test from 'node:test';
import { readProviderError } from '../src/investigation/provider-error.ts';
import { OpenAICompatiblePlanner } from '../src/investigation/model.ts';
import { MockProvider } from '../src/investigation/mock.ts';
import { runInvestigation } from '../src/investigation/run.ts';
import { renderReport, validateReport } from '../src/investigation/report.ts';

test('provider JSON keeps useful error fields and strips request, secrets, URLs and stacks', async () => {
  const result = await readProviderError(
    Response.json({
      error: {
        message:
          'GPU capacity exhausted; Bearer hidden-token; key-secret https://private.example/v1',
        type: 'server_error',
        code: 'gpu_busy',
        stack: 'PRIVATE stack',
        request: { messages: 'PRIVATE prompt' },
        api_key: 'PRIVATE key',
      },
      headers: { Authorization: 'PRIVATE header' },
    }),
    ['key-secret'],
  );
  assert.match(result.body, /GPU capacity exhausted/);
  assert.match(result.body, /gpu_busy/);
  assert.ok(
    !/PRIVATE|key-secret|hidden-token|private\.example/.test(result.body),
  );
  assert.equal(result.truncated, false);
});

test('plain text, HTML, malformed JSON and terminal escapes are bounded and redacted', async () => {
  for (const raw of [
    '<h1>Backend unavailable</h1> token=PRIVATE https://private.example/secret',
    '{"message":"Backend unavailable", "api_key":"PRIVATE",',
    'Backend unavailable\n at /home/private/file:3',
    'Backend unavailable\u001b[31m\npassword=PRIVATE',
  ]) {
    const result = await readProviderError(new Response(raw), []);
    assert.match(result.body, /Backend unavailable/);
    assert.ok(!/PRIVATE|private\.example|\/home\/private/.test(result.body));
    assert.ok(!result.body.includes('\u001b') && !result.body.includes('\n'));
  }
});

test('oversized provider body is capped and its reader cancelled', async () => {
  let cancelled = false;
  const response = new Response(
    new ReadableStream({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode(`GPU failure ${'x'.repeat(20000)}`),
        );
      },
      cancel() {
        cancelled = true;
      },
    }),
  );
  const details = await readProviderError(response, []);
  assert.equal(details.truncated, true);
  assert.ok(details.body.length <= 2048);
  assert.match(details.body, /GPU failure/);
  assert.equal(cancelled, true);
});

test('stalled body read expires in one second and is cancelled', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let cancelled = false;
  const pending = readProviderError(
    new Response(
      new ReadableStream({
        cancel() {
          cancelled = true;
        },
      }),
    ),
    [],
  );
  t.mock.timers.tick(1000);
  const details = await pending;
  assert.match(details.body, /unavailable/);
  assert.equal(details.truncated, true);
  assert.equal(cancelled, true);
});

test('HTTP diagnostic survives runner and rendering; cannot attach to a non-HTTP trace', async (t) => {
  const before = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '1';
  t.after(() => {
    if (before === undefined) delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    else process.env.NODE_TLS_REJECT_UNAUTHORIZED = before;
  });
  t.mock.method(globalThis, 'fetch', async () =>
    Response.json(
      { error: { message: 'CUDA allocation failed', code: 'gpu_error' } },
      { status: 500 },
    ),
  );
  t.mock.timers.enable({
    apis: ['Date', 'setTimeout', 'setInterval'],
    now: Date.now(),
  });
  const report = await runInvestigation(
    {
      account_id: 'demo',
      region: 'us-east-1',
      max_candidates: 1,
      window: { from: '2026-09-01T00:00:00Z', to: '2026-09-29T00:00:00Z' },
    },
    {
      provider: new MockProvider(),
      onProgress(event) {
        if (event.event === 'planner_retry')
          queueMicrotask(() => t.mock.timers.tick(event.delay_ms));
      },
      planner: new OpenAICompatiblePlanner({
        baseUrl: 'https://model.example/v1',
        model: 'test',
        apiKey: 'test-key',
      }),
    },
  );
  const failureIndex = report.trace.findIndex((entry) => entry.failure_code);
  assert.match(
    report.trace[failureIndex].provider_error?.body ?? '',
    /CUDA allocation failed/,
  );
  assert.match(renderReport(report), /CUDA allocation failed/);
  assert.equal(report.trace[failureIndex].failure_code, 'model_http_500');
  assert.equal(report.budget.planner_calls, 3);
  const forged = structuredClone(report);
  forged.trace[failureIndex].failure_code = 'planner_timeout';
  assert.throws(() => validateReport(forged));
  const tooLarge = structuredClone(report);
  assert.ok(tooLarge.trace[failureIndex].provider_error);
  tooLarge.trace[failureIndex].provider_error.body = 'x'.repeat(2049);
  assert.throws(() => validateReport(tooLarge));
  delete report.trace[failureIndex].provider_error;
  assert.doesNotThrow(() => validateReport(report));
});
