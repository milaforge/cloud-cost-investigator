# Cloud Cost Investigator

**Find EC2 scheduling opportunities. Challenge them with evidence. Explain the decision.**

For engineers deciding which EC2 instances could run fewer hours. Supply an AWS
account and region; the investigator discovers candidates, proposes shutdown
windows, and checks utilization, jobs and dependencies before returning a cited
**conditional recommendation**, **rejection**, or **needs verification**.
No previous investigation is required. No infrastructure is changed.

**Today:** a working TypeScript / Node.js CLI with **synthetic operational evidence**.
**Long term:** a **cost optimization specialist agent**, starting with EC2 scheduling
and expanding to other optimization decisions as evidence integrations and safety
policies are proven. That broader scope is a goal, not a current capability.

[Architecture](docs/components.md) · [Setup & CLI reference](docs/CLI_GUIDE.md#run) · [Results & demos](docs/CLI_GUIDE.md#memory-and-decision-follow-through) · [Execution status](docs/EXECUTION_PLAN.md)

## Try it

Node.js **24+** and npm. The default demo needs no credentials.

```bash
npm ci
npm run investigate -- --account demo --region us-east-1
```

The default scenario rejects an attractive shutdown window after finding a
conflicting critical batch job. Account and region label the synthetic data;
**this command does not call AWS**. [More scenarios and options](docs/CLI_GUIDE.md#run).

## What works now

| Component | Current capability |
| --- | --- |
| Investigation loop | Up to three candidates; bounded checks; deterministic safety rules; cited CLI/JSON reports |
| Model planner | Scripted by default; configurable real-model planning, with recorded NVIDIA calls |
| Meterless H-MEM | Disk-backed lessons prioritize fresh checks; changed evidence can clear old warnings |
| Zetaris | Remote history, explicit operator decisions, due reviews and reported outcomes |

Operational sources remain **mocked**, including when using a real model.
Savings estimates require explicit assumptions; reported outcomes are not verified
savings. H-MEM saves a check in the recurring-blocker demo but **ties fixed ordering**
across the eight-workload comparison. [Evidence and limitations](docs/CLI_GUIDE.md#memory-and-decision-follow-through).

## Next

Prioritize **live read-only evidence integrations**. Build on H-MEM's existing
investigation lessons only when evaluation shows reusable methods improve on
fixed rules. Keep the current bounded loop and deterministic evaluator.
[Architecture assessment](docs/components.md#best-meterless-fit).

Track 02 — *The Agent That Can Explain Why*. [Product scope](docs/PROJECT_CONTEXT.md) · [Safety & assumptions](docs/CLI_GUIDE.md#safety-and-ownership) · [Verification commands](docs/CLI_GUIDE.md#verify) · [Decision follow-up](docs/FOLLOW_UP.md)
