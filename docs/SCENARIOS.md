# Product demo scenarios

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

## Browser coverage: A–G

The browser has seven selectable previews, generated through the actual investigator
with synthetic evidence and a scripted planner. Start with nothing selected.
The letters identify browser presets; **D here means missing evidence**, while
“D — Reinvestigation” in the product acceptance contract names the broader
cross-run proof. The six EC2 cases above remain a separate reproducible dataset.

| Preview | Product behavior represented | Sponsor role and evidence boundary |
| --- | --- | --- |
| A · Human decision required | Complete technical checks without a conflict still defer human authority. | Seeded Zetaris deferral and H-MEM hint never authorize shutdown. |
| B · Rejected window | Low CPU suggests 00:00–06:00 UTC; a named overnight job rejects it. Remaining checks still run. | Mock H-MEM prioritizes the job check; current evidence supplies the contradiction. |
| C · Continuous operation | A named dependency obligation rejects the window. | Mock H-MEM prioritizes dependencies; Zetaris compares the prior deferred result. |
| D · Missing evidence | Partial job coverage names the missing source and concrete next action. | Prior context cannot fill the current evidence gap. This fast preview does not demonstrate unavailable-source retries. |
| E · Three candidates | Rank and investigate three instances independently: one deferral, one job rejection, one dependency rejection. | History, hints, citations and displayed follow-up remain candidate-scoped. |
| F · First investigation | Empty successful history reads still lead to a cited job rejection. | Both mock stores return no context; the resulting reasoning summary is held only in memory. No baseline is required. |
| G · Changed evidence | A seeded dependency rejection is rechecked and withdrawn; current complete checks defer the human decision. | Zetaris retains the old rejection for comparison; a typed H-MEM hint triggers a fresh recheck, never a stale verdict. |

**Learn** follows the selected candidate and shows historical versus fresh verdicts
and any actual lesson recheck in the trace. Its cold/warm/changed cards explain the
multi-run mechanism; they do not execute it. **Follow through** shows that candidate's
result and concrete review tasks, then explains attribution, due time, linked
investigation/request records, verified readback and a fresh due review. No
operator decision is invented or saved. Legacy accepted-result/outcome learning
is folded separately: only validated links and allowlisted checks can teach
H-MEM; operator prose cannot direct the planner.

Together these previews represent the product journey, not full integration
proof. All browser history is isolated in-memory mock data; G starts from seeded
history, not a preceding executed C run. For executable persistence and failure
coverage, use:

- `node --import tsx --test --test-isolation=none tests/demo-history.test.ts tests/demo-web-ui.test.ts tests/demo-web.test.ts`: generated previews, scoped citations and Demo/Live boundaries.
- `npm run demo:warm`: cold C → warm C → changed A, real local Meterless H-MEM reopened between runs, measured call counts and persisted correction; synthetic telemetry, no Zetaris.
- `node --import tsx --test --test-isolation=none tests/follow-up.test.ts tests/outcome-learning.test.ts`: local fixture decision/review and validated legacy outcome-learning coverage; no remote writes.
- [Zetaris follow-through proof](FOLLOW_UP.md#reproducible-proof): separate service-dependent append/readback and due-review demonstration. Requires explicit authorization for retained remote writes.

Model failures, retry exhaustion, invalid scope, unavailable history and budgets
remain focused failure tests rather than extra presentation presets. Actual
NVIDIA planning and remote Zetaris permissions/persistence require their separately
labeled execution receipts. Do not infer them from a successful preview.

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
4. Show G (or EC2-5/6): Zetaris keeps the prior verdict for audit; only H-MEM hints may prioritize checks, and fresh evidence changes the conclusion. Then open Learn and Follow through for that result.

Label every replay synthetic. Native live SSM maintenance executions and ELBv2 registrations provide partial operational facts, never workload-wide clearance. In-instance cron jobs are not collected by those adapters. A new instance cannot supply past observations; missing billing is not zero spend and does not prevent investigating validated running inventory. Actual sponsor calls, model performance and remaining release gates belong in [the execution plan](EXECUTION_PLAN.md). Historical measurements retain their original policy and labels.
