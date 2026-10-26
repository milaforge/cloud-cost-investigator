import type { InvestigationProgress } from './run.ts';

/** Only trusted stage names, counters and allowlisted codes belong in live UI status. */
export function progressText(event: InvestigationProgress): string {
  switch (event.event) {
    case 'planner_start':
      return `Planner call ${event.call} started`;
    case 'planner_pause':
      return `Planner pacing: ${(event.delay_ms / 1000).toFixed(1)} seconds`;
    case 'planner_retry':
      return `Planner call ${event.call} unavailable (${event.failure_code}); retry ${event.attempt}/3 in ${(event.delay_ms / 1000).toFixed(1)} seconds`;
    case 'tool_retry':
      return `Tool ${event.tool} failed; retry ${event.retry_count}/3 in ${(event.delay_ms / 1000).toFixed(1)} seconds`;
    case 'activity':
      return `${event.message} · ${Math.floor(event.elapsed_ms / 1000)}s elapsed · ${Math.ceil(event.remaining_ms / 1000)}s remaining`;
    case 'trace':
      return `${event.step}. ${event.phase}${event.tool ? ` · ${event.tool}` : ''}${event.status ? ` · ${event.status}` : ''}${event.failure_code ? ` · ${event.failure_code}` : ''} · trace_id=${event.trace_id} · confidence=${event.confidence} · retry_count=${event.retry_count ?? 'unknown'}`;
  }
}
