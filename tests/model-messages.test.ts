import assert from 'node:assert/strict';
import test, { type TestContext } from 'node:test';
import {
  OpenAICompatiblePlanner,
  redactModelMessage,
  type ModelMessage,
} from '../src/investigation/model.ts';

function enableTls(t: TestContext) {
  const previous = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '1';
  t.after(() => {
    if (previous === undefined) delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    else process.env.NODE_TLS_REJECT_UNAUTHORIZED = previous;
  });
}

const state = {
  request: {
    account_id: 'demo',
    region: 'us-east-1',
    max_candidates: 1,
    window: { from: '2026-09-01T00:00:00Z', to: '2026-09-29T00:00:00Z' },
  },
  candidate_id: null,
  proposed_window: null,
  observations: [],
  trace: [],
};
const config = {
  baseUrl: 'https://private.example/v1',
  model: 'test-model',
  apiKey: 'configured-secret',
};

for (const invalid of [false, true]) {
  test(`model messages show actual prompt and ${invalid ? 'invalid' : 'valid'} output without request credentials`, async (t) => {
    enableTls(t);
    const messages: ModelMessage[] = [];
    const output = invalid
      ? '<img src=x onerror=alert(1)> configured-secret https://private.example/trace'
      : '{"action":"list_ec2_instances","reason":"Discover inventory first."}';
    let sent: { messages: { role: string; content: string }[] } | undefined;
    t.mock.method(
      globalThis,
      'fetch',
      async (_url: string | URL | Request, init?: RequestInit) => {
        sent = JSON.parse(String(init?.body));
        assert.equal(
          messages.length,
          1,
          'prompt arrives before the network wait',
        );
        return Response.json({
          choices: [{ finish_reason: 'stop', message: { content: output } }],
        });
      },
    );
    const planner = new OpenAICompatiblePlanner(config, (message) =>
      messages.push(message),
    );
    const result = planner.next(state, new AbortController().signal);
    if (invalid)
      await assert.rejects(result, { message: 'model_invalid_action_json' });
    else assert.equal(((await result) as { type: string }).type, 'tool');
    assert.deepEqual(
      messages.map((message) => message.kind),
      ['prompt', 'output'],
    );
    assert.equal(
      messages[0].text,
      sent?.messages
        .map((message) => `${message.role.toUpperCase()}\n${message.content}`)
        .join('\n\n'),
    );
    assert.match(
      messages[0].text,
      /"available_actions":\["list_ec2_instances","finish"\]/,
    );
    assert.doesNotMatch(
      JSON.stringify(messages),
      /configured-secret|private\.example|Authorization/,
    );
    assert.equal(
      messages[1].text,
      invalid
        ? '<img src=x onerror=alert(1)> [redacted] [url redacted]'
        : output,
    );
  });
}

test('model display redacts credentials in evidence, bounds text and isolates observer failures', async (t) => {
  const unsafe =
    '{"password":"two words", "api_key":"abc", "session_token":"def"} Bearer abc nvapi-abc AKIA1234567890123456 https://host.example/a 10.0.0.1 db.internal';
  const safe = redactModelMessage(unsafe, []);
  assert.doesNotMatch(
    safe,
    /two words|abc|def|1234567890123456|host\.example|10\.0\.0\.1|db\.internal/,
  );
  assert.match(
    redactModelMessage('x'.repeat(240001), []),
    /\[truncated for display\]$/,
  );
  enableTls(t);
  t.mock.method(globalThis, 'fetch', async () =>
    Response.json({
      choices: [
        {
          finish_reason: 'stop',
          message: {
            content: '{"action":"finish","reason":"No useful check."}',
          },
        },
      ],
    }),
  );
  const planner = new OpenAICompatiblePlanner(config, () => {
    throw new Error('observer failed');
  });
  assert.deepEqual(await planner.next(state, new AbortController().signal), {
    type: 'finish',
    reason: 'No useful check.',
  });
});

test('transport failure retains attempted prompt without fabricating model output', async (t) => {
  enableTls(t);
  const messages: ModelMessage[] = [];
  t.mock.method(globalThis, 'fetch', async () => {
    throw new Error('private transport detail');
  });
  await assert.rejects(
    new OpenAICompatiblePlanner(config, (message) =>
      messages.push(message),
    ).next(state, new AbortController().signal),
    { message: 'model_transport_unavailable' },
  );
  assert.deepEqual(
    messages.map((message) => message.kind),
    ['prompt'],
  );
});
