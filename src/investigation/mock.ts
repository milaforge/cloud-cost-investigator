import {
  validateAction,
  type Mode,
  type Observation,
  type ToolAction,
} from '../contracts.ts';

export interface CurrentEvidenceProvider {
  readonly mode: Mode;
  call(action: ToolAction, signal: AbortSignal): Promise<unknown>;
}

let evidenceSequence = 0;

/** Synthetic direct-source observations; this provider never contacts AWS. */
export class MockProvider implements CurrentEvidenceProvider {
  readonly mode = 'mock' as const;

  constructor(
    private readonly scenario: 'B' | 'clear' | 'missing' = 'B',
    private readonly clock: () => number = Date.now,
  ) {}

  async call(action: ToolAction, signal: AbortSignal): Promise<unknown> {
    signal.throwIfAborted();
    const validated = validateAction(action);
    if (validated.type !== 'tool')
      throw new Error('Expected current-evidence tool action');
    const { tool, args } = validated;
    const observation: Observation = {
      tool,
      status: 'ok',
      source: `mock-ec2-${tool.replace(/^(list|get)_ec2_/, '')}`,
      integration_mode: this.mode,
      scope: {
        account_id: args.account_id,
        region: args.region,
        ...(args.instance_id === undefined
          ? {}
          : { instance_id: args.instance_id }),
      },
      observed_window: { ...args.window },
      collected_at: new Date(this.clock()).toISOString(),
      coverage: { complete: true, authoritative: true },
      missing_fields: [],
      units: 'instances',
      evidence_id: `mock-ec2-evidence-${++evidenceSequence}`,
      data: null,
    };

    switch (tool) {
      case 'list_ec2_instances':
        observation.data = {
          instances: [
            { instance_id: 'i-mock-primary', state: 'running' },
            { instance_id: 'i-mock-secondary', state: 'running' },
          ],
        };
        break;
      case 'get_ec2_billing':
        observation.units = 'currency';
        observation.data = {
          costs: [
            { instance_id: 'i-mock-primary', compute_cost: 480 },
            { instance_id: 'i-mock-secondary', compute_cost: 80 },
          ],
          currency: 'USD',
          // A ranking input only; no claim that these charges are avoidable.
          commitment_coverage_known: false,
        };
        break;
      case 'get_ec2_metrics':
        observation.units = 'percent';
        observation.data = {
          average_cpu_percent: 2,
          peak_cpu_percent: 8,
          suggested_window: { start_hour_utc: 0, end_hour_utc: 6 },
          aggregation_minutes: 5,
        };
        break;
      case 'get_ec2_operations':
        observation.units = 'UTC-hours';
        // Simplified daily UTC fixture semantics, not a real AWS scheduling API.
        if (this.scenario === 'missing') {
          observation.status = 'unavailable';
          observation.coverage = { complete: false, authoritative: false };
          observation.missing_fields = ['job_schedule'];
        } else if (this.scenario === 'clear') {
          observation.status = 'no_match';
          observation.data = { jobs: [] };
        } else {
          observation.data = {
            jobs: [
              {
                job_id: 'mock-critical-daily-batch',
                critical: true,
                window: { start_hour_utc: 2, end_hour_utc: 3 },
              },
            ],
          };
        }
        break;
      case 'get_ec2_dependencies':
        observation.units = 'boolean';
        observation.data = { requires_continuous_operation: false };
        break;
    }

    signal.throwIfAborted();
    return observation;
  }
}
