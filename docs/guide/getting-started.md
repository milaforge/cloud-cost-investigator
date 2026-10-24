# Run Cloud Cost Investigator

[Documentation index](../README.md) · [Project](../../README.md)

Requires **Node.js 24+**, **npm**, and Git. Dependencies are pinned in
`package-lock.json`: TypeScript/tsx for the CLI, AWS SDK v3 for live evidence, and
the checked-in Meterless H-MEM reference. No separate H-MEM service is required.

## 1. Try the local demo

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
For JSON output, append `--json`. [Other scenarios and CLI options](../CLI_GUIDE.md#run).

## 2. Configure the integrations you need

```bash
# Only if .env does not already exist; otherwise merge the needed settings.
cp .env.example .env
```

Keep `.env` untracked. The CLI loads it from the project working directory;
existing shell variables take precedence.

| Integration | What to configure |
| --- | --- |
| Live AWS evidence | A read-only SDK profile/SSO or workload role. Follow [AWS setup and permissions](../AWS_TOOLS.md#authentication-and-live-smoke-check). Cost Explorer requires explicit opt-in and may incur API charges. |
| Real-model planner | Set `LLM_BASE_URL`, `LLM_MODEL`, `LLM_API_KEY` and provider options. See [model configuration](../CLI_GUIDE.md#model-configuration); the example targets NVIDIA Chat Completions. |
| Zetaris history | Provision persistent server storage → `CCI_HISTORY` lakehouse → dedicated table → app-user permissions. Follow [Zetaris setup and verification](../ZETARIS_HISTORY.md#required-local-docker-setup-history-lakehouse), then configure connection credentials and `ZETARIS_HISTORY_TABLE`. |
| Local reasoning memory | Set `HMEM_PERSIST_DIR=.cci-memory` to retain H-MEM lessons between runs. Keep generated state untracked; use one writer. |

`ZETARIS_HISTORY_TABLE` enables history reads; leave it empty when running without
Zetaris. Appends additionally require `ZETARIS_HISTORY_ALLOW_APPEND=true` after
provisioning and permission review. The setup probe retains a labeled synthetic
record. Zetaris owns the physical storage mapping: `ZETARIS_CCI_HISTORY_PATH` is
only a provisioning reference, not a setting read by the app.

## 3. Investigate your account

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
configuration. [Full setup and CLI reference](../CLI_GUIDE.md#fresh-machine-setup).

## Verify your setup

- [Components and architecture](../components.md)
- [Product scope, evidence contracts and safety invariants](../PROJECT_CONTEXT.md)
- [Setup, CLI options, demos and measured results](../CLI_GUIDE.md)
- [AWS evidence tools and source limitations](../AWS_TOOLS.md)
- [Zetaris provisioning and history contract](../ZETARIS_HISTORY.md)
- [Operator decisions and follow-up workflow](../FOLLOW_UP.md)

```bash
npm test
npm run typecheck
npm run typecheck:aws
npm run lint
```

These checks do not establish live service access. See [verification boundaries](../CLI_GUIDE.md#verify)
for separate manual integration probes.

[Next: understand outcome learning](outcome-learning.md).
