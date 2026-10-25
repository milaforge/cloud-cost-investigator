# How

[What](../README.md) · **How**

## AI agent clean checkout

For Claude, Codex or another coding agent: use this sequence when asked to set up
or validate the repository. Start by reading [AGENTS.md](../AGENTS.md), including
its required project documents. Current gate status lives only in
[the execution plan](EXECUTION_PLAN.md); old receipts are evidence, not commands
to rerun automatically. A local mock pass does not establish live integration.

### 1. Check the checkout and prerequisites

Use **Git, Node.js 24+ and npm**. Check versions before installing. This repository
uses `package-lock.json`, so use npm rather than converting package managers.
No GPU, `.env`, AWS account, model subscription or Zetaris installation is needed
for this validation. Real local H-MEM is already vendored and uses the root
installation; do not run `npm run setup`, install inside `vendor/hmem`, or add the
optional notebook dependencies.

If the repository is not already cloned:

```bash
git clone https://github.com/milaforge/cloud-cost-investigator.git
cd cloud-cost-investigator
```

Then record the revision and check the environment:

```bash
git rev-parse HEAD
git status --short
node --version
npm --version
```

A clean validation needs a fresh directory with no `.env`, `.aws`, `node_modules`
or existing memory copied from another checkout. Preserve any existing work;
use a separate clone if necessary, never reset or clean the user's worktree.
Use a shell without inherited cloud/model credentials or custom `NODE_OPTIONS`.
Do not print environment variables or credential files. If a tool-version
manager fails in an isolated home, select its installed Node 24+ binary; do not
change global configuration or silently install a new runtime.

### 2. Install the locked dependencies

```bash
npm ci --no-audit --no-fund
```

Expect exit **0**. This downloads public packages and runs their installation
scripts where permitted by npm policy; it needs registry access and local disk
writes. No application service credentials are needed. If npm flags a pending
install script, inspect that named package and the actual checks before deciding
it is needed; do not bulk-approve scripts or disable the environment's controls.
Do not regenerate the lockfile to bypass an install failure. Report the exact
failed command and sanitized error if blocked.

### 3. Prove the CLI's success and failure behavior

In this disposable validation shell, explicitly disable configured history:

```bash
export ZETARIS_HISTORY_TABLE=
export ZETARIS_HISTORY_ALLOW_APPEND=false
export HMEM_PERSIST_DIR=
npm run --silent investigate -- --evidence mock --planner scripted --account demo --region us-east-1 --scenario B --json
npm run --silent investigate -- --evidence mock --planner scripted --account demo --region us-east-1 --scenario A --json
npm run --silent investigate -- --evidence mock --planner scripted --account demo --region us-east-1 --scenario C --json
npm run --silent investigate -- --evidence mock --planner scripted --account demo --region us-east-1 --scenario missing --json
```

Run each command and record its exit code separately. The final command returning
**2** is an expected safe partial result, not a failed setup; avoid shell
fail-fast handling that mistakes it for a broken installation.

| Scenario | CLI exit | `completion_status` | Candidate verdict / evidence |
| --- | --- | --- | --- |
| B | 0 | `complete` | `not_recommended`; proposed window contradicted by a fresh operations/job observation |
| A | 0 | `complete` | `conditional_recommendation`; human approval remains required |
| C | 0 | `complete` | `not_recommended`; fresh dependency evidence contradicts the proposal |
| missing | 2 | `partial` | `needs_verification`; missing authority cannot clear shutdown |

