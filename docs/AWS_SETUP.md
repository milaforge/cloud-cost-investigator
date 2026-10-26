# AWS setup and account requirements

[What](../README.md) · [How](HOW.md)

Use this guide to prepare an **existing authorized AWS account** for read-only
EC2 scheduling investigations. Successful API access and complete scheduling
proof are different gates. No setup command grants shutdown authority.

## Choose mock or live evidence

An instance that has run for two days cannot supply seven days of historical
telemetry. Keep its live evidence partial. For the complete demo, reuse the
existing mock provider with an explicit seven-day observation window:

```bash
ZETARIS_HISTORY_TABLE= HMEM_PERSIST_DIR= ZETARIS_HISTORY_ALLOW_APPEND=false npm run investigate -- --evidence mock --planner scripted --account demo --region us-east-1 --lookback-days 7 --scenario A --json
```

This is synthetic evidence and synthetic pricing through the real investigation
engine, not seven days of live AWS collection. The command disables configured
history and makes no AWS or model calls. Repeat with `--scenario B` for a job
conflict, `--scenario C` for a continuous dependency, or `--scenario missing` for
safe deferral (expected exit 2). A/B/C normally exit 0. Clearances, pricing and
all generated observations remain labeled `mock`; the live provider never
fills missing days, changes timestamps or falls back to these fixtures.

For PowerShell, clear the history settings before running the same command
starting with `npm run investigate`:

```powershell
$env:ZETARIS_HISTORY_TABLE = ''
$env:HMEM_PERSIST_DIR = ''
$env:ZETARIS_HISTORY_ALLOW_APPEND = 'false'
```

## Account assumptions and acceptance

| Requirement                 | What must be true                                                                                                                                                                                                                                                                                         |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Intended identity and scope | The SDK resolves an approved identity in the same 12-digit account as `--account`; `--region` contains the intended EC2 resources. Cross-account role assumption, if needed, is provisioned by the account owner, not CCI.                                                                                |
| Existing resource           | Inventory returns a running candidate and matching positive compute spend. Optional owner/environment tags are informative, not authority.                                                                                                                                                                |
| Metric history              | Positive scheduling requires at least seven complete UTC days of gap-free CPU averages/peaks at five-minute or finer aggregation, plus the collector's network coverage. AWS mode defaults to 14 days and accepts `--lookback-days 1–14`; a shorter request does not remove the seven-day safety minimum. |
| Billing availability        | The intended caller can query attributable EC2 compute records for the same account/region/instance and UTC days; pagination, missing dates and currency remain validated.                                                                                                                                |
| Job/dependency authority    | Named operational sources cover the actual workload, including non-AWS jobs and consumers, plus current owner/calendar/recovery clearance. Native SSM/ELBv2 reads alone cannot satisfy this.                                                                                                              |
| Savings authority           | Verified marginal rate, purchase option, commitment treatment and retained-cost exclusion are required; account access alone cannot supply these assumptions.                                                                                                                                             |

The investigation provider requests **300-second** metrics by default. The
standalone low-level collector retains its separate 3600-second default unless
configured otherwise. Seven days at 300 seconds requires 2,016 timestamps per
series (4,032 for 14 days); CPU Average, CPU Maximum, NetworkIn and NetworkOut
are checked separately. Do not fill missing samples with zero.

