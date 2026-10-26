import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
  loadProjectEnv,
  modelConfigFromEnv,
  validateModelConfig,
} from '../src/config.ts';
import { OpenAICompatiblePlanner } from '../src/investigation/model.ts';
import { MockProvider } from '../src/investigation/mock.ts';
import { runInvestigation } from '../src/investigation/run.ts';
import { queryZetaris } from '../src/tools/zetaris.ts';
import { validateAction, type InvestigationRequest } from '../src/contracts.ts';

const request: InvestigationRequest = {
  account_id: 'demo',
  region: 'us-east-1',
  max_candidates: 1,
  window: { from: '2026-09-01T00:00:00Z', to: '2026-09-29T00:00:00Z' },
};

test('native env loader reads a file, preserves shell values and tolerates missing files', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'investigator-env-'));
  const keys = ['INVESTIGATOR_ENV_TEST', 'INVESTIGATOR_SHELL_TEST'];
  const previous = keys.map((key) => process.env[key]);
  t.after(() => {
    keys.forEach((key, i) => {
      if (previous[i] === undefined) delete process.env[key];
      else process.env[key] = previous[i];
    });
    rmSync(dir, { recursive: true, force: true });
  });
  delete process.env.INVESTIGATOR_ENV_TEST;
  process.env.INVESTIGATOR_SHELL_TEST = 'shell';
  const file = join(dir, '.env');
  writeFileSync(
    file,
    'INVESTIGATOR_ENV_TEST="from file"\nINVESTIGATOR_SHELL_TEST=file\n',
  );
  assert.equal(loadProjectEnv(file), true);
  assert.equal(process.env.INVESTIGATOR_ENV_TEST, 'from file');
  assert.equal(process.env.INVESTIGATOR_SHELL_TEST, 'shell');
  assert.equal(loadProjectEnv(join(dir, 'missing')), false);
  assert.throws(() => loadProjectEnv(dir), { message: 'env_file_unreadable' });
});

test('web AWS overrides use file values while other shell settings and absent keys survive', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'investigator-web-env-'));
  const keys = ['AWS_PROFILE', 'AWS_REGION', 'AWS_ENABLE_COST_EXPLORER'];
  const previous = keys.map((key) => process.env[key]);
  t.after(() => {
    keys.forEach((key, i) => {
      if (previous[i] === undefined) delete process.env[key];
      else process.env[key] = previous[i];
    });
    rmSync(dir, { recursive: true, force: true });
  });
  Object.assign(process.env, {
    AWS_PROFILE: 'shell-profile',
    AWS_REGION: 'us-east-1',
    AWS_ENABLE_COST_EXPLORER: 'false',
  });
  const file = join(dir, '.env');
  writeFileSync(
    file,
    'AWS_PROFILE=cci\nAWS_REGION=eu-west-3\nAWS_ENABLE_COST_EXPLORER=true\n',
  );
  const overrides = ['AWS_PROFILE', 'AWS_REGION'];
  assert.equal(loadProjectEnv(file, overrides), true);
  assert.equal(process.env.AWS_PROFILE, 'cci');
  assert.equal(process.env.AWS_REGION, 'eu-west-3');
  assert.equal(process.env.AWS_ENABLE_COST_EXPLORER, 'false');
  // Worker/adapters reload with default precedence and retain startup selection.
  loadProjectEnv(file);
  assert.equal(process.env.AWS_PROFILE, 'cci');
  assert.equal(process.env.AWS_REGION, 'eu-west-3');
  writeFileSync(file, 'AWS_ENABLE_COST_EXPLORER=true\n');
  loadProjectEnv(file, overrides);
  assert.equal(process.env.AWS_PROFILE, 'cci');
  assert.equal(process.env.AWS_REGION, 'eu-west-3');
  assert.equal(loadProjectEnv(join(dir, 'missing'), overrides), false);
  assert.throws(() => loadProjectEnv(dir, overrides), {
    message: 'env_file_unreadable',
  });
});

