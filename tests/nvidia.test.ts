import assert from 'node:assert/strict';
import test, { type TestContext } from 'node:test';
import {
  DEFAULT_NVIDIA_MODEL,
  NvidiaPlanner,
} from '../src/investigation/nvidia.ts';
import type { PlannerState } from '../src/investigation/planner.ts';

const state: PlannerState = {
  request: {
    account_id: 'demo',
    region: 'us-east-1',
    max_candidates: 1,
    window: { from: '2026-09-25T00:00:00Z', to: '2026-10-23T00:00:00Z' },
  },
  candidate_id: null,
  proposed_window: null,
  observations: [],
  trace: [],
};

function configure(t: TestContext): NvidiaPlanner {
  const keys = ['NVIDIA_API_KEY', 'NODE_TLS_REJECT_UNAUTHORIZED'] as const;
  const previous = keys.map((key) => process.env[key]);
  t.after(() => {
    keys.forEach((key, index) => {
      if (previous[index] === undefined) delete process.env[key];
      else process.env[key] = previous[index];
    });
  });
  process.env.NVIDIA_API_KEY = 'test-key';
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '1';
  return new NvidiaPlanner(DEFAULT_NVIDIA_MODEL);
}

const envelope = (content: string, finish_reason = 'stop') => ({
  model: DEFAULT_NVIDIA_MODEL,
  choices: [{ message: { content }, finish_reason }],
});
const signal = () => new AbortController().signal;

test('NVIDIA planner sends a bounded request only to its fixed endpoint', async (t) => {
  const planner = configure(t);
  const action = { type: 'finish', reason: 'done' };
  const fetchMock = t.mock.method(
    globalThis,
    'fetch',
    async (url: string | URL | Request, options?: RequestInit) => {
      assert.equal(url, 'https://integrate.api.nvidia.com/v1/chat/completions');
      assert.equal(options?.redirect, 'error');
      assert.equal(options?.method, 'POST');
      assert.equal(
        new Headers(options?.headers).get('Authorization'),
        'Bearer test-key',
      );
      assert.ok(options?.signal instanceof AbortSignal);
      const body = JSON.parse(String(options?.body));
      assert.equal(body.model, DEFAULT_NVIDIA_MODEL);
      assert.equal(body.max_tokens, 1024);
      assert.equal(body.stream, false);
      assert.deepEqual(body.chat_template_kwargs, { enable_thinking: false });
      assert.equal(body.temperature, 1);
      assert.equal(body.top_p, 0.95);
      assert.equal(body.messages[0].role, 'system');
      assert.equal(body.response_format.type, 'json_schema');
      assert.equal(
        body.response_format.json_schema.name,
        'investigation_action',
      );
      const context = JSON.parse(
        body.messages[1].content.split('\n').slice(1).join('\n'),
      );
      assert.deepEqual(context.request, state.request);
      assert.deepEqual(context.attempted_actions, []);
      assert.ok(!('trace' in context));
      assert.ok(body.messages[0].content.includes('trusted code binds'));
      return Response.json(
        envelope(JSON.stringify({ action: 'finish', reason: 'done' })),
      );
    },
  );
  assert.deepEqual(await planner.next(state, signal()), action);
  assert.equal(fetchMock.mock.callCount(), 1);
});

test('NVIDIA planner refuses malformed JSON actions', async (t) => {
  const planner = configure(t);
  t.mock.method(globalThis, 'fetch', async () =>
    Response.json(envelope('not JSON')),
  );
  await assert.rejects(planner.next(state, signal()), {
    message: 'model_invalid_action_json',
  });
});

test('NVIDIA planner refuses token-truncated output', async (t) => {
  const planner = configure(t);
  t.mock.method(globalThis, 'fetch', async () =>
    Response.json(envelope('{}', 'length')),
  );
  await assert.rejects(planner.next(state, signal()), {
    message: 'model_incomplete_response',
  });
});

test('NVIDIA planner refuses a response without a completion choice', async (t) => {
  const planner = configure(t);
  t.mock.method(globalThis, 'fetch', async () =>
    Response.json({ model: 'other', choices: [] }),
  );
  await assert.rejects(planner.next(state, signal()), {
    message: 'model_invalid_response',
  });
});

