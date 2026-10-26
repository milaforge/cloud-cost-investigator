import {
  type InvestigationReport,
  type Observation,
  TOOL_NAMES,
  traceConfidence,
} from '../contracts.ts';
import { validateReport } from './report.ts';

/** Concise decision rationales, not hidden model thinking or raw provider payloads. */
function observationSummary(o: Observation): string {
  const d = o.data;
  if (!d)
    return `${o.tool}: ${o.status}; missing ${o.missing_fields.join(', ') || 'validated evidence'}.`;
  if ('instances' in d)
    return `Discovered ${d.instances.length} instances: ${d.instances.map((i) => `${i.instance_id} (${i.state})`).join(', ')}.`;
  if ('costs' in d)
    return `Observed compute spend: ${d.costs.map((c) => `${c.instance_id} ${c.compute_cost} ${d.currency}`).join(', ')}; commitment coverage ${d.commitment_coverage_known ? 'known' : 'unknown'}.`;
  if ('average_cpu_percent' in d)
    return `CPU average ${d.average_cpu_percent}%, peak ${d.peak_cpu_percent}%; suggested ${d.suggested_window.start_hour_utc}:00–${d.suggested_window.end_hour_utc}:00 UTC.`;
  if ('jobs' in d)
    return `${d.jobs.length ? d.jobs.map((j) => `${j.job_id}: ${j.critical ? 'critical' : 'noncritical'} ${j.window.start_hour_utc}:00–${j.window.end_hour_utc}:00 UTC`).join('; ') : 'No overlapping jobs returned'}; scheduling clearance ${d.scheduling_clearance ? 'provided' : 'not provided'}.`;
  return `Continuous operation required: ${d.requires_continuous_operation}; scheduling clearance ${d.scheduling_clearance ? 'provided' : 'not provided'}.`;
}

/** A readable view of validated report state. Never changes verdicts or receipts. */
export function traceEvents(value: InvestigationReport) {
  const report = validateReport(value);
  const retrieved = new Map<string, Observation>();
  let instance: string | undefined;
  return report.trace.map((entry) => {
    const cited = entry.evidence_ids
      .map((id) => report.evidence.find((o) => o.evidence_id === id))
      .filter((o): o is Observation => !!o);
    // Selection cites both discovery tools. Reset candidate-specific coverage so
    // a previous instance's complete checks never transfer to the next one.
    if (
      entry.phase === 'evaluator' &&
      cited.some((o) => o.tool === 'list_ec2_instances') &&
      cited.some((o) => o.tool === 'get_ec2_billing')
    )
      instance = undefined;
    if (entry.action?.type === 'tool' && entry.action.args.instance_id)
      instance = entry.action.args.instance_id;
    for (const o of cited) {
      if (entry.phase === 'tool') retrieved.set(o.evidence_id, o);
      if (o.scope.instance_id) instance = o.scope.instance_id;
    }
    const complete = new Set(
      [...retrieved.values()]
        .filter(
          (o) =>
            (o.scope.instance_id === undefined ||
              o.scope.instance_id === instance) &&
            traceConfidence(undefined, [o]) === 'supported',
        )
        .map((o) => o.tool),
    );
    const action = entry.action;
    const scope = `${report.request.account_id}/${report.request.region}${instance ? `/${instance}` : ''}`;
    const input =
      action?.type === 'tool'
        ? `${action.tool}; ${scope}; observed ${action.args.window.from} to ${action.args.window.to}${action.args.proposed_window ? `; proposed ${action.args.proposed_window.start_hour_utc}:00–${action.args.proposed_window.end_hour_utc}:00 UTC` : ''}.`
        : `${scope}; ${complete.size}/${TOOL_NAMES.length} required evidence checks complete; ${entry.evidence_ids.length} current citations.`;
    const output =
      entry.phase === 'planner'
        ? entry.failure_code
          ? `No valid next action; ${entry.failure_code}.`
          : action?.type === 'tool'
            ? `Selected ${action.tool} for execution.`
            : action?.type === 'propose'
              ? `Proposed ${action.window.start_hour_utc}:00–${action.window.end_hour_utc}:00 UTC for operational challenge.`
              : 'Selected finish.'
        : entry.phase === 'tool' && cited.length
          ? cited
              .map(
                (o) =>
                  `${observationSummary(o)}${o.data && o.missing_fields.length ? ` Missing: ${o.missing_fields.join(', ')}.` : ''}`,
              )
              .join(' ')
          : entry.reason;
    return {
      timestamp: entry.timestamp ?? null,
      trace_id: entry.trace_id,
      step: entry.step,
      agent_name: {
        planner: 'Planner',
        tool: 'Executor',
        evaluator: 'Evaluator',
        finish: 'Reporter',
      }[entry.phase],
      action:
        action?.type === 'tool'
          ? action.tool
          : (action?.type ??
            (entry.phase === 'planner'
              ? 'choose_next_action'
              : entry.phase === 'evaluator'
                ? 'evaluate_evidence'
                : 'finish')),
      input_summary: input,
      reasoning:
        entry.phase === 'tool'
          ? (action?.reason ?? entry.reason)
          : entry.reason,
      output_summary: output,
      // Completeness of this candidate's five required evidence checks, not a
      // calibrated probability of safety. Unknown on historical untimed traces.
      confidence:
        entry.timestamp == null ? null : complete.size / TOOL_NAMES.length,
      evidence_support: entry.confidence,
      retry_count: entry.retry_count,
      status:
        entry.status ??
        (entry.failure_code
          ? 'error'
          : entry.phase === 'finish'
            ? report.completion_status
            : 'success'),
      evidence_ids: entry.evidence_ids,
      ...(entry.failure_code ? { failure_code: entry.failure_code } : {}),
    };
  });
}

export function renderTraceJsonl(report: InvestigationReport): string {
  return `${traceEvents(report)
    .map((event) => JSON.stringify(event))
    .join('\n')}\n`;
}