test('generic settings never inherit NVIDIA credentials or provider options', () => {
  const config = modelConfigFromEnv({
    LLM_BASE_URL: 'http://127.0.0.1:11434/v1/',
    LLM_MODEL: 'custom/model',
    NVIDIA_API_KEY: 'other-secret',
  });
  assert.equal(config.baseUrl, 'http://127.0.0.1:11434/v1');
  assert.equal(config.apiKey, undefined);
  assert.equal(config.responseFormat, 'text');
  assert.deepEqual(config.extraBody, {});
  assert.throws(
    () =>
      modelConfigFromEnv({
        LLM_MODEL: 'custom',
        NVIDIA_API_KEY: 'other-secret',
      }),
    { message: 'model_configuration_invalid' },
  );
});

test('configuration rejects unsafe URLs, malformed JSON and request overrides', () => {
  for (const baseUrl of [
    'http://remote.example/v1',
    'https://user:secret@example.com',
    'https://example.com?key=secret',
    'https://example.com/#secret',
  ]) {
    assert.throws(() => validateModelConfig({ baseUrl, model: 'custom' }), {
      message: 'model_configuration_invalid',
    });
  }
  for (const body of [
    '[]',
    'null',
    '{',
    '{"messages":[]}',
    '{"max_tokens":4097}',
    '{"max_tokens":1,"max_completion_tokens":1}',
  ]) {
    assert.throws(
      () =>
        modelConfigFromEnv({
          LLM_BASE_URL: 'https://provider.example/v1',
          LLM_MODEL: 'custom',
          LLM_EXTRA_BODY: body,
        }),
      { message: 'model_configuration_invalid' },
    );
  }
});

test('arbitrary compatible provider completes B through the same validated loop', async (t) => {
  const oldTls = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '1';
  t.after(() => {
    if (oldTls === undefined) delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    else process.env.NODE_TLS_REJECT_UNAUTHORIZED = oldTls;
  });
  const actions = [
    'get_ec2_billing',
    'get_ec2_metrics',
    'propose',
    'get_ec2_operations',
    'get_ec2_dependencies',
    'finish',
  ];
  const fetchMock = t.mock.method(
    globalThis,
    'fetch',
    async (url: string | URL | Request, options?: RequestInit) => {
      assert.equal(url, 'https://provider.example/v1/chat/completions');
      assert.equal(
        new Headers(options?.headers).get('Authorization'),
        'Bearer provider-key',
      );
      assert.equal(options?.redirect, 'error');
      const body = JSON.parse(String(options?.body));
      assert.equal(body.model, 'custom/model');
      assert.equal(body.max_completion_tokens, 512);
      assert.equal(body.max_tokens, undefined);
      assert.equal(body.chat_template_kwargs, undefined);
      assert.equal(body.response_format, undefined);
      return Response.json({
        model: 'resolved-model-alias',
        choices: [
          {
            finish_reason: 'stop',
            message: {
              content: JSON.stringify({
                action: actions.shift(),
                reason: 'Check current evidence.',
              }),
            },
          },
        ],
      });
    },
  );
  const report = await runInvestigation(request, {
    provider: new MockProvider(),
    planner: new OpenAICompatiblePlanner({
      baseUrl: 'https://provider.example/v1',
      model: 'custom/model',
      apiKey: 'provider-key',
      extraBody: { max_completion_tokens: 512 },
    }),
  });
  assert.equal(report.completion_status, 'complete');
  assert.equal(report.candidates[0].verdict, 'not_recommended');
  assert.equal(report.planner.model, 'custom/model');
  assert.ok(fetchMock.mock.callCount() >= 4);
});

