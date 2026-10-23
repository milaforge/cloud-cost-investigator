import type { Action, MetricsData, ToolArgs, ToolName } from '../contracts.ts';
import { historicalPriority } from './history.ts';
import type { PlannerState } from './run.ts';

export type { PlannerState } from './run.ts';
export interface Planner {
  readonly mode: 'scripted' | 'live';
  readonly model: string | null;
  next(state: PlannerState, signal: AbortSignal): Promise<unknown>;
}

/** Reproducible offline policy for exercising the loop; deliberately not labeled as a model. */
export class ScriptedPlanner implements Planner {
  readonly mode = 'scripted' as const;
  readonly model = null;
  async next(state: PlannerState, signal: AbortSignal): Promise<Action> {
    signal.throwIfAborted();
    const attempted = (tool: ToolName) =>
      state.trace.some(
        (t) =>
          t.phase === 'tool' &&
          t.action?.type === 'tool' &&
          t.action.tool === tool,
      );
    const tool = (name: ToolName, reason: string): Action => {
      const args: ToolArgs = {
        account_id: state.request.account_id,
        region: state.request.region,
        window: state.request.window,
      };
      if (!['list_ec2_instances', 'get_ec2_billing'].includes(name)) {
        if (!state.candidate_id) throw new Error('Candidate required');
        args.instance_id = state.candidate_id;
      }
      if (name === 'get_ec2_operations') {
        if (!state.proposed_window) throw new Error('Proposed window required');
        args.proposed_window = state.proposed_window;
      }
      return { type: 'tool', tool: name, reason, args };
    };
    if (!attempted('list_ec2_instances'))
      return tool(
        'list_ec2_instances',
        'Discover scoped EC2 inventory; no instance ID or prior run required.',
      );
    if (!attempted('get_ec2_billing'))
      return tool(
        'get_ec2_billing',
        'Rank discovered instances using current compute cost.',
      );
    if (!state.candidate_id)
      return {
        type: 'finish',
        reason:
          'Inventory or billing did not establish an eligible scoped candidate.',
      };
    if (!attempted('get_ec2_metrics'))
      return tool(
        'get_ec2_metrics',
        'Inspect selected-instance average, peaks, coverage and possible inactive hours.',
      );
    const metrics = state.observations.find(
      (o) => o.tool === 'get_ec2_metrics',
    );
    if (!state.proposed_window) {
      if (
        metrics?.status !== 'ok' ||
        !metrics.data ||
        !metrics.coverage.complete ||
        metrics.missing_fields.length
      )
        return {
          type: 'finish',
          reason:
            'No complete utilization observation supports a plausible window.',
        };
      const data = metrics.data as MetricsData;
      if (data.average_cpu_percent > 10 || data.peak_cpu_percent > 20)
        return {
          type: 'finish',
          reason:
            'Observed utilization or peaks do not support an idle-window hypothesis.',
        };
      return {
        type: 'propose',
        window: data.suggested_window,
        evidence_ids: [metrics.evidence_id],
        reason:
          'Observed low average and peak CPU suggest this window; challenge it before any decision.',
      };
    }
    const priority = historicalPriority(state.historical_hints);
    if (priority && !attempted(priority))
      return tool(
        priority,
        'Historical unresolved checks prioritize this fresh query; prior verdicts are not current evidence.',
      );
    if (!attempted('get_ec2_operations'))
      return tool(
        'get_ec2_operations',
        'Try to falsify the proposed window with overlapping critical jobs.',
      );
    if (!attempted('get_ec2_dependencies'))
      return tool(
        'get_ec2_dependencies',
        'Check dependency uptime constraints; absent job records alone do not establish safety.',
      );
    return {
      type: 'finish',
      reason:
        'Targeted checks exhausted; this rejection-first slice defers unresolved positive clearance.',
    };
  }
}