test('NVIDIA HTTP failure is sanitized, canceled and never retried', async (t) => {
  const planner = configure(t);
  let canceled = false;
  const response = new Response(
    new ReadableStream({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode('private provider diagnostic'),
        );
      },
      cancel() {
        canceled = true;
      },
    }),
    { status: 401 },
  );
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => response);
  await assert.rejects(planner.next(state, signal()), {
    message: 'model_http_401',
  });
  assert.equal(canceled, true);
  assert.equal(fetchMock.mock.callCount(), 1);
});

test('NVIDIA planner cancels an oversized streaming response', async (t) => {
  const planner = configure(t);
  let canceled = false;
  const response = new Response(
    new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array(32_769));
      },
      cancel() {
        canceled = true;
      },
    }),
  );
  t.mock.method(globalThis, 'fetch', async () => response);
  await assert.rejects(planner.next(state, signal()), {
    message: 'model_invalid_response',
  });
  assert.equal(canceled, true);
});

test('NVIDIA transport errors disclose no provider diagnostics and are never retried', async (t) => {
  const planner = configure(t);
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => {
    throw new Error('private provider diagnostic');
  });
  await assert.rejects(planner.next(state, signal()), {
    message: 'model_transport_unavailable',
  });
  assert.equal(fetchMock.mock.callCount(), 1);
});

test('NVIDIA planner propagates caller cancellation to the request', async (t) => {
  const planner = configure(t);
  const controller = new AbortController();
  t.mock.method(
    globalThis,
    'fetch',
    async (_url: string | URL | Request, options?: RequestInit) => {
      controller.abort();
      assert.equal(options?.signal?.aborted, true);
      throw new Error('aborted');
    },
  );
  await assert.rejects(planner.next(state, controller.signal), {
    message: 'model_transport_unavailable',
  });
});

test('NVIDIA planner refuses disabled TLS verification before any network request', async (t) => {
  const planner = configure(t);
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => {
    throw new Error('must not fetch');
  });
  await assert.rejects(planner.next(state, signal()), {
    message: 'model_tls_verification_required',
  });
  assert.equal(fetchMock.mock.callCount(), 0);
});

test('NVIDIA preset accepts configured models and requires its own credentials', (t) => {
  configure(t);
  assert.equal(new NvidiaPlanner('arbitrary/model').model, 'arbitrary/model');
  delete process.env.NVIDIA_API_KEY;
  assert.throws(() => new NvidiaPlanner(DEFAULT_NVIDIA_MODEL), {
    message: 'model_api_key_required',
  });
});

test('NVIDIA planner bounds serialized input before any network request', async (t) => {
  const planner = configure(t);
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => {
    throw new Error('must not fetch');
  });
  const oversized: PlannerState = {
    ...state,
    observations: [
      { source: 'x'.repeat(100_001) },
    ] as unknown as PlannerState['observations'],
  };
  await assert.rejects(planner.next(oversized, signal()), {
    message: 'model_state_too_large',
  });
  assert.equal(fetchMock.mock.callCount(), 0);
});

test('NVIDIA choice binds scope and periods from trusted current state', async (t) => {
  const planner = configure(t);
  t.mock.method(globalThis, 'fetch', async () =>
    Response.json(
      envelope(
        JSON.stringify({
          action: 'get_ec2_billing',
          reason: 'Rank cost after inventory.',
        }),
      ),
    ),
  );
  assert.deepEqual(await planner.next(state, signal()), {
    type: 'tool',
    tool: 'get_ec2_billing',
    reason: 'Rank cost after inventory.',
    args: {
      account_id: state.request.account_id,
      region: state.request.region,
      window: state.request.window,
    },
  });
});

test('NVIDIA choice refuses injected arguments and unsupported actions', async (t) => {
  const planner = configure(t);
  const responses = [
    {
      action: 'get_ec2_billing',
      reason: 'cost',
      args: { account_id: 'other' },
    },
    { action: 'stop_instances', reason: 'write' },
    { action: 'get_ec2_operations', reason: 'challenge without a candidate' },
    { action: 'propose', reason: 'invent a window without metrics' },
  ];
  t.mock.method(globalThis, 'fetch', async () =>
    Response.json(envelope(JSON.stringify(responses.shift()))),
  );
  for (let i = 0; i < 4; i++)
    await assert.rejects(planner.next(state, signal()), {
      message: 'model_invalid_action_json',
    });
});