for (const { name, baseUrl, extraBody, expected } of [
  {
    name: 'OpenAI defaults to completion tokens',
    baseUrl: 'https://api.openai.com/v1/',
    extraBody: {},
    expected: { max_completion_tokens: 1024 },
  },
  {
    name: 'OpenAI honors an explicit completion limit',
    baseUrl: 'https://api.openai.com/v1',
    extraBody: { max_completion_tokens: 4096 },
    expected: { max_completion_tokens: 4096 },
  },
  {
    name: 'OpenAI honors an explicit legacy limit for compatible models',
    baseUrl: 'https://api.openai.com/v1',
    extraBody: { max_tokens: 512 },
    expected: { max_tokens: 512 },
  },
  {
    name: 'other providers retain the legacy default',
    baseUrl: 'https://provider.example/v1',
    extraBody: {},
    expected: { max_tokens: 1024 },
  },
]) {
  test(name, async (t) => {
    const oldTls = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '1';
    t.after(() => {
      if (oldTls === undefined) delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
      else process.env.NODE_TLS_REJECT_UNAUTHORIZED = oldTls;
    });
    const fetchMock = t.mock.method(
      globalThis,
      'fetch',
      async (_url: string | URL | Request, options?: RequestInit) => {
        const body = JSON.parse(String(options?.body));
        assert.equal(body.max_tokens, expected.max_tokens);
        assert.equal(
          body.max_completion_tokens,
          expected.max_completion_tokens,
        );
        assert.equal(body.model, 'gpt-6.1-sol');
        // Model a provider that rejects the deprecated field, as in the
        // reported 400. Explicit legacy overrides remain caller-controlled.
        if (
          name === 'OpenAI defaults to completion tokens' &&
          body.max_tokens
        ) {
          return new Response(null, { status: 400 });
        }
        return Response.json({
          choices: [
            {
              finish_reason: 'stop',
              message: {
                content: JSON.stringify({
                  action: 'list_ec2_instances',
                  reason: 'Discover candidates.',
                }),
              },
            },
          ],
        });
      },
    );
    const planner = new OpenAICompatiblePlanner({
      baseUrl,
      model: 'gpt-6.1-sol',
      extraBody,
    });
    const action = await planner.next(
      {
        request,
        candidate_id: null,
        proposed_window: null,
        observations: [],
        trace: [],
      },
      new AbortController().signal,
    );
    assert.equal(validateAction(action).type, 'tool');
    assert.equal(fetchMock.mock.callCount(), 1);
  });
}

test('Zetaris requires explicit HTTP opt-in and sanitizes provider errors', async (t) => {
  const values = {
    ZETARIS_BASE_URL: 'https://zetaris.example',
    ZETARIS_API_KEY: 'fake-key',
    ZETARIS_ORG_ID: 'fake-org',
    ZETARIS_ALLOW_HTTP: 'false',
    ZETARIS_AUTH_MODE: 'token',
    NODE_TLS_REJECT_UNAUTHORIZED: '1',
  };
  const previous = Object.keys(values).map((key) => process.env[key]);
  t.after(() =>
    Object.keys(values).forEach((key, i) => {
      if (previous[i] === undefined) delete process.env[key];
      else process.env[key] = previous[i];
    }),
  );
  Object.assign(process.env, values);
  const fetchMock = t.mock.method(
    globalThis,
    'fetch',
    async (_url: string | URL | Request, options?: RequestInit) => {
      assert.equal(
        new Headers(options?.headers).get('Authorization'),
        'Bearer fake-key',
      );
      assert.equal(new Headers(options?.headers).get('X-Org-ID'), 'fake-org');
      assert.equal(options?.redirect, 'error');
      assert.deepEqual(JSON.parse(String(options?.body)), {
        sql: 'SELECT 1',
        limit: 100,
      });
      return new Response('secret diagnostic', { status: 403 });
    },
  );
  await assert.rejects(queryZetaris('SELECT 1'), {
    message: 'zetaris_http_403',
  });
  process.env.ZETARIS_BASE_URL = 'http://zetaris.example';
  await assert.rejects(queryZetaris('SELECT 1'), {
    message: 'zetaris_configuration_invalid',
  });
  assert.equal(fetchMock.mock.callCount(), 1);
  process.env.ZETARIS_ALLOW_HTTP = 'true';
  await assert.rejects(queryZetaris('SELECT 1'), {
    message: 'zetaris_http_403',
  });
  assert.equal(fetchMock.mock.callCount(), 2);
});
