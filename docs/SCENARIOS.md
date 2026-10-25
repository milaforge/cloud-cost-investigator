# Six EC2 investigation scenarios

Use this runbook for the October 26 submission target. These are synthetic,
offline investigations through the existing planner/executor/evaluator and
runtime-validated contracts. They do not establish live AWS operational coverage,
live Zetaris connectivity, model reasoning quality, or realized savings.

The browser demo is a separate presentation path: its built-in presets use
rolling 28-day windows. Use `demo:scenarios` below for the exact fixed 14-day
six-case proof. Loaded single reports show historical comparisons, but their
Zetaris status comes from the report and is not a new live connectivity check.

## Reproduce from a clean checkout

Use Node.js 24+ and npm, and a submission revision containing this change.
The new commands extend upstream `4fa83ff`; use the Task 2 PR revision until merged.

```bash
git clone https://github.com/milaforge/cloud-cost-investigator.git
cd cloud-cost-investigator
git checkout <submission-commit>
npm ci
npm run demo:scenarios
npm run test:scenarios
npm test
npm run typecheck
npm run typecheck:aws
npm run lint
```

Expected: **7 demo checks for 6 cases** (case 3 tests each unavailable source)
with focused and full-suite verification recorded in [the execution plan](EXECUTION_PLAN.md).
The demo is a test-backed
replay: each printed receipt comes from a newly executed, validated investigation,
with assertions on the decisive evidence. It is not a canned report or a live
model demo. UUIDs and execution times vary; evidence, verdicts and savings arithmetic
are reproducible.

No credentials or `.env` setup are needed for these commands. The demo uses mock
current evidence and an intercepted in-memory Zetaris HTTP transport, exercising
the real history adapter's append/readback and comparison logic. It does not write
remote history. H-MEM is disabled in the six-case demo to isolate Zetaris comparison
behavior; the broader suite separately exercises the vendored local H-MEM.
The checked-in H-MEM source needs no new `npm run setup` download for this suite.

If npm is unavailable but dependencies are already installed, the exact demo
command is:

```bash
node --import tsx --test --test-isolation=none --test-reporter=spec --test-name-pattern=^EC2 tests/investigation.test.ts tests/broader-scenarios.test.ts tests/warm.test.ts
```

The integrated checkout was verified after a locked `npm ci` installation using
an ephemeral npm executable because npm is not on this shell’s PATH. See the
execution plan for current results and upstream clean-checkout receipts.

## JSONL handoff

[ec2-scenarios.jsonl](ec2-scenarios.jsonl) contains exactly six JSON objects,
one per line. Case 3 has two variants. Each object includes the expected verdict,
decisive reason, synthetic mode, history-use flag and reproduction command.
`variants[].current_investigation.evidence` contains the actual synthetic tool
observations; complete validated reports retain citations, missing checks and
traces. Cases 5/6 additionally include the previous investigation and existing
version-1 Zetaris record, with separate current/historical IDs.

Regenerate from the passing scenario tests, without copying fixture data:

```bash
npm run export:scenarios
# Same project entry point when npm is unavailable:
node --import tsx scripts/export-scenarios.ts
node --import tsx --test --test-isolation=none tests/scenario-export.test.ts
```

The exporter captures the seven selected test reports in a temporary file and
publishes only after all tests and JSONL validation pass. Expected labels come
from reports whose verdict assertions already passed; labels never reach the
evidence provider. The export test compares retained facts against regenerated
fixtures, replays all seven exported evidence variants through the engine, and
rejects invalid JSON, truncation, false verdicts, forged citations/history and
changed observation periods. Runtime IDs and timestamps vary on regeneration.

The separate model benchmark is the existing **eight-case evaluation**, with its
original 28-day request and history disabled. It is not the six-case JSONL replay.
See [model evaluation instructions](evaluation/README.md) and the current
[execution receipt](EXECUTION_PLAN.md) for real-model results, failures and retry
counts. Real model calls over fixtures remain synthetic evidence; a matching
deferral reached through planner failure is not a successful model run. Generated
evaluation output and diagnostics stay local and excluded from the commit.

## Scenario identifiers and runnable test mapping

