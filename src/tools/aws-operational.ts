import {
  utc,
  validateScheduledMaintenance,
  validateLoadBalancerTarget,
  validateTargetGroupArn,
} from '../contracts.ts';
import { estimatePeriod } from '../investigation/policy.ts';
import {
  DataError,
  issue,
  makeEvidence,
  type Scope,
  type ToolResult,
  type Window,
} from './aws-evidence.ts';
import type { AwsTransport } from './aws.ts';

/** Bounded native facts only. These sources never attest workload-wide coverage. */
export async function collectOperationalEvidence(options: {
  instanceId: string;
  kind: 'operations' | 'dependencies';
  window: Window;
  result: ToolResult<'schedule' | 'deployment' | 'dependency'>;
  scope: Scope;
  signal: AbortSignal;
  transport: AwsTransport;
  maxPages: number;
  clock: () => Date;
  synthetic: boolean;
}): Promise<void> {
  const {
    instanceId,
    kind,
    window,
    result,
    scope,
    signal,
    transport,
    maxPages,
    clock,
    synthetic,
  } = options;
  const addIssue = (code: string) => {
    if (!result.issues.some((i) => i.code === code))
      result.issues.push(issue(code));
  };
  const unconfigured = () => {
    result.status = 'unavailable';
    addIssue('SOURCE_NOT_CONFIGURED');
  };
  const { maintenanceSchedule, maintenanceWindow, targetGroups, targetHealth } =
    transport;
  result.status = 'partial';
  addIssue(
    kind === 'operations'
      ? 'JOBS_OUTSIDE_SSM_UNKNOWN'
      : 'DEPENDENCIES_OUTSIDE_ELBV2_UNKNOWN',
  );
  addIssue('OWNER_CALENDAR_RECOVERY_CLEARANCE_REQUIRED');
  let requests = 0;
  const take = () => {
    signal.throwIfAborted();
    if (requests++ < 20) return true;
    addIssue('TRUNCATED');
    return false;
  };
  const nextToken = (value: unknown, seen: Set<string>) => {
    if (value === undefined || value === '') return undefined;
    if (typeof value !== 'string' || value.length > 4096) throw new DataError();
    if (seen.has(value)) {
      addIssue('TRUNCATED');
      return undefined;
    }
    seen.add(value);
    return value;
  };
  const seen = new Set<string>();
  const records = new Set<string>();
  let token: string | undefined;
  if (kind === 'operations') {
    if (!maintenanceSchedule || !maintenanceWindow) return unconfigured();
    // AWS expands cron/rate/timezones. Do not implement a partial cron parser or
    // convert one dated execution into an invented daily critical job.
    const period = estimatePeriod({
      account_id: scope.accountId,
      region: scope.region,
      window,
      max_candidates: 1,
    });
    const after = new Date(Date.parse(period.from) - 86400000).toISOString();
    const definitions = new Map<string, number | null>();
    for (let page = 0; page < maxPages; page++) {
      if (!take()) return;
      const response = await maintenanceSchedule(
        {
          ResourceType: 'INSTANCE',
          Targets: [{ Key: 'InstanceIds', Values: [instanceId] }],
          Filters: [
            { Key: 'ScheduledAfter', Values: [after] },
            { Key: 'ScheduledBefore', Values: [period.to] },
          ],
          MaxResults: 100,
          NextToken: token,
        },
        signal,
      );
      signal.throwIfAborted();
      if (
        !Array.isArray(response.ScheduledWindowExecutions) ||
        response.ScheduledWindowExecutions.length > 100
      )
        throw new DataError();
      for (const row of response.ScheduledWindowExecutions) {
        if (
          !row ||
          typeof row.WindowId !== 'string' ||
          !/^mw-[a-f0-9]{17}$/.test(row.WindowId) ||
          typeof row.ExecutionTime !== 'string'
        )
          throw new DataError();
        const start = utc(
          row.ExecutionTime.replace(/T(\d{2}:\d{2})Z$/, 'T$1:00Z'),
        );
        if (
          Date.parse(start) < Date.parse(after) ||
          Date.parse(start) >= Date.parse(period.to)
        )
          throw new DataError();
        if (!definitions.has(row.WindowId)) {
          if (!take()) return;
          const definition = await maintenanceWindow(
            { WindowId: row.WindowId },
            signal,
          );
          signal.throwIfAborted();
          if (
            definition.WindowId !== row.WindowId ||
            typeof definition.Enabled !== 'boolean' ||
            typeof definition.Duration !== 'number' ||
            !Number.isInteger(definition.Duration) ||
            definition.Duration < 1 ||
            definition.Duration > 24
          )
            throw new DataError();
          definitions.set(
            row.WindowId,
            definition.Enabled ? definition.Duration : null,
          );
        }
        const duration = definitions.get(row.WindowId);
        if (duration === null || duration === undefined) continue;
        const maintenance_window = validateScheduledMaintenance({
          window_id: row.WindowId,
          execution_window: {
            from: new Date(start).toISOString(),
            to: new Date(Date.parse(start) + duration * 3600000).toISOString(),
          },
        });
        const key = `${row.WindowId}:${start}`;
        if (records.has(key)) continue;
        if (result.evidence.length >= 100) {
          addIssue('TRUNCATED');
          return;
        }
        records.add(key);
        result.evidence.push(
          makeEvidence(
            'schedule',
            instanceId,
            {
              description:
                'An SSM maintenance window is scheduled for this instance; task criticality is not inferred.',
              maintenance_window,
            },
            scope,
            clock().toISOString(),
            synthetic,
            'SSM.DescribeMaintenanceWindowSchedule+GetMaintenanceWindow',
            window,
          ),
        );
      }
      token = nextToken(response.NextToken, seen);
      if (!token) return;
    }
  } else {
    if (!targetGroups || !targetHealth) return unconfigured();
    for (let page = 0; page < maxPages; page++) {
      if (!take()) return;
      const response = await targetGroups(
        { PageSize: 20, Marker: token },
        signal,
      );
      signal.throwIfAborted();
      if (
        !Array.isArray(response.TargetGroups) ||
        response.TargetGroups.length > 20
      )
        throw new DataError();
      for (const group of response.TargetGroups) {
        if (
          !group ||
          !['instance', 'ip', 'lambda', 'alb'].includes(group.TargetType ?? '')
        )
          throw new DataError();
        // Validate account/region before using a returned ARN in another request.
        const target_group_arn = validateTargetGroupArn(group.TargetGroupArn, {
          account_id: scope.accountId,
          region: scope.region,
        });
        if (group.TargetType !== 'instance') {
          addIssue('NON_INSTANCE_TARGETS_NOT_RESOLVED');
          continue;
        }
        if (records.has(target_group_arn)) continue;
        records.add(target_group_arn);
        if (!take()) return;
        const health = await targetHealth(
          { TargetGroupArn: target_group_arn },
          signal,
        );
        signal.throwIfAborted();
        if (!Array.isArray(health.TargetHealthDescriptions))
          throw new DataError();
        if (health.TargetHealthDescriptions.length > 1000)
          addIssue('TRUNCATED');
        for (const target of health.TargetHealthDescriptions.slice(0, 1000)) {
          if (!target || typeof target.Target?.Id !== 'string')
            throw new DataError();
          if (target.Target.Id !== instanceId) continue;
          const data = validateLoadBalancerTarget(
            {
              target_group_arn,
              port: target.Target.Port,
              state: target.TargetHealth?.State,
            },
            { account_id: scope.accountId, region: scope.region },
          );
          if (result.evidence.length >= 100) {
            addIssue('TRUNCATED');
            return;
          }
          result.evidence.push(
            makeEvidence(
              'dependency',
              instanceId,
              data,
              scope,
              clock().toISOString(),
              synthetic,
              'ELBv2.DescribeTargetGroups+DescribeTargetHealth',
              window,
            ),
          );
        }
      }
      token = nextToken(response.NextMarker, seen);
      if (!token) return;
    }
  }
  if (token) addIssue('TRUNCATED');
}