All four must report `integration_mode: mock`, `planner.mode: scripted`,
`historical_context.zetaris: not_configured` and `historical_context.hmem: not_configured`.
Check that hypothesis citations resolve to evidence retrieved in the same report.
The JSON and trace interpretation are documented in the [CLI guide](CLI_GUIDE.md#capture-and-read-the-decision-trace).

### 4. Run local verification and real local memory

Run the four [verification commands](CLI_GUIDE.md#verify) in order. Expect exit
**0** from each. `npm test` uses mocked external transports, temporary local files,
loopback HTTP fixtures and child Node processes. It excludes the paid live
integration test. A sandbox denying `listen` or `spawn` is an environment blocker;
request the narrowly required tool permission and rerun the affected check.
Do not suppress tests or change application code to hide that restriction.

```bash
npm run --silent evaluate -- --planner scripted
npm run --silent demo:warm -- --planner scripted --json
```

Expect both exits **0**. Evaluation must show **8/8 correct dispositions**,
**0 unsafe positives** and valid current-run citations. The memory demonstration
must return `passed: true`: cold/warm/changed runs use fresh synthetic evidence
and real temporary disk-backed H-MEM. Zetaris is disabled; no model request is
made. Warm-demo progress goes to stderr; capture stdout separately when parsing
`--json` (do not combine it with `2>&1`). Do not describe this as live AWS, remote
Zetaris or real-model proof.

### 5. Check the local web entry point and finish

```bash
npm run demo:web -- --no-open
```

Expect a printed loopback URL. Check that it serves the page; do not enable real
services. No scenario/report should be selected initially. Automated server tests
cover routes and worker behavior; checking the visible UI requires a browser.
Stop only this server with Ctrl+C after the smoke check. No build step is required
for this Node/tsx CLI and local viewer.

```bash
git diff --exit-code
git status --short
```

Expect no tracked changes or new untracked files. Installed dependencies and
runtime caches are ignored. Report the revision, runtime versions, commands,
exit codes, integration modes and any blocker. List service checks as **not run**,
not passed. Retain safe logs outside the checkout. A fresh clone of a local Git
repository proves the recorded revision; it does not verify GitHub visibility,
remote availability, another OS, or uncommitted documentation changes.

### Human approval boundaries

A request to set up or validate the checkout authorizes the local procedure
above. Ask only for authorization that is missing from the current task; reuse
approval already granted for the same action and scope. Sandbox/tool approval
may still be required separately from human authorization of the project work.

| Action | Agent behavior |
| --- | --- |
| Read project files, install locked packages, run local checks, create temporary H-MEM, start/stop a loopback viewer | Proceed within the setup request. Keep dependency changes and upstream refreshes out of this procedure. |
| Install/upgrade system tools, add production dependencies, refresh vendored H-MEM | Obtain explicit authorization before changing that environment or dependency set. |
| Real model/integration test or repeated reliability gate | Requires authorization for the provider/model, request limit and billable usage. Read [model setup](CLI_GUIDE.md#model-configuration); the application requires its own configured Chat Completions access. Do not assume the coding agent's login supplies it. Never guess a credential destination, repeat successful paid diagnostics, or automatically retry. |
| Live AWS or remote Zetaris reads | Requires an authorized account/region or history scope and an approved existing identity. Follow [AWS setup](AWS_TOOLS.md#authentication-and-live-smoke-check) or [Zetaris setup](ZETARIS_SETUP.md). Credential presence alone is not authorization. |
| Provision remote storage/table/user/grants; retain Zetaris recommendations, decisions or outcomes | Prepare the exact target, permissions and retained records for human review before execution unless already authorized. Appends also need the configured append flag and the workflow's explicit acknowledgment. See [Zetaris permissions](ZETARIS_HISTORY.md#required-app-configuration-and-table-setup) and [follow-through](FOLLOW_UP.md). Never retry an uncertain write without inspecting history. |
| Login/SSO, API keys or secrets | Let the human provision secrets through their approved local mechanism. Never ask them to paste a key into chat, print `.env`, overwrite existing secrets, or copy them into validation receipts. Resume from safe key-presence checks. |
| Stop/resize resources or otherwise mutate AWS infrastructure | Outside this application's scope; never execute it as a setup step or as a consequence of a recommendation. |
| Commit, push, publish reports/video, or submit the entry | Requires explicit instruction for that action. Review the exact files/artifacts first, including privacy and source-mode labels. |

After the local proof, stop unless the user also requested a specific authorized
service check. Use the service configuration links below for that separate task.

## Run the demo

Install the prerequisites listed in [What](../README.md). `package-lock.json` pins the CLI's TypeScript/tsx and AWS SDK dependencies; Meterless H-MEM is vendored, with no separate service required.

```bash
git clone https://github.com/milaforge/cloud-cost-investigator.git
cd cloud-cost-investigator
npm ci
ZETARIS_HISTORY_TABLE= HMEM_PERSIST_DIR= ZETARIS_HISTORY_ALLOW_APPEND=false npm run investigate -- --evidence mock --planner scripted --account demo --region us-east-1
```

The intended user is an infrastructure/platform engineer deciding which proposed shutdowns warrant human review. Expect `not_recommended`: a conflicting batch job disproves the proposed shutdown window. This demo uses **synthetic evidence and a scripted planner**. The command disables configured history so the first run cannot contact or append to Zetaris.

## Open the web demo

```bash
npm run demo:web
```

Starts a loopback-only server on an available port and opens the browser. Initial
A/B previews are generated from synthetic evidence with a scripted planner.
No scenario or report is selected on startup. Choose a scenario and run it, or
explicitly open an A/B preview. Changing scenarios clears the previous report.
After this one startup command, the demo workflows run from browser buttons:

| Workflow | What to run and inspect |
| --- | --- |
| **Investigate** | Choose A (conditional opportunity), B (rejected window), C, missing evidence or three candidates, then **Run investigation**. Inspect current evidence, hypotheses, savings qualifications and human actions. |
| **Learn** | **Run learning demonstration** executes cold, warm and changed-evidence investigations using real temporary local H-MEM. Compare check order, calls, timing and fresh verdicts; inspect each phase's report. |
| **Follow through** | Explicitly select **Use real Zetaris and retain the seven demo records**, then run the configured service demonstration. Inspect the deferred/reviewed and accepted/outcome-reported paths and readback checks. All decisions are fictional; no AWS changes occur. |

Investigation and learning default to offline scripted runs. The server loads the
project `.env`, preserving shell precedence, but does not contact services on
startup. Configuration labels indicate presence, **not verified connectivity**.
For real inference, select the configured model and explicitly enable real
services (or select the model checkbox on Learn). The
[model setup](CLI_GUIDE.md#model-configuration) stays server-side; model calls may
incur usage. Live AWS is an explicit browser option with account, region and
candidate limit; the [AWS setup](AWS_TOOLS.md#investigation-cli) and missing-source
limits still apply. The account ID checks the authenticated AWS scope; it does not
authenticate the browser. Configure the server's AWS SDK credential chain or
`AWS_PROFILE` before starting it. Select **Read Zetaris decision history** to
query prior records for discovered instances. This investigation control is
read-only even if server append permission is enabled. History is historical
context and never replaces live evidence. The normal
investigation CLI still defaults to live AWS.

Follow-through requires [Zetaris setup](ZETARIS_SETUP.md), server-side
`ZETARIS_HISTORY_ALLOW_APPEND=true`, and the browser write acknowledgment. It
retains seven synthetic records under a unique account and never silently falls
back to fixture storage. Restart after changing configuration. Real-service
failures stay failures; the browser does not substitute scripted results.

Only one run executes at a time. Actual progress and expandable events remain
visible, including after a page refresh. **Stop run** terminates the local worker;
external writes may already have completed. Do not blindly retry an interrupted
write: retain the synthetic account shown in events and inspect its history.
Refreshing or reconnecting only retrieves the latest job; it never resubmits it.
An already completed job opens only when you select **View last result**.
The server keeps only its latest job result in memory; a server restart loses
that display state. Server shutdown stops the active worker.

Use `npm run demo:web -- --no-open` on a headless machine and open the printed
URL from a browser on that computer. If automatic opening fails, the server
keeps running and prints the URL. Ctrl+C stops it.

Choose **Load report**, or drop one JSON file, to inspect a generated single
investigation report. **Run details & export → Download JSON** saves the selected report
from the browser. The 2 MiB upload limit applies to each file. Validation checks
report consistency, citations and savings; it cannot authenticate user-supplied
evidence. Evaluation summaries and multi-run demo bundles are not single report
files. Uploads go only to this local server for validation and are not saved to
disk. Invalid files preserve the current display. Loaded files remain in the
current page until replaced or refreshed; keep real-account reports private.

The verdict and next human action lead the report. **How it got there** shows
the key checks and proposal/rejection sequence. UTC timestamps label evidence
collection; reasoning steps without recorded times say so. Hover, focus or tap
an **i** control for supporting details. Select evidence links for observations
and coverage. Expand **Window, assumptions & remaining checks** or **Full
investigation trace** for the complete detail. **Real services & scope** sits
below the report. Motion respects the system reduced-motion preference. Architecture and
execution bounds live in [components](components.md#local-report-viewer).

## Six-scenario evidence proof

[Task 2 scenario proofs and October 26 demo runbook](SCENARIOS.md):
`npm run demo:scenarios` replays six cases (seven variants) offline, and
`npm run export:scenarios` produces the validated synthetic JSONL handoff.
These use 14 complete UTC days; the policy still enforces a seven-day minimum.

## Configure your investigation

Copy [.env.example](../.env.example) to `.env` **only if `.env` does not exist**; otherwise merge the needed keys. Keep it untracked. Commands load it from the working directory; existing shell variables take precedence.

| Choose | Continue here |
| --- | --- |
| Live AWS evidence and permissions | [AWS authentication](AWS_TOOLS.md#authentication-and-live-smoke-check) |
| A real model, including NVIDIA | [Model configuration](CLI_GUIDE.md#model-configuration) |
| Persistent investigation lessons | [H-MEM configuration](MEMORY.md#configuration) |
| Historical recommendations and decisions | [Zetaris setup](ZETARIS_SETUP.md) |

Live, read-only AWS evidence is the default. Synthetic runs require `--evidence mock`; failures never switch to mocks. Replace the account placeholder and region with your intended AWS scope:

```bash
npm run investigate -- --account YOUR_12_DIGIT_ACCOUNT_ID --region us-east-1
```

The [team-adopted quality bar](../the_bar.md) guides reproducibility, visible decision-making and submission materials. Its examples do not change this project’s safety policy or technology roles.

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
STS. An account ID is a scope guard, not a credential. The optional
`AWS_EXPECTED_ACCOUNT_ID` is consumed directly by the standalone
`npm run demo:aws -- --live` smoke script; the investigation instead derives its
guard from `--account`. By default the smoke script checks only STS and inventory;
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

Common failures:
- Missing/expired credentials or SSO session: refresh the approved login and
  repeat the identity check; the collector reports `MISSING_CREDENTIALS`.
- `SCOPE_MISMATCH`: wrong authenticated account; correct the profile/account.
  `MISSING_REGION` or empty inventory: verify region configuration and scope;
  an empty result alone does not prove authentication failure.
- `ACCESS_DENIED`: ask the account owner to verify the specific read actions,
  permission boundaries/SCPs and billing access. STS success is insufficient.
- `COST_EXPLORER_DISABLED`: the app opt-in flag is absent. `SOURCE_UNAVAILABLE`
  can mean unavailable/not-enabled resource-level data. Missing billing can
  prevent candidate selection; it is not zero cost.
- Recent usage may not yet appear. Cost Explorer refreshes at least daily, and
  upstream billing data can arrive later than 24 hours; do not promise immediate
  spend visibility. [AWS refresh guidance](https://docs.aws.amazon.com/cost-management/latest/userguide/ce-what-is.html).
- Network/DNS errors, timeouts or throttling remain explicit retrieval failures;
  do not disable TLS or substitute synthetic results for a failed live call.

## What synthetic and live runs prove

The [six scenarios](SCENARIOS.md) prove supported, unsafe and uncertain outcomes
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
prevent a supported window; it cannot establish the job's purpose, criticality
or exact overlap. The authoritative unsafe job-overlap demonstration remains
synthetic. Recent costs may also be absent until Cost Explorer updates. Do not
launch instances or generate load merely to claim the synthetic safety proofs
have become live integrations.

## Go deeper

| Question | One place to read |
| --- | --- |
| Which flags and scenarios can I run? | [CLI reference](CLI_GUIDE.md) |
| How do the components work together? | [Architecture](components.md) |
| How are Zetaris, Meterless and NVIDIA used? | [Sponsor technology explanation](components.md#sponsor-technology-explanation) |
| How do I record a decision, review or outcome? | [Follow-up workflow](FOLLOW_UP.md) |
| How are lessons stored and reused? | [H-MEM reference](MEMORY.md) |
| What are the exact evidence and safety rules? | [Product contracts](PROJECT_CONTEXT.md) |
| How do I reproduce and assess the demos? | [Evaluation](evaluation/README.md) |
| How do I present the workflow to judges? | [Demo and deck preparation](DEMO.md) |
| What works today, and what is still unverified? | [Current status and release checklist](EXECUTION_PLAN.md) |
| What does the hackathon require? | [Recorded event rules](RULES.md) |

For contributors: [checks and diagnostics](CLI_GUIDE.md#verify), [working rules](../AGENTS.md), and [decision rationale](../memory.md).