The JSONL identifiers `ec2-1` through `ec2-6` (also written EC2-1–EC2-6 in
slides) identify scenarios, not literal Node test names. Actual names start with
`EC2 1:` through `EC2 6:`; each variant stores its complete name in `source_test`.
Each row’s `reproduction_command` selects that prefix in the existing test files.
Case 3 deliberately selects two tests, one per unavailable source. The mapping
table below names the owning files. `test:scenarios`, `demo:scenarios` and
`export:scenarios` are package scripts; there is no `npm run EC2-1` command.

The separate eight-case evaluator uses different labels: A is supported, B and
C are unsafe (job overlap and continuous dependency), and `missing` is uncertain.
Do not describe evaluator C as the uncertain case or confuse these labels with
the collector-only synthetic fixtures.

## Evidence and acceptance map

All six use **2026-09-15 00:00 UTC through 2026-09-29 00:00 UTC**, exclusive end:
14 complete days. Prior investigations in cases 5/6 use September 1–15. Each
investigation retrieves new mock evidence IDs. The historical runs replay archived
synthetic periods; they do not claim that two weeks elapsed during the demo.

The baseline is a running, scoped instance with positive attributable compute
cost, CPU average 2% / peak 8%, five-minute aggregation and a 00:00–06:00 UTC
proposal. Positive cases additionally require matching owner, calendar and recovery
clearances from operations and dependencies. Empty job results alone never suffice.

| Case                                  | Existing coverage at `a8c08f5`                                                                | Decisive evidence and assertions                                                                                                                                               | Test location                                      |
| ------------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------- |
| 1: conditional recommendation         | A already supported approval and deterministic savings                                        | Running resource and attributable spend; both fresh safety checks cited; no unresolved checks; human approval remains required                                                 | `tests/broader-scenarios.test.ts`, `EC2 1`         |
| 2: critical overlap rejected          | B already proved proposal precedes the contradicting query                                    | Critical 02:00–03:00 job overlaps 00:00–06:00; current job citation; proposed → contradicted; other windows/dependencies explicitly unevaluated                                | `tests/investigation.test.ts`, `EC2 2`             |
| 3: unavailable safety source deferred | Operations unavailable covered; dependency unavailable also covered in warm-memory tests      | Isolate each unavailable source against otherwise positive A evidence; no conflict fabricated; specific missing check; proposed → unresolved; savings null                     | `tests/investigation.test.ts`, both `EC2 3` tests  |
| 4: unexplained peak deferred          | High-peak tests already existed                                                               | Average 2% / peak 95%; metrics registered in current trace; no initial supported window, no invented operational conflict, missing operational checks, savings null            | `tests/investigation.test.ts`, `EC2 4`             |
| 5: prior approval overturned          | A → B comparisons and standalone C existed; follow-up workflow also exercised an A → C review | Added direct A → C Zetaris comparison: prior conditional recommendation, newly retrieved continuous-operation dependency, current dependency citation, current not_recommended | `tests/warm.test.ts`, `EC2 5`                      |
| 6: prior rejection revisited          | B → A Zetaris comparison and separate H-MEM C → A already existed                             | Strengthened B → A: jobs cleared, dependency false, matching fresh clearances, supported hypothesis; added C → A Zetaris variant                                               | `tests/warm.test.ts`, `EC2 6` and `Zetaris C -> A` |

History checks assert prior verdict/windows, fresh citation separation, successful
append/readback for both runs, and rejection of historical IDs used as current
citations. Additional A/B-history counterexamples with unavailable fresh dependency
evidence must both defer. Removing a conflict without adequate authority must not
become approval. Existing clearance, scope, partial-source and timeout regressions
remain in the focused suite. Verdict expectations exist only in tests; providers
return evidence through the unchanged shared contract.

## Synthetic versus live evidence

