# Cloud Cost Investigator

**Find ways to cut AWS costs while protecting the jobs your business depends on.**

Cloud Cost Investigator (CCI) checks when EC2 servers could be turned off,
explains the risks, and recommends what needs human review. It never changes
your infrastructure.

With memory enabled, it learns from past investigations which checks to try first.
This can save work when similar problems return; it still checks fresh evidence
every time. More use does not guarantee better results.

EC2 scheduling is the hackathon scope. The long-term goal is a cost optimization
specialist agent.

## Why this exists

Low average CPU can hide a weekly batch job or a dependency that needs continuous
uptime. A useful cost recommendation must explain both the opportunity and the
operational reasons it could fail.

This investigator actively tries to disprove each proposed shutdown window.
In the main demo, utilization suggests an attractive window; a later operational
check finds a critical batch job that overlaps it. The agent rejects that window
and shows the evidence behind the change. Missing evidence leads to an explicit
deferral. Savings remain unknown unless the required pricing and scheduling
assumptions are available.

## How it works

1. Discover and rank up to three EC2 candidates in the requested account/region.
2. Propose a UTC shutdown window from current utilization evidence.
3. Challenge it with peaks, jobs, dependencies and operational clearance.
4. Replan within bounded call/time budgets, then apply deterministic safety rules.
5. Report the verdict, evidence citations, rejected hypotheses and unresolved checks.

Optional **Meterless H-MEM** lessons help choose which fresh check to run first.
**Zetaris** retains investigation history, explicit operator decisions, due reviews
and reported outcomes. Historical records never replace current telemetry or
provide permission to change AWS. [Components and architecture](docs/components.md).

## Run it yourself

Requires **Node.js 24+**, **npm**, and Git. Dependencies are pinned in
`package-lock.json`: TypeScript/tsx for the CLI, AWS SDK v3 for live evidence, and
the checked-in Meterless H-MEM reference. No separate H-MEM service is required.

### 1. Try the local demo

On a fresh clone, this needs no credentials or external services:

```bash
git clone https://github.com/milaforge/cloud-cost-investigator.git
cd cloud-cost-investigator
npm ci
npm run investigate -- --evidence mock --account demo --region us-east-1
```

Expect scenario B to end with `not_recommended` after finding a conflicting batch
job. Its evidence is **synthetic**, and its default planner is scripted.
The report includes the proposed window, contradiction, citations and trace.
For JSON output, append `--json`. [Other scenarios and CLI options](docs/CLI_GUIDE.md#run).

### 2. Configure the integrations you need

```bash
# Only if .env does not already exist; otherwise merge the needed settings.
cp .env.example .env
```

Keep `.env` untracked. The CLI loads it from the project working directory;
existing shell variables take precedence.

| Integration | What to configure |
| --- | --- |
| Live AWS evidence | A read-only SDK profile/SSO or workload role. Follow [AWS setup and permissions](docs/AWS_TOOLS.md#authentication-and-live-smoke-check). Cost Explorer requires explicit opt-in and may incur API charges. |
| Real-model planner | Set `LLM_BASE_URL`, `LLM_MODEL`, `LLM_API_KEY` and provider options. See [model configuration](docs/CLI_GUIDE.md#model-configuration); the example targets NVIDIA Chat Completions. |
| Zetaris history | Provision persistent server storage → `CCI_HISTORY` lakehouse → dedicated table → app-user permissions. Follow [Zetaris setup and verification](docs/ZETARIS_HISTORY.md#required-local-docker-setup-history-lakehouse), then configure connection credentials and `ZETARIS_HISTORY_TABLE`. |
| Local reasoning memory | Set `HMEM_PERSIST_DIR=.cci-memory` to retain H-MEM lessons between runs. Keep generated state untracked; use one writer. |

`ZETARIS_HISTORY_TABLE` enables history reads; leave it empty when running without
Zetaris. Appends additionally require `ZETARIS_HISTORY_ALLOW_APPEND=true` after
provisioning and permission review. The setup probe retains a labeled synthetic
record. Zetaris owns the physical storage mapping: `ZETARIS_CCI_HISTORY_PATH` is
only a provisioning reference, not a setting read by the app.

### 3. Investigate your account

Replace `YOUR_12_DIGIT_ACCOUNT_ID` and the region with your intended AWS scope:

```bash
npm run investigate -- --account YOUR_12_DIGIT_ACCOUNT_ID --region us-east-1
# Add a configured real model:
npm run investigate -- --account YOUR_12_DIGIT_ACCOUNT_ID --region us-east-1 --planner model
```

**Live, read-only AWS evidence is the default.** Synthetic evidence always requires
`--evidence mock`; failures never silently switch to mocks. You can also use
`--evidence mock --planner model` to test a real model against synthetic evidence.

Exit codes: **0** completed investigation, **2** partial, **1** failed or invalid
configuration. [Full setup and CLI reference](docs/CLI_GUIDE.md#fresh-machine-setup).

## Current capabilities and limits

The bounded investigation loop, cited CLI/JSON reports, deterministic safety
rules, H-MEM persistence, real NVIDIA calls and remote Zetaris append/readback
have recorded proof. [Results and demonstrations](docs/CLI_GUIDE.md#memory-and-decision-follow-through).

Live AWS inventory, billing and utilization adapters exist, but recorded live AWS
proof is limited to authenticated empty discovery. Authoritative live jobs and
dependency sources remain unconfigured, so positive live scheduling recommendations
are not yet proven. Reported outcomes are operator statements, not verified
savings. H-MEM saves a check in one recurring-blocker demo but ties fixed check
orders across the eight-workload comparison.

## Hackathon context

Built for **Track 02 — The Agent That Can Explain Why** in the
[Open Agent Hackathon 2026](https://academy.genai.works/courses/open-agent-hackathon-2026/details).
The organizer emphasizes meaningful outcomes, reasoning across data, useful memory
and explanations. This project applies that goal to an operational decision:
**why a promising cost optimization should proceed, be rejected, or wait**.

Zetaris supplies the structured decision trail; Meterless H-MEM supplies reusable
investigation lessons; NVIDIA Nemotron can plan the next evidence check. The
project reuses the vendored H-MEM reference and inherited starter notebook; the
investigation CLI is the product entry point.

The current organizer overview names Meterless Nightshift as the NVIDIA execution
path. This implementation uses H-MEM and direct NVIDIA-compatible requests;
compliance with that wording needs team/portal confirmation. Actual Cursor usage,
slides and the 1–4 minute submission video remain release-checklist items.
[Recorded requirements](docs/RULES.md) and [execution/release status](docs/EXECUTION_PLAN.md)
keep those requirements separate from verified implementation.

## Documentation and verification

- [Components and architecture](docs/components.md)
- [Product scope, evidence contracts and safety invariants](docs/PROJECT_CONTEXT.md)
- [Setup, CLI options, demos and measured results](docs/CLI_GUIDE.md)
- [AWS evidence tools and source limitations](docs/AWS_TOOLS.md)
- [Zetaris provisioning and history contract](docs/ZETARIS_HISTORY.md)
- [Operator decisions and follow-up workflow](docs/FOLLOW_UP.md)

```bash
npm test
npm run typecheck
npm run typecheck:aws
npm run lint
```

These checks do not establish live service access. See [verification boundaries](docs/CLI_GUIDE.md#verify)
for separate manual integration probes.
