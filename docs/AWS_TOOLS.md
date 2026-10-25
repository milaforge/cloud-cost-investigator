# AWS evidence tools

[What](../README.md) · [How](HOW.md)

Framework-independent, read-only EC2 tools for the agent. Shared `src/contracts.ts`
defines the application boundary. `aws-agent.ts` returns its exact runtime-validated
`Observation` shape. `aws-evidence.ts` retains detailed collector records with
scope, periods and provenance beneath that boundary. No verdicts or persistence
are implemented in these tools; Milad owns Zetaris load/save and H-MEM integration.

## Run

After the [project setup](HOW.md#run-the-demo), run collector-specific checks or fixtures:

```sh
npm run typecheck:aws
npm run test:aws
npm run demo:aws -- A
npm run demo:aws -- B
npm run demo:aws -- C
npm run demo:aws -- missing
```

The demos are deterministic, entirely local, and never resolve AWS credentials.
They emit the actual tool-response JSON. A has low off-hours usage; B has low
average CPU but a weekly peak and required batch; C has increased utilization,
compute cost and a matching capacity change. `missing` has metric gaps and
unavailable billing/operations. These are evidence fixtures, not an implemented
agent evaluation or proof of autonomous replanning.

## Investigation CLI

```sh
npm run investigate -- --evidence aws --account YOUR_12_DIGIT_ACCOUNT_ID --region us-east-1
# Optional resource-level Cost Explorer queries (may incur API charges):
AWS_ENABLE_COST_EXPLORER=true npm run investigate -- --evidence aws --account YOUR_12_DIGIT_ACCOUNT_ID --region us-east-1 --json
```

Replace the account placeholder with the intended account; authenticated STS scope
must match. Use the default SDK credential chain described below. No synthetic
fallback occurs. Missing billing blocks cost-based candidate selection; missing
jobs/dependencies prevents a safety recommendation, and savings remain null.
Model selection (`--planner model`) is independent of evidence selection.

## Authentication and live smoke check

Follow [Authenticate to AWS](HOW.md#authenticate-to-aws) for profile/environment
setup, identity and region checks, permissions and common failures.
`AWS_EXPECTED_ACCOUNT_ID` optionally guards the smoke script’s STS account check.
The investigation CLI uses its required `--account` argument as the guard.

```sh
npm run demo:aws -- --live
# Also probe native operational facts for one retrieved running instance:
npm run demo:aws -- --live --operations
```

The live demo loads project `.env` without overriding shell variables. By default
it calls only STS identity and EC2 discovery. `--operations` additionally probes
SSM and ELBv2 for one retrieved running instance; if none is retrieved, it reports
that the operational probe did not run. Output contains status, counts and issue
codes, never instance/account IDs, ARNs or tags. No CloudWatch or Cost Explorer
query is performed by either demo command.

Required permissions for the corresponding features:
- `ec2:DescribeInstances`
- `cloudwatch:GetMetricData`
- `ce:GetCostAndUsageWithResources`
- `ssm:DescribeMaintenanceWindowSchedule`
- `ssm:GetMaintenanceWindow`
- `elasticloadbalancing:DescribeTargetGroups`
- `elasticloadbalancing:DescribeTargetHealth`

The tools also call `sts:GetCallerIdentity` to resolve/verify account scope. No
infrastructure mutations, billing-feature enablement, IAM changes or new resources
are performed. The SDK is limited to two attempts per request. A whole tool call
has a 20-second default deadline and a five-page limit; truncated data is partial.

## Agent integration

The primary agent-facing exports follow `src/tools/zetaris.ts`'s exported async
function pattern, without arbitrary SQL or infrastructure mutation:

```ts
import {
  list_ec2_instances,
  get_ec2_billing,
  get_ec2_metrics,
  get_ec2_operations,
  get_ec2_dependencies,
  createAwsEvidenceProvider,
} from './src/tools/aws-agent.ts';

// Same ToolArgs and AbortSignal as the current shared contract:
// await list_ec2_instances({ account_id, region, window }, signal);
// await get_ec2_billing({ account_id, region, window }, signal);
// await get_ec2_metrics({ account_id, region, window, instance_id }, signal);
// await get_ec2_operations({ account_id, region, window, instance_id, proposed_window }, signal);
// await get_ec2_dependencies({ account_id, region, window, instance_id }, signal);

// Used by the CLI with --evidence aws:
const provider = createAwsEvidenceProvider();
```

All five return `Promise<Observation>`. The provider implements the existing
`CurrentEvidenceProvider.call(action, signal)` interface and propagates cancellation.
The investigation CLI selects this provider by default (`--evidence aws`);
synthetic evidence requires `--evidence mock`. Importing these functions makes no AWS requests by itself.

Billing is a discovery-level operation in the new shared contract: it discovers
instances, then collects attributable cost for at most five instances by default,
under one overall deadline. Capped or incomplete discovery is `partial`.
`AWS_ENABLE_COST_EXPLORER=true` or provider `config.enableCostExplorer: true`
opts in; no billing feature is enabled in AWS. Unknown currency is `unavailable`,
not an invented USD total. Mixed currencies are never combined. Numeric totals
are for ranking; the detailed collector retains original decimal strings.

Metrics summarize the full observed period's CPU average and peak. A deterministic
six-hour candidate interval uses observed hourly averages; it is only a hypothesis.
It does not hide full-period peaks or establish safe shutdown. Missing CPU inputs
yield `unavailable` because the exact shared contract requires average, peak and
suggested window and does not accept null/no-match metric payloads. Network data
and sample counts remain available in the detailed collector records.

Operations/dependencies collect native facts through the read-only sources below.
Even a completed empty native scan has `partial` status, false coverage and
explicit unknowns: it cannot establish workload-wide absence or owner clearance.
Legacy synthetic cron strings and tags are never promoted to authority.

Agent observations use the contract's snake_case fields, `integration_mode`, a
source identifier and a content-derived `evidence_id`. Collector-only fields are
not appended to the exact shared wire shape. No shared verdict is changed.

The collector accepts at most 14 days, hour-aligned metrics (or five minutes
when configured), and UTC-day-aligned billing. AWS CLI mode defaults to 14 complete
UTC days ending at midnight today; `--lookback-days` accepts 1–14. Mock mode
retains its 28-day default. Unsupported AWS CLI periods and mock scenario flags
are rejected before retrieval. Current populated-resource verification is tracked in the [execution plan](EXECUTION_PLAN.md).

### Detailed collector access

```ts
import { createAwsTools } from './src/tools/aws.js';

const tools = createAwsTools({
  region: 'us-east-1',
  expectedAccountId: process.env.AWS_EXPECTED_ACCOUNT_ID,
  window: { from: '2026-10-15T00:00:00.000Z', to: '2026-10-22T00:00:00.000Z' },
  // Explicit opt-in to querying an already available billing source:
  enableCostExplorer: true,
});
try {
  const inventory = await tools.getEC2Instances();
  // Agent selects an ID from returned evidence; do not assume the first is suitable.
  // await tools.getUtilization(instanceId);
  // await tools.getCostEvidence(instanceId);
  // await tools.getOperationalEvidence(instanceId);
} finally {
  tools.close();
}
```

Replace the example dates with recent dates for live calls. Bind tools to a
single authenticated account/region and investigation window. With no window,
the factory freezes the preceding 14 complete UTC days. Overrides are supported
per utilization/billing call. The interval is inclusive at `from`, exclusive at
`to`; metrics must align to the configured period (3600 seconds by default, or
300). Maximum window length is 14 days; this MVP rejects old telemetry rather
than silently changing CloudWatch retention/granularity rules. Billing requires
whole UTC days within the last 14 days.

`getEC2Instances({ instanceIds })` optionally filters discovery to up to 100 IDs.
Pagination is internal, bounded and reported as partial on truncation; callers
do not receive an opaque SDK continuation token to pass to the model.

The detailed methods remain available for collection/testing. Input validation,
normalization of consumed AWS fields and output construction happen here; use the
agent-facing exports above for shared `Observation` compatibility. Zetaris stores
history downstream and is never used by this collector as a current-data source.

## Result semantics

Every call returns `status`, `scope`, optional `window`, `collectedAt`,
`retrievedVia`, typed `evidence`, matching `evidenceIds` and structured `issues`.

| Status        | Meaning                                                                |
| ------------- | ---------------------------------------------------------------------- |
| `ok`          | Requested core data has complete reported coverage                     |
| `no_match`    | Successful retrieval with no matching observations                     |
| `partial`     | Some data returned, but fields, metrics, pages or coverage are missing |
| `unavailable` | Credentials, permission, configuration or source unavailable           |
| `error`       | Invalid input, scope mismatch, invalid source data or failed request   |

Each evidence record keeps the shared fields (`id`, `instanceId`, `kind`, `source`,
`observedAt`, `collectedAt`, `synthetic`, `data`) and adds `scope`, `window` and
`provenance`. Scope always belongs to the authenticated identity. If setup fails,
the result scope may be null; successful evidence never has unknown scope.
Synthetic account `000000000000` is a fixture identifier, never a real target.

IDs are content-derived and stable for identical observations. Retain the evidence
alongside the report: `sourceRef` references that normalized observation, not an
external archive that the tool secretly creates. Provider request IDs, when
available, aid tracing; they are not substitutes for retaining the actual evidence.

CPU average and maximum are separate metric series; network values are period
totals in bytes. Expected/returned point counts describe coverage of the requested
window, not proof the instance ran throughout it. Missing samples are omitted,
never zero-filled. A real zero is retained. Memory is explicitly reported as not
collected; it needs an additional configured source. CPU/network completeness
does not establish that downsizing or stopping is safe.

Billing uses resource/account/region/service filters, daily `UnblendedCost`, and
usage/charge-type groups. Decimal amounts remain strings and currency is preserved.
Only attributable EC2 compute costs are returned, never guessed account-wide
allocations. Cost Explorer must already expose resource-level data; access or
availability failures stay explicit. The SDK does not enable paid features.
Cost Explorer queries themselves can incur API charges, so they are disabled by
default and must be explicitly enabled in factory configuration.

These costs are not savings: commitments, retained EBS resources, availability and
schedule assumptions require further evidence. No currency conversion or monthly
savings calculation is done here. Unknown estimated/final billing status is null.

## Native operational evidence

`getOperationalEvidence(instanceId, { kind: 'operations' | 'dependencies' })`
defaults to operations. The agent-facing tools select the corresponding source:
- **Operations:** [SSM DescribeMaintenanceWindowSchedule](https://docs.aws.amazon.com/systems-manager/latest/APIReference/API_DescribeMaintenanceWindowSchedule.html)
  targets the exact instance, then [GetMaintenanceWindow](https://docs.aws.amazon.com/systems-manager/latest/APIReference/API_GetMaintenanceWindow.html)
  verifies ID, enabled state and duration. AWS expands schedule/timezone rules;
  CCI preserves dated execution intervals without parsing cron or inventing daily
  critical jobs. The query covers the policy's planning month following the
  observed window, starting one day earlier to catch cross-midnight maintenance.
  A dated overlap can reject the proposed daily shutdown window in that month.
  It does not establish task criticality or the absence of jobs outside SSM.
- **Dependencies:** ELBv2 DescribeTargetGroups and
  [DescribeTargetHealth](https://docs.aws.amazon.com/elasticloadbalancing/latest/APIReference/API_DescribeTargetHealth.html)
  retain matching instance-ID registrations, ports and actual health states.
  Returned ARNs must match authenticated account/region before a health read.
  Registration requires service-owner and traffic-draining review; it never
  fabricates a continuous-operation requirement. IP, Lambda and ALB target groups
  remain explicitly unresolved. Other consumers are outside this source's coverage.

Each call allows at most 20 operational API requests (plus identity), five pages
by default and 100 facts, under the existing 20-second deadline and two-attempt
SDK limit. Target-group pages contain at most 20 groups; at most 1,000 target rows
are inspected per response. Repeated tokens and caps report `TRUNCATED`. Later
failures retain previously collected facts as partial; denial/malformed output
never clears safety. Missing transport sources remain `SOURCE_NOT_CONFIGURED`.
No task payloads, command parameters, credentials or raw provider error bodies
are retained.

Planned execution intervals are distinct from the utilization observation window
and collection timestamp. Reports retain these facts with source provenance and
validated evidence IDs. Both native sources always disclose missing broader
coverage and owner/calendar/recovery clearance. Empty results cannot support a
conditional recommendation; workload-specific authority is still required.

## Remaining integration

The CLI now selects this provider explicitly and uses the same validated report,
Zetaris history and H-MEM flow as mock mode. The AWS module only fetches/returns
evidence. The executor budgets are defined in [runtime bounds](components.md#runtime-ownership-and-bounds). Empty inventory remains a partial investigation when billing
currency/records are unavailable; it never invents a zero-cost billing result.
H-MEM reasoning persistence is separate. No automatic live-to-synthetic fallback
is allowed. Native operational coverage is deliberately incomplete; live populated-source
verification remains a separate gate. No resource launch or paid-feature provisioning
is needed to demonstrate the empty-discovery path.