These fixtures prove all three verdict classes. Live AWS can establish successful
authentication, inventory and currently available metrics/billing observations.
Native SSM maintenance executions and ELBv2 registrations supply partial operational
facts, not complete scheduling clearances. Actual live proof depends on successful
authorized calls; see the current execution receipt. A new instance cannot supply
14 days of past metrics. An in-instance cron job is not authoritative operational
evidence for the collector: its CPU activity may cause `needs_verification`, but
only the synthetic job fixture establishes the critical overlap for case 2.
New costs may not appear in Cost Explorer immediately. Follow the
[AWS setup and limitations](HOW.md#authenticate-to-aws); do not create resources
or treat missing history/costs as zero to reproduce these cases.

## Exact window-policy limitation

The **scenario dataset** is 14 complete UTC days. The **positive safety policy**
in `src/investigation/policy.ts` rejects durations below `7 * 86400000`; it does
not require 14 days. A boundary test now verifies 6 days defers while 7, 13 and
14 days can recommend when every other requirement is met. No policy change was
made for this task.

AWS CLI defaults to 14 complete UTC days but permits 1–14. Mock CLI defaults to
28 days and ends at the current instant; `--lookback-days 14` alone does not make
mock CLI periods midnight-aligned. Use this fixed-period scenario harness for
the submission proof. The standalone CLI defaults to live AWS and requires
explicit `--evidence mock` for synthetic runs.

## Three-minute recording flow

Run the demo once before recording. Keep its output available and rerun individual
cases when presenting. These commands need no network or saved local history:

```bash
# Contradiction-first opening:
node --import tsx --test --test-isolation=none --test-reporter=spec "--test-name-pattern=^EC2 2:" tests/investigation.test.ts
# Both historical reversals:
node --import tsx --test --test-isolation=none --test-reporter=spec "--test-name-pattern=^EC2 [56]:" tests/warm.test.ts
```

| Time      | Show                                                        | Say                                                                                                                                                                      |
| --------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 0:00–0:20 | Scope and synthetic-mode label                              | “We investigate EC2 off-hours scheduling. Every conclusion needs current evidence; nothing changes infrastructure.”                                                      |
| 0:20–1:05 | Case 2's low CPU, proposed → contradicted, job and citation | “The attractive window fails because a required batch overlaps it. We reject that window.”                                                                               |
| 1:05–1:35 | Cases 1, 3 and 4 in the complete demo output                | “Matching authority supports conditional approval. Missing authority or unexplained peaks produce verification requests. Low CPU is insufficient.”                       |
| 1:35–2:30 | Cases 5/6 historical comparisons and fresh citations        | “A previous approval is overturned by a new uptime dependency. A previous rejection can be cleared only by fresh matching evidence. Old records are labeled historical.” |
| 2:30–3:00 | Test totals and explicit limitations                        | “Six cases, seven focused checks. Current data and this Zetaris transport are synthetic. Live operational coverage and human approval remain separate requirements.”     |

For sponsor proof, show the separately recorded genuine Zetaris/H-MEM/model results
linked in `CLI_GUIDE.md` and `EXECUTION_PLAN.md`, labeling their dates and modes.
Do not describe this offline replay as a live sponsor or NVIDIA call. A live model
demo depends on provider availability and should not replace the dependable replay.

## Slide-ready findings

- **Decision quality:** recommend only with matching current clearances; reject a
  confirmed conflict; defer missing evidence or unexplained utilization peaks.
- **Explain why:** the trace connects the proposed shutdown to the retrieved
  contradiction. Citations resolve to this run's evidence and resource.
- **History is revisable:** both approval → rejection and rejection → approval
  follow fresh evidence. Zetaris retains prior decisions; it does not dictate them.
- **Measured scope:** six cases and seven exported variants, with current check
  results in the execution plan. These use labeled synthetic evidence. This is
  fixture correctness, not production accuracy or a live-model benchmark.
- **Honest limits:** 14-day scenario data, seven-day policy minimum;
  native operational coverage is incomplete; synthetic marginal pricing; approval required.

## Separate, limited loop/memory review

After scenario verification, inspection and existing regressions confirmed:
- The executor validates actions/evidence, bounds tool/planner attempts and total
  runtime, and preserves completed candidates when later work fails. No loop
  redesign was needed.
- The high-peak case stops before operational queries. Its final explanation is
  generic; the metrics and planner trace carry the peak reason. The demo prints
  the registered metric and missing checks. Improving that explanation is optional
  follow-up, not a reason to claim the peak's cause is known.
- Zetaris comparisons stay outside planner hints. H-MEM alone prioritizes learned
  checks; scope/mode/time filtering and fresh revalidation remain tested.
- H-MEM's existing eight-workload comparison ties the strongest fixed order on
  total warm tool calls; recurring cases can improve and changed cases can regress.
  Training work is additional. Do not claim a general efficiency gain.
- Two upstream Windows portability failures used `/tmp` in a follow-up test and
  the memory-evaluation script. Both now use `os.tmpdir()`; no memory algorithm changed.

These are a limited review and regression results, not an exhaustive architecture
or security audit. Submission ownership, blockers and execution evidence remain
in `EXECUTION_PLAN.md`.