AWS basic monitoring already supplies five-minute EC2 metrics; paid detailed
monitoring is not required for this policy. It does not create history before
the instance was running. Memory metrics are not collected by this integration
and are not an additional scheduling gate. See [AWS monitoring categories](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/manage-detailed-monitoring.html)
and [collector coverage semantics](AWS_TOOLS.md#result-semantics).

## Authenticate to AWS

Offline synthetic scenarios need no AWS credentials. For a live investigation,
use an existing authorized read-only identity and the account/region containing
the intended EC2 instances. Do not create resources just to reproduce the demo.
The AWS CLI is useful for login and identity checks; the application itself uses
AWS SDK v3, not an AWS CLI subprocess.

The actual loader in [aws.ts](../src/tools/aws.ts) constructs SDK clients without
explicit credentials, using the [default Node credential chain](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/setting-credentials-node.html).
It supports configured shared profiles/SSO, environment credentials and workload
roles. Choose a single intended credential source and check for stale shell
credentials before relying on a profile. The application preserves existing
shell-variable precedence when loading local .env configuration.

For an existing IAM Identity Center profile, refresh its session:

```bash
aws sso login --profile cci-readonly
aws sts get-caller-identity --profile cci-readonly --region us-east-1
aws configure get region --profile cci-readonly
```

Replace the example profile and region with your own. If no profile exists,
follow your team's approved AWS CLI setup (for SSO, `aws configure sso --profile
cci-readonly`; for an approved key-based profile, `aws configure --profile
cci-readonly`). Enter credentials locally, never in chat, source files or a demo
recording. Check the returned Account and Arn locally against the expected
12-digit account and role. STS identity does not report or verify your EC2 region;
compare the configured region with the region containing your instances and pass
that region explicitly below. [GetCallerIdentity](https://docs.aws.amazon.com/cli/latest/reference/sts/get-caller-identity.html)
requires no explicit IAM permission, but a successful identity call does not
prove EC2, CloudWatch or billing access.

Select that profile for the Node process and verify its identity in the same shell:

```bash
export AWS_PROFILE=cci-readonly
export AWS_REGION=us-east-1
export AWS_EXPECTED_ACCOUNT_ID=YOUR_12_DIGIT_ACCOUNT_ID
aws sts get-caller-identity --region "$AWS_REGION"
npm run investigate -- --evidence aws --account "$AWS_EXPECTED_ACCOUNT_ID" --region "$AWS_REGION"
```

PowerShell equivalent:

```powershell
$env:AWS_PROFILE = 'cci-readonly'
$env:AWS_REGION = 'us-east-1'
$env:AWS_EXPECTED_ACCOUNT_ID = 'YOUR_12_DIGIT_ACCOUNT_ID'
aws sts get-caller-identity --region $env:AWS_REGION
npm run investigate -- --evidence aws --account $env:AWS_EXPECTED_ACCOUNT_ID --region $env:AWS_REGION
```

The investigation requires both `--account` and `--region`; its explicit region
overrides the SDK region default, and the account argument is checked against
STS. An account ID is a scope guard, not a credential.
`AWS_EXPECTED_ACCOUNT_ID` supplies the web UI's Live account scope and optionally
guards the standalone `npm run demo:aws -- --live` smoke script. The investigation
CLI still derives its guard from `--account`. Web Live also reads `AWS_REGION`
and `CCI_MAX_CANDIDATES` (1–3, default 1) from server `.env`; restart after edits.
By default the smoke script checks only STS and inventory;
`--live --operations` additionally probes SSM and ELBv2 for one retrieved running
instance. Neither smoke mode queries CloudWatch or Cost Explorer.

Alternatively, supply `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` through
your approved local environment; temporary credentials also require
`AWS_SESSION_TOKEN`. Supply `AWS_REGION` for the SDK/smoke script. Do not mix
expired environment credentials with a different intended profile. The AWS CLI
does not load this project's .env; shell/profile credentials must be available to
both tools for the identity check to represent the application. **Never commit
credentials, .env, private AWS exports or screenshots containing them.**

Minimum read operations used by the five evidence tools:

| Evidence tool          | Read permission / current capability                                                                                |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `list_ec2_instances`   | `ec2:DescribeInstances`; STS account check                                                                          |
| `get_ec2_metrics`      | `cloudwatch:GetMetricData`; STS account check                                                                       |
| `get_ec2_billing`      | `ec2:DescribeInstances` plus `ce:GetCostAndUsageWithResources`; STS account check                                   |
| `get_ec2_operations`   | `ssm:DescribeMaintenanceWindowSchedule`, `ssm:GetMaintenanceWindow`; incomplete native facts                        |
| `get_ec2_dependencies` | `elasticloadbalancing:DescribeTargetGroups`, `elasticloadbalancing:DescribeTargetHealth`; incomplete consumer facts |

Profile assumption/SSO login may require separate organizational permissions.
Do not grant administrator access, infrastructure-write actions, SSH or SSM
command execution to make these collectors work. Only the listed SSM reads are used. Cost Explorer uses its us-east-1 endpoint while
resource queries remain scoped to the requested region. Billing requests require
explicit `AWS_ENABLE_COST_EXPLORER=true` in the shell or local .env; the app does
not enable billing features. Resource-level Cost Explorer data must already be
opted in and available. Queries can incur API charges. See the
[resource-level API requirements](https://docs.aws.amazon.com/aws-cost-management/latest/APIReference/API_GetCostAndUsageWithResources.html).

## Prepare resource-level billing

The account owner verifies Cost Explorer availability and, in the management
account where applicable, opens **Billing and Cost Management → Cost Management
preferences → Daily granularity → Resource-level data at daily granularity**,
selects EC2 compute, and saves the preferences. This is account provisioning,
not an application action. Changes can take up to 48 hours; daily resource-level
data covers the past 14 days. Confirm linked-account visibility where relevant.
See [AWS configuration instructions](https://docs.aws.amazon.com/cost-management/latest/userguide/ce-configuring-data.html)
and [resource-level data availability](https://docs.aws.amazon.com/cost-management/latest/userguide/ce-resource-daily.html).

Only after the source is provisioned, set `AWS_ENABLE_COST_EXPLORER=true` for
the intended application process. This flag opts into API requests; it does not
enable Cost Explorer or grant permissions. Hourly billing is not needed by this
collector. Keep feature-enablement and data-retention cost decisions with the
account owner; CCI performs no such changes.

Inspect each observation's `status`, `missing_fields` and `coverage`. A successful
HTTP response or an integration-test pass does not establish complete dates.
The collector checks daily attributable groups over the whole request; no rows
for a requested day remain a coverage gap, not a proved zero. A two-day-old
instance will generally not satisfy a seven- or fourteen-day billing request.
Optional missing inventory metadata does not itself invalidate enumeration.

`ACCESS_DENIED` alone does not identify the cause. Verify the intended caller,
specific IAM action, boundaries/SCPs, Cost Explorer enablement, organization/member
visibility and daily resource settings separately. Billing-console **Activate IAM
Access** is not the control for Cost Explorer SDK API access. Do not add broad
permissions to work around a data-enablement or history gap.

## Jobs and dependencies: what native AWS reads establish

These read-only integrations already exist; they run when the investigation
reaches the corresponding challenge. An early inventory/billing/metrics stop can
prevent later challenges. The standalone operational smoke check below can verify
their access independently of historical telemetry. Do not relax a prerequisite
or substitute synthetic observations into a live run to reach them.

| Native source                                                      | Retrieved facts                                                                                                                              | Coverage it cannot establish                                                                                                                                                    |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SSM `DescribeMaintenanceWindowSchedule` and `GetMaintenanceWindow` | Instance-targeted, AWS-expanded scheduled maintenance intervals and enabled-window duration; a dated overlap can reject the proposed window. | Guest cron, systemd timers, application/external schedulers, workload-wide job absence, owner/calendar/recovery approval.                                                       |
| ELBv2 `DescribeTargetGroups` and `DescribeTargetHealth`            | Matching instance-ID registrations, ports and target health; account/region are validated.                                                   | Direct clients, queue consumers, all upstream/downstream services, continuous-availability obligations or safe traffic draining. IP/Lambda/ALB target groups remain unresolved. |

CCI does not request SSH or SSM `SendCommand`/session access. Fetching a schedule
from SSM is different from executing a guest command. An empty SSM scan is not
an empty workload job calendar; a healthy ELB target is not shutdown clearance.
Both observations stay partial until broader authority is supplied.

For a future positive live recommendation, identify the actual operational record
owners and the specific read APIs or maintained records that cover this workload.
A narrow adapter should validate account/region/instance, freshness, timezone and
exceptions, retain source provenance, and refuse missing or expired authority.
The existing policy requires matching operations/dependency clearances for the
exact proposed UTC window, covering the next calendar month, with owner
confirmation, reviewed calendar, verified recovery, excluded dates and overhead.
The optional browser owner statement is unverified supporting context and cannot
provide these permissions or clearances. General AWS account access cannot prove
that all external jobs and consumers have been covered.

## Savings and historical compatibility

New runs only reject or defer; savings are always null regardless of billing coverage. Billing ranks known running candidates when available and is not a prerequisite for operational checks. Historical recommendation reports retain their validated deterministic calculations. The live adapter has no marginal-pricing proof; Cost Explorer access alone never establishes future savings.

## Common failures

- Missing/expired credentials or SSO session: refresh the approved login and
  repeat the identity check; the collector reports `MISSING_CREDENTIALS`.
- `SCOPE_MISMATCH`: wrong authenticated account; correct the profile/account.
  `MISSING_REGION` or empty inventory: verify region configuration and scope;
  an empty result alone does not prove authentication failure.
- `ACCESS_DENIED`: ask the account owner to verify the specific read actions,
  permission boundaries/SCPs and billing access. STS success is insufficient.
- `COST_EXPLORER_DISABLED`: the app opt-in flag is absent. `SOURCE_UNAVAILABLE`
  can mean unavailable/not-enabled resource-level data. Missing billing removes spend ranking; known running inventory remains investigable. It is not zero cost.
- Recent usage may not yet appear. Cost Explorer refreshes at least daily, and
  upstream billing data can arrive later than 24 hours; do not promise immediate
  spend visibility. [AWS refresh guidance](https://docs.aws.amazon.com/cost-management/latest/userguide/ce-what-is.html).
- Network/DNS errors, timeouts or throttling remain explicit retrieval failures;
  do not disable TLS or substitute synthetic results for a failed live call.

## What synthetic and live runs prove

The [six scenarios](SCENARIOS.md) prove named conflicts and evidence-driven deferrals
with labeled synthetic evidence. Live AWS runs can prove authentication,
inventory and the metrics/billing evidence actually returned, subject to coverage
and permissions. Native SSM maintenance executions can contradict a window;
ELBv2 registrations identify consumers needing owner/draining review, not an
automatic continuous-operation requirement. These sources do not establish
complete owner, calendar and recovery clearance. Empty scans and missing sources
must stay unknown. See [native collection limits](AWS_TOOLS.md).

A newly launched instance cannot provide 14 days of historical metrics. The live
CLI requests the preceding 14 complete UTC days by default; unavailable periods
are not zero utilization. An in-instance cron job is not an authoritative
operations source for the current collector, which does not inspect guest jobs.
Its CPU activity may lead to `needs_verification` if metrics are collected and
require window-specific follow-up; it cannot establish the job's purpose, criticality
or exact overlap. The authoritative unsafe job-overlap demonstration remains
synthetic. Recent costs may also be absent until Cost Explorer updates. Do not
launch instances or generate load merely to claim the synthetic safety proofs
have become live integrations.
