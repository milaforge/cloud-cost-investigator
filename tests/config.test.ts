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
import type { InvestigationRequest } from '../src/contracts.ts';

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
    'list_ec2_instances',
    'get_ec2_billing',
    'get_ec2_metrics',
    'propose',
    'get_ec2_operations',
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
  assert.ok(fetchMock.mock.callCount() >= 5);
});
