# AWS evidence tools

[What](../README.md) · [Why](WHY.md) · [How](HOW.md)

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

AWS SDK v3 clients use the default Node credential chain, including local profiles,
SSO, environment credentials or workload roles. Do not pass credentials through
tool arguments. Select a profile with `AWS_PROFILE` if needed and provide region
through SDK configuration or `AWS_REGION`. Do not commit credentials or exports.
`AWS_EXPECTED_ACCOUNT_ID` optionally guards the CLI against using the wrong account.

```sh
npm run demo:aws -- --live
```

This only calls STS identity and EC2 discovery. It prints status, count and issue
codes, not instance IDs, account IDs or tags. No live CloudWatch or Cost Explorer
query is performed by the demo command.

Required permissions for the corresponding features:
- `ec2:DescribeInstances`
- `cloudwatch:GetMetricData`
- `ce:GetCostAndUsageWithResources`

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

Operations/dependencies return `unavailable`, `data: null`, false coverage and
explicit missing fields. They do not promote synthetic cron strings or tags into
an authoritative source. The original detailed synthetic scenarios remain usable
for collector tests; the agent integration tests verify honest safety deferral.

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

Live `getOperationalEvidence` returns `unavailable/SOURCE_NOT_CONFIGURED`. It does
not infer dependencies from EC2 tags or claim no jobs exist. Synthetic scenarios
include labeled operational evidence through the same evidence structure.

## Remaining integration

The CLI now selects this provider explicitly and uses the same validated report,
Zetaris history and H-MEM flow as mock mode. The AWS module only fetches/returns
evidence. The executor budgets are defined in [runtime bounds](components.md#runtime-ownership-and-bounds). Empty inventory remains a partial investigation when billing
currency/records are unavailable; it never invents a zero-cost billing result.
H-MEM reasoning persistence is separate. No automatic live-to-synthetic fallback
is allowed. Operations/dependency sources remain unconfigured. No resource launch
or paid-feature provisioning is needed to demonstrate the empty-discovery path.
