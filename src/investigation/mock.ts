import { randomUUID } from 'node:crypto';
import { estimatePeriod } from './policy.ts';
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

export type MockScenario = 'A' | 'B' | 'C' | 'mixed' | 'clear' | 'missing';

/** Synthetic direct-source observations; this provider never contacts AWS. */
export class MockProvider implements CurrentEvidenceProvider {
  readonly mode = 'mock' as const;

  constructor(
    private readonly scenario: MockScenario = 'B',
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
      // Persisted history can outlive this process; a local counter reuses old IDs.
      evidence_id: `mock-ec2-evidence-${randomUUID()}`,
      data: null,
    };

    const scenario =
      this.scenario === 'mixed'
        ? args.instance_id === 'i-mock-primary'
          ? 'A'
          : args.instance_id === 'i-mock-secondary'
            ? 'B'
            : 'C'
        : this.scenario;
    const period = estimatePeriod({
      account_id: args.account_id,
      region: args.region,
      window: args.window,
      max_candidates: 1,
    });
    const clearance = {
      window: { start_hour_utc: 0, end_hour_utc: 6 },
      valid_window: period,
      owner_confirmed: true,
      calendar_reviewed: true,
      recovery_verified: true,
      excluded_dates: [period.from.slice(0, 10)],
      overhead_minutes: 30,
    };
    switch (tool) {
      case 'list_ec2_instances':
        observation.data = {
          instances: [
            { instance_id: 'i-mock-primary', state: 'running' },
            { instance_id: 'i-mock-secondary', state: 'running' },
            ...(this.scenario === 'mixed'
              ? [
                  { instance_id: 'i-mock-third', state: 'running' as const },
                  { instance_id: 'i-mock-fourth', state: 'running' as const },
                ]
              : []),
          ],
        };
        break;
      case 'get_ec2_billing':
        observation.units = 'currency';
        observation.data = {
          costs: [
            {
              instance_id: 'i-mock-primary',
              compute_cost: 480,
              ...(this.scenario === 'A' || this.scenario === 'mixed'
                ? {
                    pricing: {
                      hourly_compute_rate: 0.5,
                      purchase_option: 'on_demand' as const,
                      retained_costs_excluded: true,
                      billing_granularity_minutes: 60,
                      valid_window: period,
                    },
                  }
                : {}),
            },
            { instance_id: 'i-mock-secondary', compute_cost: 80 },
            ...(this.scenario === 'mixed'
              ? [
                  { instance_id: 'i-mock-third', compute_cost: 40 },
                  { instance_id: 'i-mock-fourth', compute_cost: 10 },
                ]
              : []),
          ],
          currency: 'USD',
          // A ranking input only; no claim that these charges are avoidable.
          commitment_coverage_known:
            this.scenario === 'A' || this.scenario === 'mixed',
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
        if (scenario === 'missing') {
          observation.status = 'unavailable';
          observation.coverage = { complete: false, authoritative: false };
          observation.missing_fields = ['job_schedule'];
        } else if (
          scenario === 'clear' ||
          scenario === 'C' ||
          scenario === 'A'
        ) {
          observation.status = 'no_match';
          observation.data = {
            jobs: [],
            ...(scenario === 'A' ? { scheduling_clearance: clearance } : {}),
          };
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
        observation.data = {
          requires_continuous_operation: scenario === 'C',
          ...(scenario === 'C'
            ? {
                continuous_operation_reason: {
                  dependency_id: 'shared-api-consumer',
                  requirement:
                    'The synthetic consumer requires this instance available continuously, including 00:00–06:00 UTC',
                },
              }
            : {}),
          ...(scenario === 'A' ? { scheduling_clearance: clearance } : {}),
        };
        break;
    }

    signal.throwIfAborted();
    return observation;
  }
}
