import test from 'node:test';
import { loadProjectEnv } from '../../src/config.ts';
import { validateAction } from '../../src/contracts.ts';
import { OpenAICompatiblePlanner } from '../../src/investigation/model.ts';

// Opt-in live test: npm test only matches tests/*.test.ts, not this directory.
// One real model call; the returned tool choice is validated but never executed.
test('configured LLM accepts a request and returns a valid planner action', {
  timeout: 25_000,
}, async (t) => {
  loadProjectEnv();
  // Do not inherit disabled TLS checks from a development shell.
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '1';
  const planner = new OpenAICompatiblePlanner();
  let action: unknown;
  try {
    action = await planner.next(
      {
        request: {
          account_id: 'integration-test',
          region: 'us-east-1',
          max_candidates: 1,
          window: { from: '2026-10-01T00:00:00Z', to: '2026-10-02T00:00:00Z' },
        },
        candidate_id: null,
        proposed_window: null,
        observations: [],
        trace: [],
      },
      t.signal,
    );
  } catch (error) {
    if (error instanceof Error && error.message === 'model_http_400') {
      t.diagnostic(
        'HTTP 400: check model-specific request parameters. OpenAI reasoning models use max_completion_tokens instead of max_tokens; remove incompatible LLM_EXTRA_BODY options left over from another provider. A valid API key does not guarantee request compatibility.',
      );
    }
    if (error instanceof Error && error.message === 'model_http_405') {
      t.diagnostic(
        'HTTP 405: verify LLM_BASE_URL is the provider base for POST /chat/completions. Codex backend and Responses API routes require a different adapter. The test does not change endpoints or retry with credentials.',
      );
    }
    throw error;
  }
  validateAction(action);
});
