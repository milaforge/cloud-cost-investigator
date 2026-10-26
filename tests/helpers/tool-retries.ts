import type { TestContext } from 'node:test';
import type { InvestigationProgress } from '../../src/investigation/run.ts';

/** Exercise production backoff with the test clock, including its aggregate deadline. */
export function toolRetryClock(t: TestContext) {
  t.mock.timers.enable({
    apis: ['Date', 'setTimeout', 'setInterval'],
    now: Date.now(),
  });
  return (event: InvestigationProgress) => {
    if (event.event === 'tool_retry')
      queueMicrotask(() => t.mock.timers.tick(event.delay_ms));
  };
}
