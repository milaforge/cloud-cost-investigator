# Six EC2 investigation scenarios

## What

CCI identifies a specific reason to reject a shutdown window, or names exactly what evidence or external decision is missing and defers. New reports only use `not_recommended` and `needs_verification`; savings are always null. Old recommendation reports remain readable.

| Case      | Evidence and expected result                                                                                                                                                                |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EC2-1 / A | Complete synthetic technical checks, no conflict found: defer the authorized human decision outside CCI. Do not invent a telemetry gap.                                                     |
| EC2-2 / B | Critical job at 02:00–03:00 UTC overlaps the proposed 00:00–06:00 window: reject, naming the job and both windows.                                                                          |
| EC2-3     | Operations or dependencies unavailable (two variants): defer with the specific missing source and next check.                                                                               |
| EC2-4     | Average CPU 2%, whole-period peak 95%, no known job conflict: investigate the supplied window, then defer for window-specific activity evidence. A peak alone does not identify a conflict. |
| EC2-5     | Prior A deferral followed by current C dependency evidence: reject the new window with the named dependency obligation.                                                                     |
| EC2-6     | Prior B rejection followed by fresh A evidence clearing the job: withdraw the old rejection and defer. History never grants approval.                                                       |

## Why

The cases prove that a current contradiction and missing evidence lead to different answers. Both operations and dependencies are collected within budget, including after a conflict. Low CPU, complete synthetic clearance and a historical verdict cannot authorize shutdown. The fixed scenario dataset covers 14 complete UTC days; a shorter-than-seven-day history creates an explicit recurring-window gap.

## How

Use Node.js 24+ and installed npm dependencies:

```bash
npm ci
npm run demo:scenarios
npm run test:scenarios
npm run export:scenarios
node --import tsx --test --test-isolation=none tests/scenario-export.test.ts
```

There are six cases and seven variants. Test names start with `EC2 1:` through `EC2 6:`. The exporter runs those tests and publishes [ec2-scenarios.jsonl](ec2-scenarios.jsonl) only after they pass. Each JSONL row retains validated evidence, citations, hypotheses, expected verdicts and a reproduction command. IDs and execution timestamps vary. The root JSONL copy is the same handoff artifact.

These are synthetic current observations and a local intercepted Zetaris transport exercising the real adapter. They require no credentials, paid model or remote writes. H-MEM is disabled here; its real local persistence is tested separately. The browser presets use rolling 28-day windows, while this harness fixes a 14-day period. The separate eight-case evaluation uses its own 28-day request and history disabled; see [evaluation](evaluation/README.md).

## Recording sequence

1. Show B first: the exact job, conflicting window and current citation.
2. Show missing evidence: the named source, uncertainty and next check.
3. Show EC2-4: a whole-period peak creates a question, not an invented operational cause.
4. Show EC2-5/6: history changes which facts deserve attention, while fresh evidence changes the conclusion.

Label every replay synthetic. Native live SSM maintenance executions and ELBv2 registrations provide partial operational facts, never workload-wide clearance. In-instance cron jobs are not collected by those adapters. A new instance cannot supply past observations; missing billing is not zero spend and does not prevent investigating validated running inventory. Actual sponsor calls, model performance and remaining release gates belong in [the execution plan](EXECUTION_PLAN.md). Historical measurements retain their original policy and labels.
