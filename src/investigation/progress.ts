import type { InvestigationProgress } from './run.ts';

/** Only trusted stage names, counters and allowlisted codes belong in live UI status. */
export function progressText(event: InvestigationProgress): string {
  switch (event.event) {
    case 'history': {
      const source = event.source === 'zetaris' ? 'Zetaris' : 'Meterless H-MEM';
      if (event.status === 'disabled')
        return `${source} ${event.operation} · ${event.operation === 'store' ? (event.source === 'zetaris' ? 'append disabled; no historical record written' : 'storage disabled; no memory written') : 'disabled for this investigation'}`;
      if (event.status === 'unavailable')
        return `${source} ${event.operation} · unavailable · ${event.failure_code ?? 'history_source_failed'}; no historical claim made`;
      if (event.source === 'zetaris' && event.operation === 'read')
        return `Zetaris read · ${event.status} · ${event.count ?? 0} matching prior recommendation records for this instance and source mode${event.verdicts?.length ? ` (${event.verdicts.join(', ')})` : ''}; audit comparison only: prior verdicts are not current evidence or validated lessons, so none passed to Planner`;
      if (event.source === 'hmem' && event.operation === 'read')
        return `Meterless H-MEM read · ${event.status} · ${event.count ?? 0} eligible reasoning summaries selected${event.lesson ? `; learned check ${event.lesson} requires a matching proposed window` : '; no learned check'}; fresh evidence still required`;
      if (event.source === 'zetaris')
        return `Zetaris store · ok · historical recommendation ${event.verdict ?? ''} verified by exact readback; not current evidence`;
      return `Meterless H-MEM store · ok · historical reasoning summary saved (verdict ${event.verdict ?? 'unknown'}; ${event.lesson ? `learned check ${event.lesson}` : 'no reusable lesson'}); includes hypothesis, unresolved risks and evidence provenance, not current telemetry`;
    }
    case 'planner_context':
      return `Planner context: ${event.history_hint_count} applicable Meterless H-MEM historical hints${event.checks.length ? ` for ${event.checks.join(', ')}` : ''}; Zetaris audit records excluded; fresh evidence required`;
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
